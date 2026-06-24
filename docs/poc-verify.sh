#!/bin/bash
# POC 验证脚本 — 一键检查各组件状态
# 在 Git Bash 或 WSL 中运行

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

pass() { echo -e "${GREEN}✅ $1${NC}"; }
fail() { echo -e "${RED}❌ $1${NC}"; }
warn() { echo -e "${YELLOW}⚠️  $1${NC}"; }

echo "========================================="
echo "  POC 组件状态检查"
echo "========================================="
echo ""

# 1. MySQL 检查
echo "--- MySQL (Node_02:3306) ---"
if timeout 3 bash -c 'echo > /dev/tcp/192.168.157.122/3306' 2>/dev/null; then
    pass "MySQL 端口可达"
    # 尝试查询
    RESULT=$(cd "$(dirname "$0")/../server" && uv run python -c "
import pymysql
try:
    conn = pymysql.connect(host='192.168.157.122', port=3306, user='root', password='123456', database='delivery_poc', charset='utf8mb4')
    with conn.cursor() as c:
        c.execute('SELECT gmv, order_count, avg_order_amount, update_time FROM dashboard_summary WHERE id=1')
        r = c.fetchone()
    conn.close()
    if r:
        print(f'GMV={r[0]}, Orders={r[1]}, Avg={r[2]}, Updated={r[3]}')
    else:
        print('EMPTY')
except Exception as e:
    print(f'ERROR: {e}')
" 2>&1)
    if [[ "$RESULT" == ERROR* ]]; then
        fail "MySQL 查询失败: $RESULT"
        warn "请先执行 ❶ MySQL 建表步骤"
    else
        pass "dashboard_summary: $RESULT"
    fi
else
    fail "MySQL 不可达"
fi
echo ""

# 2. Kafka 检查
echo "--- Kafka (Node_03:9092) ---"
if timeout 3 bash -c 'echo > /dev/tcp/192.168.157.123/9092' 2>/dev/null; then
    pass "Kafka 端口可达"
else
    fail "Kafka 不可达"
fi
echo ""

# 3. FastAPI 检查
echo "--- FastAPI (localhost:8000) ---"
if curl -s http://localhost:8000/api/health > /dev/null 2>&1; then
    pass "FastAPI 运行中"
    SUMMARY=$(curl -s http://localhost:8000/api/summary 2>/dev/null || echo '{}')
    echo "   /api/summary: $SUMMARY"
else
    warn "FastAPI 未运行 (终端运行: cd server && uv run uvicorn api.main:app --host 0.0.0.0 --port 8000)"
fi
echo ""

# 4. Next.js 检查
echo "--- Next.js (localhost:3000) ---"
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    pass "Next.js 运行中"
else
    warn "Next.js 未运行 (终端运行: cd web && pnpm dev)"
fi
echo ""

echo "========================================="
echo "  全部检查完成"
echo "========================================="
