# Cloudflare R2 接入方案设计

## 1. 项目背景与目标

### 背景
- 当前使用 Supabase Storage，免费额度仅 1GB，单文件限制 50MB（实际配置 150MB）
- CAD 文件普遍较大，需支持最大 500MB 上传
- 下载流量费用随用户增长而增加

### 目标
- 迁移文件存储至 Cloudflare R2
- 支持单文件最大 500MB 上传
- 降低存储和流量成本
- 保持现有上传接口和前端交互不变

---

## 2. Cloudflare R2 特性分析

| 特性 | 详情 |
|------|------|
| 免费额度 | 10GB 存储/月，出口流量**完全免费** |
| 单文件限制 | 最大 5TB |
| API 兼容性 | 完全兼容 AWS S3 API |
| 接入方式 | S3 SDK (`@aws-sdk/client-s3`) |
| 预签名 URL | 支持，用于前端直传 |
| 国内访问 | 需绑定自定义域名（推荐） |
| 超量费用 | 存储 $0.015/GB/月 |

---

## 3. 架构设计

### 3.1 数据流设计

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   前端组件   │────▶│  /api/upload/sign │────▶│  R2 预签名 URL  │
│ (设计表单)   │     │  (Next.js API)    │     │  (有效期1小时)   │
└─────────────┘     └──────────────────┘     └─────────────────┘
       │                                              │
       │                                              │
       │         直传文件（绕过 Vercel 限制）            │
       │                                              │
       └──────────────────────────────────────────────┘
```

### 3.2 文件命名策略

- 格式：`{organization_id}/{timestamp}-{safe_filename}`
- 示例：`org_123/1685000000000-design_v1.dwg`
- 目的：避免文件名冲突，支持按组织隔离

### 3.3 存储桶策略

- 存储桶名称：`cad-files`（与现有 Supabase bucket 同名，便于迁移）
- 访问控制：私有（通过预签名 URL 访问）
- CORS 配置：允许前端域名 PUT/GET 请求

---

## 4. 环境变量配置

```env
# Cloudflare R2 配置
R2_ACCOUNT_ID=your-cloudflare-account-id
R2_ACCESS_KEY_ID=your-r2-access-key-id
R2_SECRET_ACCESS_KEY=your-r2-secret-access-key
R2_BUCKET_NAME=cad-files
R2_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
R2_PUBLIC_URL=https://pub-your-custom-domain.r2.dev  # 可选，自定义域名
```

---

## 5. 核心功能模块

### 5.1 R2 客户端 (`src/lib/r2/client.ts`)
- 初始化 S3Client（R2 兼容）
- 环境变量校验
- 单例模式

### 5.2 上传服务 (`src/lib/r2/upload.ts`)
- `generateUploadUrl(path)` - 生成预签名上传 URL
- `uploadFile(buffer, path)` - 服务端直接上传
- `getPublicUrl(path)` - 获取公开访问 URL

### 5.3 下载服务 (`src/lib/r2/download.ts`)
- `generateDownloadUrl(path)` - 生成预签名下载 URL
- `getFileStream(path)` - 获取文件流（服务端代理下载）

### 5.4 删除服务 (`src/lib/r2/delete.ts`)
- `deleteFile(path)` - 删除单个文件
- `deleteFiles(paths[])` - 批量删除

---

## 6. API 接口设计

### 6.1 现有接口保持不变

| 接口 | 方法 | 功能 | 改动 |
|------|------|------|------|
| `/api/upload/sign` | POST | 获取上传签名 URL | 内部改为 R2 预签名 URL |
| `/api/upload` | POST | 直传文件（小文件） | 内部改为上传到 R2 |

### 6.2 新增接口

| 接口 | 方法 | 功能 |
|------|------|------|
| `/api/files/delete` | POST | 删除 R2 文件 |
| `/api/files/download` | GET | 获取预签名下载链接 |

---

## 7. 前端改动

### 7.1 上传流程（保持不变）
1. 选择文件 → 校验大小（提升至 500MB）
2. 调用 `/api/upload/sign` 获取预签名 URL
3. 使用 `fetch(PUT)` 直传到 R2
4. 保存返回的 `publicUrl`

### 7.2 下载流程
- 直接使用 `cad_file_url`（R2 公开 URL 或预签名 URL）

---

## 8. 安全策略

### 8.1 预签名 URL
- 有效期：1 小时
- 仅允许 PUT/GET 特定路径

### 8.2 CORS 配置
```xml
<CORSConfiguration>
  <CORSRule>
    <AllowedOrigin>*</AllowedOrigin>
    <AllowedMethod>PUT</AllowedMethod>
    <AllowedMethod>GET</AllowedMethod>
    <AllowedHeader>*</AllowedHeader>
    <MaxAgeSeconds>3600</MaxAgeSeconds>
  </CORSRule>
</CORSConfiguration>
```

### 8.3 权限隔离
- 文件路径包含 `organization_id`
- API 层校验用户是否有权访问该组织

---

## 9. 迁移策略

### 9.1 渐进式迁移
1. 新文件写入 R2
2. 旧 Supabase 文件保持只读
3. `cad_file_url` 字段兼容两种 URL 格式

### 9.2 数据兼容
- 数据库字段无需改动
- 根据 URL 域名判断存储来源

---

## 10. 测试策略

### 10.1 单元测试
- R2 客户端初始化
- 预签名 URL 生成
- 文件路径生成逻辑

### 10.2 集成测试
- 实际上传 1MB / 100MB / 500MB 文件
- 下载链接有效性验证
- 删除操作验证

### 10.3 回归测试
- 现有设计表单功能不受影响
- 旧 Supabase 文件仍可下载

---

## 11. 风险与应对

| 风险 | 应对措施 |
|------|----------|
| R2 预签名 URL 生成失败 | 降级到服务端代理上传 |
| 文件迁移期间数据不一致 | 保持双写一段时间 |
| 自定义域名未配置 | 使用 R2 默认 `r2.dev` 域名 |
| 网络超时（大文件） | 前端增加重试机制 |

---

## 12. 实施步骤概览

1. 安装 `@aws-sdk/client-s3` 和 `@aws-sdk/s3-request-presigner`
2. 配置环境变量
3. 实现 R2 客户端和服务层
4. 修改 `/api/upload/sign` 使用 R2
5. 修改 `/api/upload` 使用 R2
6. 前端提升文件大小限制至 500MB
7. 编写测试
8. 编写文档
