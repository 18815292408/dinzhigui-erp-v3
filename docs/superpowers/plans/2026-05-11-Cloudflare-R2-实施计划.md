# Cloudflare R2 接入实施计划

## 任务清单

### 任务 1：安装 AWS SDK 依赖
- **文件**：`package.json`
- **操作**：`npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner`
- **验证**：`node -e "require('@aws-sdk/client-s3')"` 不报错

### 任务 2：更新环境变量模板
- **文件**：`.env.local.example`
- **操作**：添加 R2 相关环境变量
- **验证**：模板包含所有 R2 配置项

### 任务 3：创建 R2 客户端
- **文件**：`src/lib/r2/client.ts`
- **功能**：
  - 初始化 S3Client（R2 兼容）
  - 环境变量校验
  - 单例导出
- **验证**：客户端能正确初始化

### 任务 4：创建 R2 上传服务
- **文件**：`src/lib/r2/upload.ts`
- **功能**：
  - `generateUploadUrl(path)` - 生成预签名上传 URL（有效期1小时）
  - `uploadFile(buffer, path, contentType)` - 服务端直接上传
  - `getPublicUrl(path)` - 获取公开访问 URL
- **验证**：单元测试通过

### 任务 5：创建 R2 下载服务
- **文件**：`src/lib/r2/download.ts`
- **功能**：
  - `generateDownloadUrl(path)` - 生成预签名下载 URL
- **验证**：单元测试通过

### 任务 6：创建 R2 删除服务
- **文件**：`src/lib/r2/delete.ts`
- **功能**：
  - `deleteFile(path)` - 删除单个文件
- **验证**：单元测试通过

### 任务 7：修改上传签名 API
- **文件**：`src/app/api/upload/sign/route.ts`
- **改动**：
  - 使用 R2 `generateUploadUrl` 替代 Supabase `createSignedUploadUrl`
  - 返回格式保持兼容：`{ signedUrl, publicUrl, filename }`
- **验证**：API 返回正确的预签名 URL

### 任务 8：修改直传上传 API
- **文件**：`src/app/api/upload/route.ts`
- **改动**：
  - 使用 R2 `uploadFile` 替代 Supabase `storage.upload`
  - 文件大小限制提升至 500MB
- **验证**：能成功上传文件到 R2

### 任务 9：修改前端文件大小限制
- **文件**：`src/components/designs/design-edit-form.tsx`
- **改动**：
  - `maxSize` 从 150MB 改为 500MB
  - 提示文字更新
- **验证**：前端允许选择 500MB 文件

### 任务 10：编写单元测试
- **文件**：`src/lib/r2/__tests__/client.test.ts`
- **文件**：`src/lib/r2/__tests__/upload.test.ts`
- **文件**：`src/lib/r2/__tests__/download.test.ts`
- **文件**：`src/lib/r2/__tests__/delete.test.ts`
- **验证**：`npm test` 通过

### 任务 11：编写集成测试
- **文件**：`src/app/api/upload/__tests__/route.test.ts`
- **验证**：上传流程端到端测试通过

### 任务 12：代码审查
- **检查项**：
  - 环境变量是否正确处理
  - 错误处理是否完善
  - 类型定义是否准确
  - 是否遵循现有代码风格

### 任务 13：运行测试验证
- **命令**：`npm run test` 和 `npm run lint`
- **验证**：全部通过

### 任务 14：编写 API 文档
- **文件**：`docs/superpowers/plans/2026-05-11-Cloudflare-R2-API文档.md`
- **内容**：接口说明、环境变量配置、故障处理

---

## 文件变更清单

| 操作 | 文件路径 | 说明 |
|------|----------|------|
| 修改 | `package.json` | 新增 AWS SDK 依赖 |
| 修改 | `.env.local.example` | 新增 R2 环境变量 |
| 新增 | `src/lib/r2/client.ts` | R2 S3 客户端 |
| 新增 | `src/lib/r2/upload.ts` | 上传服务 |
| 新增 | `src/lib/r2/download.ts` | 下载服务 |
| 新增 | `src/lib/r2/delete.ts` | 删除服务 |
| 新增 | `src/lib/r2/index.ts` | 统一导出 |
| 修改 | `src/app/api/upload/sign/route.ts` | 改用 R2 预签名 URL |
| 修改 | `src/app/api/upload/route.ts` | 改用 R2 上传，500MB 限制 |
| 修改 | `src/components/designs/design-edit-form.tsx` | 500MB 限制 |
| 新增 | `src/lib/r2/__tests__/client.test.ts` | 客户端单元测试 |
| 新增 | `src/lib/r2/__tests__/upload.test.ts` | 上传单元测试 |
| 新增 | `src/lib/r2/__tests__/download.test.ts` | 下载单元测试 |
| 新增 | `src/lib/r2/__tests__/delete.test.ts` | 删除单元测试 |
| 新增 | `docs/superpowers/plans/2026-05-11-Cloudflare-R2-API文档.md` | API 文档 |

---

## 验证标准

- [ ] 500MB 文件上传成功
- [ ] 上传进度可实时显示
- [ ] 上传失败有明确错误提示
- [ ] 文件下载链接可正常访问
- [ ] 旧 Supabase 文件仍可下载
- [ ] 单元测试全部通过
- [ ] 集成测试全部通过
- [ ] Lint 无错误
