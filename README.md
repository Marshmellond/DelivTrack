# DelivTrack -- 外卖配送实时监控与运营管理系统

## 项目简介

O2O 外卖配送实时数据分析与运营管理平台。Python 模拟器生成订单，经 Kafka 流转至 Flink 实时计算，结果写入 MySQL，由 FastAPI 后端提供 API，Next.js 前端渲染。

```
  generator               Flink               MySQL              FastAPI            Next.js
  (Python)    --> Kafka --> (Java)  -->  delivery_dashboard  -->  API (Python)  -->  前端 (React)
  模拟订单       pipeline   5s窗口聚合              实时查询           实时大屏/管理
```

## 技术架构

```
  +-----------+     +-----------+     +-----------+     +-----------+     +-----------+
  | Generator | --> |   Kafka   | --> |   Flink   | --> |   MySQL   | <-- |  FastAPI  |
  |  (Python) |     |  3-node   |     |  1.17.2   |     |  Node_02  |     |  (uvicorn)|
  +-----------+     +-----------+     +-----------+     +-----------+     +-----------+
       |                  |                 |                 |                 |
       |          Node_01:9092       Node_02:8081        3306                |
       |          Node_02:9092       WebUI                delivery_          |
       |          Node_03:9092                            dashboard          +-----------+
       |                                                                     |  Next.js  |
       +-------------------------------------------------------------------->|  :3000    |
                                              API calls (REST + WS)          +-----------+
```

## 项目结构

```
DelivTrack/
├── README.md                         # 主文档（本文件）
├── docs/
│   ├── full-schema.sql               # 完整建表 SQL（9 张表）
│   └── 外卖配送实时监控与运营管理系统-详细方案.md
├── scripts/                          # 集群运维脚本（部署于 Node_01）
├── generator/                        # Python 数据模拟器
│   ├── pyproject.toml
│   ├── simulator/
│   │   ├── run.py                    # 入口：启动 Kafka Producer 循环
│   │   ├── generator.py             # 订单生成逻辑（从 MySQL 加载基础数据）
│   │   ├── config.py                # Kafka / MySQL 连接参数
│   │   └── seed_data.py             # 基础数据种子（独立脚本）
│   └── README.md
├── flink/                            # Flink 流计算（Java Maven）
│   ├── pom.xml
│   ├── src/main/java/com/delivery/
│   │   ├── DeliveryJob.java         # Flink Job: Kafka Source -> Window -> MySQL Sink
│   │   └── Order.java               # POJO (Kafka JSON 映射)
│   └── README.md
├── server/                           # FastAPI 后端
│   ├── pyproject.toml
│   ├── seed_full_data.py            # 完整种子数据（1000 用户 / 1000 订单 / 全量聚合）
│   ├── api/
│   │   ├── main.py                  # FastAPI 入口
│   │   ├── config.py                # MySQL / JWT / Kafka 配置
│   │   ├── database.py              # MySQL 连接工具
│   │   ├── models.py                # Pydantic 模型
│   │   ├── auth.py                  # 认证 (register / login / JWT)
│   │   ├── dashboard.py             # 大屏只读接口 (summary / regions / trends...)
│   │   ├── health.py                # 健康检查 (MySQL + Kafka 连通性)
│   │   ├── monitor.py               # 系统监控 (Pipeline / 聚合统计)
│   │   ├── websocket.py             # WebSocket 实时推送 (500ms 轮询广播)
│   │   ├── crud_users.py            # 用户 CRUD
│   │   ├── crud_merchants.py        # 商家 CRUD
│   │   ├── crud_riders.py           # 骑手 CRUD
│   │   ├── crud_menu.py             # 菜单 CRUD
│   │   └── crud_orders.py           # 订单查询
│   └── README.md
└── web/                              # Next.js 前端
    ├── package.json
    ├── tsconfig.json
    ├── next.config.ts
    ├── src/app/
    │   ├── page.tsx                  # 首页（自动跳转）
    │   ├── layout.tsx                # 根布局
    │   ├── login/page.tsx            # 登录
    │   ├── register/page.tsx         # 注册
    │   ├── dashboard/page.tsx        # 运营总览大屏
    │   ├── monitor/page.tsx          # 实时监控大屏
    │   ├── orders/page.tsx           # 全部订单
    │   ├── riders/page.tsx           # 骑手状态
    │   ├── merchants/page.tsx        # 商家列表
    │   ├── profile/page.tsx          # 个人中心
    │   ├── notifications/page.tsx    # 系统通知
    │   ├── help/page.tsx             # 帮助文档
    │   ├── manage/                   # 后台管理
    │   │   ├── users/page.tsx
    │   │   ├── merchants/page.tsx
    │   │   ├── riders/page.tsx
    │   │   ├── orders/page.tsx
    │   │   ├── menu/page.tsx
    │   │   └── zones/page.tsx
    │   ├── analytics/                # 数据分析
    │   │   ├── orders/page.tsx
    │   │   ├── revenue/page.tsx
    │   │   ├── delivery/page.tsx
    │   │   └── customers/page.tsx
    │   ├── operations/               # 运营管理
    │   │   ├── orders/page.tsx
    │   │   └── dispatch/page.tsx
    │   ├── system/logs/page.tsx      # 系统日志
    │   ├── components/               # 通用组件
    │   │   ├── AppShell.tsx          # 页面壳
    │   │   ├── AuthGuard.tsx         # 登录守卫
    │   │   ├── Sidebar.tsx           # 侧边栏导航
    │   │   ├── DataTable.tsx         # 数据表格
    │   │   ├── Toast.tsx             # 消息提示
    │   │   └── dashboard/
    │   │       ├── StatCard.tsx
    │   │       ├── AnimatedNumber.tsx
    │   │       └── useDashboardData.ts
    │   └── lib/api.ts                # 前端 API 工具集
    └── README.md
```

