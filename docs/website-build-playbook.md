# 网站搭建操作手册

适用场景：

- 从一个原始 `html` 实验页出发
- 重构为现代前后端项目
- 接入 Supabase 数据库
- 可先部署到 Vercel 验证
- 再迁移到阿里云中国大陆服务器
- 最终嵌入 Credamo 或其他问卷平台

---

## 1. 总体流程

推荐顺序：

1. 先明确需求与实验逻辑
2. 先做原始 HTML 原型
3. 再让 Codex 按参考 GitHub 项目工程化重构
4. 明确要求“不要改视觉，只升级技术栈”
5. 接入行为记录 API
6. 接入 Supabase
7. 先部署到 Vercel 快速验证
8. 如果中国大陆访问不稳定，再迁移到阿里云
9. 用 1Panel + Docker 跑正式版本
10. 把最终链接嵌入 Credamo

---

## 2. 第一步：先做原始 HTML 原型

目标：

- 先把页面结构和实验逻辑做出来
- 不先引入复杂框架

推荐 Prompt：

```text
请帮我先生成一个单文件 html 实验网页。
要求：
1. 页面结构包括商品信息、评分概览、评论总结、查看原始评论按钮、评论列表
2. 风格尽量中性，不要过度营销
3. 支持通过 URL 参数 condition 切换 rating / aigrs_positive / aigrs_neutral / aigrs_negative
4. 先不要做复杂框架，直接输出一个可运行的 index.html
5. 评论数据先写死在页面里
```

---

## 3. 第二步：按参考 GitHub 项目重构

目标：

- 把静态 HTML 改成现代工程
- 复用参考项目的技术栈和目录思路
- 但不要随意改视觉

推荐 Prompt：

```text
我已经有一个原始 html 页面，现在请你不要改变页面展示效果，只把它重构成现代前后端项目。
请参考这个 GitHub 项目的工程结构和技术栈：
https://github.com/xxxx/xxxx

要求：
1. 使用和参考项目一致或接近的技术栈
2. 但用户看到的页面视觉要尽量保持我原始 html 的样子
3. 把静态页面改成 Next.js / App Router / TypeScript / Tailwind 项目
4. 前端页面内容不要随意改视觉
5. 把评论数据和实验条件抽到单独文件
```

补充强调 Prompt：

```text
注意：
1. 不要改变我原始网页的视觉内容
2. 不要重新设计配色和布局
3. 只做技术栈升级和工程化改造
4. 页面展示必须尽量和原始 index.html 一致
```

---

## 4. 第三步：加入行为记录

目标：

- 记录实验行为
- 保证后续能分析用户浏览过程

推荐 Prompt：

```text
请在当前项目里加入实验行为记录功能。
要求记录：
1. page_view
2. 点击查看原始评论
3. 点击加载更多评论
4. 页面切到后台
5. 页面重新回到前台
6. 页面关闭或离开时的 session_end 总结

并且记录这些字段：
- uid
- session_id
- condition
- elapsed_seconds
- visible_seconds
- hidden_seconds
- review_panel_viewed
- review_visible_seconds
- load_more_clicks
- visible_review_count
- max_scroll_percent
- created_at

要求：
1. 前端自动上报
2. 后端提供 API 接口接收
3. 数据结构清晰，方便实验分析
```

---

## 5. 第四步：接入 Supabase

目标：

- 把行为数据真正落库
- 不只停留在本地文件

推荐 Prompt：

```text
请把当前项目的实验事件数据接入 Supabase。
要求：
1. 服务端写入，不暴露高权限 key 到前端
2. 帮我生成建表 SQL
3. 告诉我需要哪些环境变量
4. 默认优先写入 Supabase
5. 如果需要，保留本地 fallback 方案
```

### 需要保存的 Supabase 信息

- `Project URL`
- `Secret key (sb_secret_...)`
- 数据库表名：`experiment_events`

### 常用环境变量

```bash
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
EXPERIMENT_STORAGE_PREFIX=product-experiment
```

---

## 6. 第五步：先部署到 Vercel 快速验证

目标：

- 快速验证前后端和 Supabase 是否打通
- 先让整条链路跑通

推荐 Prompt：

```text
请把当前项目整理成可部署到 Vercel 的版本。
要求：
1. 检查 Next.js 项目是否能 build
2. 列出 Vercel 需要配置的环境变量
3. 告诉我如何连接 Supabase
4. 如果部署失败，帮助我逐步排查 build 日志
```

### Vercel 部署前要做的事

1. 先把代码 push 到 GitHub
2. 在 Vercel 导入仓库
3. 填好环境变量
4. 部署成功后访问页面测试
5. 去 Supabase 查看是否有记录写入

---

## 7. 第六步：如果中国大陆访问不稳定，再迁移阿里云

目标：

- 解决 `vercel.app` 在中国大陆访问不稳定的问题
- 用大陆服务器跑正式实验版本

推荐 Prompt：

