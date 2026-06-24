# 外卖配送实时监控系统 — POC 最小流程

## 目标

只跑通一条线：**模拟器 → Kafka → Flink → MySQL → FastAPI → Next.js（一张图）**

验证整个链路可用后，再按详细方案加功能。

---

## 第一步：MySQL 建表

SSH 到 Node_02，连 MySQL：

```bash
mysql -u root -p Itcast@2020
```

```sql
CREATE DATABASE IF NOT EXISTS delivery_poc DEFAULT CHARSET utf8mb4;
USE delivery_poc;

-- POC 只用一张聚合表，Flink 算出来的 GMV 和订单数就写这里
CREATE TABLE dashboard_summary (
    id INT PRIMARY KEY DEFAULT 1,
    gmv DECIMAL(14,2) DEFAULT 0,
    order_count BIGINT DEFAULT 0,
    avg_order_amount DECIMAL(8,2) DEFAULT 0,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 插入初始行（Flink 用 REPLACE INTO 更新这一行）
INSERT INTO dashboard_summary (id, gmv, order_count, avg_order_amount) VALUES (1, 0, 0, 0);

-- 验证
SELECT * FROM dashboard_summary;
```

预期输出：
```
+----+------+-------------+------------------+---------------------+
| id | gmv  | order_count | avg_order_amount | update_time         |
+----+------+-------------+------------------+---------------------+
|  1 | 0.00 |           0 |             0.00 | 2026-06-11 12:00:00 |
+----+------+-------------+------------------+---------------------+
```

---

## 第二步：建 Kafka Topic

SSH 到任意 Kafka 节点：

```bash
kafka-topics.sh --bootstrap-server 192.168.157.123:9092 \
  --create --topic delivery-orders \
  --partitions 3 --replication-factor 2

# 验证
kafka-topics.sh --bootstrap-server 192.168.157.123:9092 \
  --list | grep delivery
```

---

## 第三步：Python 模拟器（Kafka 生产者）

### 目录结构

```
server/simulator/
├── config.py
├── generator.py
└── run.py
```

### config.py

```python
# Kafka 连接
KAFKA_BOOTSTRAP = [
    "192.168.157.121:9092",
    "192.168.157.122:9092",
    "192.168.157.123:9092",
]
KAFKA_TOPIC = "delivery-orders"

# MySQL 连接（模拟器暂时用不到，预留）
MYSQL_HOST = "192.168.157.122"
MYSQL_PORT = 3306
MYSQL_USER = "root"
MYSQL_PASSWORD = "Itcast@2020"
MYSQL_DB = "delivery_poc"

# 发送频率
INTERVAL = 0.05   # 50ms
BATCH_SIZE = 25   # 每批 25 条 → 500条/秒
```

### generator.py

```python
"""POC 外卖订单生成器 — 最小字段"""

import random
import time
import uuid

MERCHANTS = [  # 10 个商家
    ("老王盖浇饭", "中餐"), ("麦肯基炸鸡", "快餐"), ("蜀味川菜馆", "中餐"),
    ("日料一番", "日料"), ("披萨达人", "西餐"), ("湘味小炒", "中餐"),
    ("粤式茶餐厅", "中餐"), ("烤肉大王", "韩餐"), ("甜品屋", "甜品"), ("深夜烧烤", "小吃"),
]

CITIES = [
    ("北京市", ["朝阳区","海淀区","丰台区","通州区"]),
    ("上海市", ["浦东新区","徐汇区","静安区","闵行区"]),
    ("广州市", ["天河区","越秀区","白云区","番禺区"]),
    ("深圳市", ["南山区","福田区","宝安区","龙岗区"]),
    ("杭州市", ["西湖区","拱墅区","滨江区","余杭区"]),
]


def generate_order() -> dict:
    merchant_name, category = random.choice(MERCHANTS)
    city, districts = random.choice(CITIES)
    district = random.choice(districts)
    item_count = random.choices([1, 2, 3], weights=[0.5, 0.35, 0.15])[0]
    unit_price = round(random.uniform(15, 80), 2)

    return {
        "order_no": str(uuid.uuid4()).replace("-", "")[:16],
        "user_id": random.randint(1, 1000),
        "merchant_name": merchant_name,
        "category": category,
        "rider_id": random.randint(1, 50),
        "total_amount": round(unit_price * item_count, 2),
        "delivery_fee": round(random.uniform(3, 8), 2),
        "distance": round(random.uniform(0.5, 5.0), 2),
        "status": random.choices(
            ["created","accepted","delivering","delivered"],
            weights=[0.1, 0.2, 0.3, 0.4]
        )[0],
        "city": city,
        "district": district,
        "event_time": int(time.time() * 1000),
    }


def generate_batch(n: int = 25) -> list[dict]:
    return [generate_order() for _ in range(n)]
```

