# Product Experiment Next

这是一个基于 `Next.js 14 App Router + TypeScript + Tailwind CSS` 重写的商品浏览实验项目，用来替代原始仓库中的静态 `index.html`。

## 目标

- 复刻原实验页的核心逻辑：商品介绍、评分概览、条件摘要、原始评论、返回问卷
- 借鉴 `culture_china` 项目的排版方式、字体策略、渐变背景和卡片层次
- 增加后端 API，实现实验行为追踪与汇总查看

## 技术栈

- Next.js 14 App Router
- TypeScript
- Tailwind CSS
- Node.js Route Handlers
- 文件持久化日志存储

## 本地启动

```bash
npm install
npm run dev
```

默认页面地址：

```bash
http://localhost:3000
```

## 实验参数

支持通过 URL 查询参数控制实验行为：

```bash
/?condition=rating
/?condition=aigrs_positive
/?condition=aigrs_neutral
/?condition=aigrs_negative
/?condition=rating&uid=test-001&return_url=https%3A%2F%2Fexample.com%2Fsurvey
```

## 后端接口

### `POST /api/experiment/track`

记录实验事件，支持以下事件类型：

- `page_view`
- `view_reviews`
- `load_more`
- `page_hidden`
- `page_visible`
- `session_end`

### `GET /api/experiment/summary`

返回当前追踪日志的简单汇总，包括事件总数、参与者数量和最近一次事件时间。

## Vercel + Supabase 部署

这个项目已经调整为适合部署到 Vercel 的结构，并优先支持 Supabase 免费数据库：

- 前端使用标准 Next.js App Router
- 后端使用 Route Handlers
- 持久化采用三种模式
- 优先使用 Supabase
- 本地开发默认写入 `data/experiment-events.jsonl`
- 如果没有 Supabase，则会尝试使用 Upstash Redis
- 两者都没有时，退回本地文件或临时目录存储

### 推荐部署方式

1. 把仓库推到 GitHub
2. 在 Vercel 中导入该仓库
3. 在 Supabase 新建一个项目
4. 在 Supabase 的 SQL Editor 中执行 [supabase/schema.sql](/Users/linhaiting/Documents/codex/product-experiment-next/supabase/schema.sql)
5. 在 Vercel 的环境变量中填入：

```bash
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
EXPERIMENT_STORAGE_PREFIX=product-experiment
```

6. 可选：如果你不想用 Supabase，也可以改用 Upstash Redis：

```bash
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

7. 重新部署

### 为什么这样改

Vercel 生产环境不适合依赖应用目录内的本地文件做长期持久化，所以这里把线上持久化改成了数据库优先。没有配置 Supabase 或 Redis 时，项目仍然能运行，但数据只会退回到本地文件或临时文件目录，不适合作为正式实验环境。

## 数据存储

本地开发默认将追踪事件写入：

```bash
data/experiment-events.jsonl
```

如果检测到 `NEXT_PUBLIC_SUPABASE_URL` 和 `SUPABASE_SERVICE_ROLE_KEY`，应用会自动改用 Supabase 保存事件与汇总数据。

如果没有 Supabase，但检测到 `UPSTASH_REDIS_REST_URL` 和 `UPSTASH_REDIS_REST_TOKEN`，应用会自动改用 Upstash Redis REST API。

## 说明

- Supabase 提供免费数据库额度，适合你这种实验数据记录场景
- 这个仓库已经带好了 SQL 建表脚本，只需要在 Supabase 执行一次
