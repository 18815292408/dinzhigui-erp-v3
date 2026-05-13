# Cloudflare R2 集成 API 文档

## 概述

本文档描述 Cloudflare R2 存储服务与方案管理系统的集成方式，包括 API 接口、环境变量配置和故障处理指南。

---

## 环境变量配置

在项目根目录创建 `.env.local` 文件，添加以下配置：

```env
# Cloudflare R2 配置（必填）
R2_ACCOUNT_ID=your-cloudflare-account-id
R2_ACCESS_KEY_ID=your-r2-access-key-id
R2_SECRET_ACCESS_KEY=your-r2-secret-access-key
R2_BUCKET_NAME=cad-files

# Cloudflare R2 配置（可选）
# R2_PUBLIC_URL=https://cdn.yourdomain.com  # 自定义域名，未配置则使用 r2.dev
```

### 获取方式

1. **R2_ACCOUNT_ID**
   - 登录 Cloudflare Dashboard
   - 右侧边栏查看 **Account ID**

2. **R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY**
   - 进入 R2 管理页面
   - 点击 **Manage R2 API Tokens**
   - 创建新的 API Token，选择 **Object Read & Write** 权限
   - 复制 **Access Key ID** 和 **Secret Access Key**

3. **R2_BUCKET_NAME**
   - 在 R2 中创建存储桶，建议使用 `cad-files`
   - 或直接使用已有的存储桶名称

4. **R2_PUBLIC_URL**（可选）
   - 配置自定义域名后填写
   - 未配置时系统会自动使用 `{bucket-name}.r2.dev` 域名

---

## API 接口

### 1. 获取上传签名 URL

**接口**：`POST /api/upload/sign`

**功能**：生成 R2 预签名上传 URL，用于前端直传文件（绕过 Vercel 4.5MB 限制）

**请求头**：
```
Content-Type: application/json
Cookie: session=xxx
```

**请求体**：
```json
{
  "filename": "design_v1.dwg"
}
```

**响应**：
```json
{
  "signedUrl": "https://account-id.r2.cloudflarestorage.com/cad-files/org_123/1685000000000-design_v1.dwg?X-Amz-Algorithm=...",
  "publicUrl": "https://cad-files.r2.dev/org_123/1685000000000-design_v1.dwg",
  "path": "org_123/1685000000000-design_v1.dwg",
  "filename": "design_v1.dwg"
}
```

**错误响应**：
```json
{
  "error": "请先登录"
}
```

**使用流程**：
1. 前端调用此接口获取 `signedUrl`
2. 使用 `fetch(PUT)` 将文件直传到 `signedUrl`
3. 保存返回的 `publicUrl` 到数据库

---

### 2. 直传上传文件

**接口**：`POST /api/upload`

**功能**：服务端代理上传文件到 R2（适用于小文件或需要服务端处理的场景）

**请求头**：
```
Content-Type: multipart/form-data
Cookie: session=xxx
```

**请求体**：
```
file: (二进制文件数据)
```

**响应**：
```json
{
  "url": "https://cad-files.r2.dev/org_123/1685000000000-design_v1.dwg",
  "filename": "design_v1.dwg",
  "path": "org_123/1685000000000-design_v1.dwg"
}
```

**限制**：
- 最大文件大小：**500MB**
- 支持的文件类型：`.dwg`, `.dxf`, `.pdf`, `.jpg`, `.jpeg`, `.png`, `.gif`, `.bmp`, `.doc`, `.docx`, `.xls`, `.xlsx`, `.ppt`, `.pptx`, `.txt`, `.zip`, `.rar`, `.7z`, `.mp3`, `.mp4`, `.svg`, `.ai`, `.psd`

---

### 3. 获取下载链接

**接口**：`GET /api/files/download?path={file_path}`

**功能**：生成预签名下载 URL（有效期 1 小时）

**请求头**：
```
Cookie: session=xxx
```

**查询参数**：
```
path: org_123/1685000000000-design_v1.dwg
```

**响应**：
```json
{
  "url": "https://account-id.r2.cloudflarestorage.com/cad-files/org_123/...?X-Amz-Algorithm=..."
}
```

---

### 4. 删除文件

**接口**：`POST /api/files/delete`

**功能**：从 R2 删除指定文件

**请求头**：
```
Content-Type: application/json
Cookie: session=xxx
```

**请求体**：
```json
{
  "path": "org_123/1685000000000-design_v1.dwg"
}
```

**响应**：
```json
{
  "success": true
}
```

---

## 前端使用示例

### 上传文件

```typescript
async function uploadFile(file: File) {
  // 1. 获取预签名 URL
  const signRes = await fetch('/api/upload/sign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ filename: file.name }),
  })

  const { signedUrl, publicUrl, path } = await signRes.json()

  // 2. 直传到 R2
  await fetch(signedUrl, {
    method: 'PUT',
    body: file,
  })

  // 3. 保存 publicUrl
  return { url: publicUrl, path }
}
```

