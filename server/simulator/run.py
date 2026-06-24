"""POC 模拟器入口 — 往 Kafka 写订单"""

import json
import time
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from kafka import KafkaProducer
from simulator.config import KAFKA_BOOTSTRAP, KAFKA_TOPIC, INTERVAL, BATCH_SIZE
from simulator.generator import generate_batch


def main():
    producer = KafkaProducer(
        bootstrap_servers=KAFKA_BOOTSTRAP,
        value_serializer=lambda v: json.dumps(v, ensure_ascii=False).encode("utf-8"),
        acks="all",
        retries=3,
    )

    print(f"POC 模拟器启动 → Kafka: {KAFKA_BOOTSTRAP}, Topic: {KAFKA_TOPIC}")
    print(f"频率: {INTERVAL}s × {BATCH_SIZE} = {int(BATCH_SIZE / INTERVAL)} 条/秒")
    print("按 Ctrl+C 停止\n")

    count = 0
    try:
        while True:
            orders = generate_batch(BATCH_SIZE)
            for order in orders:
                producer.send(KAFKA_TOPIC, value=order)
            count += len(orders)
            print(f"\r已发送: {count} 条", end="", flush=True)
            time.sleep(INTERVAL)
    except KeyboardInterrupt:
        print(f"\n\n停止。共发送 {count} 条")
    finally:
        producer.flush()
        producer.close()


if __name__ == "__main__":
    main()
