"""WebSocket endpoint for real-time dashboard push."""

import asyncio
import json

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from .database import get_connection

router = APIRouter(tags=["websocket"])

# Track connected clients
_connected: set[WebSocket] = set()
_broadcast_task: asyncio.Task | None = None


async def _query_dashboard_data() -> dict:
    """Query MySQL for dashboard summary and return as dict."""
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT gmv, order_count, "
                "CASE WHEN order_count > 0 THEN gmv/order_count ELSE 0 END AS avg_order_amount, "
                "update_time "
                "FROM dashboard_summary WHERE id = 1"
            )
            row = cur.fetchone()

            cur.execute(
                "SELECT SUM(order_count) FROM dashboard_region"
            )
            total_orders = cur.fetchone()[0] or 0
    finally:
        conn.close()

    if row is None:
        return {
            "gmv": 0,
            "order_count": 0,
            "avg_order_amount": 0,
            "total_orders": 0,
            "update_time": None,
        }

    return {
        "gmv": float(row[0]),
        "order_count": int(row[1]),
        "avg_order_amount": float(row[2]),
        "total_orders": total_orders,
        "update_time": str(row[3]),
    }


async def _broadcast_loop():
    """Background task that queries MySQL every 500ms and broadcasts to all clients."""
    while True:
        try:
            data = await _query_dashboard_data()
            payload = json.dumps(data, ensure_ascii=False, default=str)

            # Snapshot connected clients to avoid mutation during iteration
            disconnected: set[WebSocket] = set()
            for ws in _connected:
                try:
                    await ws.send_text(payload)
                except Exception:
                    disconnected.add(ws)

            _connected.difference_update(disconnected)
        except Exception:
            pass  # Silently swallow query/loop errors to keep broadcasting

        await asyncio.sleep(0.5)


def _ensure_broadcast():
    """Start the broadcast background task if not already running."""
    global _broadcast_task
    if _broadcast_task is None or _broadcast_task.done():
        _broadcast_task = asyncio.ensure_future(_broadcast_loop())


@router.websocket("/ws/dashboard")
async def dashboard_ws(websocket: WebSocket):
    await websocket.accept()
    _connected.add(websocket)
    _ensure_broadcast()

    try:
        # Keep the connection alive — listen for client messages (or pings)
        while True:
            try:
                # Receive and ignore any client message; timeout keeps the loop responsive
                await asyncio.wait_for(websocket.receive_text(), timeout=30)
            except asyncio.TimeoutError:
                # Send a keepalive ping
                try:
                    await websocket.send_text('"ping"')
                except Exception:
                    break
    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        _connected.discard(websocket)
