# 部署指南

## 环境准备

### 1. Supabase 项目设置

1. 在 [Supabase](https://supabase.com) 创建项目
2. 获取项目 URL 和 `anon/public` key
3. 获取 `service_role` key（用于 Edge Functions）

### 2. DeepSeek API

1. 在 [DeepSeek](https://platform.deepseek.com) 注册账号
2. 创建 API Key

### 3. 数据库迁移

在 Supabase Dashboard 的 SQL Editor 中运行：

```sql
-- 复制 supabase/migrations/001_initial_schema.sql 的内容并执行
```

### 4. 配置环境变量

创建 `.env.local`：

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
DEEPSEEK_API_KEY=your-deepseek-api-key
```

### 5. 部署 Edge Function

```bash
supabase login
supabase init
supabase functions deploy analyze-intention
```

### 6. 部署到 Vercel

```bash
npm i -g vercel
vercel
```

按照提示连接 GitHub 仓库并配置环境变量。

### 7. 配置 Supabase Auth Redirect

在 Supabase Dashboard → Authentication → URL Configuration 中添加：

- Site URL: 你的 Vercel 部署 URL
- Redirect URLs: 你的 Vercel 部署 URL + /auth/callback

## 本地开发

```bash
npm install
npm run dev
```