### run.py

```python
"""POC 模拟器入口 — 往 Kafka 写订单"""

import json
import time
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from kafka import KafkaProducer
from simulator.config import KAFKA_BOOTSTRAP, KAFKA_TOPIC, INTERVAL, BATCH_SIZE
from simulator.generator import generate_batch


def main():
    producer = KafkaProducer(
        bootstrap_servers=KAFKA_BOOTSTRAP,
        value_serializer=lambda v: json.dumps(v, ensure_ascii=False).encode("utf-8"),
        acks="all",
        retries=3,
    )

    print(f"POC 模拟器启动 → Kafka: {KAFKA_BOOTSTRAP}, Topic: {KAFKA_TOPIC}")
    print(f"频率: {INTERVAL}s × {BATCH_SIZE} = {int(BATCH_SIZE/INTERVAL)} 条/秒")
    print("按 Ctrl+C 停止\n")

    count = 0
    try:
        while True:
            orders = generate_batch(BATCH_SIZE)
            for order in orders:
                producer.send(KAFKA_TOPIC, value=order)
            count += len(orders)
            print(f"\r已发送: {count} 条", end="", flush=True)
            time.sleep(INTERVAL)
    except KeyboardInterrupt:
        print(f"\n\n停止。共发送 {count} 条")
    finally:
        producer.flush()
        producer.close()


if __name__ == "__main__":
    main()
```

### 安装依赖并运行

```bash
cd server
uv add kafka-python
uv run python simulator/run.py
```

验证 Kafka 收到数据：

```bash
# Node_03 上：
kafka-console-consumer.sh --bootstrap-server 192.168.157.123:9092 \
  --topic delivery-orders --max-messages 3
```

---

## 第四步：Flink 作业（Kafka → MySQL）

### pom.xml（Maven 依赖）

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>
    <groupId>com.delivery</groupId>
    <artifactId>delivery-flink-poc</artifactId>
    <version>1.0-SNAPSHOT</version>
    <properties>
        <maven.compiler.source>8</maven.compiler.source>
        <maven.compiler.target>8</maven.compiler.target>
        <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
        <flink.version>1.17.2</flink.version>
    </properties>
    <dependencies>
        <dependency>
            <groupId>org.apache.flink</groupId>
            <artifactId>flink-streaming-java</artifactId>
            <version>${flink.version}</version>
            <scope>provided</scope>
        </dependency>
        <dependency>
            <groupId>org.apache.flink</groupId>
            <artifactId>flink-connector-kafka</artifactId>
            <version>1.17.2</version>
        </dependency>
        <dependency>
            <groupId>com.fasterxml.jackson.core</groupId>
            <artifactId>jackson-databind</artifactId>
            <version>2.15.3</version>
        </dependency>
        <dependency>
            <groupId>mysql</groupId>
            <artifactId>mysql-connector-java</artifactId>
            <version>8.0.33</version>
        </dependency>
    </dependencies>
    <build>
        <plugins>
            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-shade-plugin</artifactId>
                <version>3.4.1</version>
                <executions>
                    <execution>
                        <phase>package</phase>
                        <goals><goal>shade</goal></goals>
                        <configuration>
                            <artifactSet>
                                <excludes>
                                    <exclude>org.apache.flink:flink-streaming-java</exclude>
                                </excludes>
                            </artifactSet>
                            <transformers>
                                <transformer implementation="org.apache.maven.plugins.shade.resource.ManifestResourceTransformer">
                                    <mainClass>com.delivery.DeliveryJob</mainClass>
                                </transformer>
                            </transformers>
                        </configuration>
                    </execution>
                </executions>
            </plugin>
        </plugins>
    </build>
</project>
```

### Order.java

```java
package com.delivery;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.io.Serializable;

