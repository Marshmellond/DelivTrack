"""Generate massive demo data for delivery dashboard POC.

Seeds 500 realistic orders into delivery_dashboard and populates all dashboard
aggregation tables from the order data.

Usage:
    cd C:/Users/skv/project/dev_project/DelivTrack/server
    uv run python seed_full_data.py
"""
import pymysql
import random
import json
from datetime import datetime, timedelta

# ============================================================
# Config
# ============================================================

MYSQL_CFG = {
    "host": "192.168.157.122",
    "port": 3306,
    "user": "root",
    "password": "123456",
    "database": "delivery_dashboard",
    "charset": "utf8mb4",
}

# ============================================================
# Static reference data (mirrors existing seed)
# ============================================================

MERCHANT_INFO = {
    1:  {"name": "老王盖浇饭", "category": "中餐", "city": "北京", "district": "朝阳区"},
    2:  {"name": "麦肯基炸鸡", "category": "快餐", "city": "北京", "district": "海淀区"},
    3:  {"name": "蜀味川菜馆", "category": "中餐", "city": "北京", "district": "丰台区"},
    4:  {"name": "日料一番",   "category": "日料", "city": "上海", "district": "浦东新区"},
    5:  {"name": "披萨达人",   "category": "西餐", "city": "上海", "district": "徐汇区"},
    6:  {"name": "湘味小炒",   "category": "中餐", "city": "上海", "district": "静安区"},
    7:  {"name": "粤式茶餐厅", "category": "中餐", "city": "广州", "district": "天河区"},
    8:  {"name": "烤肉大王",   "category": "韩餐", "city": "深圳", "district": "南山区"},
    9:  {"name": "甜品屋",     "category": "甜品", "city": "杭州", "district": "西湖区"},
    10: {"name": "深夜烧烤",   "category": "小吃", "city": "杭州", "district": "拱墅区"},
    11: {"name": "海鲜大排档", "category": "中餐", "city": "深圳", "district": "福田区"},
    12: {"name": "兰州拉面馆", "category": "快餐", "city": "深圳", "district": "宝安区"},
    13: {"name": "元气早餐店", "category": "快餐", "city": "杭州", "district": "滨江区"},
    14: {"name": "精致寿司店", "category": "日料", "city": "广州", "district": "番禺区"},
    15: {"name": "重庆老火锅", "category": "中餐", "city": "上海", "district": "闵行区"},
}

CITY_DISTRICTS = {
    "北京": ["朝阳区", "海淀区", "丰台区", "东城区"],
    "上海": ["浦东新区", "徐汇区", "静安区", "黄浦区"],
    "广州": ["天河区", "番禺区", "越秀区", "海珠区"],
    "深圳": ["南山区", "福田区", "宝安区", "罗湖区"],
    "杭州": ["西湖区", "拱墅区", "滨江区", "上城区"],
}

MENU_ITEMS_BY_CATEGORY = {
    "中餐": [
        ("宫保鸡丁", 28), ("鱼香肉丝", 26), ("麻婆豆腐", 22), ("红烧肉", 38),
        ("糖醋排骨", 42), ("水煮鱼", 48), ("回锅肉", 30), ("干煸豆角", 18),
        ("酸辣土豆丝", 15), ("番茄蛋汤", 12), ("青椒肉丝", 24), ("辣子鸡", 45),
        ("蒜蓉西兰花", 16), ("东坡肉", 40), ("清蒸鲈鱼", 55),
    ],
    "快餐": [
        ("香辣鸡腿堡", 18), ("薯条", 10), ("可乐", 6), ("鸡米花", 12),
        ("牛肉汉堡", 22), ("鸡肉卷", 16), ("蛋挞", 8), ("炸鸡翅", 14),
        ("玉米浓汤", 9), ("冰淇淋", 7),
    ],
    "日料": [
        ("三文鱼刺身", 58), ("鳗鱼饭", 45), ("天妇罗拼盘", 38), ("拉面", 28),
        ("寿司拼盘", 68), ("味噌汤", 12), ("炸猪排", 35), ("章鱼小丸子", 18),
    ],
    "西餐": [
        ("意大利面", 32), ("牛排", 88), ("凯撒沙拉", 26), ("奶油蘑菇汤", 18),
        ("披萨", 48), ("烤鸡翅", 22),
    ],
    "韩餐": [
        ("石锅拌饭", 30), ("韩式炸鸡", 42), ("泡菜汤", 20), ("烤肉拼盘", 78),
        ("冷面", 22), ("炒年糕", 16),
    ],
    "甜品": [
        ("提拉米苏", 28), ("芒果班戟", 22), ("巧克力蛋糕", 25), ("杨枝甘露", 18),
        ("抹茶千层", 32), ("双皮奶", 15), ("蛋挞", 8), ("冰淇淋华夫", 26),
    ],
    "小吃": [
        ("羊肉串", 5), ("烤茄子", 8), ("烤鱼", 38), ("手抓饼", 10),
        ("臭豆腐", 8), ("煎饼果子", 12), ("铁板鱿鱼", 20), ("炸串组合", 18),
    ],
}