```text
当前项目已经在 Vercel 可运行，但中国大陆访问不稳定。
请帮我迁移到阿里云服务器。
要求：
1. 选择适合的中国大陆服务器配置
2. 给出推荐地域、系统、配置
3. 使用 1Panel + Docker 部署
4. 保持项目继续连接 Supabase
5. 告诉我每一步该怎么做
```

### 已验证可用的服务器方案

```text
阿里云轻量应用服务器
中国内地
杭州
通用型
2核2G
Ubuntu 22.04
购买 1 年
```

---

## 8. 第七步：阿里云部署顺序

推荐固定顺序：

1. 买阿里云服务器
2. 查看公网 IP
3. 设置 root 密码
4. SSH 登录
5. 安装 Docker
6. 安装 1Panel
7. 在阿里云放行端口
8. 拉取 GitHub 仓库
9. 用 Docker / docker-compose 部署
10. 公网测试访问
11. 验证 Supabase 数据是否继续写入

### 常用端口

- `22`：SSH
- `3000`：当前网站端口
- `35954`：1Panel 面板端口
- 以后可扩展 `80`、`443`

---

## 9. 第八步：1Panel + Docker 部署

### 服务器上拉代码

```bash
cd /opt
git clone https://github.com/你的用户名/你的仓库.git
cd 你的仓库
```

### 当前项目路径

```bash
/opt/product-experiment-next
```

### 启动命令

```bash
cd /opt/product-experiment-next
docker-compose up -d --build
docker ps
```

### 如果以后更新代码

```bash
cd /opt/product-experiment-next
git pull
docker-compose down
docker-compose up -d --build
docker ps
```

### 查看日志

```bash
cd /opt/product-experiment-next
docker-compose logs --tail=100
docker-compose logs -f
```

---

## 10. 第九步：Credamo 嵌入链接

当前已验证可用的服务器地址：

```text
http://121.41.34.8:3000
```

### 四个实验条件版本

```text
http://121.41.34.8:3000/?condition=rating&uid={{user_id}}
http://121.41.34.8:3000/?condition=aigrs_positive&uid={{user_id}}
http://121.41.34.8:3000/?condition=aigrs_neutral&uid={{user_id}}
http://121.41.34.8:3000/?condition=aigrs_negative&uid={{user_id}}
```

如果 Credamo 的变量名不是 `{{user_id}}`，要替换成实际问卷变量名。

---

## 11. 本地开发与上线流程

### 本地电脑终端

```bash
cd /Users/linhaiting/Documents/codex/product-experiment-next
npm run dev
git add .
git commit -m "你的修改说明"
git push
```

### 服务器终端或 1Panel 终端

```bash
cd /opt/product-experiment-next
git pull
docker-compose down
docker-compose up -d --build
docker ps
```

规则：

- 改代码：在本地电脑改
- 提交代码：在本地电脑 push
- 更新线上：在服务器 pull + rebuild

---

## 12. 常改文件位置

### 页面展示

```text
components/experiment-page.tsx
```

### 商品信息、评论、AI 总结

```text
lib/reviews.ts
```

### 全局样式

```text
app/globals.css
```

### 埋点接口

```text
app/api/experiment/track/route.ts
```

### 数据落库逻辑

```text
lib/experiment-store.ts
lib/supabase.ts
```

---

## 13. 需要长期保存的账号与凭据

### 必须保存

- 阿里云公网 IP
- 阿里云 root 密码
- 1Panel 地址
- 1Panel 用户名
- 1Panel 密码
- GitHub 仓库地址
- GitHub Token
- Supabase Project URL
- Supabase Secret Key
- 本地项目路径
- 服务器项目路径

### 强烈建议保存到密码管理器或私密文档

可建立如下模板：

```text
项目名称：

阿里云
- 公网 IP:
- root 密码:
- 地域:
- 实例名称:

1Panel
- 地址:
- 用户名:
- 密码:

Supabase
- Project URL:
- Secret key:

GitHub
- 仓库地址:
- 用户名:
- Token:

路径
- 本地目录:
- 服务器目录:
```

---

## 14. 上线前检查清单

在正式嵌入问卷前，建议逐项检查：

1. 页面能否在目标网络环境打开
2. 四个 `condition` 链接是否都正常
3. `uid` 是否能写入数据库
4. `page_view` 是否落库
5. `session_end` 是否落库
6. 评论区行为是否记录
7. Supabase 中是否能按 `uid` 或 `session_id` 查到记录
8. Credamo 外链关闭后是否不影响问卷流程

推荐 Prompt：

```text
请帮我做上线前检查清单。
目标：把实验网页嵌入 Credamo。
请检查：
1. 四个 condition 链接是否正确
2. uid 参数是否能写入数据库
3. session_end 是否能落库
4. 页面是否适合问卷外链嵌入
5. 是否还需要删除或隐藏任何多余按钮
```

---

## 15. 一句话总结

推荐固定心智模型：

- 先做 HTML 原型
- 再做工程化重构
- 再接 Supabase
- 先用 Vercel 快速验证
- 再迁移阿里云中国大陆服务器
- 最后固定为“本地改代码 + GitHub + 服务器更新”的长期流程