public class Order implements Serializable {
    @JsonProperty("order_no") private String orderNo;
    @JsonProperty("user_id") private int userId;
    @JsonProperty("merchant_name") private String merchantName;
    @JsonProperty("category") private String category;
    @JsonProperty("rider_id") private int riderId;
    @JsonProperty("total_amount") private double totalAmount;
    @JsonProperty("delivery_fee") private double deliveryFee;
    @JsonProperty("distance") private double distance;
    @JsonProperty("status") private String status;
    @JsonProperty("city") private String city;
    @JsonProperty("district") private String district;
    @JsonProperty("event_time") private long eventTime;

    // getters
    public String getOrderNo() { return orderNo; }
    public int getUserId() { return userId; }
    public String getMerchantName() { return merchantName; }
    public String getCategory() { return category; }
    public int getRiderId() { return riderId; }
    public double getTotalAmount() { return totalAmount; }
    public double getDeliveryFee() { return deliveryFee; }
    public double getDistance() { return distance; }
    public String getStatus() { return status; }
    public String getCity() { return city; }
    public String getDistrict() { return district; }
    public long getEventTime() { return eventTime; }
}
```

### DeliveryJob.java

```java
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
 */
public class DeliveryJob {

    private static final Logger LOG = LoggerFactory.getLogger(DeliveryJob.class);

    private static final String KAFKA_BOOTSTRAP = "192.168.157.121:9092,192.168.157.122:9092,192.168.157.123:9092";
    private static final String KAFKA_TOPIC = "delivery-orders";
    private static final String KAFKA_GROUP = "delivery-poc-group";

    private static final String MYSQL_URL = "jdbc:mysql://192.168.157.122:3306/delivery_poc?useSSL=false&serverTimezone=Asia/Shanghai";
    private static final String MYSQL_USER = "root";
    private static final String MYSQL_PASS = "Itcast@2020";

    private static final ObjectMapper MAPPER = new ObjectMapper();

    // 累加器
    public static class Acc {
        double gmv = 0;
        long orderCount = 0;

        Acc add(Order o) { gmv += o.getTotalAmount(); orderCount++; return this; }
        Acc merge(Acc o) { gmv += o.gmv; orderCount += o.orderCount; return this; }
    }

    // MySQL Sink
    public static class MySQLSink extends RichSinkFunction<Acc> {
        @Override
        public void invoke(Acc acc, Context ctx) {
            String sql = "REPLACE INTO dashboard_summary (id, gmv, order_count, avg_order_amount) VALUES (1, ?, ?, ?)";
            try (Connection conn = DriverManager.getConnection(MYSQL_URL, MYSQL_USER, MYSQL_PASS);
                 PreparedStatement ps = conn.prepareStatement(sql)) {
                double avgAmount = acc.orderCount > 0 ? acc.gmv / acc.orderCount : 0;
                ps.setDouble(1, acc.gmv);
                ps.setLong(2, acc.orderCount);
                ps.setDouble(3, avgAmount);
                ps.executeUpdate();
                LOG.info("MySQL updated: gmv={}, orders={}, avg={}", acc.gmv, acc.orderCount, String.format("%.2f", avgAmount));
            } catch (Exception e) {
                LOG.error("MySQL write failed", e);
            }
        }
    }

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
                    try { return MAPPER.readValue(json, Order.class); }
                    catch (Exception e) { return null; }
                })
                .filter(o -> o != null && o.getTotalAmount() > 0)
                .name("Parse-JSON");

        // 5 秒窗口聚合
        orders
                .windowAll(TumblingProcessingTimeWindows.of(Time.seconds(5)))
                .aggregate(new AggregateFunction<Order, Acc, Acc>() {
                    @Override public Acc createAccumulator() { return new Acc(); }
                    @Override public Acc add(Order o, Acc a) { return a.add(o); }
                    @Override public Acc getResult(Acc a) { return a; }
                    @Override public Acc merge(Acc a, Acc b) { return a.merge(b); }
                })
                .addSink(new MySQLSink())
                .name("MySQL-Sink");

        env.execute("Delivery-POC-Job");
    }
}
```

### 打包提交

```bash
cd flink
mvn package