# ============================================================
# Helpers
# ============================================================

random.seed(42)  # reproducible runs

BASE_DATE = datetime(2026, 6, 25, 14, 0, 0)  # "now"


def random_time_24h(offset_hours=0.0):
    """Return a random datetime within the last 24 hours (with optional offset)."""
    seconds_ago = random.uniform(offset_hours * 3600, 24 * 3600)
    return BASE_DATE - timedelta(seconds=seconds_ago)


def order_no(i):
    """DD + date + 6-digit zero-padded sequence."""
    return f"DD{BASE_DATE.strftime('%Y%m%d')}{i:06d}"


def build_items(category, count=None):
    """Pick random menu items from a category and return a JSON list."""
    pool = MENU_ITEMS_BY_CATEGORY.get(category, MENU_ITEMS_BY_CATEGORY["中餐"])
    if count is None:
        count = random.choices([1, 2, 3, 4], weights=[25, 40, 25, 10], k=1)[0]
    chosen = random.sample(pool, min(count, len(pool)))
    items = []
    for name, price in chosen:
        qty = random.choices([1, 2, 3], weights=[55, 35, 10], k=1)[0]
        items.append({"name": name, "price": price, "quantity": qty})
    return items


def item_total(items):
    """Sum of price * quantity for a list of item dicts."""
    return sum(it["price"] * it["quantity"] for it in items)


# ============================================================
# Step 1: Clean old data
# ============================================================

def clean_data(cur):
    """Truncate orders and all dashboard tables."""
    print("[1/6] Cleaning old data...")
    cur.execute("SET FOREIGN_KEY_CHECKS=0")
    for t in ["orders", "dashboard_hourly", "dashboard_merchant_rank",
              "dashboard_region", "dashboard_summary"]:
        cur.execute(f"TRUNCATE TABLE {t}")
    cur.execute("SET FOREIGN_KEY_CHECKS=1")
    print("  -> Truncated orders + 4 dashboard tables")


# ============================================================
# Step 2: Ensure extra dashboard_summary columns exist
# ============================================================

def ensure_summary_columns(cur):
    """Add rider_online / rider_delivering / avg_delivery_time / cancel_rate
    if they don't already exist in dashboard_summary."""
    cur.execute("DESCRIBE dashboard_summary")
    existing = {r[0] for r in cur.fetchall()}
    additions = [
        ("rider_online",      "INT DEFAULT 0"),
        ("rider_delivering",  "INT DEFAULT 0"),
        ("avg_delivery_time", "DECIMAL(6,2) DEFAULT 0"),
        ("cancel_rate",       "DECIMAL(5,2) DEFAULT 0"),
    ]
    for col_name, col_def in additions:
        if col_name not in existing:
            cur.execute(f"ALTER TABLE dashboard_summary ADD COLUMN {col_name} {col_def}")
            print(f"  -> Added column dashboard_summary.{col_name}")


