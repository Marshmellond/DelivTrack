# Generator -- 外卖订单数据模拟器

Python 数据模拟器，从 MySQL 读取商户、骑手、用户、菜品基础数据，按现实场景随机生成订单，批量发送至 Kafka。

## 依赖

- Python >= 3.11
- [kafka-python](https://pypi.org/project/kafka-python/) -- Kafka Producer
- [pymysql](https://pypi.org/project/pymysql/) -- MySQL 连接

使用 uv 管理依赖：

```bash
cd generator
uv sync
```

## 模块说明

| 文件                        | 说明                                                       |
|-----------------------------|-----------------------------------------------------------|
| `simulator/config.py`       | Kafka / MySQL 连接参数，发送频率 `INTERVAL=50ms, BATCH=25` |
| `simulator/generator.py`    | 从 MySQL 加载活跃商家/骑手/用户/菜品，随机组合生成订单 JSON |
| `simulator/run.py`          | 入口脚本：预加载数据后无限循环发送到 Kafka                  |
| `simulator/seed_data.py`    | 基础数据种子脚本（极少使用，通常用 server/seed_full_data.py） |

## 运行

```bash
cd generator
uv run python simulator/run.py
```

启动后将输出：

```
模拟器启动 -> Kafka: ..., Topic: delivery-orders
频率: 0.05s x 25 = 500 条/秒
按 Ctrl+C 停止

已发送: 2500 条
```

控制逻辑：

- `INTERVAL=0.05` 秒（50ms）间隔，每批 `BATCH_SIZE=25` 条，理论吞吐 **500 条/秒**
- 无限循环，`Ctrl+C` 优雅退出并 flush 缓冲区

## 数据生成逻辑

- 从 MySQL 加载活跃商户和菜单，随机选择 1-3 个菜品，按菜品价格和随机数量计算总价
- 配送距离 0.5-5.0 km，配送费 3-8 元
- 订单状态按权重随机：created(10%) / accepted(20%) / delivering(30%) / delivered(40%)
- 城市/区域从商户地址解析
- 每条消息带有 `event_time` (epoch ms)，供 Flink 时间窗口使用

## 配置

编辑 `simulator/config.py` 修改连接参数：

```python
KAFKA_BOOTSTRAP = ["192.168.157.121:9092", "192.168.157.122:9092", "192.168.157.123:9092"]
KAFKA_TOPIC = "delivery-orders"
INTERVAL = 0.05      # 发送间隔(秒)
BATCH_SIZE = 25       # 每批数量
```