# 浏览器打开 http://192.168.157.122:8081
# Submit New Job → Add New → 上传 delivery-flink-poc-1.0-SNAPSHOT.jar → Submit
```

### 验证

```bash
# Node_02 MySQL 上，每隔 5 秒查一次：
mysql -u root -p Itcast@2020 -e "SELECT * FROM delivery_poc.dashboard_summary;"
```

看到 gmv 和 order_count 在涨就对了。

---

## 第五步：FastAPI 接口

### 安装依赖

```bash
cd server
uv add fastapi uvicorn pymysql
```

### api/main.py

```python
"""POC FastAPI — 读 MySQL dashboard_summary 返回 JSON"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import pymysql

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

MYSQL_CFG = {
    "host": "192.168.157.122", "port": 3306,
    "user": "root", "password": "Itcast@2020",
    "database": "delivery_poc", "charset": "utf8mb4",
}


@app.get("/api/summary")
def summary():
    conn = pymysql.connect(**MYSQL_CFG)
    with conn.cursor() as cur:
        cur.execute("SELECT gmv, order_count, avg_order_amount, update_time FROM dashboard_summary WHERE id=1")
        row = cur.fetchone()
    conn.close()
    return {
        "gmv": float(row[0]),
        "order_count": int(row[1]),
        "avg_order_amount": float(row[2]),
        "update_time": str(row[3]),
    }


@app.get("/api/health")
def health():
    return {"status": "ok"}
```

### 启动

```bash
uv run uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload
```

验证：
```bash
curl http://localhost:8000/api/summary
```

预期返回：
```json
{"gmv": 123456.78, "order_count": 2840, "avg_order_amount": 43.45, "update_time": "2026-06-11 12:05:00"}
```

---

## 第六步：Next.js 大屏（一张图）

### 安装依赖

```bash
cd web
pnpm add echarts echarts-for-react
```

### app/page.tsx

```tsx
"use client";

import { useEffect, useState, useRef } from "react";

export default function Home() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("http://localhost:8000/api/summary");
        setData(await res.json());
      } catch {}
    };
    fetchData();
    const timer = setInterval(fetchData, 500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0e27] text-white flex flex-col items-center justify-center gap-6">
      <h1 className="text-3xl font-bold">🛵 外卖配送实时监控 POC</h1>

      <div className="grid grid-cols-3 gap-6">
        <Card label="累计 GMV" value={`¥${(data?.gmv ?? 0).toLocaleString()}`} color="text-cyan-400" />
        <Card label="累计订单量" value={`${(data?.order_count ?? 0).toLocaleString()} 单`} color="text-emerald-400" />
        <Card label="均单金额" value={`¥${(data?.avg_order_amount ?? 0).toLocaleString()}`} color="text-amber-400" />
      </div>

      <p className="text-gray-500 text-sm">
        {data?.update_time ? `最后更新：${data.update_time}` : "等待数据..."}
      </p>
    </div>
  );
}

function Card({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-white/5 border border-cyan-500/20 rounded-2xl p-8 text-center w-64 backdrop-blur">
      <p className="text-gray-400 text-sm mb-2">{label}</p>
      <p className={`text-3xl font-bold ${color}`}>{value || "--"}</p>
    </div>
  );
}
```

### 启动

```bash
pnpm dev
```

打开 `http://localhost:3000`，看到三个数字卡片在刷新 → **POC 链路全通 ✅**

---

## POC 验证清单

| 步骤 | 验证方法 | 预期结果 |
|---|---|---|
| ① MySQL | `SELECT * FROM dashboard_summary` | 1 行初始数据 |
| ② Kafka | `kafka-console-consumer` 看消息 | JSON 订单输出 |
| ③ 模拟器 | `uv run python simulator/run.py` | `已发送: xxx 条` |
| ④ Flink | MySQL 每隔 5 秒查询 | gmv/order_count 在涨 |
| ⑤ FastAPI | `curl localhost:8000/api/summary` | 返回 JSON 数据 |
| ⑥ Next.js | 浏览器 `localhost:3000` | 3 个数字卡片显示数据 |

---

## POC → 正式版的下一步

POC 跑通后，告诉 AI：

> "POC 最小流程已跑通，现在按照《外卖配送实时监控与运营管理系统-详细方案.md》开始完整开发。先做第一步：MySQL 建全部 9 张表。"

然后逐步开发：建表 → 模拟器完整版 → Flink 5 条管道 → FastAPI 全部接口 → Next.js 6 个页面。
