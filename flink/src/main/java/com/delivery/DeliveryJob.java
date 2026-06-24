package com.delivery;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.flink.api.common.eventtime.WatermarkStrategy;
import org.apache.flink.api.common.functions.AggregateFunction;
import org.apache.flink.api.common.functions.MapFunction;
import org.apache.flink.api.common.serialization.SimpleStringSchema;
import org.apache.flink.connector.kafka.source.KafkaSource;
import org.apache.flink.connector.kafka.source.enumerator.initializer.OffsetsInitializer;
import org.apache.flink.streaming.api.datastream.DataStream;
import org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;
import org.apache.flink.streaming.api.functions.sink.RichSinkFunction;
import org.apache.flink.streaming.api.windowing.assigners.TumblingProcessingTimeWindows;
import org.apache.flink.streaming.api.windowing.time.Time;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;

/**
 * POC 最小作业: Kafka → 5s 窗口聚合 → MySQL dashboard_summary
 *
 * <p>打包后通过 Flink WebUI (http://192.168.157.122:8081) 提交运行。</p>
 */
public class DeliveryJob {

    private static final Logger LOG = LoggerFactory.getLogger(DeliveryJob.class);

    private static final String KAFKA_BOOTSTRAP =
            "192.168.157.121:9092,192.168.157.122:9092,192.168.157.123:9092";
    private static final String KAFKA_TOPIC = "delivery-orders";
    private static final String KAFKA_GROUP = "delivery-poc-group";

    private static final String MYSQL_URL =
            "jdbc:mysql://192.168.157.122:3306/delivery_poc"
                    + "?useSSL=false&serverTimezone=Asia/Shanghai";
    private static final String MYSQL_USER = "root";
    private static final String MYSQL_PASS = "123456";

    private static final ObjectMapper MAPPER = new ObjectMapper();

    // ---- 累加器 ----
    public static class Acc {
        double gmv = 0;
        long orderCount = 0;

        Acc add(Order o) {
            gmv += o.getTotalAmount();
            orderCount++;
            return this;
        }

        Acc merge(Acc o) {
            gmv += o.gmv;
            orderCount += o.orderCount;
            return this;
        }
    }

    // ---- MySQL Sink ----
    public static class MySQLSink extends RichSinkFunction<Acc> {
        @Override
        public void invoke(Acc acc, Context ctx) {
            String sql = "REPLACE INTO dashboard_summary (id, gmv, order_count, avg_order_amount) "
                    + "VALUES (1, ?, ?, ?)";
            try (Connection conn = DriverManager.getConnection(MYSQL_URL, MYSQL_USER, MYSQL_PASS);
                 PreparedStatement ps = conn.prepareStatement(sql)) {
                double avgAmount = acc.orderCount > 0 ? acc.gmv / acc.orderCount : 0;
                ps.setDouble(1, acc.gmv);
                ps.setLong(2, acc.orderCount);
                ps.setDouble(3, avgAmount);
                ps.executeUpdate();
                LOG.info("MySQL updated: gmv={}, orders={}, avg={}",
                        acc.gmv, acc.orderCount, String.format("%.2f", avgAmount));
            } catch (Exception e) {
                LOG.error("MySQL write failed", e);
            }
        }
    }

    // ---- 主入口 ----
    public static void main(String[] args) throws Exception {
        StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();
        env.setParallelism(2);

        // Kafka Source
        KafkaSource<String> source = KafkaSource.<String>builder()
                .setBootstrapServers(KAFKA_BOOTSTRAP)
                .setTopics(KAFKA_TOPIC)
                .setGroupId(KAFKA_GROUP)
                .setStartingOffsets(OffsetsInitializer.latest())
                .setValueOnlyDeserializer(new SimpleStringSchema())
                .build();

        DataStream<Order> orders = env
                .fromSource(source, WatermarkStrategy.noWatermarks(), "Kafka")
                .map((MapFunction<String, Order>) json -> {
                    try {
                        return MAPPER.readValue(json, Order.class);
                    } catch (Exception e) {
                        return null;
                    }
                })
                .filter(o -> o != null && o.getTotalAmount() > 0)
                .name("Parse-JSON");

        // 5 秒滚动窗口聚合 → MySQL
        orders
                .windowAll(TumblingProcessingTimeWindows.of(Time.seconds(5)))
                .aggregate(new AggregateFunction<Order, Acc, Acc>() {
                    @Override
                    public Acc createAccumulator() {
                        return new Acc();
                    }

                    @Override
                    public Acc add(Order o, Acc a) {
                        return a.add(o);
                    }

                    @Override
                    public Acc getResult(Acc a) {
                        return a;
                    }

                    @Override
                    public Acc merge(Acc a, Acc b) {
                        return a.merge(b);
                    }
                })
                .addSink(new MySQLSink())
                .name("MySQL-Sink");

        env.execute("Delivery-POC-Job");
    }
}
