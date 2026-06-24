"""外卖订单生成器 — 从 MySQL 加载真实数据生成完整订单"""

import random
import time
import pymysql

from simulator.config import MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DB

# District -> City mapping (derived from seed data)
DISTRICT_TO_CITY = {
    "朝阳区": "北京市", "海淀区": "北京市", "丰台区": "北京市", "通州区": "北京市",
    "浦东新区": "上海市", "徐汇区": "上海市", "静安区": "上海市", "闵行区": "上海市",
    "天河区": "广州市", "越秀区": "广州市", "白云区": "广州市", "番禺区": "广州市",
    "南山区": "深圳市", "福田区": "深圳市", "宝安区": "深圳市", "龙岗区": "深圳市",
    "西湖区": "杭州市", "拱墅区": "杭州市", "滨江区": "杭州市", "余杭区": "杭州市",
}

# In-memory caches (populated on first use)
_merchants = []          # list of dicts: {id, name, category, address, ...}
_riders = []             # list of dicts: {id, name, phone, vehicle, status}
_users = []              # list of dicts: {id, username, phone, address, ...}
_menu_items = []         # list of dicts: {id, merchant_id, name, price, ...}
_merchant_menu = {}      # merchant_id -> list of menu_item dicts
_loaded = False


def _get_conn():
    """Create a new MySQL connection with DictCursor."""
    return pymysql.connect(
        host=MYSQL_HOST,
        port=MYSQL_PORT,
        user=MYSQL_USER,
        password=MYSQL_PASSWORD,
        database=MYSQL_DB,
        charset="utf8mb4",
        cursorclass=pymysql.cursors.DictCursor,
    )


def _parse_address(address: str) -> tuple[str, str]:
    """Parse city and district from an address string like '朝阳区建国路100号'.

    Returns (city, district). Defaults to ('北京市', '') if no district matched.
    """
    for district, city in DISTRICT_TO_CITY.items():
        if district in address:
            return city, district
    return "北京市", ""


def load_data():
    """Load merchants, riders, users, and menu items from MySQL into memory."""
    global _merchants, _riders, _users, _menu_items, _merchant_menu, _loaded

    conn = _get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM merchants WHERE status='active'")
            _merchants = cur.fetchall()

            cur.execute("SELECT * FROM riders WHERE status IN ('online','delivering')")
            _riders = cur.fetchall()

            cur.execute("SELECT * FROM users")
            _users = cur.fetchall()

            cur.execute(
                "SELECT m.* FROM menu_items m "
                "JOIN merchants mer ON m.merchant_id=mer.id "
                "WHERE mer.status='active' AND m.status='on_sale'"
            )
            _menu_items = cur.fetchall()

        # Build merchant_id -> [menu_items] lookup
        _merchant_menu = {}
        for item in _menu_items:
            mid = item["merchant_id"]
            _merchant_menu.setdefault(mid, []).append(item)

        _loaded = True
        print(
            f"[Generator] Data loaded: {len(_merchants)} merchants, "
            f"{len(_riders)} riders, {len(_users)} users, "
            f"{len(_menu_items)} menu items"
        )
    finally:
        conn.close()


def _ensure_loaded():
    """Lazy-load data on first use."""
    if not _loaded:
        load_data()


def generate_order() -> dict:
    """Generate a single full order JSON record using live MySQL data."""
    _ensure_loaded()

    # Pick random entities
    merchant = random.choice(_merchants)
    user = random.choice(_users)
    rider = random.choice(_riders) if _riders else {"id": 0, "name": "未知"}

    # Derive city / district from merchant address
    city, district = _parse_address(merchant.get("address", ""))

    # Pick 1-3 menu items belonging to this merchant
    menu = _merchant_menu.get(merchant["id"], [])
    if not menu:
        items = [{"name": "未知菜品", "price": 20.0, "quantity": 1}]
        total_amount = 20.0
    else:
        n_items = random.choices([1, 2, 3], weights=[0.5, 0.35, 0.15])[0]
        n_items = min(n_items, len(menu))
        chosen = random.sample(menu, n_items)
        items = []
        total_amount = 0.0
        for item in chosen:
            qty = random.randint(1, 3)
            items.append({
                "name": item["name"],
                "price": float(item["price"]),
                "quantity": qty,
            })
            total_amount += float(item["price"]) * qty

    distance = round(random.uniform(0.5, 5.0), 2)
    delivery_fee = round(random.uniform(3, 8), 2)
    total_amount = round(total_amount, 2)

    # Order number: DL + timestamp + random hex suffix
    order_no = (
        "DL"
        + time.strftime("%Y%m%d%H%M%S", time.localtime())
        + format(random.randint(0, 0xFFFFFF), "06x")
    )

    return {
        "order_no": order_no,
        "user_id": user["id"],
        "user_name": user["username"],
        "merchant_id": merchant["id"],
        "merchant_name": merchant["name"],
        "merchant_category": merchant["category"],
        "rider_id": rider["id"],
        "rider_name": rider["name"],
        "items": items,
        "total_amount": total_amount,
        "delivery_fee": delivery_fee,
        "distance": distance,
        "status": random.choices(
            ["created", "accepted", "delivering", "delivered"],
            weights=[0.1, 0.2, 0.3, 0.4],
        )[0],
        "city": city,
        "district": district,
        "user_address": user.get("address", ""),
        "event_time": int(time.time() * 1000),
    }


def generate_batch(n: int = 25) -> list[dict]:
    """Generate a batch of n orders."""
    return [generate_order() for _ in range(n)]
