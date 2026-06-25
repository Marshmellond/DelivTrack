"""模拟器配置 — 连接参数"""

# Kafka 连接
KAFKA_BOOTSTRAP = [
    "192.168.157.121:9092",
    "192.168.157.122:9092",
    "192.168.157.123:9092",
]
KAFKA_TOPIC = "delivery-orders"

# MySQL 连接
MYSQL_HOST = "192.168.157.122"
MYSQL_PORT = 3306
MYSQL_USER = "root"
MYSQL_PASSWORD = "123456"
MYSQL_DB = "delivery_dashboard"

# 发送频率
INTERVAL = 1      # 1秒
BATCH_SIZE = 5    # 每批 5 条 → 5条/秒
