# Server -- FastAPI 后端

FastAPI 后端服务，提供 REST API、WebSocket 实时推送、JWT 认证、以及所有实体的 CRUD 管理接口。

## 依赖

- Python >= 3.11
- FastAPI + Uvicorn -- Web 框架
- PyMySQL -- MySQL 连接
- PyJWT -- JWT 令牌
- bcrypt -- 密码哈希
- websockets -- WebSocket 支持

```bash
cd server
uv sync
```

## 运行

```bash
cd server
uv run uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
```

启动后访问：
- API 文档：http://localhost:8000/docs （Swagger UI）
- 健康检查：http://localhost:8000/api/health

## 项目结构

```
server/
├── pyproject.toml
├── seed_full_data.py            # 完整种子数据脚本（独立运行）
├── api/
│   ├── main.py                  # FastAPI app 入口，挂载所有 Router
│   ├── config.py                # MySQL / JWT / Kafka 配置
│   ├── database.py              # PyMySQL 连接工厂
│   ├── models.py                # Pydantic 请求/响应模型
│   ├── auth.py                  # 注册 / 登录 / JWT 认证依赖
│   ├── dashboard.py             # 大屏只读接口
│   ├── health.py                # MySQL + Kafka 连通性健康检查
│   ├── monitor.py               # Pipeline 监控 / 聚合统计
│   ├── websocket.py             # WebSocket 实时推送 (500ms 轮询广播)
│   ├── crud_users.py            # 用户 CRUD
│   ├── crud_merchants.py        # 商家 CRUD
│   ├── crud_riders.py           # 骑手 CRUD
│   ├── crud_menu.py             # 菜单 CRUD
│   └── crud_orders.py           # 订单查询
└── README.md
```

## API 端点一览

### 认证 (需要公开访问)

| 方法   | 路径                | 说明     |
|--------|---------------------|----------|
| POST   | `/api/auth/register`| 用户注册 |
| POST   | `/api/auth/login`   | 登录获取 JWT |

### 大屏 (无需认证)

| 方法   | 路径                          | 说明                     |
|--------|-------------------------------|--------------------------|
| GET    | `/api/dashboard/summary`      | 核心指标汇总             |
| GET    | `/api/dashboard/regions`      | 城市/区域排行 (20条)     |
| GET    | `/api/dashboard/merchant-rank`| 商家 GMV 排行 (Top 15)   |
| GET    | `/api/dashboard/trend`        | 最近 7 天每小时趋势 (168点) |
| GET    | `/api/dashboard/recent-orders`| 最近 20 条订单           |
| GET    | `/api/dashboard/status-distribution` | 订单状态分布        |
| GET    | `/api/summary`                | POC 兼容摘要             |

### 健康检查 / 监控

| 方法   | 路径                    | 说明                       |
|--------|-------------------------|----------------------------|
| GET    | `/api/health`           | MySQL ping                  |
| GET    | `/api/health/full`      | MySQL + Kafka TCP 连通性   |
| GET    | `/api/monitor/pipeline` | Pipeline 状态 (Kafka/Flink/MySQL/lag) |
| GET    | `/api/monitor/stats`    | 聚合业务统计               |

### WebSocket

| 路径               | 说明                                        |
|--------------------|---------------------------------------------|
| `ws://host:8000/ws/dashboard` | 实时推送 dashboard_summary (500ms 间隔) |

### CRUD 管理 (全部需要 JWT，部分需要 admin 角色)

| 方法   | 路径                      | 说明         | 权限   |
|--------|---------------------------|-------------|--------|
| GET    | `/api/users`              | 用户列表    | admin  |
| GET    | `/api/users/{id}`         | 用户详情    | admin  |
| PUT    | `/api/users/{id}`         | 更新用户    | admin  |
| DELETE | `/api/users/{id}`         | 删除用户    | admin  |
| GET    | `/api/merchants`          | 商家列表    | 任意登录 |
| POST   | `/api/merchants`          | 新建商家    | admin  |
| GET    | `/api/merchants/{id}`     | 商家详情    | 任意登录 |
| PUT    | `/api/merchants/{id}`     | 更新商家    | admin  |
| DELETE | `/api/merchants/{id}`     | 删除商家    | admin  |
| GET    | `/api/riders`             | 骑手列表    | 任意登录 |
| POST   | `/api/riders`             | 新建骑手    | admin  |
| GET    | `/api/riders/{id}`        | 骑手详情    | 任意登录 |
| PUT    | `/api/riders/{id}`        | 更新骑手    | admin  |
| DELETE | `/api/riders/{id}`        | 删除骑手    | admin  |
| GET    | `/api/menu-items`         | 菜单列表    | 任意登录 |
| POST   | `/api/menu-items`         | 新建菜品    | admin  |
| GET    | `/api/menu-items/{id}`    | 菜品详情    | 任意登录 |
| PUT    | `/api/menu-items/{id}`    | 更新菜品    | admin  |
| DELETE | `/api/menu-items/{id}`    | 删除菜品    | admin  |
| GET    | `/api/orders`             | 订单列表    | 任意登录 |
| GET    | `/api/orders/{id}`        | 订单详情    | 任意登录 |

## 种子数据

```bash
cd server
uv run python seed_full_data.py
```

导入内容：
- 1000 用户 (user_0000 ~ user_0999，前 5 个 admin，密码均为 `123456`)
- 15 商家 (覆盖 5 城市 x 中餐/快餐/日料/西餐/韩餐/甜品/小吃 7 大品类)
- 95 菜品 (按品类分配到对应商家)
- 50 骑手 (在线/配送中/离线 约 40%/30%/30%)
- 1000 订单 (近 7 天，按高峰时段 (11-13, 17-19) 和 weekday 加权分布)
- 全量聚合表 (summary / region / merchant_rank / hourly)
