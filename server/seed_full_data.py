"""Seeds delivery_dashboard with realistic demo data.

Features:
- 1000 users, 15 merchants, 95 menu items, 50 riders
- 1000 orders over last 7 days with realistic patterns:
  * Peak hours (11-13, 17-19) get more orders
  * Weekdays more than weekends
  * Status lifecycle: older orders delivered, recent ones created
- All dashboard aggregations computed from real order data
- All timestamps relative to NOW()
- All user passwords = '123456' (bcrypt hashed)

Usage:
    cd C:/Users/skv/project/dev_project/DelivTrack/server
    uv run python seed_full_data.py
"""
import pymysql
import random
import json
import bcrypt
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
# Static reference data
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

random.seed(42)

# Pre-compute bcrypt hash for '123456' (same salt for reproducibility)
PASSWORD_HASH = bcrypt.hashpw(b"123456", bcrypt.gensalt()).decode()

# Chinese family names and given names for realistic user names
SURNAMES = ["张", "李", "王", "刘", "陈", "杨", "赵", "黄", "周", "吴",
            "徐", "孙", "马", "朱", "胡", "郭", "何", "高", "林", "罗"]
GIVEN_CHARS = ["伟", "芳", "娜", "敏", "静", "丽", "强", "磊", "洋", "勇",
               "艳", "杰", "涛", "明", "超", "秀英", "华", "慧", "鑫", "桂英"]

# Rider names
RIDER_SURNAMES = ["赵", "钱", "孙", "李", "周", "吴", "郑", "王", "冯", "陈"]
RIDER_GIVENS = ["强", "勇", "刚", "军", "伟", "磊", "飞", "鹏", "龙", "峰"]


