"""Read-only endpoints for orders — JWT required."""

from fastapi import APIRouter, Depends, HTTPException, Query, status

from .auth import get_current_user
from .database import get_connection

router = APIRouter(prefix="/orders", tags=["orders"])


def _row_to_order(row) -> dict:
    return {
        "id": row[0], "order_no": row[1], "user_id": row[2],
        "merchant_id": row[3], "rider_id": row[4],
        "items": row[5], "amount": float(row[6]) if row[6] else 0,
        "delivery_fee": float(row[7]) if row[7] else 0,
        "distance": float(row[8]) if row[8] else 0,
        "status": row[9], "city": row[10], "district": row[11],
        "create_time": str(row[12]) if row[12] else None,
        "merchant": row[13] if len(row) > 13 else "",
    }


@router.get("")
def list_orders(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=1000),
    status_filter: str = Query(None, alias="status"),
    city: str = Query(None),
    merchant_id: int = Query(None),
    current_user: dict = Depends(get_current_user),
):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            where_parts = []
            aliased_parts = []
            params = []

            if status_filter:
                where_parts.append("status = %s")
                aliased_parts.append("o.status = %s")
                params.append(status_filter)
            if city:
                where_parts.append("city = %s")
                aliased_parts.append("o.city = %s")
                params.append(city)
            if merchant_id is not None:
                where_parts.append("merchant_id = %s")
                aliased_parts.append("o.merchant_id = %s")
                params.append(merchant_id)

            where_sql = (" WHERE " + " AND ".join(where_parts)) if where_parts else ""
            aliased_where = (" WHERE " + " AND ".join(aliased_parts)) if aliased_parts else ""

            cur.execute(f"SELECT COUNT(*) FROM orders{where_sql}", params)
            total = cur.fetchone()[0]

            offset = (page - 1) * page_size
            cur.execute(
                "SELECT o.id, o.order_no, o.user_id, o.merchant_id, o.rider_id, "
                "o.items, o.total_amount, o.delivery_fee, o.distance, "
                "o.status, o.city, o.district, o.create_time, "
                "m.name AS merchant_name "
                "FROM orders o LEFT JOIN merchants m ON m.id = o.merchant_id"
                f"{aliased_where} "
                "ORDER BY o.create_time DESC LIMIT %s OFFSET %s",
                params + [page_size, offset],
            )
            rows = cur.fetchall()
    finally:
        conn.close()

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": [_row_to_order(r) for r in rows],
    }


@router.get("/{order_id}")
def get_order(order_id: int, current_user: dict = Depends(get_current_user)):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT o.id, o.order_no, o.user_id, o.merchant_id, o.rider_id, "
                "o.items, o.total_amount, o.delivery_fee, o.distance, "
                "o.status, o.city, o.district, o.create_time, "
                "m.name AS merchant_name "
                "FROM orders o LEFT JOIN merchants m ON m.id = o.merchant_id "
                "WHERE o.id = %s",
                (order_id,),
            )
            row = cur.fetchone()
    finally:
        conn.close()

    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    return _row_to_order(row)