# ============================================================
# Step 3: Generate 500 orders
# ============================================================

def generate_orders(cur, conn):
    """Insert 500 orders with realistic status distribution."""
    print("[2/6] Generating 500 orders...")

    # Status distribution
    status_pool = (
        ["created"]    * 50   +   # 10%
        ["accepted"]   * 75   +   # 15%
        ["delivering"] * 100  +   # 20%
        ["delivered"]  * 250  +   # 50%
        ["cancelled"]  * 25        #  5%
    )
    assert len(status_pool) == 500
    random.shuffle(status_pool)

    rows = []
    for i in range(500):
        status = status_pool[i]
        mid = random.randint(1, 15)
        info = MERCHANT_INFO[mid]
        category = info["category"]
        city = info["city"]

        # District: 70% merchant's actual district, 30% random from city
        if random.random() < 0.7:
            district = info["district"]
        else:
            district = random.choice(CITY_DISTRICTS[city])

        # Items
        items = build_items(category)
        delivery_fee = round(random.uniform(3.0, 8.0), 2)
        total = round(item_total(items) + delivery_fee, 2)

        # Distance
        distance = round(random.uniform(0.5, 15.0), 2)

        # Rider assignment
        if status == "created":
            rider_id = None
        else:
            rider_id = random.randint(1, 50)

        # Timestamp (biased per status — earlier statuses = more recent)
        if status == "created":
            ts = random_time_24h(offset_hours=0)   # last 0-24h (skewed recent)
        elif status == "accepted":
            ts = random_time_24h(offset_hours=1)   # at least 1h ago
        elif status == "delivering":
            ts = random_time_24h(offset_hours=2)   # at least 2h ago
        elif status == "delivered":
            ts = random_time_24h(offset_hours=3)   # at least 3h ago
        else:  # cancelled
            ts = random_time_24h(offset_hours=0)

        rows.append((
            order_no(i + 1),     # order_no
            random.randint(1, 1000),  # user_id
            mid,                      # merchant_id
            rider_id,                 # rider_id
            json.dumps(items, ensure_ascii=False),  # items
            total,                    # total_amount
            delivery_fee,             # delivery_fee
            distance,                 # distance
            status,                   # status
            city,                     # city
            district,                 # district
            ts,                       # create_time
        ))

    sql = (
        "INSERT INTO orders (order_no, user_id, merchant_id, rider_id, "
        "items, total_amount, delivery_fee, distance, status, city, district, "
        "create_time) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)"
    )
    cur.executemany(sql, rows)
    conn.commit()
    print(f"  -> Inserted {cur.rowcount} orders")


# ============================================================
# Step 4: Populate dashboard_summary
# ============================================================

def populate_dashboard_summary(cur, conn):
    """Compute aggregates from orders and upsert dashboard_summary (id=1)."""
    print("[3/6] Computing dashboard_summary...")

    # GMV & order count
    cur.execute("SELECT COALESCE(SUM(total_amount),0), COUNT(*) FROM orders")
    gmv, order_count = cur.fetchone()
    gmv = float(gmv)
    order_count = int(order_count)
    avg_order_amount = round(gmv / order_count, 2) if order_count else 0

    # Cancel rate
    cur.execute("SELECT COUNT(*) FROM orders WHERE status = 'cancelled'")
    cancelled = cur.fetchone()[0]
    cancel_rate = round(cancelled / order_count * 100, 2) if order_count else 0

    # Avg delivery time — compute for delivered orders from create_time
    # Since we don't store finish_time, use a reasonable random range
    cur.execute(
        "SELECT AVG(TIMESTAMPDIFF(MINUTE, create_time, "
        "DATE_ADD(create_time, INTERVAL FLOOR(15 + RAND() * 30) MINUTE))) "
        "FROM orders WHERE status = 'delivered'"
    )
    avg_del = cur.fetchone()[0]
    avg_delivery_time = round(float(avg_del), 2) if avg_del else round(random.uniform(20, 35), 2)

    # Rider stats (realistic random)
    rider_online = random.randint(35, 50)
    rider_delivering = random.randint(10, 25)

    cur.execute(
        "REPLACE INTO dashboard_summary "
        "(id, gmv, order_count, avg_order_amount, rider_online, rider_delivering, "
        "avg_delivery_time, cancel_rate, update_time) "
        "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,NOW())",
        (1, gmv, order_count, avg_order_amount, rider_online,
         rider_delivering, avg_delivery_time, cancel_rate),
    )
    conn.commit()
    print(f"  -> GMV={gmv:.2f}, orders={order_count}, avg={avg_order_amount}")
    print(f"  -> riders_online={rider_online}, delivering={rider_delivering}")
    print(f"  -> avg_delivery={avg_delivery_time}min, cancel_rate={cancel_rate}%")


