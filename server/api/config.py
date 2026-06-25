"""Centralized configuration for the Delivery Dashboard API."""

MYSQL_CFG = {
    "host": "192.168.157.122",
    "port": 3306,
    "user": "root",
    "password": "123456",
    "database": "delivery_dashboard",
    "charset": "utf8mb4",
}

JWT_SECRET = "delivery-dashboard-secret-key-2024"
JWT_ALGORITHM = "HS256"
JWT_EXPIRES_HOURS = 24

KAFKA_BOOTSTRAP = [
    "192.168.157.121:9092",
    "192.168.157.122:9092",
    "192.168.157.123:9092",
]
