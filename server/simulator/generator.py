"""POC 外卖订单生成器 — 最小字段"""

import random
import time
import uuid


MERCHANTS = [  # 10 个商家
    ("老王盖浇饭", "中餐"),
    ("麦肯基炸鸡", "快餐"),
    ("蜀味川菜馆", "中餐"),
    ("日料一番", "日料"),
    ("披萨达人", "西餐"),
    ("湘味小炒", "中餐"),
    ("粤式茶餐厅", "中餐"),
    ("烤肉大王", "韩餐"),
    ("甜品屋", "甜品"),
    ("深夜烧烤", "小吃"),
]

CITIES = [
    ("北京市", ["朝阳区", "海淀区", "丰台区", "通州区"]),
    ("上海市", ["浦东新区", "徐汇区", "静安区", "闵行区"]),
    ("广州市", ["天河区", "越秀区", "白云区", "番禺区"]),
    ("深圳市", ["南山区", "福田区", "宝安区", "龙岗区"]),
    ("杭州市", ["西湖区", "拱墅区", "滨江区", "余杭区"]),
]


def generate_order() -> dict:
    """随机生成一条外卖订单"""
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
            ["created", "accepted", "delivering", "delivered"],
            weights=[0.1, 0.2, 0.3, 0.4],
        )[0],
        "city": city,
        "district": district,
        "event_time": int(time.time() * 1000),
    }


def generate_batch(n: int = 25) -> list[dict]:
    """批量生成 n 条订单"""
    return [generate_order() for _ in range(n)]
