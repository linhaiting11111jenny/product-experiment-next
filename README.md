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

## 阿里云 / 腾讯云部署

如果 `vercel.app` 在中国大陆访问不稳定，更适合的路径通常是：

- 购买中国香港节点的轻量服务器或云服务器
- 安装 1Panel
- 用 Docker 部署这个仓库
- 继续复用 Supabase 数据库

这样通常比直接使用海外 Serverless 域名更容易被中国大陆用户访问，同时也比中国大陆服务器少一层备案压力。

### 推荐方案

- 区域优先选中国香港
- 系统建议选 Ubuntu 22.04 LTS
- 开放端口：`22`、`80`、`443`、`1Panel 面板端口`
- 用 Docker 构建本项目，容器内监听 `3000`
- 用 1Panel 或 Nginx 反向代理到 `80/443`

### 需要配置的环境变量

```bash
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
EXPERIMENT_STORAGE_PREFIX=product-experiment
```

### Docker 部署文件

项目已经提供：

- [Dockerfile](/Users/linhaiting/Documents/codex/product-experiment-next/Dockerfile)
- [.dockerignore](/Users/linhaiting/Documents/codex/product-experiment-next/.dockerignore)

### 适合的部署方式

1. 在服务器安装 Docker 和 1Panel
2. 在 1Panel 中创建容器应用，或直接用 GitHub 仓库拉代码构建镜像
3. 设置上述环境变量
4. 暴露容器 `3000` 端口
5. 通过 1Panel 网站 / 反向代理，把公网 `80` 或 `443` 转发到容器 `3000`
