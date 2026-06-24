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

public class DeliveryJob {

    private static final Logger LOG = LoggerFactory.getLogger(DeliveryJob.class);
    private static final String KAFKA_BOOTSTRAP = "192.168.157.121:9092,192.168.157.122:9092,192.168.157.123:9092";
    private static final String KAFKA_TOPIC = "delivery-orders";
    private static final String KAFKA_GROUP = "delivery-poc-group";
    private static final String MYSQL_URL = "jdbc:mysql://192.168.157.122:3306/delivery_dashboard?useSSL=false&serverTimezone=Asia/Shanghai";
    private static final String MYSQL_USER = "root";
    private static final String MYSQL_PASS = "123456";
    private static final ObjectMapper MAPPER = new ObjectMapper();

    public static class Acc {
        double gmv = 0; long orderCount = 0;
        Acc add(Order o) { gmv += o.getTotalAmount(); orderCount++; return this; }
        Acc merge(Acc o) { gmv += o.gmv; orderCount += o.orderCount; return this; }
    }

    public static class MySQLSink extends RichSinkFunction<Acc> {
        @Override
        public void invoke(Acc acc, Context ctx) {
            try (Connection conn = DriverManager.getConnection(MYSQL_URL, MYSQL_USER, MYSQL_PASS);
                 PreparedStatement ps = conn.prepareStatement(
                     "REPLACE INTO dashboard_summary (id, gmv, order_count, avg_order_amount) VALUES (1, ?, ?, ?)")) {
                double avg = acc.orderCount > 0 ? acc.gmv / acc.orderCount : 0;
                ps.setDouble(1, acc.gmv); ps.setLong(2, acc.orderCount); ps.setDouble(3, avg);
                ps.executeUpdate();
                LOG.info(">>> MySQL: gmv={}, orders={}, avg={}", acc.gmv, acc.orderCount, String.format("%.2f", avg));
            } catch (Exception e) { LOG.error(">>> SINK FAIL", e); }
        }
    }

    public static void main(String[] args) throws Exception {
        StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();
        env.setParallelism(2);

        KafkaSource<String> source = KafkaSource.<String>builder()
            .setBootstrapServers(KAFKA_BOOTSTRAP).setTopics(KAFKA_TOPIC).setGroupId(KAFKA_GROUP)
            .setStartingOffsets(OffsetsInitializer.latest())
            .setValueOnlyDeserializer(new SimpleStringSchema()).build();

        DataStream<Order> orders = env.fromSource(source, WatermarkStrategy.noWatermarks(), "Kafka")
            .map((MapFunction<String, Order>) json -> MAPPER.readValue(json, Order.class))
            .filter(o -> o != null && o.getTotalAmount() > 0);

        orders.windowAll(TumblingProcessingTimeWindows.of(Time.seconds(5)))
            .aggregate(new AggregateFunction<Order, Acc, Acc>() {
                @Override public Acc createAccumulator() { return new Acc(); }
                @Override public Acc add(Order o, Acc a) { return a.add(o); }
                @Override public Acc getResult(Acc a) { return a; }
                @Override public Acc merge(Acc a, Acc b) { return a.merge(b); }
            }).addSink(new MySQLSink());

        env.execute("Delivery-POC");
    }
}
