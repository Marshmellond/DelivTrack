#!/bin/bash
# ============================================================
# 集群一键停止脚本（逆序关闭）
# 运行在: Node_01 (192.168.157.121)
# 用法:   stop-all.sh
# ============================================================

set -e

N1=192.168.157.121
N2=192.168.157.122
N3=192.168.157.123

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

log() { echo -e "${GREEN}[$(date +%H:%M:%S)]${NC} $1"; }
err() { echo -e "${RED}[$(date +%H:%M:%S)]${NC} $1"; }

local_exec()  { source /etc/profile && eval "$1"; }
remote_exec() { ssh -o StrictHostKeyChecking=no root@$1 "source /etc/profile && $2" 2>&1; }

echo "============================================"
echo "  集群关闭 — $(date '+%Y-%m-%d %H:%M:%S')"
echo "============================================"

# ============================================
# 1. Flink — Node_01
# ============================================
log "1/7 停止 Flink ..."
local_exec "/export/servers/flink-1.17.2/bin/stop-cluster.sh" \
    && log "   Flink OK" || err "   Flink FAIL"
# 确保残留进程也被杀掉
ssh -o StrictHostKeyChecking=no root@$N1 "pkill -9 -f TaskManagerRunner 2>/dev/null; pkill -9 -f StandaloneSession 2>/dev/null" || true
ssh -o StrictHostKeyChecking=no root@$N2 "pkill -9 -f TaskManagerRunner 2>/dev/null; pkill -9 -f StandaloneSession 2>/dev/null" || true
ssh -o StrictHostKeyChecking=no root@$N3 "pkill -9 -f TaskManagerRunner 2>/dev/null; pkill -9 -f StandaloneSession 2>/dev/null" || true
sleep 3

# ============================================
# 2. Redis — Node_03
# ============================================
log "2/7 停止 Redis ..."
remote_exec $N3 "redis-cli -p 6379 -a 123456 shutdown 2>&1" \
    && log "   Redis OK" || err "   Redis FAIL"
sleep 2

# ============================================
# 3. Kafka — Node_01 / Node_02 / Node_03
# ============================================
log "3/7 停止 Kafka ..."
local_exec   "kafka stop"     && log "   Kafka node01 OK" || err "   Kafka node01 FAIL"
remote_exec $N2 "kafka stop"  && log "   Kafka node02 OK" || err "   Kafka node02 FAIL"
remote_exec $N3 "kafka stop"  && log "   Kafka node03 OK" || err "   Kafka node03 FAIL"
sleep 3

# ============================================
# 4. YARN — Node_01
# ============================================
log "4/7 停止 YARN ..."
local_exec "stop-yarn.sh" && log "   YARN OK" || err "   YARN FAIL"
sleep 3

# ============================================
# 5. HDFS — Node_01
# ============================================
log "5/7 停止 HDFS ..."
local_exec "stop-dfs.sh" && log "   HDFS OK" || err "   HDFS FAIL"
sleep 3

# ============================================
# 6. JournalNode — Node_01 / Node_02 / Node_03
# ============================================
log "6/7 停止 JournalNode ..."
local_exec   "hadoop-daemon.sh stop journalnode"     && log "   JN node01 OK" || err "   JN node01 FAIL"
remote_exec $N2 "hadoop-daemon.sh stop journalnode"  && log "   JN node02 OK" || err "   JN node02 FAIL"
remote_exec $N3 "hadoop-daemon.sh stop journalnode"  && log "   JN node03 OK" || err "   JN node03 FAIL"
sleep 2

# ============================================
# 7. ZooKeeper — Node_01 / Node_02 / Node_03
# ============================================
log "7/7 停止 ZooKeeper ..."
local_exec   "zkServer.sh stop"     && log "   ZK node01 OK" || err "   ZK node01 FAIL"
remote_exec $N2 "zkServer.sh stop"  && log "   ZK node02 OK" || err "   ZK node02 FAIL"
remote_exec $N3 "zkServer.sh stop"  && log "   ZK node03 OK" || err "   ZK node03 FAIL"

echo ""
echo "============================================"
log "集群已全部关闭"
echo "============================================"
