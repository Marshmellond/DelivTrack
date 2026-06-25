# DelivTrack — 外卖配送实时监控与运营管理系统

## 连接信息

| 项目 | 地址 |
|------|------|
| GitHub | https://github.com/Marshmellond/DelivTrack |
| Flink WebUI | http://192.168.157.121:8081 |
| MySQL | 192.168.157.122:3306 / root / 123456 / delivery_dashboard |
| Kafka | 192.168.157.121:9092, 192.168.157.122:9092, 192.168.157.123:9092 |
| Redis | 192.168.157.123:6379 / 123456 |

## 账号

| 用户名 | 密码 | 角色 |
|--------|------|------|
| `user_0000` ~ `user_0004` | `123456` | 管理员 |
| `user_0005` ~ `user_0999` | `123456` | 普通用户 |

## 截图

### 基础设施

| Flink WebUI 运行 Job |
|----------------------|
| ![Flink](docs/images/FlinkWeb运行Job.png) |

### 数据中心

| 页面 | 截图 |
|------|------|
| 实时看板 `/dashboard` | ![实时看板](docs/images/实时看板.png) |
| 订单分析 `/analytics/orders` | ![订单分析](docs/images/订单分析.png) |
| 营收分析 `/analytics/revenue` | ![营收分析](docs/images/营收分析.png) |
| 配送分析 `/analytics/delivery` | ![配送分析](docs/images/配送分析.png) |
| 客户洞察 `/analytics/customers` | ![客户洞察](docs/images/客户洞察.png) |

### 管理中心

| 页面 | 截图 |
|------|------|
| 订单管理 `/manage/orders` | ![订单管理](docs/images/订单管理.png) |
| 骑手管理 `/manage/riders` | ![骑手管理](docs/images/骑手管理.png) |
| 商家管理 `/manage/merchants` | ![商家管理](docs/images/商家管理.png) |
| 用户管理 `/manage/users` | ![用户管理](docs/images/用户管理.png) |
| 菜品管理 `/manage/menu` | ![菜品管理](docs/images/菜品管理.png) |
| 配送区域 `/manage/zones` | ![配送区域](docs/images/配送区域.png) |

### 运营中心

| 页面 | 截图 |
|------|------|
| 订单处理 `/operations/orders` | ![订单处理](docs/images/订单处理.png) |
| 骑手调度 `/operations/dispatch` | ![骑手调度](docs/images/骑手调度.png) |

### 系统

| 页面 | 截图 |
|------|------|
| 系统监控 `/monitor` | ![系统监控](docs/images/系统监控.png) |
| 操作日志 `/system/logs` | ![操作日志](docs/images/操作日志.png) |
| 通知中心 `/notifications` | ![通知中心](docs/images/通知中心.png) |
| 个人中心 `/profile` | ![个人中心](docs/images/个人中心.png) |

### 认证

| 页面 | 截图 |
|------|------|
| 登录 `/login` | ![登录](docs/images/登录页面.png) |
| 注册 `/register` | ![注册](docs/images/注册页面.png) |

---

## 技术架构

```
Generator(Python) → Kafka(3 Broker) → Flink(5s窗口) → MySQL(9表)
                                                           ↓
Next.js(18页面) ← FastAPI(40+接口) ←─────────────────────┘
```

## 快速启动

```bash
# 1. 集群
ssh root@192.168.157.121 && start-all.sh

# 2. Flink JAR（IDEA Maven clean package）
# 打开 http://192.168.157.121:8081 → Submit JAR

# 3. 种子数据（首次）
cd server && uv run python seed_full_data.py

# 4. 本地服务（3 终端）
cd generator && uv run python simulator/run.py
cd server && uv run uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload
cd web && pnpm dev

# 5. 打开
http://localhost:3000
```

## 子项目文档

| 子项目 | 文档 |
|--------|------|
| generator | [generator/README.md](generator/README.md) |
| flink | [flink/README.md](flink/README.md) |
| server | [server/README.md](server/README.md) |
| web | [web/README.md](web/README.md) |