# ============================================================
# Step 5: Populate dashboard_region (20 rows)
# ============================================================

def populate_dashboard_region(cur, conn):
    """Compute city x district aggregates and guarantee all 20 combinations."""
    print("[4/6] Computing dashboard_region...")

    # Aggregate from real orders
    cur.execute(
        "SELECT city, district, COUNT(*), COALESCE(SUM(total_amount),0) "
        "FROM orders GROUP BY city, district"
    )
    real_rows = {}
    for city, district, cnt, gmv in cur.fetchall():
        real_rows[(city, district)] = (cnt, float(gmv))

    # Ensure all 20 city-district combos exist
    inserted = 0
    for city, districts in CITY_DISTRICTS.items():
        for district in districts:
            cnt, gmv = real_rows.get((city, district), (0, 0.0))
            cur.execute(
                "INSERT INTO dashboard_region (city, district, order_count, gmv, update_time) "
                "VALUES (%s,%s,%s,%s,NOW()) "
                "ON DUPLICATE KEY UPDATE order_count=%s, gmv=%s, update_time=NOW()",
                (city, district, cnt, gmv, cnt, gmv),
            )
            inserted += 1

    conn.commit()
    print(f"  -> Upserted {inserted} region rows")


# ============================================================
# Step 6: Populate dashboard_merchant_rank (15 rows)
# ============================================================

def populate_dashboard_merchant_rank(cur, conn):
    """Compute per-merchant aggregates, joined with merchants.name."""
    print("[5/6] Computing dashboard_merchant_rank...")

    cur.execute(
        "SELECT m.name, m.category, "
        "COUNT(o.id) AS order_cnt, "
        "COALESCE(SUM(o.total_amount), 0) AS gmv "
        "FROM merchants m "
        "LEFT JOIN orders o ON o.merchant_id = m.id "
        "GROUP BY m.id, m.name, m.category "
        "ORDER BY gmv DESC"
    )
    rows = cur.fetchall()

    for name, category, cnt, gmv in rows:
        cur.execute(
            "INSERT INTO dashboard_merchant_rank "
            "(merchant_name, category, order_count, gmv, update_time) "
            "VALUES (%s,%s,%s,%s,NOW()) "
            "ON DUPLICATE KEY UPDATE category=%s, order_count=%s, gmv=%s, update_time=NOW()",
            (name, category, cnt, float(gmv), category, cnt, float(gmv)),
        )

    conn.commit()
    print(f"  -> Upserted {len(rows)} merchant rank rows")


# ============================================================
# Step 7: Populate dashboard_hourly (48 rows, last 24h @ 30min)
# ============================================================