def random_name(surnames, givens, idx):
    """Deterministic name based on index."""
    s = surnames[idx % len(surnames)]
    g = givens[(idx // len(surnames)) % len(givens)]
    # Add a second given name character sometimes
    if idx % 3 == 0:
        g += givens[(idx * 7 + 3) % len(givens)]
    return s + g


def random_phone():
    """Generate a realistic Chinese mobile number."""
    prefixes = ["138", "139", "150", "151", "152", "158", "159", "186", "187", "188"]
    return random.choice(prefixes) + "".join(str(random.randint(0, 9)) for _ in range(8))


def build_order_items(category, count=None):
    """Pick random menu items from a category and return a JSON-serializable list."""
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


def hour_weight(hour):
    """Return a probability weight for a given hour (0-23).
    Peak hours 11-13 and 17-19 get the highest weight."""
    if 11 <= hour <= 13:
        return 8.0
    elif 17 <= hour <= 19:
        return 9.0
    elif 10 <= hour <= 14:
        return 5.0
    elif 16 <= hour <= 20:
        return 6.0
    elif 7 <= hour <= 9:
        return 4.0
    elif 21 <= hour <= 22:
        return 3.0
    elif 0 <= hour <= 5:
        return 0.3
    else:
        return 2.0


def weekday_weight(dow):
    """Return a probability weight for day of week (0=Mon, 6=Sun).
    Weekdays higher than weekends."""
    if dow < 5:  # Mon-Fri
        return 1.0
    else:  # Sat-Sun
        return 0.6


# ============================================================
# Step 0: Clean ALL tables
# ============================================================

def clean_all(cur):
    """Truncate all tables in dependency-safe order."""
    print("[0/8] Cleaning all tables...")
    cur.execute("SET FOREIGN_KEY_CHECKS=0")
    tables = [
        "dashboard_hourly",
        "dashboard_merchant_rank",
        "dashboard_region",
        "dashboard_summary",
        "orders",
        "menu_items",
        "riders",
        "merchants",
        "users",
    ]
    for t in tables:
        cur.execute(f"TRUNCATE TABLE {t}")
        print(f"  TRUNCATE {t}")
    cur.execute("SET FOREIGN_KEY_CHECKS=1")
    print("  -> All tables cleaned")


# ============================================================
# Step 1: Seed users (1000)
# ============================================================

def seed_users(cur, conn):
    """Insert 1000 users with password='123456'."""
    print("[1/8] Seeding 1000 users...")

    rows = []
    for i in range(1000):
        username = f"user_{i:04d}"
        phone = random_phone()
        address = f"测试地址{i % 300}号"
        role = "admin" if i < 5 else "user"  # First 5 are admins
        rows.append((username, PASSWORD_HASH, phone, address, role))

    cur.executemany(
        "INSERT INTO users (username, password, phone, address, role, create_time) "
        "VALUES (%s, %s, %s, %s, %s, NOW())",
        rows,
    )
    conn.commit()
    print(f"  -> Inserted {cur.rowcount} users (5 admin + 995 user)")


# ============================================================
# Step 2: Seed merchants (15)
# ============================================================

def seed_merchants(cur, conn):
    """Insert 15 merchants."""
    print("[2/8] Seeding 15 merchants...")

    streets = ["中山路", "人民路", "解放路", "建设路", "南京路", "北京路",
               "延安路", "长江路", "黄河路", "五一街", "文化路", "学院路",
               "科技路", "光明路", "朝阳路"]
    phones = ["010-", "021-", "020-", "0755-", "0571-"]

    rows = []
    for mid in range(1, 16):
        info = MERCHANT_INFO[mid]
        city_idx = ["北京", "上海", "广州", "深圳", "杭州"].index(info["city"])
        address = f"{info['city']}{info['district']}{streets[mid-1]}{random.randint(1,300)}号"
        phone = f"{phones[city_idx]}{random.randint(10000000, 99999999)}"
        rows.append((info["name"], info["category"], info["city"], address, phone))

    cur.executemany(
        "INSERT INTO merchants (name, category, city, address, phone, status, create_time) "
        "VALUES (%s, %s, %s, %s, %s, 'active', NOW())",
        rows,
    )
    conn.commit()
    print(f"  -> Inserted {cur.rowcount} merchants")


# ============================================================
# Step 3: Seed menu_items (95)
# ============================================================

def seed_menu_items(cur, conn):
    """Insert 95 menu items distributed across all merchants."""
    print("[3/8] Seeding 95 menu items...")

    # Build a flat list of all items with category info
    all_items = []
    for cat, items in MENU_ITEMS_BY_CATEGORY.items():
        for name, price in items:
            all_items.append((cat, name, price))

    # Pad to exactly 95 items by adding variants
    base_count = len(all_items)  # 61 base items
    extra_needed = 95 - base_count
    extras = []
    for i in range(extra_needed):
        idx = i % base_count
        cat, name, price = all_items[idx]
        # Create a variant with slightly different price/suffix
        variants = ["大份", "小份", "特辣", "微辣", "加量", "双拼"]
        variant = variants[i % len(variants)]
        new_price = round(price * random.uniform(0.85, 1.35), 2)
        extras.append((cat, f"{name}({variant})", new_price))

    all_items.extend(extras)
    random.shuffle(all_items)

    rows = []
    for idx, (category, name, price) in enumerate(all_items[:95]):
        # Assign to a merchant that has this category
        matching_merchants = [mid for mid, info in MERCHANT_INFO.items()
                              if info["category"] == category]
        if matching_merchants:
            merchant_id = matching_merchants[idx % len(matching_merchants)]
        else:
            merchant_id = random.randint(1, 15)
        rows.append((merchant_id, name, price, category))

    cur.executemany(
        "INSERT INTO menu_items (merchant_id, name, price, category, stock, status, create_time) "
        "VALUES (%s, %s, %s, %s, 100, 'on_sale', NOW())",
        rows,
    )
    conn.commit()
    print(f"  -> Inserted {cur.rowcount} menu items across 15 merchants")


# ============================================================
# Step 4: Seed riders (50)
# ============================================================

def seed_riders(cur, conn):
    """Insert 50 riders with realistic names and statuses."""
    print("[4/8] Seeding 50 riders...")

    cities = ["北京", "上海", "广州", "深圳", "杭州"]
    vehicles = ["电动车", "摩托车", "电动车", "电动车", "电动车"]  # mostly e-bikes

    rows = []
    for i in range(50):
        name = random_name(RIDER_SURNAMES, RIDER_GIVENS, i)
        phone = random_phone()
        city = cities[i % len(cities)]
        vehicle = vehicles[i % len(vehicles)]
        # Status distribution: 40% online, 30% offline, 30% delivering
        if i < 20:
            status = "online"
        elif i < 35:
            status = "offline"
        else:
            status = "delivering"
        rows.append((name, phone, city, vehicle, status))

    cur.executemany(
        "INSERT INTO riders (name, phone, city, vehicle, status, create_time) "
        "VALUES (%s, %s, %s, %s, %s, NOW())",
        rows,
    )
    conn.commit()
    print(f"  -> Inserted {cur.rowcount} riders")


# ============================================================
# Step 5: Generate 1000 orders over last 7 days
# ============================================================

def generate_orders(cur, conn):
    """Insert 1000 orders with realistic temporal patterns.

    - Spread across 7 days
    - Peak hours (11-13, 17-19) weighted higher
    - Weekdays weighted higher than weekends
    - Status determined by age of order
    """
    print("[5/8] Generating 1000 orders...")

    NOW = datetime.now().replace(second=0, microsecond=0)
    ORDER_COUNT = 1000
    DAYS_BACK = 7

    # Determine how many orders fall in each day-hour slot
    # by weighted sampling
    day_hour_weights = []
    day_hour_slots = []
    for day_offset in range(DAYS_BACK):
        dt = NOW - timedelta(days=day_offset)
        dow = dt.weekday()  # 0=Mon, 6=Sun
        for hour in range(24):
            w = hour_weight(hour) * weekday_weight(dow)
            day_hour_weights.append(w)
            day_hour_slots.append((day_offset, hour))

    total_weight = sum(day_hour_weights)
    # Normalize and sample
    normalized = [w / total_weight for w in day_hour_weights]

    # How many orders per slot
    slot_counts = [0] * len(day_hour_slots)
    for _ in range(ORDER_COUNT):
        slot_idx = random.choices(range(len(day_hour_slots)), weights=normalized, k=1)[0]
        slot_counts[slot_idx] += 1

    # Now generate individual orders
    rows = []
    order_idx = 0
    base_date_str = NOW.strftime("%Y%m%d")

    for slot_idx, count in enumerate(slot_counts):
        if count == 0:
            continue
        day_offset, hour = day_hour_slots[slot_idx]
        for _ in range(count):
            order_idx += 1

            # Base time: the slot hour on the target day
            order_day = NOW - timedelta(days=day_offset)
            # Random minute/seconds within the hour
            minute = random.randint(0, 59)
            second = random.randint(0, 59)
            order_ts = order_day.replace(hour=hour, minute=minute, second=second)

            # Clamp: cannot be in the future
            if order_ts > NOW:
                order_ts = NOW - timedelta(minutes=random.randint(1, 30))

            # How many hours ago is this order?
            hours_ago = (NOW - order_ts).total_seconds() / 3600

            # Status based on age
            status = _determine_status(hours_ago)

            # Merchant
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
            items = build_order_items(category)
            delivery_fee = round(random.uniform(3.0, 8.0), 2)
            total = round(item_total(items) + delivery_fee, 2)
            distance = round(random.uniform(0.5, 15.0), 2)

            # Rider assignment
            if status == "created":
                rider_id = None
            else:
                rider_id = random.randint(1, 50)

            # Secondary timestamps based on status
            accept_time = None
            delivery_time = None
            finish_time = None

            if status in ("accepted", "delivering", "delivered"):
                # Accept 5-30 minutes after creation
                accept_offset = random.randint(5, 30)
                accept_time = order_ts + timedelta(minutes=accept_offset)

            if status in ("delivering", "delivered"):
                # Delivery starts 10-45 minutes after accept
                deliver_offset = random.randint(10, 45)
                delivery_time = (accept_time or order_ts) + timedelta(minutes=deliver_offset)

            if status == "delivered":
                # Finish 5-40 minutes after delivery start
                finish_offset = random.randint(5, 40)
                finish_time = (delivery_time or order_ts) + timedelta(minutes=finish_offset)

            # Order number: DD + date + 6-digit sequence
            order_no = f"DD{order_ts.strftime('%Y%m%d')}{order_idx:06d}"

            rows.append((
                order_no,
                random.randint(1, 1000),     # user_id
                mid,                          # merchant_id
                rider_id,                     # rider_id
                json.dumps(items, ensure_ascii=False),
                total,
                delivery_fee,
                distance,
                status,
                city,
                district,
                order_ts,
                accept_time,
                delivery_time,
                finish_time,
            ))

    sql = (
        "INSERT INTO orders (order_no, user_id, merchant_id, rider_id, "
        "items, total_amount, delivery_fee, distance, status, city, district, "
        "create_time, accept_time, delivery_time, finish_time) "
        "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)"
    )
    cur.executemany(sql, rows)
    conn.commit()
    print(f"  -> Inserted {cur.rowcount} orders over 7 days")


def _determine_status(hours_ago):
    """Determine order status based on how many hours ago it was created."""
    r = random.random()

    if hours_ago < 1.0:
        # Very recent: mostly created/accepted
        if r < 0.55:
            return "created"
        elif r < 0.85:
            return "accepted"
        elif r < 0.97:
            return "delivering"
        else:
            return "cancelled"
    elif hours_ago < 3.0:
        # 1-3 hours ago
        if r < 0.15:
            return "created"
        elif r < 0.50:
            return "accepted"
        elif r < 0.75:
            return "delivering"
        elif r < 0.90:
            return "delivered"
        else:
            return "cancelled"
    elif hours_ago < 6.0:
        # 3-6 hours ago
        if r < 0.03:
            return "created"
        elif r < 0.15:
            return "accepted"
        elif r < 0.30:
            return "delivering"
        elif r < 0.93:
            return "delivered"
        else:
            return "cancelled"
    else:
        # 6+ hours ago: mostly delivered
        if r < 0.92:
            return "delivered"
        elif r < 0.98:
            return "delivering"
        else:
            return "cancelled"


# ============================================================
# Step 6: Populate dashboard_summary
# ============================================================

def populate_dashboard_summary(cur, conn):
    """Compute all aggregates from orders and upsert dashboard_summary (id=1)."""
    print("[6/8] Computing dashboard_summary...")

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

    # Avg delivery time for delivered orders (finish_time - create_time)
    cur.execute(
        "SELECT AVG(TIMESTAMPDIFF(MINUTE, create_time, finish_time)) "
        "FROM orders WHERE status = 'delivered' AND finish_time IS NOT NULL"
    )
    avg_del = cur.fetchone()[0]
    avg_delivery_time = round(float(avg_del), 2) if avg_del else round(random.uniform(20, 35), 2)

    # Rider stats from riders table
    cur.execute("SELECT COUNT(*) FROM riders WHERE status = 'online'")
    rider_online = cur.fetchone()[0]

    cur.execute("SELECT COUNT(*) FROM riders WHERE status = 'delivering'")
    rider_delivering = cur.fetchone()[0]

    cur.execute(
        "REPLACE INTO dashboard_summary "
        "(id, gmv, order_count, avg_order_amount, rider_online, rider_delivering, "
        "avg_delivery_time, cancel_rate, update_time) "
        "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,NOW())",
        (1, gmv, order_count, avg_order_amount, rider_online,
         rider_delivering, avg_delivery_time, cancel_rate),
    )
    conn.commit()
    print(f"  -> GMV={gmv:.2f}, orders={order_count}, avg={avg_order_amount:.2f}")
    print(f"  -> riders_online={rider_online}, delivering={rider_delivering}")
    print(f"  -> avg_delivery={avg_delivery_time}min, cancel_rate={cancel_rate}%")


# ============================================================
# Step 7: Populate dashboard_region (20 rows)
# ============================================================

def populate_dashboard_region(cur, conn):
    """Compute city x district aggregates and guarantee all 20 combos."""
    print("[7/8] Computing dashboard_region...")

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
                "ON DUPLICATE KEY UPDATE order_count=VALUES(order_count), gmv=VALUES(gmv), update_time=NOW()",
                (city, district, cnt, gmv),
            )
            inserted += 1

    conn.commit()
    print(f"  -> Upserted {inserted} region rows (5 cities x 4 districts)")


# ============================================================
# Step 8: Populate dashboard_merchant_rank (15 rows)
# ============================================================

def populate_dashboard_merchant_rank(cur, conn):
    """Compute per-merchant aggregates from orders joined with merchants."""
    print("[8/8] Computing dashboard_merchant_rank...")

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
            "ON DUPLICATE KEY UPDATE category=VALUES(category), order_count=VALUES(order_count), "
            "gmv=VALUES(gmv), update_time=NOW()",
            (name, category, cnt, float(gmv)),
        )

    conn.commit()
    print(f"  -> Upserted {len(rows)} merchant rank rows")


