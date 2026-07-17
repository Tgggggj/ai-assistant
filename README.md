<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# 笔试 AI 助手全栈应用

这是一个 Vite + React 前端和 Express + Supabase 后端组成的一体化应用。

View your app in AI Studio: https://ai.studio/apps/f4e42d5b-347f-4d03-989b-a0ce78eaed5d

## Run Locally

**Prerequisites:** Node.js、Supabase 项目

1. 在 Supabase SQL Editor 中执行 `supabase/schema.sql`，创建表并写入演示数据。
2. 复制 `.env.example` 为 `.env.local`，填写：
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - 可选：`PORT`、`VITE_API_BASE_URL`、`VITE_API_PROXY_TARGET`
3. 安装依赖：
   `npm install`
4. 同时启动前端和后端：
   `npm run dev:full`
5. 打开：
   `http://localhost:3000`

## API

后端默认运行在 `http://localhost:8787`，Vite 会把 `/api/*` 代理过去。

- `GET /api/dashboard`
- `PATCH /api/profile`
- `GET /api/practice/session`
- `POST /api/practice/submit`
- `GET /api/mistakes`
- `GET /api/camera/analysis`
- `POST /api/mistakes/from-scan`
- `POST /api/camera/search-similar`

## Production

1. 构建前端：
   `npm run build`
2. 启动 Express：
   `npm start`

当 `dist/index.html` 存在时，Express 会同时托管前端静态文件和 `/api/*` 后端接口。
