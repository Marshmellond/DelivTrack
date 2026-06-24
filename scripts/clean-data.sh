#!/bin/bash
# ============================================================
# 数据清理脚本
# 用法: clean-data.sh
# 功能: 清空 MySQL 聚合表 + 重建 Kafka Topic
# ============================================================

MYSQL_HOST=192.168.157.122
KAFKA_NODE=192.168.157.123
TOPIC=delivery-orders

GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'
log() { echo -e "${GREEN}[$(date +%H:%M:%S)]${NC} $1"; }
err() { echo -e "${RED}[$(date +%H:%M:%S)]${NC} $1"; }

echo "============================================"
echo "  数据清理 — $(date '+%Y-%m-%d %H:%M:%S')"
echo "============================================"
echo ""

# 1. 清空 MySQL
log "1/3 清理 MySQL ..."
mysql -h $MYSQL_HOST -u root -p123456 delivery_dashboard <<SQL 2>/dev/null
SET FOREIGN_KEY_CHECKS=0;
TRUNCATE TABLE orders;
TRUNCATE TABLE dashboard_region;
TRUNCATE TABLE dashboard_merchant_rank;
TRUNCATE TABLE dashboard_hourly;
UPDATE dashboard_summary SET gmv=0, order_count=0, rider_online=0, rider_delivering=0, avg_delivery_time=0, cancel_rate=0 WHERE id=1;
SET FOREIGN_KEY_CHECKS=1;
SQL
log "   MySQL OK"

# 验证
echo "   $(mysql -h $MYSQL_HOST -u root -p123456 delivery_dashboard -N -e "SELECT CONCAT('orders=',COUNT(*)) FROM orders" 2>/dev/null)"
echo "   $(mysql -h $MYSQL_HOST -u root -p123456 delivery_dashboard -N -e "SELECT CONCAT('regions=',COUNT(*)) FROM dashboard_region" 2>/dev/null)"
echo "   $(mysql -h $MYSQL_HOST -u root -p123456 delivery_dashboard -N -e "SELECT CONCAT('ranks=',COUNT(*)) FROM dashboard_merchant_rank" 2>/dev/null)"
echo "   $(mysql -h $MYSQL_HOST -u root -p123456 delivery_dashboard -N -e "SELECT CONCAT('hourly=',COUNT(*)) FROM dashboard_hourly" 2>/dev/null)"
echo "   $(mysql -h $MYSQL_HOST -u root -p123456 delivery_dashboard -N -e "SELECT CONCAT('summary: gmv=',gmv,' orders=',order_count) FROM dashboard_summary WHERE id=1" 2>/dev/null)"

# 2. 确保 Kafka Topic 有 3 个分区
log "2/3 检查 Kafka 分区 ..."
ssh -o StrictHostKeyChecking=no root@$KAFKA_NODE "
    source /etc/profile
    kafka-topics.sh --bootstrap-server $KAFKA_NODE:9092 --alter --topic $TOPIC --partitions 3 2>&1
    kafka-topics.sh --bootstrap-server $KAFKA_NODE:9092 --describe --topic $TOPIC 2>&1 | grep PartitionCount
" && log "   Kafka OK" || err "   Kafka FAIL"

# 3. 确认
log "3/3 验证 ..."

echo ""
echo "============================================"
log "清理完成！"
echo "============================================"
