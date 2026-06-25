# Web -- Next.js 前端

Next.js 16 (App Router) + React 19 前端，提供运营大屏、实时监控、后台管理、数据分析等功能。

## 技术栈

- Next.js 16.2.9 (App Router)
- React 19.2.4
- TypeScript 5
- Tailwind CSS 4
- ECharts 6 (echarts-for-react)
- pnpm 包管理器

## 安装与运行

```bash
cd web
pnpm install
pnpm dev
```

开发服务器启动在 http://localhost:3000

前端默认连接 `localhost:8000` 的 FastAPI 后端，通过 `/api/lib/api.ts` 中的 `API_BASE` 配置。

## 项目结构

```
web/
├── package.json
├── tsconfig.json
├── next.config.ts
├── postcss.config.mjs
├── eslint.config.mjs
├── src/app/
│   ├── page.tsx                  # 入口页 (自动跳转 login 或 dashboard)
│   ├── layout.tsx                # 根布局
│   ├── globals.css               # 全局样式 (dark theme)
│   ├── not-found.tsx             # 404 页面
│   ├── favicon.ico
│   ├── login/page.tsx            # 登录
│   ├── register/page.tsx         # 注册
│   ├── dashboard/page.tsx        # 运营总览大屏
│   ├── monitor/page.tsx          # 实时监控 (WebSocket + ECharts)
│   ├── orders/page.tsx           # 全部订单
│   ├── riders/page.tsx           # 骑手状态
│   ├── merchants/page.tsx        # 商家列表
│   ├── profile/page.tsx          # 个人中心
│   ├── notifications/page.tsx    # 系统通知
│   ├── help/page.tsx             # 帮助文档
│   ├── manage/                   # 后台管理模块
│   │   ├── users/page.tsx
│   │   ├── merchants/page.tsx
│   │   ├── riders/page.tsx
│   │   ├── orders/page.tsx
│   │   ├── menu/page.tsx
│   │   └── zones/page.tsx
│   ├── analytics/                # 数据分析模块
│   │   ├── orders/page.tsx
│   │   ├── revenue/page.tsx
│   │   ├── delivery/page.tsx
│   │   └── customers/page.tsx
│   ├── operations/               # 运营管理模块
│   │   ├── orders/page.tsx
│   │   └── dispatch/page.tsx
│   ├── system/logs/page.tsx      # 系统日志
│   ├── components/               # 通用组件
│   │   ├── AppShell.tsx          # 页面壳 (侧边栏 + 顶栏 + 内容区)
│   │   ├── AuthGuard.tsx         # 登录状态守卫 (未登录跳转 /login)
│   │   ├── Sidebar.tsx           # 侧边栏导航
│   │   ├── DataTable.tsx         # 通用数据表格
│   │   ├── Toast.tsx             # Toast 通知
│   │   └── dashboard/
│   │       ├── StatCard.tsx      # 指标卡片
│   │       ├── AnimatedNumber.tsx # 数字动画
│   │       └── useDashboardData.ts # 大屏数据 hook (轮询 API)
│   └── lib/api.ts                # Axios API 客户端 (自动附带 JWT)
└── README.md
```

## 页面一览

| 路径                        | 页面          | 说明                           |
|-----------------------------|---------------|--------------------------------|
| `/`                         | 首页          | 自动跳转 (已登录->dashboard, 未登录->login) |
| `/login`                    | 登录          | JWT 认证                       |
| `/register`                 | 注册          | 新用户注册                     |
| `/dashboard`                | 运营总览      | GMV/订单量/骑手/趋势大屏       |
| `/monitor`                  | 实时监控      | 实时订单流 + WebSocket 推送    |
| `/orders`                   | 全部订单      | 订单列表，支持筛选与状态跟踪   |
| `/riders`                   | 骑手状态      | 骑手在线/配送中/离线状态       |
| `/merchants`                | 商家列表      | 活跃商家一览                   |
| `/profile`                  | 个人中心      | 用户信息                       |
| `/notifications`            | 系统通知      | 通知列表                       |
| `/help`                     | 帮助文档      | 使用说明                       |
| `/manage/users`             | 用户管理      | CRUD (admin only)              |
| `/manage/merchants`         | 商家管理      | CRUD (admin only)              |
| `/manage/riders`            | 骑手管理      | CRUD (admin only)              |
| `/manage/orders`            | 订单管理      | CRUD (admin only)              |
| `/manage/menu`              | 菜单管理      | CRUD (admin only)              |
| `/manage/zones`             | 区域管理      | CRUD (admin only)              |
| `/analytics/orders`         | 订单分析      | 图表分析                       |
| `/analytics/revenue`        | 营收分析      | 图表分析                       |
| `/analytics/delivery`       | 配送分析      | 图表分析                       |
| `/analytics/customers`      | 客户分析      | 图表分析                       |
| `/operations/orders`        | 订单运营      | 运营工具                       |
| `/operations/dispatch`      | 智能调度      | 运营工具                       |
| `/system/logs`              | 系统日志      | 监控日志                       |

## 构建

```bash
cd web
pnpm build
pnpm start   # 生产模式启动
```