## 环境信息

本系统部署在 3 台 CentOS 虚拟机集群上：

| 节点     | IP               | 角色与服务                                                       |
|----------|------------------|------------------------------------------------------------------|
| Node_01  | 192.168.157.121  | ZooKeeper, HDFS NameNode, Kafka broker, Flink JobManager          |
| Node_02  | 192.168.157.122  | ZooKeeper, HDFS DataNode, Kafka broker, MySQL 8.0, Flink TaskManager |
| Node_03  | 192.168.157.123  | ZooKeeper, HDFS DataNode, Kafka broker, Redis (port 6379)        |

通用账号：
- 所有节点 SSH：`root`
- MySQL：`root / 123456`，数据库 `delivery_dashboard`
- Redis：密码 `123456`
- Kafka：端口 9092，Topic `delivery-orders`

关键地址：
- Flink WebUI：http://192.168.157.121:8081
- HDFS NameNode：http://192.168.157.121:50070
- YARN：http://192.168.157.121:8088
- FastAPI：http://localhost:8000
- Next.js：http://localhost:3000

## 快速启动

### 1. 启动集群

在 Node_01 上执行：

```bash
start-all.sh    # 依次启动 ZooKeeper -> HDFS -> YARN -> Kafka -> Flink
```

### 2. 提交 Flink JAR

在本地 `flink/` 目录构建并上传到 Flink：

```bash
cd flink
mvn clean package -DskipTests
scp target/delivery-flink-poc-1.0-SNAPSHOT.jar root@192.168.157.121:/tmp/

# 在 Node_01 上提交 Job
ssh root@192.168.157.121
source /etc/profile
flink run /tmp/delivery-flink-poc-1.0-SNAPSHOT.jar
```

### 3. 导入种子数据

```bash
cd server
uv run python seed_full_data.py
```

### 4. 启动本地服务

```bash
# 终端 1 — 启动模拟器（开始生成订单）
cd generator
uv run python simulator/run.py

# 终端 2 — 启动后端
cd server
uv run uvicorn api.main:app --reload

# 终端 3 — 启动前端
cd web
pnpm dev
```

## 页面一览

| 路径                        | 页面          | 说明                           |
|-----------------------------|---------------|--------------------------------|
| `/login`                    | 登录          | JWT 认证                       |
| `/register`                 | 注册          | 新用户注册                     |
| `/dashboard`                | 运营总览      | 核心指标大屏（GMV / 订单 / 骑手 / 趋势） |
| `/monitor`                  | 实时监控      | 实时订单流 + Pipeline 状态     |
| `/orders`                   | 全部订单      | 订单列表与状态跟踪             |
| `/riders`                   | 骑手状态      | 骑手在线/配送中/离线状态       |
| `/merchants`                | 商家列表      | 活跃商家一览                   |
| `/profile`                  | 个人中心      | 个人信息与设置                 |
| `/notifications`            | 系统通知      | 通知列表                       |
| `/help`                     | 帮助文档      | 系统使用说明                   |
| `/manage/users`             | 用户管理      | 后台 CRUD                      |
| `/manage/merchants`         | 商家管理      | 后台 CRUD                      |
| `/manage/riders`            | 骑手管理      | 后台 CRUD                      |
| `/manage/orders`            | 订单管理      | 后台 CRUD                      |
| `/manage/menu`              | 菜单管理      | 后台 CRUD                      |
| `/manage/zones`             | 区域管理      | 后台 CRUD                      |
| `/analytics/orders`         | 订单分析      | 数据分析                       |
| `/analytics/revenue`        | 营收分析      | 数据分析                       |
| `/analytics/delivery`       | 配送分析      | 数据分析                       |
| `/analytics/customers`      | 客户分析      | 数据分析                       |
| `/operations/orders`        | 订单运营      | 运营管理                       |
| `/operations/dispatch`      | 智能调度      | 运营管理                       |
| `/system/logs`              | 系统日志      | 监控日志                       |

## 账号

| 用户名      | 密码     | 角色   |
|-------------|----------|--------|
| `user_0000` | `123456` | admin  |
| `user_0001` | `123456` | admin  |
| `user_0005` | `123456` | user   |
| ...         | `123456` | user   |

共 1000 个用户（前 5 个为 admin），所有密码统一为 `123456`。

## 子项目

| 子项目       | 目录         | 技术栈                 | 文档                     |
|-------------|-------------|-----------------------|--------------------------|
| 数据模拟器   | `generator/` | Python, kafka-python  | `generator/README.md`    |
| 流计算       | `flink/`     | Java, Maven, Flink    | `flink/README.md`        |
| 后端 API     | `server/`    | Python, FastAPI       | `server/README.md`       |
| 前端 Web     | `web/`       | TypeScript, Next.js   | `web/README.md`          |
