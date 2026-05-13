# 已完成订单导出功能设计文档

> **日期**: 2026-05-13
> **功能**: 已完成订单信息导出（Excel + ZIP）
> **状态**: 待审核

---

## 1. 需求概述

在 `/completed-orders` 已完成订单页面增加导出功能，支持：
- **单个订单导出**：在订单详情页点击"导出订单"按钮，导出该订单的全部信息
- **批量订单导出**：在订单列表页勾选多个订单，点击"导出选中订单"按钮，批量导出

导出内容为 **ZIP 压缩包**，包含：
1. `订单汇总表.xlsx` — 所有选中订单的完整信息表格
2. `订单附件/` — 按订单号分文件夹存放的 CAD 图纸等附件

---

## 2. 技术选型

| 用途 | 库 | 版本 | 说明 |
|------|-----|------|------|
| 生成 Excel | `exceljs` | ^4.4.0 | 样式支持完善，支持中文，支持流式写入 |
| 生成 ZIP | `archiver` | ^7.0.0 | 流式生成 ZIP，内存友好，支持大文件 |
| R2 文件下载 | 现有 `lib/r2/download.ts` | - | 复用现有预签名 URL 逻辑 |

安装命令：
```bash
npm install exceljs archiver
npm install -D @types/archiver
```

---

## 3. 数据模型

### 3.1 订单完整数据结构

基于现有 `Order`、`Design`、`Installation` 类型，导出表格包含以下字段：

**基本信息组**
- 订单号 (`order_no`)
- 客户姓名 (`customer_name`)
- 联系电话 (`customer_phone`)
- 地址 (`customer_address`)
- 房型 (`house_type`)
- 面积 (`house_area`)

**订单信息组**
- 签单金额 (`signed_amount`)
- 最终金额 (`final_order_amount`)
- 付款状态 (`payment_status`)
- 创建时间 (`created_at`)
- 完成时间 (`completed_at`)
- 订单状态 (`status`)

**人员信息组**
- 创建人 (`created_by` → 查询 `users.display_name`)
- 设计师 (`assigned_designer` → 查询 `users.display_name`)
- 安装师 (`assigned_installer` → 查询 `users.display_name`)

**方案信息组**
- 方案名称 (`design.title`)
- 房间数 (`design.room_count`)
- 总面积 (`design.total_area`)
- 方案金额 (`design.final_price` 或 `design.price`)
- CAD图纸 (`design.cad_file` — R2 存储路径，通过 `/api/files/download` 下载)
- CAD图纸链接 (`design.cad_file_url` — 预签名 URL)
- 酷家乐链接 (`design.kujiale_link`)
- 方案描述 (`design.description`)
- 附件列表 (`design.attachments` — JSON 字符串，目前未在 UI 中上传文件，导出生时若为空则跳过)

**安装信息组**
- 安装状态 (`installation.status`)
- 安装完成时间 (`installation.completed_at`)
- 安装反馈 (`installation.feedback` — JSON 字符串/数组，需 normalize)
- 售后反馈 (`installation.after_sales_feedback` — JSON 字符串/数组，需 normalize)

**工厂信息**
- 工厂记录 (`factory_records` — JSON 数组，每个记录包含 `factory_name` 和 `amount`)

**其他**
- 备注 (`remarks` — JSON 数组)

---

## 4. UI 设计

### 4.1 列表页（批量导出）

在 `completed-orders-client.tsx` 中，Tabs 下方增加操作栏：

```
┌─────────────────────────────────────────────────────────┐
│  [已完成订单] [已退订订单]                                 │
├─────────────────────────────────────────────────────────┤
│  [ ] 全选    已选择 3 个订单    [导出选中订单 ↓]         │
├─────────────────────────────────────────────────────────┤
│  [☑] 订单卡片 1                                          │
│  [☑] 订单卡片 2                                          │
│  [ ] 订单卡片 3                                          │
└─────────────────────────────────────────────────────────┘
```

**交互细节**：
- 未选择订单时，"导出选中订单"按钮置灰（`disabled`）
- 勾选复选框后，按钮变为可用状态
- 点击按钮后显示加载状态（`Loading...`），后端生成 ZIP 后自动下载
- 每个订单卡片左上角放置 `Checkbox`（使用 `shadcn/ui` 的 `Checkbox` 组件）

### 4.2 详情页（单个导出）

在 `completed-orders/[id]/page.tsx` 中，标题栏右侧增加导出按钮：

```
┌─────────────────────────────────────────────────────────┐
│  [← 返回已完成订单]                    [导出订单 ↓]      │
│  已完成订单详情                                          │
│  O-20240101-001 · 张三                                   │
├─────────────────────────────────────────────────────────┤
│  ...                                                    │
└─────────────────────────────────────────────────────────┘
```

---

## 5. Excel 表格样式设计

使用 **exceljs** 库实现以下样式：

### 5.1 表头样式
- 背景色：`#059669`（主绿色）
- 字体：白色、粗体、12px、居中
- 冻结首行（滚动时表头固定）

### 5.2 数据行样式
- 交替行背景：白色 / `#f0fdf4`（极浅绿色）
- 字体：11px、黑色（`#1f2937`）
- 边框：所有单元格 1px 细边框，`#e5e7eb`

### 5.3 列宽与对齐
- 金额列（签单金额、最终金额、方案金额）：右对齐，列宽 15
- 文本列（客户姓名、地址等）：左对齐，列宽自适应（最小 12，最大 40）
- 日期列（创建时间、完成时间）：居中，列宽 20
- 数字列（面积、房间数）：居中，列宽 12