# ============================================================
# Step 9: Populate dashboard_hourly (168 slots = 7 days x 24 hours)
# ============================================================

def populate_dashboard_hourly(cur, conn):
    """Generate 168 time slots (7 days x 24 hours) with real order aggregation."""
    print("[9/8] Computing dashboard_hourly (168 slots)...")

    NOW = datetime.now().replace(minute=0, second=0, microsecond=0)
    inserted = 0

    for day_offset in range(7, 0, -1):  # oldest first
        day_start = NOW - timedelta(days=day_offset)
        for hour in range(24):
            slot_start = day_start.replace(hour=hour)
            slot_end = slot_start + timedelta(hours=1)

            cur.execute(
                "SELECT COUNT(*), COALESCE(SUM(total_amount),0) "
                "FROM orders "
                "WHERE create_time >= %s AND create_time < %s",
                (slot_start.strftime("%Y-%m-%d %H:%M:%S"),
                 slot_end.strftime("%Y-%m-%d %H:%M:%S")),
            )
            cnt, gmv = cur.fetchone()

            # Average delivery time for orders in this slot
            if cnt > 0:
                cur.execute(
                    "SELECT AVG(TIMESTAMPDIFF(MINUTE, create_time, finish_time)) "
                    "FROM orders "
                    "WHERE create_time >= %s AND create_time < %s "
                    "AND status = 'delivered' AND finish_time IS NOT NULL",
                    (slot_start.strftime("%Y-%m-%d %H:%M:%S"),
                     slot_end.strftime("%Y-%m-%d %H:%M:%S")),
                )
                avg_del = cur.fetchone()[0]
                avg_del = round(float(avg_del), 2) if avg_del else round(random.uniform(15, 45), 2)
            else:
                avg_del = 0.0

            cur.execute(
                "INSERT INTO dashboard_hourly (time_slot, order_count, gmv, avg_delivery_time) "
                "VALUES (%s,%s,%s,%s)",
                (slot_start.strftime("%Y-%m-%d %H:%M:%S"), cnt, float(gmv), avg_del),
            )
            inserted += 1

    conn.commit()
    print(f"  -> Inserted {inserted} hourly rows (7 days x 24 hours)")