def populate_dashboard_hourly(cur, conn):
    """Generate 48 time slots (every 30 min over last 24h) and aggregate."""
    print("[6/6] Computing dashboard_hourly...")

    inserted = 0
    for slot_idx in range(48):
        slot_start = BASE_DATE - timedelta(minutes=(48 - slot_idx) * 30)
        slot_end = slot_start + timedelta(minutes=30)

        cur.execute(
            "SELECT COUNT(*), COALESCE(SUM(total_amount),0) "
            "FROM orders "
            "WHERE create_time >= %s AND create_time < %s",
            (slot_start.strftime("%Y-%m-%d %H:%M:%S"),
             slot_end.strftime("%Y-%m-%d %H:%M:%S")),
        )
        cnt, gmv = cur.fetchone()

        # Realistic random delivery time for slots with orders
        if cnt > 0:
            avg_del = round(random.uniform(15, 45), 2)
        else:
            avg_del = 0.0

        cur.execute(
            "INSERT INTO dashboard_hourly (time_slot, order_count, gmv, avg_delivery_time) "
            "VALUES (%s,%s,%s,%s)",
            (slot_start.strftime("%Y-%m-%d %H:%M:%S"), cnt, float(gmv), avg_del),
        )
        inserted += 1

    conn.commit()
    print(f"  -> Inserted {inserted} hourly rows (48 slots x 30min)")


# ============================================================
# Verify
# ============================================================

def verify(cur):
    """Print summary counts for every table."""
    print("\n" + "=" * 50)
    print("VERIFICATION")
    print("=" * 50)
    tables = [
        "orders", "dashboard_summary", "dashboard_region",
        "dashboard_merchant_rank", "dashboard_hourly",
        "users", "merchants", "riders", "menu_items",
    ]
    for t in tables:
        cur.execute(f"SELECT COUNT(*) FROM {t}")
        cnt = cur.fetchone()[0]
        print(f"  {t:30s} {cnt:>6d} rows")

    # Extra detail for orders
    cur.execute(
        "SELECT status, COUNT(*) FROM orders "
        "GROUP BY status ORDER BY FIELD(status,'created','accepted','delivering','delivered','cancelled')"
    )
    print("\n  Order status distribution:")
    for status, cnt in cur.fetchall():
        pct = cnt / 500 * 100
        print(f"    {status:12s} {cnt:>4d} ({pct:.0f}%)")

    # GMV breakout
    cur.execute("SELECT gmv, order_count, avg_order_amount, cancel_rate FROM dashboard_summary WHERE id=1")
    row = cur.fetchone()
    if row:
        print(f"\n  dashboard_summary: GMV={float(row[0]):.2f}, "
              f"orders={row[1]}, avg={float(row[2]):.2f}, "
              f"cancel_rate={float(row[3])}%")

    # Top 5 merchants
    cur.execute("SELECT merchant_name, order_count, gmv FROM dashboard_merchant_rank ORDER BY gmv DESC LIMIT 5")
    print("\n  Top 5 merchants:")
    for name, cnt, gmv in cur.fetchall():
        print(f"    {name:16s} {cnt:>4d} orders  GMV={float(gmv):.2f}")

    # Top 5 regions
    cur.execute("SELECT city, district, order_count, gmv FROM dashboard_region ORDER BY gmv DESC LIMIT 5")
    print("\n  Top 5 regions:")
    for city, district, cnt, gmv in cur.fetchall():
        print(f"    {city}{district:8s} {cnt:>4d} orders  GMV={float(gmv):.2f}")

    # Hourly trend
    cur.execute("SELECT time_slot, order_count, gmv FROM dashboard_hourly WHERE order_count > 0 ORDER BY time_slot LIMIT 10")
    print("\n  Hourly slots (first 10 with orders):")
    for ts, cnt, gmv in cur.fetchall():
        print(f"    {ts} {cnt:>3d} orders  GMV={float(gmv):.2f}")

    print("\nDone.")


# ============================================================
# Main
# ============================================================

def main():
    conn = pymysql.connect(**MYSQL_CFG)
    try:
        cur = conn.cursor()

        clean_data(cur)
        ensure_summary_columns(cur)
        generate_orders(cur, conn)
        populate_dashboard_summary(cur, conn)
        populate_dashboard_region(cur, conn)
        populate_dashboard_merchant_rank(cur, conn)
        populate_dashboard_hourly(cur, conn)
        verify(cur)

        conn.commit()
    finally:
        conn.close()


if __name__ == "__main__":
    main()
