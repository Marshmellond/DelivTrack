"""Health check endpoints — connectivity status for MySQL and Kafka."""

from fastapi import APIRouter

from .config import KAFKA_BOOTSTRAP
from .database import get_connection

router = APIRouter(prefix="/health", tags=["health"])


def _check_mysql() -> bool:
    """Return True if MySQL is reachable."""
    try:
        conn = get_connection()
        conn.ping()
        conn.close()
        return True
    except Exception:
        return False


def _check_kafka() -> bool:
    """Return True if at least one Kafka broker responds via TCP."""
    import socket
    for broker in KAFKA_BOOTSTRAP:
        host, port = broker.split(":")
        try:
            s = socket.create_connection((host, int(port)), timeout=3)
            s.close()
            return True
        except Exception:
            continue
    return False


@router.get("/full")
def health_full():
    """Full health check: MySQL and Kafka connectivity."""
    mysql_ok = _check_mysql()
    kafka_ok = _check_kafka()

    status = "ok" if mysql_ok and kafka_ok else "degraded"

    return {
        "status": status,
        "mysql": mysql_ok,
        "kafka": kafka_ok,
    }


@router.get("")
def health_lite():
    """Lightweight health check — just MySQL ping."""
    return {"status": "ok" if _check_mysql() else "error"}
