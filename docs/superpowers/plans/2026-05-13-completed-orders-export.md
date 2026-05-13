# 已完成订单导出功能实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking
> **设计文档**: `docs/superpowers/specs/2026-05-13-completed-orders-export-design.md`

---

## Goal

在 `/completed-orders` 页面实现已完成订单导出功能：
- **单个导出**：订单详情页增加"导出订单"按钮
- **批量导出**：订单列表页增加复选框 + "导出选中订单"按钮
- **导出内容**：ZIP 文件，包含 Excel 汇总表 + CAD 图纸等附件
- **后端 API**：`POST /api/orders/export`，使用 `exceljs` + `archiver` 生成 ZIP

---

## File Structure

### 新增文件

| 文件 | 职责 |
|------|------|
| `src/app/api/orders/export/route.ts` | 导出 API：验证权限、查询数据、调用 builder 生成 ZIP |
| `src/lib/export/feedback-utils.ts` | 提取 `normalizeFeedbackRecords` 函数（从 `installation-feedback.tsx`）供 API 使用 |
| `src/lib/export/excel-builder.ts` | Excel 生成器：创建工作簿、填充数据、应用样式 |
| `src/lib/export/zip-builder.ts` | ZIP 打包器：流式生成 ZIP（Excel + 附件） |
| `src/components/orders/order-export-button.tsx` | 单个导出按钮组件（详情页使用） |
| `src/components/orders/order-export-toolbar.tsx` | 批量导出工具栏（列表页使用，含全选、计数、导出按钮） |

### 修改文件

| 文件 | 修改内容 |
|------|---------|
| `package.json` | 添加 `exceljs`、`archiver`、`@types/archiver` 依赖 |
| `src/app/(dashboard)/completed-orders/completed-orders-client.tsx` | 引入 `OrderExportToolbar`，管理选中状态 |
| `src/components/orders/completed-order-list.tsx` | 增加复选框、支持 `selectedIds` / `onSelectChange` props |
| `src/app/(dashboard)/completed-orders/[id]/page.tsx` | 增加单个导出按钮 |

---

## Prerequisites

- Node.js 环境已配置
- Supabase 数据库可访问
- R2 云存储配置正常（`lib/r2/` 已有 client、upload、download）

---

## Implementation Steps

### Step 1: 安装依赖

```bash
npm install exceljs archiver
npm install -D @types/archiver
```

验证：`npm ls exceljs archiver`

### Step 2: 提取 feedback 工具函数

新建 `src/lib/export/feedback-utils.ts`：
- 从 `src/components/installations/installation-feedback.tsx` 复制 `normalizeFeedbackRecords` 函数
- 导出 `FeedbackEntry` interface 和 `normalizeFeedbackRecords` 函数
- 注意：不要修改原文件，仅复制提取

### Step 3: 实现 Excel 生成器

新建 `src/lib/export/excel-builder.ts`：
- 导出函数 `buildOrdersExcel(orders: ExportOrder[]): Promise<ExcelJS.Buffer>`
- `ExportOrder` 类型需包含所有要导出的字段（见设计文档）
- 表头样式：背景 `#059669`、白色粗体、冻结首行
- 数据行：交替色（白 / `#f0fdf4`）、细边框 `#e5e7eb`、11px 字体
- 列宽：金额列 15 右对齐、日期列 20 居中、文本列自适应（12~40）
- 工作表名：`订单汇总`
- 处理空值：统一显示为 `-`
- factory_records 和 feedback 数组需展平为文本（如 `"工厂A: ¥5000; 工厂B: ¥3000"`）

### Step 4: 实现 ZIP 打包器

新建 `src/lib/export/zip-builder.ts`：
- 导出函数 `buildOrdersZip(options: { excelBuffer: Buffer; attachments: AttachmentInfo[] }): Promise<Buffer>`
- `AttachmentInfo` 类型：`{ orderNo: string; fileName: string; fileBuffer: Buffer }`
- 使用 `archiver` 流式生成 ZIP
- ZIP 结构：
  ```
  订单汇总表.xlsx
  订单附件/
    {orderNo}/
      {fileName}
  ```
