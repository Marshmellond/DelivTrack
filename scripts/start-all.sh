#!/bin/bash
# ============================================================
# 集群一键启动脚本
# 运行在: Node_01 (192.168.157.121)
# 用法:   start-all.sh
# ============================================================

set -e

N1=192.168.157.121
N2=192.168.157.122
N3=192.168.157.123

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

log()  { echo -e "${GREEN}[$(date +%H:%M:%S)]${NC} $1"; }
err()  { echo -e "${RED}[$(date +%H:%M:%S)]${NC} $1"; }

# 本地执行（本机即 Node_01）
local_exec() { source /etc/profile && eval "$1"; }

# 远程执行（SSH 到指定 IP，自动 source profile）
remote_exec() { ssh -o StrictHostKeyChecking=no root@$1 "source /etc/profile && $2" 2>&1; }

echo "============================================"
echo "  集群启动 — $(date '+%Y-%m-%d %H:%M:%S')"
echo "============================================"

# ============================================
# 1. ZooKeeper — Node_01 / Node_02 / Node_03
# ============================================
log "1/7 启动 ZooKeeper ..."
local_exec   "zkServer.sh start"       && log "   ZK node01 OK" || err "   ZK node01 FAIL"
remote_exec $N2 "zkServer.sh start"    && log "   ZK node02 OK" || err "   ZK node02 FAIL"
remote_exec $N3 "zkServer.sh start"    && log "   ZK node03 OK" || err "   ZK node03 FAIL"
sleep 3

# ============================================
# 2. JournalNode — Node_01 / Node_02 / Node_03
# ============================================
log "2/7 启动 JournalNode ..."
local_exec   "hadoop-daemon.sh start journalnode"     && log "   JN node01 OK" || err "   JN node01 FAIL"
remote_exec $N2 "hadoop-daemon.sh start journalnode"  && log "   JN node02 OK" || err "   JN node02 FAIL"
remote_exec $N3 "hadoop-daemon.sh start journalnode"  && log "   JN node03 OK" || err "   JN node03 FAIL"
sleep 2

# ============================================
# 3. HDFS — Node_01 (start-dfs.sh 自动扩散到 DataNode)
# ============================================
log "3/7 启动 HDFS ..."
local_exec "start-dfs.sh" && log "   HDFS OK" || err "   HDFS FAIL"
sleep 5

# ============================================
# 4. YARN — Node_01 (start-yarn.sh 自动扩散)
# ============================================
log "4/7 启动 YARN ..."
local_exec "start-yarn.sh" && log "   YARN OK" || err "   YARN FAIL"
sleep 3

# ============================================
# 5. Kafka — Node_01 / Node_02 / Node_03
# ============================================
log "5/7 启动 Kafka ..."
local_exec   "kafka start"       && log "   Kafka node01 OK" || err "   Kafka node01 FAIL"
remote_exec $N2 "kafka start"    && log "   Kafka node02 OK" || err "   Kafka node02 FAIL"
remote_exec $N3 "kafka start"    && log "   Kafka node03 OK" || err "   Kafka node03 FAIL"
sleep 5

# ============================================
# 6. Redis — Node_03
# ============================================
log "6/7 启动 Redis ..."
remote_exec $N3 "redis-server /export/servers/redis-7.4/conf/redis.conf" \
    && log "   Redis OK" || err "   Redis FAIL"
sleep 2

# ============================================
# 7. 清理 Flink 旧状态（避免恢复失败）
# ============================================
log "7/8 等待 HDFS 退出安全模式 ..."
ssh -o StrictHostKeyChecking=no root@$N1 \
    "source /etc/profile && hdfs dfsadmin -safemode wait 2>&1" || true

log "7/8 清理 Flink 旧状态 ..."
# 清理 ZK 中的 /flink 节点
echo "deleteall /flink" | ssh -o StrictHostKeyChecking=no root@$N1 \
    "source /etc/profile && /export/servers/apache-zookeeper-3.8.6-bin/bin/zkCli.sh -server $N1:2181" 2>&1 | grep -E "INFO|ERROR" | tail -1 || true
# 清理 HDFS 中的 /flink 目录（使用 nameservice，避免连到 standby NN）
ssh -o StrictHostKeyChecking=no root@$N1 \
    "source /etc/profile && hdfs dfs -rm -r -skipTrash hdfs://nsl/flink 2>&1" || true
log "   Clean OK"
sleep 1

# ============================================
# 8. Flink — Node_01 (start-cluster.sh 自动扩散)
# ============================================
log "8/8 启动 Flink ..."
local_exec "/export/servers/flink-1.17.2/bin/start-cluster.sh" \
    && log "   Flink OK" || err "   Flink FAIL"
sleep 8

# ============================================
# 状态汇总
# ============================================
echo ""
echo "============================================"
log "启动完成，状态检查:"
echo "============================================"
echo ""

echo "--- ZooKeeper ---"
for node in $N1 $N2 $N3; do
    echo -n "  $node: "
    ssh -o StrictHostKeyChecking=no -o ConnectTimeout=3 root@$node "source /etc/profile && zkServer.sh status 2>&1 | head -1" 2>/dev/null || echo "UNREACHABLE"
done

echo ""
echo "--- HDFS ---"
ssh -o StrictHostKeyChecking=no -o ConnectTimeout=3 root@$N1 \
    "source /etc/profile && hdfs dfsadmin -report 2>&1 | grep 'Live datanodes'" 2>/dev/null || echo "  (check http://$N1:50070)"

echo ""
echo "--- Flink WebUI ---"
FLINK_STATUS=$(curl -s --connect-timeout 5 http://$N2:8081/overview 2>/dev/null)
if echo "$FLINK_STATUS" | grep -q "flink-version"; then
    echo "$FLINK_STATUS" | sed 's/.*taskmanagers\":\([0-9]*\).*slots-total\":\([0-9]*\).*flink-version\":\"\([^\"]*\)\".*/  TMs=\1, Slots=\2, Version=\3/'
else
    echo "  DOWN — check http://$N2:8081"
fi

echo ""
echo "============================================"
log "全部启动完毕"
echo "============================================"
echo ""
echo "  Flink : http://$N2:8081"
echo "  HDFS  : http://$N1:50070"
echo "  YARN  : http://$N1:8088"
echo "  Redis : $N3:6379"
echo "  Kafka : $N1:9092 $N2:9092 $N3:9092"
echo "  MySQL : $N2:3306"
echo ""
