"""POC FastAPI — 读 MySQL dashboard_summary 返回 JSON"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import pymysql

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

MYSQL_CFG = {
    "host": "192.168.157.122",
    "port": 3306,
    "user": "root",
    "password": "123456",
    "database": "delivery_poc",
    "charset": "utf8mb4",
}


@app.get("/api/summary")
def summary():
    """返回 dashboard_summary 单行数据"""
    conn = pymysql.connect(**MYSQL_CFG)
    with conn.cursor() as cur:
        cur.execute(
            "SELECT gmv, order_count, avg_order_amount, update_time "
            "FROM dashboard_summary WHERE id = 1"
        )
        row = cur.fetchone()
    conn.close()

    if row is None:
        return {
            "gmv": 0,
            "order_count": 0,
            "avg_order_amount": 0,
            "update_time": None,
        }

    return {
        "gmv": float(row[0]),
        "order_count": int(row[1]),
        "avg_order_amount": float(row[2]),
        "update_time": str(row[3]),
    }


@app.get("/api/health")
def health():
    return {"status": "ok"}
