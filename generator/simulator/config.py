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

# 发送频率（演示用，平稳增长）
INTERVAL = 2      # 2秒一批
BATCH_SIZE = 2    # 每批 2 条 → 1条/秒
