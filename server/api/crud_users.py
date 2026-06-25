"""CRUD for users — JWT required, delete requires admin."""

import bcrypt
from fastapi import APIRouter, Depends, HTTPException, Query, status

from .auth import admin_required, get_current_user
from .database import get_connection
from .models import UserCreate, UserResponse, UserUpdate

router = APIRouter(prefix="/users", tags=["users"])


def _row_to_user(row) -> dict:
    return {
        "id": row[0],
        "username": row[1],
        "role": row[3],
        "create_time": row[4],
    }


@router.get("")
def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=1000),
    username: str = Query(None),
    role: str = Query(None),
    current_user: dict = Depends(get_current_user),
):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            where_clauses = []
            params = []

            if username:
                where_clauses.append("username LIKE %s")
                params.append(f"%{username}%")
            if role:
                where_clauses.append("role = %s")
                params.append(role)

            where_sql = (" WHERE " + " AND ".join(where_clauses)) if where_clauses else ""

            # Count
            cur.execute(f"SELECT COUNT(*) FROM users{where_sql}", params)
            total = cur.fetchone()[0]

            # Data
            offset = (page - 1) * page_size
            cur.execute(
                f"SELECT id, username, password, role, create_time FROM users{where_sql} "
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
        "items": [_row_to_user(r) for r in rows],
    }


@router.get("/{user_id}", response_model=UserResponse)
def get_user(user_id: int, current_user: dict = Depends(get_current_user)):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT id, username, password, role, create_time FROM users WHERE id = %s", (user_id,))
            row = cur.fetchone()
    finally:
        conn.close()

    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return _row_to_user(row)


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(body: UserCreate, _admin: dict = Depends(admin_required)):
    hashed = bcrypt.hashpw(body.password.encode(), bcrypt.gensalt()).decode()

    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM users WHERE username = %s", (body.username,))
            if cur.fetchone():
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username already exists")

            cur.execute(
                "INSERT INTO users (username, password, role) VALUES (%s, %s, %s)",
                (body.username, hashed, body.role),
            )
            conn.commit()
            user_id = cur.lastrowid
    finally:
        conn.close()

    return UserResponse(id=user_id, username=body.username, role=body.role)


@router.put("/{user_id}", response_model=UserResponse)
def update_user(user_id: int, body: UserUpdate, current_user: dict = Depends(get_current_user)):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT id, username, password, role, create_time FROM users WHERE id = %s", (user_id,))
            existing = cur.fetchone()
            if not existing:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

            set_parts = []
            params = []

            if body.username is not None:
                # Check uniqueness if username changes
                if body.username != existing[1]:
                    cur.execute("SELECT id FROM users WHERE username = %s AND id != %s", (body.username, user_id))
                    if cur.fetchone():
                        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username already taken")
                set_parts.append("username = %s")
                params.append(body.username)
            if body.password is not None:
                hashed = bcrypt.hashpw(body.password.encode(), bcrypt.gensalt()).decode()
                set_parts.append("password = %s")
                params.append(hashed)
            if body.role is not None:
                set_parts.append("role = %s")
                params.append(body.role)

            if set_parts:
                params.append(user_id)
                cur.execute(f"UPDATE users SET {', '.join(set_parts)} WHERE id = %s", params)
                conn.commit()

            # Re-fetch
            cur.execute("SELECT id, username, password, role, create_time FROM users WHERE id = %s", (user_id,))
            row = cur.fetchone()
    finally:
        conn.close()

    return _row_to_user(row)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(user_id: int, _admin: dict = Depends(admin_required)):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM users WHERE id = %s", (user_id,))
            if not cur.fetchone():
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

            cur.execute("DELETE FROM users WHERE id = %s", (user_id,))
            conn.commit()
    finally:
        conn.close()

    return None
