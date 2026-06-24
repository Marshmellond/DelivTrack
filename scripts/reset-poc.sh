#!/bin/bash
# ============================================================
# POC 数据重置脚本
# 用法: reset-poc.sh
# 功能: 清空 MySQL 聚合表 + 重建 Kafka Topic（清积压）
# ============================================================

MYSQL_HOST=192.168.157.122
KAFKA_BOOTSTRAP=192.168.157.123:9092
TOPIC=delivery-orders

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'
log()  { echo -e "${GREEN}[$(date +%H:%M:%S)]${NC} $1"; }
err()  { echo -e "${RED}[$(date +%H:%M:%S)]${NC} $1"; }

echo "============================================"
echo "  POC 数据重置"
echo "============================================"

# 1. 重置 MySQL 聚合表
log "1/2 重置 MySQL dashboard_summary ..."
mysql -h $MYSQL_HOST -u root -p123456 delivery_poc -e \
    "UPDATE dashboard_summary SET gmv=0, order_count=0, avg_order_amount=0 WHERE id=1;" 2>/dev/null \
    && log "   MySQL OK" || err "   MySQL FAIL"

# 验证
RESULT=$(mysql -h $MYSQL_HOST -u root -p123456 delivery_poc -N -e \
    "SELECT CONCAT('gmv=', gmv, ' orders=', order_count) FROM dashboard_summary WHERE id=1;" 2>/dev/null)
echo "   $RESULT"

# 2. 重建 Kafka Topic（清积压消息）
log "2/2 重建 Kafka Topic ..."
ssh -o StrictHostKeyChecking=no root@192.168.157.123 \
    "source /etc/profile && \
     kafka-topics.sh --bootstrap-server $KAFKA_BOOTSTRAP --delete --topic $TOPIC 2>/dev/null; \
     sleep 2; \
     kafka-topics.sh --bootstrap-server $KAFKA_BOOTSTRAP --create --topic $TOPIC --partitions 3 --replication-factor 2 2>&1" \
    && log "   Kafka OK" || err "   Kafka FAIL"

echo ""
echo "============================================"
log "重置完成。重新启动模拟器即可。"
echo "============================================"
