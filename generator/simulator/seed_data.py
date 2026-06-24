"""生成基础数据种子 — 写入 MySQL delivery_dashboard 库"""
import pymysql
import random
import string

MYSQL_CFG = {
    "host": "192.168.157.122", "port": 3306,
    "user": "root", "password": "123456",
    "charset": "utf8mb4",
}

MERCHANTS = [
    ("老王盖浇饭", "中餐", "朝阳区建国路100号", "13800001001"),
    ("麦肯基炸鸡", "快餐", "海淀区中关村大街1号", "13800001002"),
    ("蜀味川菜馆", "中餐", "丰台区丽泽路20号", "13800001003"),
    ("日料一番", "日料", "浦东新区陆家嘴路100号", "13800001004"),
    ("披萨达人", "西餐", "徐汇区衡山路50号", "13800001005"),
    ("湘味小炒", "中餐", "静安区南京西路200号", "13800001006"),
    ("粤式茶餐厅", "中餐", "天河区体育西路30号", "13800001007"),
    ("烤肉大王", "韩餐", "南山区科技园路88号", "13800001008"),
    ("甜品屋", "甜品", "西湖区龙井路15号", "13800001009"),
    ("深夜烧烤", "小吃", "拱墅区莫干山路66号", "13800001010"),
    ("海鲜大排档", "中餐", "福田区华强北路12号", "13800001011"),
    ("兰州拉面馆", "快餐", "宝安区新安一路8号", "13800001012"),
    ("元气早餐店", "快餐", "滨江区江南大道33号", "13800001013"),
    ("精致寿司店", "日料", "番禺区市桥街55号", "13800001014"),
    ("重庆老火锅", "中餐", "闵行区七宝镇18号", "13800001015"),
]

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


def seed(conn):
    cur = conn.cursor()

    # ---- 清空旧数据 ----
    cur.execute("SET FOREIGN_KEY_CHECKS=0")
    for t in ["orders", "menu_items", "merchants", "riders", "users"]:
        cur.execute(f"TRUNCATE TABLE {t}")
    cur.execute("SET FOREIGN_KEY_CHECKS=1")

    # ---- users (1000 个) ----
    print("Inserting 1000 users...")
    for i in range(1, 1001):
        cur.execute(
            "INSERT INTO users (username, password, phone, address, role) VALUES (%s,%s,%s,%s,%s)",
            (f"user{i:04d}", "$2b$12$LJ3m4ys3u5s7G8x9ABCDEfGhIjKlMnOpQrStUvWxYz0123456789",
             f"138{random.randint(10000000,99999999)}",
             f"{random.choice(['北京市','上海市','广州市','深圳市','杭州市'])}"
             f"{random.choice(['朝阳区','海淀区','浦东新区','天河区','南山区'])}"
             f"{random.choice(['建国路','中山路','人民路','解放路','建设路'])}{random.randint(1,500)}号",
             "user"),
        )
    cur.execute("UPDATE users SET role='admin' WHERE id=1")  # admin 账号
    conn.commit()
    print(f"  Users: {cur.rowcount}")

    # ---- merchants (15 个) ----
    print("Inserting merchants...")
    merchant_ids = []
    for name, cat, addr, phone in MERCHANTS:
        cur.execute(
            "INSERT INTO merchants (name, category, address, phone, status) VALUES (%s,%s,%s,%s,'active')",
            (name, cat, addr, phone),
        )
        merchant_ids.append(cur.lastrowid)
    conn.commit()
    print(f"  Merchants: {len(merchant_ids)}")

    # ---- menu_items (每个商家 5~8 个菜) ----
    print("Inserting menu_items...")
    for mid, (name, cat, _, _) in zip(merchant_ids, MERCHANTS):
        items = MENU_ITEMS_BY_CATEGORY.get(cat, MENU_ITEMS_BY_CATEGORY["中餐"])
        chosen = random.sample(items, min(random.randint(5, 8), len(items)))
        for item_name, price in chosen:
            cur.execute(
                "INSERT INTO menu_items (merchant_id, name, price, stock, category, status) VALUES (%s,%s,%s,%s,%s,'on_sale')",
                (mid, item_name, price, random.randint(50, 200), cat),
            )
    conn.commit()
    cur.execute("SELECT COUNT(*) FROM menu_items")
    print(f"  Menu Items: {cur.fetchone()[0]}")

    # ---- riders (50 个) ----
    print("Inserting riders...")
    vehicles = ["电动车", "摩托车", "自行车"]
    for i in range(1, 51):
        cur.execute(
            "INSERT INTO riders (name, phone, vehicle, status) VALUES (%s,%s,%s,%s)",
            (f"骑手{i:03d}",
             f"139{random.randint(10000000,99999999)}",
             random.choice(vehicles),
             random.choice(["online", "online", "online", "delivering", "offline"])),
        )
    conn.commit()
    print(f"  Riders: 50")

    cur.close()
    print("\nSeed data done!")


if __name__ == "__main__":
    cfg = dict(MYSQL_CFG, database="delivery_dashboard")
    conn = pymysql.connect(**cfg)
    try:
        seed(conn)
    finally:
        conn.close()
