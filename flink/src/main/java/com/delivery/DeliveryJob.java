package com.delivery;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.flink.api.common.functions.AggregateFunction;
import org.apache.flink.api.common.functions.FilterFunction;
import org.apache.flink.api.common.functions.MapFunction;
import org.apache.flink.api.common.serialization.SimpleStringSchema;
import org.apache.flink.streaming.api.datastream.DataStream;
import org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;
import org.apache.flink.streaming.api.functions.sink.RichSinkFunction;
import org.apache.flink.streaming.api.windowing.assigners.TumblingProcessingTimeWindows;
import org.apache.flink.streaming.api.windowing.time.Time;
import org.apache.flink.streaming.connectors.kafka.FlinkKafkaConsumer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.util.Properties;

public class DeliveryJob {

    private static final Logger LOG = LoggerFactory.getLogger(DeliveryJob.class);
    private static final String KAFKA_BOOTSTRAP = "192.168.157.121:9092,192.168.157.122:9092,192.168.157.123:9092";
    private static final String KAFKA_TOPIC = "delivery-orders";
    private static final String MYSQL_URL = "jdbc:mysql://192.168.157.122:3306/delivery_dashboard?useSSL=false&serverTimezone=Asia/Shanghai";
    private static final ObjectMapper MAPPER = new ObjectMapper();

    public static class Acc {
        double gmv = 0; long orderCount = 0;
        Acc add(Order o) { gmv += o.getTotalAmount(); orderCount++; return this; }
        Acc merge(Acc o) { gmv += o.gmv; orderCount += o.orderCount; return this; }
    }

    public static class MySQLSink extends RichSinkFunction<Acc> {
        @Override
        public void invoke(Acc acc, Context ctx) {
            try (Connection conn = DriverManager.getConnection(MYSQL_URL, "root", "123456");
                 PreparedStatement ps = conn.prepareStatement(
                     "REPLACE INTO dashboard_summary (id, gmv, order_count, avg_order_amount) VALUES (1, ?, ?, ?)")) {
                double avg = acc.orderCount > 0 ? acc.gmv / acc.orderCount : 0;
                ps.setDouble(1, acc.gmv); ps.setLong(2, acc.orderCount); ps.setDouble(3, avg);
                ps.executeUpdate();
                LOG.info(">>> OK: gmv={}, orders={}", acc.gmv, acc.orderCount);
            } catch (Exception e) { LOG.error(">>> FAIL: {}", e.toString()); }
        }
    }

    public static void main(String[] args) throws Exception {
        StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();
        env.setParallelism(2);

        Properties props = new Properties();
        props.setProperty("bootstrap.servers", KAFKA_BOOTSTRAP);
        props.setProperty("group.id", "delivery-final");

        FlinkKafkaConsumer<String> consumer = new FlinkKafkaConsumer<>(
            KAFKA_TOPIC, new SimpleStringSchema(), props);
        consumer.setStartFromEarliest();

        DataStream<Order> orders = env.addSource(consumer)
            .map((MapFunction<String, Order>) json -> {
                try { return MAPPER.readValue(json, Order.class); }
                catch (Exception e) { return null; }
            })
            .filter(new FilterFunction<Order>() {
                @Override
                public boolean filter(Order o) { return o != null && o.getTotalAmount() > 0; }
            });

        orders.windowAll(TumblingProcessingTimeWindows.of(Time.seconds(5)))
            .aggregate(new AggregateFunction<Order, Acc, Acc>() {
                @Override public Acc createAccumulator() { return new Acc(); }
                @Override public Acc add(Order o, Acc a) { return a.add(o); }
                @Override public Acc getResult(Acc a) { return a; }
                @Override public Acc merge(Acc a, Acc b) { return a.merge(b); }
            }).addSink(new MySQLSink());

        env.execute("DelivTrack-Stream");
    }
}