# ============================================================
# Verify
# ============================================================

def verify(cur):
    """Print summary counts for every table and key metrics."""
    print("\n" + "=" * 60)
    print("VERIFICATION")
    print("=" * 60)

    tables = [
        "users", "merchants", "menu_items", "riders",
        "orders", "dashboard_summary", "dashboard_region",
        "dashboard_merchant_rank", "dashboard_hourly",
    ]
    for t in tables:
        cur.execute(f"SELECT COUNT(*) FROM {t}")
        cnt = cur.fetchone()[0]
        print(f"  {t:30s} {cnt:>6d} rows")

    # Order status distribution
    cur.execute(
        "SELECT status, COUNT(*) FROM orders "
        "GROUP BY status ORDER BY FIELD(status,'created','accepted','delivering','delivered','cancelled')"
    )
    print("\n  Order status distribution:")
    total_orders = 0
    for status, cnt in cur.fetchall():
        total_orders += cnt
    cur.execute("SELECT COUNT(*) FROM orders")
    total_orders = cur.fetchone()[0]

    cur.execute(
        "SELECT status, COUNT(*) FROM orders "
        "GROUP BY status ORDER BY FIELD(status,'created','accepted','delivering','delivered','cancelled')"
    )
    for status, cnt in cur.fetchall():
        pct = cnt / total_orders * 100 if total_orders > 0 else 0
        print(f"    {status:12s} {cnt:>4d} ({pct:.1f}%)")

    # GMV breakout
    cur.execute(
        "SELECT gmv, order_count, avg_order_amount, rider_online, rider_delivering, "
        "avg_delivery_time, cancel_rate FROM dashboard_summary WHERE id=1"
    )
    row = cur.fetchone()
    if row:
        print(f"\n  dashboard_summary:")
        print(f"    GMV={float(row[0]):.2f}, orders={row[1]}, avg={float(row[2]):.2f}")
        print(f"    riders_online={row[3]}, delivering={row[4]}, "
              f"avg_del={float(row[5])}min, cancel_rate={float(row[6])}%")

    # Top 5 merchants
    cur.execute(
        "SELECT merchant_name, order_count, gmv FROM dashboard_merchant_rank ORDER BY gmv DESC LIMIT 5"
    )
    print("\n  Top 5 merchants:")
    for name, cnt, gmv in cur.fetchall():
        print(f"    {name:16s} {cnt:>4d} orders  GMV={float(gmv):.2f}")

    # Top 5 regions
    cur.execute(
        "SELECT city, district, order_count, gmv FROM dashboard_region ORDER BY gmv DESC LIMIT 5"
    )
    print("\n  Top 5 regions:")
    for city, district, cnt, gmv in cur.fetchall():
        print(f"    {city} {district:8s} {cnt:>4d} orders  GMV={float(gmv):.2f}")

    # Hourly peaks (top 10 hours by order count)
    cur.execute(
        "SELECT time_slot, order_count, gmv FROM dashboard_hourly "
        "WHERE order_count > 0 ORDER BY order_count DESC LIMIT 10"
    )
    print("\n  Top 10 busiest hours:")
    for ts, cnt, gmv in cur.fetchall():
        print(f"    {ts}  {cnt:>3d} orders  GMV={float(gmv):.2f}")

    # Date range of orders
    cur.execute("SELECT MIN(create_time), MAX(create_time) FROM orders")
    min_dt, max_dt = cur.fetchone()
    print(f"\n  Order date range: {min_dt}  ->  {max_dt}")

    # User password check
    cur.execute("SELECT username, LENGTH(password) FROM users LIMIT 3")
    print("\n  Sample users (password hash length):")
    for uname, pwlen in cur.fetchall():
        print(f"    {uname}: password hash length={pwlen}")

    print("\nDone.")


# ============================================================
# Main
# ============================================================

def main():
    conn = pymysql.connect(**MYSQL_CFG)
    try:
        cur = conn.cursor()

        clean_all(cur)
        seed_users(cur, conn)
        seed_merchants(cur, conn)
        seed_menu_items(cur, conn)
        seed_riders(cur, conn)
        generate_orders(cur, conn)
        populate_dashboard_summary(cur, conn)
        populate_dashboard_hourly(cur, conn)
        populate_dashboard_region(cur, conn)
        populate_dashboard_merchant_rank(cur, conn)
        verify(cur)

        conn.commit()
    finally:
        conn.close()


if __name__ == "__main__":
    main()
