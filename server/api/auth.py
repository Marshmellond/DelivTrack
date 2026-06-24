"""JWT authentication — register, login, and dependency helpers."""

from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from .config import JWT_ALGORITHM, JWT_EXPIRES_HOURS, JWT_SECRET
from .database import get_connection
from .models import TokenResponse, UserCreate, UserLogin, UserResponse

router = APIRouter(prefix="/auth", tags=["auth"])

security = HTTPBearer()


# ── Helpers ───────────────────────────────────────────────────────────────────

def _hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def _verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())


def _create_token(username: str, role: str, user_id: int) -> str:
    payload = {
        "sub": username,
        "role": role,
        "user_id": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRES_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def _decode_token(token: str) -> dict:
    return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])


# ── Dependencies ──────────────────────────────────────────────────────────────

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """Decode JWT from Authorization header and return payload dict."""
    try:
        payload = _decode_token(credentials.credentials)
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")


def admin_required(
    current_user: dict = Depends(get_current_user),
) -> dict:
    """Require role == admin."""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin required")
    return current_user


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(body: UserCreate):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            # Check duplicate
            cur.execute("SELECT id FROM users WHERE username = %s", (body.username,))
            if cur.fetchone():
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username already exists")

            hashed = _hash_password(body.password)
            cur.execute(
                "INSERT INTO users (username, password, role) VALUES (%s, %s, %s)",
                (body.username, hashed, body.role),
            )
            conn.commit()
            user_id = cur.lastrowid
    finally:
        conn.close()

    token = _create_token(body.username, body.role, user_id)
    return TokenResponse(
        access_token=token,
        user=UserResponse(id=user_id, username=body.username, role=body.role),
    )


@router.post("/login", response_model=TokenResponse)
def login(body: UserLogin):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, username, password, role FROM users WHERE username = %s",
                (body.username,),
            )
            row = cur.fetchone()
    finally:
        conn.close()

    if not row:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password")
    if not _verify_password(body.password, row[2]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password")

    token = _create_token(row[1], row[3], row[0])
    return TokenResponse(
        access_token=token,
        user=UserResponse(id=row[0], username=row[1], role=row[3]),
    )