### 下载文件

```typescript
async function downloadFile(path: string) {
  const res = await fetch(`/api/files/download?path=${encodeURIComponent(path)}`, {
    credentials: 'include',
  })
  const { url } = await res.json()
  window.open(url, '_blank')
}
```

---

## 核心模块说明

### R2 客户端 (`src/lib/r2/client.ts`)

```typescript
import { getR2Client, getR2BucketName, getR2PublicUrl } from '@/lib/r2/client'

// 获取 S3Client 实例（单例）
const client = getR2Client()

// 获取存储桶名称
const bucket = getR2BucketName()

// 获取自定义域名（可能为 undefined）
const publicUrl = getR2PublicUrl()
```

### 上传服务 (`src/lib/r2/upload.ts`)

```typescript
import { generateUploadUrl, uploadFile, getPublicUrl } from '@/lib/r2/upload'

// 生成预签名上传 URL
const { signedUrl, publicUrl } = await generateUploadUrl('org_123/file.dwg')

// 服务端直接上传
const result = await uploadFile(buffer, 'org_123/file.dwg', 'application/octet-stream')

// 获取公开访问 URL
const url = getPublicUrl('org_123/file.dwg')
```

### 下载服务 (`src/lib/r2/download.ts`)

```typescript
import { generateDownloadUrl } from '@/lib/r2/download'

const url = await generateDownloadUrl('org_123/file.dwg')
```

### 删除服务 (`src/lib/r2/delete.ts`)

```typescript
import { deleteFile, deleteFiles } from '@/lib/r2/delete'

// 删除单个文件
await deleteFile('org_123/file.dwg')

// 批量删除
await deleteFiles(['org_123/file1.dwg', 'org_123/file2.dwg'])
```

---

## 故障处理指南

### 常见问题

#### 1. 预签名 URL 生成失败

**现象**：调用 `/api/upload/sign` 返回 500 错误

**排查步骤**：
1. 检查 `.env.local` 中 R2 环境变量是否配置正确
2. 确认 `R2_ACCOUNT_ID`、`R2_ACCESS_KEY_ID`、`R2_SECRET_ACCESS_KEY` 无误
3. 检查 API Token 是否有 **Object Read & Write** 权限
4. 查看服务器日志获取详细错误信息

**解决方案**：
```bash
# 验证环境变量
echo $R2_ACCOUNT_ID
echo $R2_ACCESS_KEY_ID
```

#### 2. 文件上传失败（CORS 错误）

**现象**：前端直传时报 CORS 错误

**原因**：R2 存储桶 CORS 配置未正确设置

**解决方案**：
在 Cloudflare R2 控制台中为存储桶配置 CORS：
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

#### 3. 文件大小超限

**现象**：上传大文件时失败

**排查**：
- 前端限制：500MB
- R2 限制：单文件最大 5TB（无限制）
- Vercel 限制：已绕过（使用预签名 URL 直传）

**解决方案**：
确认文件大小不超过 500MB，如需要更大请修改前端和 API 限制。

#### 4. 下载链接失效

**现象**：预签名下载 URL 返回 403

**原因**：预签名 URL 已过期（默认 1 小时）

**解决方案**：
重新调用 `/api/files/download` 获取新的预签名 URL。

#### 5. 环境变量未配置

**现象**：服务器启动时报错 `R2 环境变量未配置`

**解决方案**：
确保 `.env.local` 文件存在且包含所有必需的 R2 配置项。

---

## 迁移说明

### 从 Supabase 迁移到 R2

1. **新文件**：自动写入 R2
2. **旧文件**：Supabase 中的文件保持只读，仍可正常访问
3. **数据库**：`cad_file_url` 字段兼容两种 URL 格式，无需修改

### 双写策略（可选）

如需保证数据安全，可在过渡期内同时写入 Supabase 和 R2：

```typescript
// 同时上传到 Supabase 和 R2
await Promise.all([
  supabase.storage.from('cad-files').upload(path, buffer),
  uploadFile(buffer, path, contentType),
])
```

---

## 性能优化建议

1. **使用自定义域名**：在 Cloudflare 中配置自定义域名，提升国内访问速度
2. **启用 CDN**：R2 自带 Cloudflare CDN 加速
3. **预签名 URL 缓存**：前端可缓存预签名 URL，避免频繁调用 API
4. **分片上传**：对于超大文件（>100MB），建议实现分片上传

---

## 安全建议

1. **API Token 权限**：仅授予 **Object Read & Write**，不要授予其他权限
2. **预签名 URL 有效期**：保持 1 小时，不要过长
3. **文件路径隔离**：使用 `organization_id` 前缀隔离不同租户的数据
4. **定期轮换密钥**：建议每 3-6 个月轮换一次 R2 API Token
