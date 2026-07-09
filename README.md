# 大蓝赢 🏆

**男性向内容社区** — 暗黑风格 · 极致轻量 · 无框架依赖

科技 · 汽车 · 运动 · 游戏 · 财经 · 健身 · 户外 · 数码

---

## 技术栈

| 层 | 方案 |
|---|---|
| 框架 | Next.js 15 (App Router) |
| 样式 | Tailwind CSS 4 |
| UI 组件 | 100% 手写，零三方组件库 |
| 主题 | 永久暗黑模式 (Zinc-900 基底) |
| 强调色 | 克莱因蓝变体 `#2152ff` |
| 质感 | 毛玻璃导航栏 · 微圆角 · 大留白 |
| 后端 | Supabase (Auth + PostgreSQL + Storage) |

## 快速开始

```bash
# 1. 安装依赖
npm install
# 或
pnpm install

# 2. 启动开发服务器
npm run dev

# 3. 浏览器打开 http://localhost:3000
```

## 项目结构

```
ni/
├── app/
│   ├── globals.css       # 全局样式 + Tailwind v4 主题定义
│   ├── layout.tsx        # 根布局
│   └── page.tsx          # 首页（信息流）
├── components/
│   ├── Navbar.tsx        # 毛玻璃导航栏
│   └── PostCard.tsx      # 兼容型帖子卡片
├── types/
│   └── index.ts          # TypeScript 类型
├── package.json
├── next.config.ts
├── postcss.config.mjs
├── tsconfig.json
├── .env.example
├── supabase-schema.sql   # Supabase 数据库 schema
└── README.md
```

## 核心组件：PostCard

`PostCard` 组件智能兼容两种内容形态：

| 情景 | 渲染方式 |
|---|---|
| **纯文字** (`images: []`) | 不显示任何图片，高亮标题 + 正文前两行（行末省略号） |
| **图文** (`images: [url]`) | 第一张图作为封面（16:9 自适应），下方标题 + 正文 |

所有卡片均带有微边框 + 阴影，悬停时有轻微上浮动效和边框提亮。

## 后续规划

- [ ] 接入 Supabase 认证
- [ ] 接入 Supabase 数据库真实数据
- [ ] 发布内容页面
- [ ] 个人主页
- [ ] 帖子详情 & 评论
- [ ] Capacitor 打包移动 App
