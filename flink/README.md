# Flink -- 实时流计算

Apache Flink 流计算 Job，消费 Kafka Topic `delivery-orders`，以 5 秒滚动窗口聚合 GMV 与订单量，写入 MySQL 大屏汇总表。

## 技术栈

- Java 8
- Apache Flink 1.17.2
- Kafka Connector（消费端）
- MySQL JDBC + HikariCP（写入端）

## 数据流 Pipeline

```
Kafka (delivery-orders)  -->  Flink Source  -->  Deserialize (JSON → Order POJO)
    -->  5s Tumbling Window (windowAll)  -->  Aggregate (gmv, order_count)
    -->  MySQL Sink (REPLACE INTO dashboard_summary)
```

## 项目结构

```
flink/
├── pom.xml
├── src/main/java/com/delivery/
│   ├── DeliveryJob.java       # Flink Job 主入口
│   └── Order.java             # 订单 POJO (Jackson 反序列化)
└── README.md
```

## 构建

```bash
cd flink
mvn clean package -DskipTests
```

产物：`target/delivery-flink-poc-1.0-SNAPSHOT.jar`（shade 打包，内含所有依赖除 Flink 自身）

## 部署与运行

1. 上传 JAR 到 Flink 集群（Node_01）：

```bash
scp target/delivery-flink-poc-1.0-SNAPSHOT.jar root@192.168.157.121:/tmp/
```

2. 在 Node_01 提交 Job：

```bash
ssh root@192.168.157.121
source /etc/profile
flink run /tmp/delivery-flink-poc-1.0-SNAPSHOT.jar
```

3. 验证：打开 Flink WebUI http://192.168.157.121:8081，查看 Running Jobs

## 核心逻辑

- **Source**：Kafka Consumer，group `delivery-poc-group`，从 latest offset 开始消费
- **并行度**：`env.setParallelism(2)`
- **窗口**：5 秒滚动窗口（`TumblingProcessingTimeWindows.of(Time.seconds(5))`）
- **聚合**：累加 `gmv` 和 `order_count`
- **Sink**：每条聚合结果 `REPLACE INTO dashboard_summary (id=1)` 更新实时大屏数据

## 依赖说明

| 依赖                      | Scope    | 说明                         |
|---------------------------|----------|------------------------------|
| flink-streaming-java      | provided | Flink 集群自带，无需打包     |
| flink-connector-kafka     | compile  | Kafka Source 连接器          |
| jackson-databind          | compile  | JSON 反序列化                |
| mysql-connector-java      | compile  | MySQL JDBC Driver            |
| HikariCP                  | compile  | JDBC 连接池（Sink 复用连接） |
