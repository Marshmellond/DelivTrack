"""POC 模拟器配置 — Kafka / MySQL 连接参数"""

# Kafka 连接
KAFKA_BOOTSTRAP = [
    "192.168.157.121:9092",
    "192.168.157.122:9092",
    "192.168.157.123:9092",
]
KAFKA_TOPIC = "delivery-orders"

# MySQL 连接（供后续扩展使用，POC 阶段模拟器不直接写 MySQL）
MYSQL_HOST = "192.168.157.122"
MYSQL_PORT = 3306
MYSQL_USER = "root"
MYSQL_PASSWORD = "123456"
MYSQL_DB = "delivery_poc"

# 发送频率
INTERVAL = 0.05   # 50ms
BATCH_SIZE = 25   # 每批 25 条 → 500条/秒
