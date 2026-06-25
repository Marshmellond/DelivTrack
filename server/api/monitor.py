"""System monitoring endpoints — pipeline status and aggregate stats.

Provides real-time visibility into the data pipeline components
(Kafka, MySQL) and key business metrics.
"""

from fastapi import APIRouter, Response

from .config import KAFKA_BOOTSTRAP
from .database import get_connection

router = APIRouter(prefix="/monitor", tags=["monitor"])

_CACHE_HEADER = {"Cache-Control": "no-cache"}


def _get_kafka_msg_rate() -> float:
    """Attempt to read Kafka consumer offset. Returns 0.0 if unavailable."""
    try:
        from kafka import KafkaConsumer, TopicPartition

        consumer = KafkaConsumer(
            bootstrap_servers=KAFKA_BOOTSTRAP,
            request_timeout_ms=3000,
            api_version_auto_timeout_ms=3000,
        )
        # Try to get offsets for the delivery_orders topic
        topic = "delivery_orders"
        partitions = consumer.partitions_for_topic(topic)
        if not partitions:
            consumer.close()
            return 0.0

        total_offset = 0
        for p in partitions:
            tp = TopicPartition(topic, p)
            consumer.assign([tp])
            end_offset = consumer.end_offsets([tp]).get(tp, 0)
            total_offset += end_offset

        consumer.close()
        # Return the latest offset as a proxy for total messages
        return float(total_offset)
    except Exception:
        return 0.0


def _get_flink_status() -> str:
    """Check if a Flink job manager is reachable.
    Returns 'running', 'stopped', or 'unknown'.
    """
    try:
        import urllib.request
        import json

        # Try common Flink REST API endpoint
        req = urllib.request.Request(
            "http://localhost:8081/jobs/overview",
            headers={"Accept": "application/json"},
        )
        with urllib.request.urlopen(req, timeout=2) as resp:
            data = json.loads(resp.read())
            jobs = data.get("jobs", [])
            if not jobs:
                return "no_jobs"
            running = [j for j in jobs if j.get("state") == "RUNNING"]
            if running:
                return "running"
            return "stopped"
    except Exception:
        return "unknown"


def _get_mysql_conns() -> int:
    """Return current MySQL connection count."""
    try:
        conn = get_connection()
        with conn.cursor() as cur:
            cur.execute("SHOW STATUS LIKE 'Threads_connected'")
            row = cur.fetchone()
        conn.close()
        if row:
            return int(row[1])
        return 0
    except Exception:
        return 0


def _get_data_lag_seconds() -> float:
    """Compute data lag as seconds since the most recent order."""
    try:
        conn = get_connection()
        with conn.cursor() as cur:
            cur.execute(
                "SELECT TIMESTAMPDIFF(SECOND, MAX(create_time), NOW()) "
                "FROM orders"
            )
            row = cur.fetchone()
        conn.close()
        if row and row[0] is not None:
            return float(row[0])
        return 0.0
    except Exception:
        return -1.0


@router.get("/pipeline")
def pipeline_status(response: Response):
    """Return pipeline health metrics.

    - kafka_msgs_per_sec: latest Kafka consumer offset total
    - flink_job_status: Flink REST API status or 'unknown'
    - mysql_conns: active MySQL connections (Threads_connected)
    - data_lag_seconds: time since most recent order insertion
    """
    response.headers.update(_CACHE_HEADER)

    return {
        "kafka_msgs_per_sec": _get_kafka_msg_rate(),
        "flink_job_status": _get_flink_status(),
        "mysql_conns": _get_mysql_conns(),
        "data_lag_seconds": _get_data_lag_seconds(),
    }


@router.get("/stats")
def system_stats(response: Response):
    """Return aggregate business metrics from live DB queries.

    - total_orders: COUNT(*) from orders
    - total_gmv: SUM(total_amount) from orders
    - active_riders: COUNT(*) from riders WHERE status='online'
    - active_merchants: COUNT(*) from merchants WHERE status='active'
    - users_count: COUNT(*) from users
    """
    response.headers.update(_CACHE_HEADER)

    conn = get_connection()
    try:
        with conn.cursor() as cur:
            # total_orders and total_gmv
            cur.execute(
                "SELECT COUNT(*), COALESCE(SUM(total_amount), 0) FROM orders"
            )
            total_orders, total_gmv = cur.fetchone()

            # active riders (online + delivering)
            cur.execute(
                "SELECT COUNT(*) FROM riders WHERE status IN ('online', 'delivering')"
            )
            active_riders = cur.fetchone()[0]

            # active merchants
            cur.execute(
                "SELECT COUNT(*) FROM merchants WHERE status = 'active'"
            )
            active_merchants = cur.fetchone()[0]

            # users count
            cur.execute("SELECT COUNT(*) FROM users")
            users_count = cur.fetchone()[0]

            # Additional useful metrics
            cur.execute(
                "SELECT COUNT(*) FROM orders WHERE status = 'cancelled'"
            )
            cancelled_orders = cur.fetchone()[0]

            cur.execute(
                "SELECT AVG(TIMESTAMPDIFF(MINUTE, create_time, finish_time)) "
                "FROM orders WHERE status = 'delivered' AND finish_time IS NOT NULL"
            )
            avg_del = cur.fetchone()[0]
    finally:
        conn.close()

    return {
        "total_orders": int(total_orders),
        "total_gmv": float(total_gmv),
        "active_riders": int(active_riders),
        "active_merchants": int(active_merchants),
        "users_count": int(users_count),
        "cancelled_orders": int(cancelled_orders),
        "avg_delivery_time_min": round(float(avg_del), 2) if avg_del else 0.0,
        "cancel_rate_pct": round(
            int(cancelled_orders) / int(total_orders) * 100, 2
        ) if int(total_orders) > 0 else 0.0,
    }
