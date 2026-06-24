"""Dashboard read-only endpoints (no auth required)."""

from fastapi import APIRouter, Response

from .database import get_connection

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

# Reusable Cache-Control header for real-time endpoints
_CACHE_HEADER = {"Cache-Control": "no-cache"}


@router.get("/summary")
def summary(response: Response):
    """Return the single dashboard_summary row (id=1)."""
    response.headers.update(_CACHE_HEADER)
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT gmv, order_count, avg_order_amount, update_time, "
                "rider_online, rider_delivering, avg_delivery_time, cancel_rate "
                "FROM dashboard_summary WHERE id = 1"
            )
            row = cur.fetchone()
    finally:
        conn.close()

    if row is None:
        return {"gmv": 0, "order_count": 0, "avg_order_amount": 0, "update_time": None,
                "total_orders": 0, "total_gmv": 0, "rider_online_rate": 0, "avg_delivery_time": 0}

    gmv = float(row[0])
    orders = int(row[1])
    avg = float(row[2]) if row[2] else 0
    rider_online = int(row[4]) if row[4] else 0
    rider_delivering = int(row[5]) if row[5] else 0
    avg_delivery_time = float(row[6]) if row[6] else 0
    cancel_rate = float(row[7]) if row[7] else 0

    # rider_online_rate: online riders as fraction of total (assume 50 total)
    rider_online_rate = round(rider_online / 50, 2) if rider_online else 0

    return {
        "gmv": gmv, "order_count": orders, "avg_order_amount": avg, "update_time": str(row[3]),
        "total_orders": orders, "total_gmv": gmv,
        "rider_online_rate": rider_online_rate,
        "avg_delivery_time": avg_delivery_time,
        "rider_online": rider_online,
        "rider_delivering": rider_delivering,
        "cancel_rate": cancel_rate,
    }


@router.get("/regions")
def regions(response: Response):
    """Return all dashboard_region rows ordered by order_count descending."""
    response.headers.update(_CACHE_HEADER)
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM dashboard_region ORDER BY order_count DESC")
            rows = cur.fetchall()
    finally:
        conn.close()

    return [
        {
            "id": r[0],
            "city": r[1],
            "district": r[2],
            "order_count": r[3],
            "gmv": float(r[4]) if r[4] else 0,
            "avg_order_amount": float(r[4]) / r[3] if r[3] and r[4] else 0,
        }
        for r in rows
    ]


@router.get("/merchant-rank")
def merchant_rank(response: Response):
    """Top 15 merchants by GMV."""
    response.headers.update(_CACHE_HEADER)
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, merchant_name, order_count, gmv "
                "FROM dashboard_merchant_rank ORDER BY gmv DESC LIMIT 15"
            )
            rows = cur.fetchall()
    finally:
        conn.close()

    return [
        {
            "id": r[0],
            "name": r[1],
            "order_count": r[2],
            "gmv": float(r[3]) if r[3] else 0,
        }
        for r in rows
    ]


@router.get("/trend")
def trend(response: Response):
    """Hourly trend for the last hour."""
    response.headers.update(_CACHE_HEADER)
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT * FROM dashboard_hourly "
                "WHERE time_slot >= NOW() - INTERVAL 1 HOUR "
                "ORDER BY time_slot"
            )
            rows = cur.fetchall()
    finally:
        conn.close()

    return [
        {
            "id": r[0],
            "time_slot": str(r[1]),
            "order_count": r[2],
            "gmv": float(r[3]) if r[3] else 0,
        }
        for r in rows
    ]


@router.get("/recent-orders")
def recent_orders(response: Response):
    """Latest 20 orders."""
    response.headers.update(_CACHE_HEADER)
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM orders ORDER BY create_time DESC LIMIT 20")
            rows = cur.fetchall()
    finally:
        conn.close()

    return [
        {
            "id": r[0],
            "order_no": r[1],
            "user_id": r[2],
            "merchant_id": r[3],
            "rider_id": r[4],
            "items": r[5],
            "total_amount": float(r[6]) if r[6] else 0,
            "delivery_fee": float(r[7]) if r[7] else 0,
            "distance": float(r[8]) if r[8] else 0,
            "status": r[9],
            "city": r[10],
            "district": r[11],
            "create_time": str(r[12]) if r[12] else None,
        }
        for r in rows
    ]


@router.get("/status-distribution")
def status_distribution(response: Response):
    """Count orders grouped by status from the latest 1000 rows."""
    response.headers.update(_CACHE_HEADER)
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT status, COUNT(*) AS cnt "
                "FROM (SELECT status FROM orders ORDER BY create_time DESC LIMIT 1000) t "
                "GROUP BY status ORDER BY cnt DESC"
            )
            rows = cur.fetchall()
    finally:
        conn.close()

    return [
        {"status": r[0], "count": int(r[1])}
        for r in rows
    ]
