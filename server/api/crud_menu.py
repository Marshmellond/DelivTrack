"""CRUD for menu items — JWT + admin required, with merchant filter."""

from fastapi import APIRouter, Depends, HTTPException, Query, status

from .auth import admin_required
from .database import get_connection
from .models import MenuItemCreate, MenuItemResponse, MenuItemUpdate

router = APIRouter(prefix="/menu", tags=["menu"])


def _row_to_item(row) -> dict:
    return {
        "id": row[0], "merchant_id": row[1], "name": row[2],
        "price": float(row[3]) if row[3] else 0,
        "category": row[4],
        "stock": row[5] if len(row) > 5 else 0,
        "status": row[6] if len(row) > 6 else "on_sale",
        "create_time": str(row[7]) if len(row) > 7 else None,
    }


@router.get("")
def list_menu_items(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=1000),
    merchant_id: int = Query(None),
    name: str = Query(None),
    _admin: dict = Depends(admin_required),
):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            where_clauses = []
            params = []

            if merchant_id is not None:
                where_clauses.append("merchant_id = %s")
                params.append(merchant_id)
            if name:
                where_clauses.append("name LIKE %s")
                params.append(f"%{name}%")

            where_sql = (" WHERE " + " AND ".join(where_clauses)) if where_clauses else ""

            cur.execute(f"SELECT COUNT(*) FROM menu_items{where_sql}", params)
            total = cur.fetchone()[0]

            offset = (page - 1) * page_size
            cur.execute(
                f"SELECT id, merchant_id, name, price, category, stock, status, create_time FROM menu_items{where_sql} "
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
        "items": [_row_to_item(r) for r in rows],
    }


@router.get("/{item_id}", response_model=MenuItemResponse)
def get_menu_item(item_id: int, _admin: dict = Depends(admin_required)):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT id, merchant_id, name, price, category, stock, status, create_time FROM menu_items WHERE id = %s", (item_id,))
            row = cur.fetchone()
    finally:
        conn.close()

    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Menu item not found")
    return _row_to_item(row)


@router.post("", response_model=MenuItemResponse, status_code=status.HTTP_201_CREATED)
def create_menu_item(body: MenuItemCreate, _admin: dict = Depends(admin_required)):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO menu_items (merchant_id, name, price, category) VALUES (%s, %s, %s, %s)",
                (body.merchant_id, body.name, body.price, body.category),
            )
            conn.commit()
            iid = cur.lastrowid
    finally:
        conn.close()

    return MenuItemResponse(id=iid, merchant_id=body.merchant_id, name=body.name, price=body.price, category=body.category)


@router.put("/{item_id}", response_model=MenuItemResponse)
def update_menu_item(item_id: int, body: MenuItemUpdate, _admin: dict = Depends(admin_required)):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT id, merchant_id, name, price, category, stock, status, create_time FROM menu_items WHERE id = %s", (item_id,))
            if not cur.fetchone():
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Menu item not found")

            set_parts = []
            params = []
            if body.merchant_id is not None:
                set_parts.append("merchant_id = %s")
                params.append(body.merchant_id)
            if body.name is not None:
                set_parts.append("name = %s")
                params.append(body.name)
            if body.price is not None:
                set_parts.append("price = %s")
                params.append(body.price)
            if body.category is not None:
                set_parts.append("category = %s")
                params.append(body.category)

            if set_parts:
                params.append(item_id)
                cur.execute(f"UPDATE menu_items SET {', '.join(set_parts)} WHERE id = %s", params)
                conn.commit()

            cur.execute("SELECT id, merchant_id, name, price, category, stock, status, create_time FROM menu_items WHERE id = %s", (item_id,))
            row = cur.fetchone()
    finally:
        conn.close()

    return _row_to_item(row)


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_menu_item(item_id: int, _admin: dict = Depends(admin_required)):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM menu_items WHERE id = %s", (item_id,))
            if not cur.fetchone():
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Menu item not found")

            cur.execute("DELETE FROM menu_items WHERE id = %s", (item_id,))
            conn.commit()
    finally:
        conn.close()

    return None