### 5.4 工作表结构
- **Sheet 名称**：`订单汇总`
- **表头行**：第 1 行（冻结）
- **数据行**：从第 2 行开始

---

## 6. ZIP 文件结构设计

```
已完成订单导出_2026-05-13_143052.zip
├── 订单汇总表.xlsx              ← 所有订单信息的 Excel 表格
└── 订单附件/
    ├── O-20240101-001/          ← 按订单号命名的文件夹
    │   ├── CAD图纸.dwg
    │   └── 效果图_1.png
    ├── O-20240101-002/
    │   ├── CAD图纸.dwg
    │   └── 附件.pdf
    └── ...
```

**说明**：
- 文件夹命名规则：`订单号/`（去除特殊字符）
- 文件命名规则：保留原始文件名，如果重名则加序号后缀
- 如果某个订单没有附件，不创建该订单的文件夹
- Excel 表格中附件列填写 ZIP 内的相对路径（如 `订单附件/O-20240101-001/CAD图纸.dwg`）

---

## 7. API 接口设计

### 7.1 请求

```http
POST /api/orders/export
Content-Type: application/json

{
  "orderIds": ["uuid-1", "uuid-2", "uuid-3"]
}
```

### 7.2 响应

成功时返回 ZIP 文件流：
```http
HTTP/1.1 200 OK
Content-Type: application/zip
Content-Disposition: attachment; filename="已完成订单导出_2026-05-13_143052.zip"

[binary zip data]
```

错误时返回 JSON：
```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "error": "未选择订单"
}
```

### 7.3 后端处理流程

1. **验证**：检查 session，获取用户 `organization_id`
2. **查询数据**：根据 `orderIds` 查询 orders 表，验证所有订单属于当前组织且状态为 `completed` 或 `cancelled`
3. **关联查询**：并行查询 designs、installations、users 表（users 用于解析创建人/设计师/安装师姓名）
4. **数据规范化**：使用 `normalizeFeedbackRecords` 函数处理 `feedback` 和 `after_sales_feedback`（支持 JSON 字符串和数组两种格式）
5. **生成 Excel**：使用 exceljs 创建工作簿，填充数据，应用样式
6. **下载附件**：遍历每个订单的 `design.cad_file`，使用 R2 预签名 URL 下载
7. **打包 ZIP**：使用 archiver 将 Excel 和附件打包成 ZIP 流
8. **返回响应**：设置响应头，返回 ZIP 流

---

## 8. 文件变更清单

### 8.1 新增文件

| 文件路径 | 说明 |
|---------|------|
| `src/app/api/orders/export/route.ts` | 导出 API 路由 |
| `src/lib/export/excel-builder.ts` | Excel 生成工具 |
| `src/lib/export/zip-builder.ts` | ZIP 打包工具 |
| `src/lib/export/feedback-utils.ts` | 反馈记录规范化工具（提取自 `installation-feedback.tsx`） |
| `src/components/orders/order-export-button.tsx` | 导出按钮组件（详情页用） |
| `src/components/orders/order-export-toolbar.tsx` | 批量导出工具栏（列表页用） |

### 8.2 修改文件

| 文件路径 | 修改内容 |
|---------|---------|
| `package.json` | 增加 `exceljs`、`archiver`、`@types/archiver` 依赖 |
| `src/app/(dashboard)/completed-orders/completed-orders-client.tsx` | 增加批量导出工具栏 |
| `src/components/orders/completed-order-list.tsx` | 增加复选框和选中状态管理 |
| `src/app/(dashboard)/completed-orders/[id]/page.tsx` | 增加导出按钮 |

---

## 8.5 数据库类型说明

> ⚠️ 注意：`src/types/database.ts` 中缺少部分字段定义（`designs.cad_file`、`designs.cad_file_url`、`designs.kujiale_link`、`installations.after_sales_feedback` 等），但实际 Supabase 表中存在这些列。实现时需使用 `any` 类型或扩展类型定义。

---

## 9. 安全性考虑

1. **权限验证**：API 必须验证用户 session，且只能导出当前组织（`organization_id`）的订单
2. **订单状态校验**：只允许导出 `completed` 或 `cancelled` 状态的订单
3. **订单归属校验**：验证传入的 `orderIds` 都属于当前组织，防止越权导出
4. **文件访问**：附件通过 R2 预签名 URL 下载，URL 有效期 1 小时
5. **数量限制**：单次最多导出 50 个订单，防止资源耗尽

---

## 10. 性能考虑

1. **流式处理**：ZIP 使用 archiver 流式生成，不缓存到内存
2. **并发下载**：附件下载使用 `Promise.all` 并行，限制并发数为 5
3. **Excel 流式写入**：使用 exceljs 的流式模式，减少内存占用
4. **超时处理**：设置 API 超时时间为 60 秒

---

## 11. 错误处理

| 场景 | 处理方式 |
|------|---------|
| 未选择订单 | 返回 400，提示"请至少选择一个订单" |
| 订单不存在 | 跳过该订单，继续处理其他 |
| 附件下载失败 | 在 Excel 中标注"下载失败"，不影响整体导出 |
| 生成超时 | 返回 504，提示"订单数量过多，请分批导出" |
| 权限不足 | 返回 403，提示"无权导出" |

---

*设计文档结束*
