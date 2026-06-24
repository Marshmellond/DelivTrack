# POC 启动指南 — 外卖配送实时监控最小流程

## 当前状态

✅ 所有代码已编写并本地验证通过  
⏳ 需要手动执行 VM 侧操作（MySQL 建表 + Kafka 建 Topic + Flink 提交）

---

## 快速启动（按顺序执行）

### ❶ MySQL 建表（需 SSH Node_02）

```bash
ssh root@192.168.157.122
# 密码: 123456

mysql -u root -pItcast@2020
```

```sql
CREATE DATABASE IF NOT EXISTS delivery_poc DEFAULT CHARSET utf8mb4;
USE delivery_poc;

CREATE TABLE IF NOT EXISTS dashboard_summary (
    id INT PRIMARY KEY DEFAULT 1,
    gmv DECIMAL(14,2) DEFAULT 0,
    order_count BIGINT DEFAULT 0,
    avg_order_amount DECIMAL(8,2) DEFAULT 0,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT INTO dashboard_summary (id, gmv, order_count, avg_order_amount) VALUES (1, 0, 0, 0)
ON DUPLICATE KEY UPDATE id=id;

SELECT * FROM dashboard_summary;
-- 预期: 1 行，gmv=0, order_count=0
```

---

### ❷ Kafka 建 Topic（需 SSH 任意 Kafka 节点）

```bash
ssh root@192.168.157.123
# 密码: 123456

kafka-topics.sh --bootstrap-server 192.168.157.123:9092 \
  --create --topic delivery-orders \
  --partitions 3 --replication-factor 2

# 验证
kafka-topics.sh --bootstrap-server 192.168.157.123:9092 \
  --list | grep delivery
```

---

### ❸ 启动 Python 模拟器（本地，Windows 终端）

```bash
cd server
uv run python simulator/run.py
```

验证消息到达 Kafka：
```bash
# 在 VM 上
kafka-console-consumer.sh --bootstrap-server 192.168.157.123:9092 \
  --topic delivery-orders --max-messages 3
```

---

### ❹ Flink 作业打包并提交（需 JDK 8 + Maven 环境）

```bash
# 打包（在 flink/ 目录下）
cd flink
mvn clean package -DskipTests
# 产出: target/delivery-flink-poc-1.0-SNAPSHOT.jar
```

提交到 Flink：
1. 浏览器打开 http://192.168.157.122:8081
2. 左侧 "Submit New Job" → "Add New" → 上传 jar
3. 点击 Submit

验证 Flink 写入 MySQL：
```bash
# 在 Node_02 上，每 5 秒查一次
watch -n 5 'mysql -u root -pItcast@2020 -e "SELECT * FROM delivery_poc.dashboard_summary;"'
# 看到 gmv 和 order_count 在涨 → Flink 工作正常
```

---

### ❺ 启动 FastAPI（本地，新 Windows 终端）

```bash
cd server
uv run uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload
```

验证：
```bash
curl http://localhost:8000/api/summary
# 预期: {"gmv": 123456.78, "order_count": 2840, ...}
```

---

### ❻ 启动 Next.js 前端（本地，新 Windows 终端）

```bash
cd web
pnpm dev
```

浏览器打开 **http://localhost:3000**  
看到 3 个数字卡片（GMV / 订单量 / 均单金额）在 500ms 刷新 → **POC 全链路通 ✅**

---

## POC 验证清单

| # | 组件 | 验证方法 | 预期结果 |
|---|------|----------|----------|
| 1 | MySQL | `SELECT * FROM delivery_poc.dashboard_summary` | 1 行，初始值全 0 |
| 2 | Kafka | `kafka-console-consumer` 消费消息 | JSON 订单输出 |
| 3 | 模拟器 | 终端输出 `已发送: xxx 条` | 计数持续增长 |
| 4 | Flink | MySQL 每 5 秒查询 gmv/order_count | 数字在涨 |
| 5 | FastAPI | `curl localhost:8000/api/health` | `{"status":"ok"}` |
| 6 | Next.js | 浏览器 `localhost:3000` | 3 个数字卡片显示数据 |

---

## 一键命令汇总

```bash
# === 终端 1: 模拟器 ===
cd server && uv run python simulator/run.py

# === 终端 2: FastAPI ===
cd server && uv run uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload

# === 终端 3: Next.js ===
cd web && pnpm dev
```

打开 http://localhost:3000 查看结果。
