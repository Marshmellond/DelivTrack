"""CRUD for riders — JWT + admin required, plus status toggle."""

from fastapi import APIRouter, Depends, HTTPException, Query, status

from .auth import admin_required, get_current_user
from .database import get_connection
from .models import RiderCreate, RiderResponse, RiderUpdate

router = APIRouter(prefix="/riders", tags=["riders"])


def _row_to_rider(row) -> dict:
    return {
        "id": row[0], "name": row[1], "phone": row[2],
        "city": row[3], "status": row[4],
        "vehicle": row[5] if len(row) > 5 else "",
        "create_time": str(row[6]) if len(row) > 6 else None,
    }


@router.get("")
def list_riders(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    name: str = Query(None),
    search: str = Query(None, alias="search"),
    status_filter: str = Query(None, alias="status"),
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
            if status_filter:
                where_clauses.append("status = %s")
                params.append(status_filter)

            where_sql = (" WHERE " + " AND ".join(where_clauses)) if where_clauses else ""

            cur.execute(f"SELECT COUNT(*) FROM riders{where_sql}", params)
            total = cur.fetchone()[0]

            offset = (page - 1) * page_size
            cur.execute(
                f"SELECT id, name, phone, city, status, vehicle, create_time FROM riders{where_sql} "
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
        "items": [_row_to_rider(r) for r in rows],
    }


@router.get("/{rider_id}", response_model=RiderResponse)
def get_rider(rider_id: int, _admin: dict = Depends(admin_required)):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT id, name, phone, city, status, vehicle, create_time FROM riders WHERE id = %s", (rider_id,))
            row = cur.fetchone()
    finally:
        conn.close()

    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rider not found")
    return _row_to_rider(row)


@router.post("", response_model=RiderResponse, status_code=status.HTTP_201_CREATED)
def create_rider(body: RiderCreate, _admin: dict = Depends(admin_required)):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO riders (name, phone, city, status) VALUES (%s, %s, %s, %s)",
                (body.name, body.phone, body.city, body.status),
            )
            conn.commit()
            rid = cur.lastrowid
    finally:
        conn.close()

    return RiderResponse(id=rid, name=body.name, phone=body.phone, city=body.city, status=body.status)


@router.put("/{rider_id}", response_model=RiderResponse)
def update_rider(rider_id: int, body: RiderUpdate, _admin: dict = Depends(admin_required)):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT id, name, phone, city, status, vehicle, create_time FROM riders WHERE id = %s", (rider_id,))
            if not cur.fetchone():
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rider not found")

            set_parts = []
            params = []
            if body.name is not None:
                set_parts.append("name = %s")
                params.append(body.name)
            if body.phone is not None:
                set_parts.append("phone = %s")
                params.append(body.phone)
            if body.city is not None:
                set_parts.append("city = %s")
                params.append(body.city)
            if body.status is not None:
                set_parts.append("status = %s")
                params.append(body.status)

            if set_parts:
                params.append(rider_id)
                cur.execute(f"UPDATE riders SET {', '.join(set_parts)} WHERE id = %s", params)
                conn.commit()

            cur.execute("SELECT id, name, phone, city, status, vehicle, create_time FROM riders WHERE id = %s", (rider_id,))
            row = cur.fetchone()
    finally:
        conn.close()

    return _row_to_rider(row)


@router.put("/{rider_id}/status", response_model=RiderResponse)
def toggle_rider_status(rider_id: int, _admin: dict = Depends(admin_required)):
    """Toggle rider status between online and offline."""
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT id, status FROM riders WHERE id = %s", (rider_id,))
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rider not found")

            new_status = "offline" if row[1] == "online" else "online"
            cur.execute("UPDATE riders SET status = %s WHERE id = %s", (new_status, rider_id))
            conn.commit()

            cur.execute("SELECT id, name, phone, city, status, vehicle, create_time FROM riders WHERE id = %s", (rider_id,))
            updated = cur.fetchone()
    finally:
        conn.close()

    return _row_to_rider(updated)


@router.delete("/{rider_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_rider(rider_id: int, _admin: dict = Depends(admin_required)):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM riders WHERE id = %s", (rider_id,))
            if not cur.fetchone():
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rider not found")

            cur.execute("DELETE FROM riders WHERE id = %s", (rider_id,))
            conn.commit()
    finally:
        conn.close()

    return None