- 附件文件夹命名：清理订单号中的非法字符（`/`、`\`、`: ` 等）

### Step 5: 实现导出 API

新建 `src/app/api/orders/export/route.ts`：
- `POST` 方法，接收 `{ orderIds: string[] }`
- 权限验证：解析 session，获取 `organization_id`
- 数据查询：
  - 查询 `orders` 表，筛选 `id IN orderIds` + `organization_id = user.orgId` + `status IN ('completed', 'cancelled')`
  - 并行查询 `designs`（含 `cad_file`, `cad_file_url`, `kujiale_link`）、`installations`（含 `after_sales_feedback`）、`users`（解析姓名）
- 数据组装：将用户 UUID 映射为 display_name
- 下载附件：
  - 遍历每个订单的 `design.cad_file`
  - 使用 `generateDownloadUrl` 获取预签名 URL
  - 使用 `fetch` 下载文件 Buffer
  - 限制并发数为 5（使用 `p-limit` 或手动控制）
- 生成 Excel：调用 `buildOrdersExcel`
- 生成 ZIP：调用 `buildOrdersZip`
- 返回 ZIP 流：
  ```ts
  return new NextResponse(zipBuffer, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="已完成订单导出_${date}.zip"`,
    },
  })
  ```
- 错误处理：
  - 400：`orderIds` 为空
  - 403：订单不属于当前组织
  - 500：生成失败，返回 `{ error: string }`

### Step 6: 实现批量导出 UI（列表页）

修改 `src/components/orders/completed-order-list.tsx`：
- 新增 props：`selectedIds: string[]`、`onSelectChange: (id: string, checked: boolean) => void`
- 在每个订单卡片左上角增加 `Checkbox`（`shadcn/ui` 组件）
- 复选框状态由父组件管理

新建 `src/components/orders/order-export-toolbar.tsx`：
- Props：`selectedCount: number`、`totalCount: number`、`onSelectAll: () => void`、`onExport: () => void`、`isExporting: boolean`
- 布局：左侧全选复选框 + "已选择 X / Y 个订单" 文本，右侧"导出选中订单"按钮
- 按钮使用 `Download` icon + `Button` 组件
- 未选择时按钮 `disabled`
- 导出中时按钮显示 `Loader2` 旋转图标

修改 `src/app/(dashboard)/completed-orders/completed-orders-client.tsx`：
- 增加 `selectedIds` state
- 增加 `handleSelectChange`、`handleSelectAll`、`handleExport` 函数
- `handleExport`：调用 `fetch('/api/orders/export', { method: 'POST', body: JSON.stringify({ orderIds: selectedIds }) })`，获取 blob 后使用 `URL.createObjectURL` 触发下载
- 在 `Tabs` 下方插入 `OrderExportToolbar`
- 将 `selectedIds` 和 `onSelectChange` 传给 `CompletedOrderList`

### Step 7: 实现单个导出 UI（详情页）

新建 `src/components/orders/order-export-button.tsx`：
- Props：`orderId: string`、`variant?: 'default' \| 'outline'`
- 按钮文案：`导出订单`，icon：`Download`
- 点击后调用 `fetch('/api/orders/export', ...)` 下载 ZIP
- 加载状态：`isExporting` 时显示旋转图标

修改 `src/app/(dashboard)/completed-orders/[id]/page.tsx`：
- 在标题栏（`<BackButton>` 右侧）插入 `OrderExportButton`
- 传入 `orderId={params.id}`

### Step 8: 运行 TypeScript 检查

```bash
npx tsc --noEmit
```
修复所有类型错误。

### Step 9: 运行 Next.js 构建

```bash
npm run build
```
确保构建通过。

### Step 10: 手动测试验证

1. 打开 `/completed-orders`
2. 勾选 1~3 个已完成订单
3. 点击"导出选中订单"，确认 ZIP 下载成功
4. 解压 ZIP，检查：
   - Excel 表格包含所有字段
   - 表格样式正确（绿色表头、交替行）
   - 附件文件夹存在且文件可打开
5. 进入某个已完成订单详情页
6. 点击"导出订单"，确认单个导出正常
7. 测试边界情况：
   - 未勾选订单时按钮禁用
   - 订单无附件时 ZIP 仅含 Excel
   - 网络错误时显示友好提示

---

## Testing Checklist

- [ ] 依赖安装成功
- [ ] `tsc --noEmit` 无错误
- [ ] `npm run build` 成功
- [ ] 批量导出 ZIP 格式正确
- [ ] 单个导出 ZIP 格式正确
- [ ] Excel 表格样式符合设计
- [ ] 附件下载完整
- [ ] 无附件订单导出正常
- [ ] 权限验证生效（跨组织订单无法导出）
- [ ] 空选择时按钮禁用

---

## Notes

- **数据库类型**：`src/types/database.ts` 缺少 `cad_file`、`cad_file_url`、`kujiale_link`、`after_sales_feedback` 等字段，实现时使用 `any` 或类型断言
- **反馈数据**：`installation.feedback` 和 `after_sales_feedback` 可能是 JSON 字符串，需用 `normalizeFeedbackRecords` 规范化
- **并发控制**：附件下载限制并发数为 5，避免 R2 限流
- **内存管理**：ZIP 和 Excel 都使用流式处理，但小量订单（<50）可以直接生成 Buffer
- **日期格式**：Excel 中日期统一使用 `YYYY-MM-DD HH:mm:ss` 格式
- **金额格式**：使用 `¥#,##0.00` 格式

---

*实施计划完成*
