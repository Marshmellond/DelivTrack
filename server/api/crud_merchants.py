"""CRUD for merchants — JWT + admin required."""

from fastapi import APIRouter, Depends, HTTPException, Query, status

from .auth import admin_required, get_current_user
from .database import get_connection
from .models import MerchantCreate, MerchantResponse, MerchantUpdate

router = APIRouter(prefix="/merchants", tags=["merchants"])


def _row_to_merchant(row) -> dict:
    return {
        "id": row[0], "name": row[1], "category": row[2],
        "city": row[3] if len(row) > 3 else "",
        "address": row[4] if len(row) > 4 else "",
        "phone": row[5] if len(row) > 5 else "",
        "status": row[6] if len(row) > 6 else "active",
        "create_time": str(row[7]) if len(row) > 7 else None,
    }


@router.get("")
def list_merchants(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=1000),
    name: str = Query(None),
    search: str = Query(None, alias="search"),
    category: str = Query(None),
    current_user: dict = Depends(get_current_user),
):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            where_clauses = []
            params = []

            if search or name:
                where_clauses.append("name LIKE %s")
                params.append(f"%{search or name}%")
            if category:
                where_clauses.append("category = %s")
                params.append(category)

            where_sql = (" WHERE " + " AND ".join(where_clauses)) if where_clauses else ""

            cur.execute(f"SELECT COUNT(*) FROM merchants{where_sql}", params)
            total = cur.fetchone()[0]

            offset = (page - 1) * page_size
            cur.execute(
                f"SELECT id, name, category, city, address, phone, status, create_time FROM merchants{where_sql} "
                "ORDER BY id DESC LIMIT %s OFFSET %s",
                params + [page_size, offset],
            )
            rows = cur.fetchall()
    finally:
        conn.close()

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": [_row_to_merchant(r) for r in rows],
    }


@router.get("/{merchant_id}", response_model=MerchantResponse)
def get_merchant(merchant_id: int, _admin: dict = Depends(admin_required)):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT id, name, category, city, address, phone, status, create_time FROM merchants WHERE id = %s", (merchant_id,))
            row = cur.fetchone()
    finally:
        conn.close()

    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Merchant not found")
    return _row_to_merchant(row)


@router.post("", response_model=MerchantResponse, status_code=status.HTTP_201_CREATED)
def create_merchant(body: MerchantCreate, _admin: dict = Depends(admin_required)):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO merchants (name, category, city, address, phone, status) VALUES (%s, %s, %s, %s, %s, 'active')",
                (body.name, body.category, getattr(body, "city", ""), getattr(body, "address", ""), getattr(body, "phone", "")),
            )
            conn.commit()
            mid = cur.lastrowid
    finally:
        conn.close()

    return MerchantResponse(id=mid, name=body.name, category=body.category, city=body.city)


@router.put("/{merchant_id}", response_model=MerchantResponse)
def update_merchant(merchant_id: int, body: MerchantUpdate, _admin: dict = Depends(admin_required)):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT id, name, category, city, address, phone, status, create_time FROM merchants WHERE id = %s", (merchant_id,))
            if not cur.fetchone():
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Merchant not found")

            set_parts = []
            params = []
            if body.name is not None:
                set_parts.append("name = %s")
                params.append(body.name)
            if body.category is not None:
                set_parts.append("category = %s")
                params.append(body.category)
            if getattr(body, 'address', None) is not None:
                set_parts.append("address = %s")
                params.append(getattr(body, 'address', None))
            if getattr(body, 'phone', None) is not None:
                set_parts.append("phone = %s")
                params.append(getattr(body, 'phone', None))

            if set_parts:
                params.append(merchant_id)
                cur.execute(f"UPDATE merchants SET {', '.join(set_parts)} WHERE id = %s", params)
                conn.commit()

            cur.execute("SELECT id, name, category, city, address, phone, status, create_time FROM merchants WHERE id = %s", (merchant_id,))
            row = cur.fetchone()
    finally:
        conn.close()

    return _row_to_merchant(row)


@router.delete("/{merchant_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_merchant(merchant_id: int, _admin: dict = Depends(admin_required)):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM merchants WHERE id = %s", (merchant_id,))
            if not cur.fetchone():
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Merchant not found")

            cur.execute("DELETE FROM merchants WHERE id = %s", (merchant_id,))
            conn.commit()
    finally:
        conn.close()

    return None
