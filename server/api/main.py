"""Delivery Dashboard API — consolidated FastAPI application.

Includes all routers: auth, dashboard, and CRUD for every entity.
POC endpoints (/api/summary, /api/health) are preserved for backwards compatibility.
"""

from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
import pymysql

from .config import MYSQL_CFG

from .auth import router as auth_router
from .dashboard import router as dashboard_router
from .crud_users import router as users_router
from .crud_merchants import router as merchants_router
from .crud_riders import router as riders_router
from .crud_menu import router as menu_router
from .crud_orders import router as orders_router
from .websocket import router as ws_router
from .health import router as health_router

app = FastAPI(title="Delivery Dashboard API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Include all module routers (prefixed with /api) ───────────────────────────
app.include_router(auth_router, prefix="/api")
app.include_router(dashboard_router, prefix="/api")
app.include_router(users_router, prefix="/api")
app.include_router(merchants_router, prefix="/api")
app.include_router(riders_router, prefix="/api")
app.include_router(menu_router, prefix="/api")
app.include_router(orders_router, prefix="/api")
app.include_router(health_router, prefix="/api")
app.include_router(ws_router)  # WebSocket has its own path, no prefix needed


# ── POC backward-compat endpoints ─────────────────────────────────────────────

@app.get("/api/summary")
def summary(response: Response):
    """Return dashboard_summary single row (POC compat)."""
    response.headers["Cache-Control"] = "no-cache"
    conn = pymysql.connect(**MYSQL_CFG)
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT gmv, order_count, avg_order_amount, update_time "
                "FROM dashboard_summary WHERE id = 1"
            )
            row = cur.fetchone()
    finally:
        conn.close()

    if row is None:
        return {
            "gmv": 0,
            "order_count": 0,
            "avg_order_amount": 0,
            "update_time": None,
        }

    return {
        "gmv": float(row[0]),
        "order_count": int(row[1]),
        "avg_order_amount": float(row[2]),
        "update_time": str(row[3]),
    }
