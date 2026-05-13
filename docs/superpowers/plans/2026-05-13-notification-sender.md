# 消息提醒增加来源方 - 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking

## 设计文档

- `docs/superpowers/specs/2026-05-13-notification-sender-design.md`

## 文件结构

### 新增文件

| 文件 | 说明 |
|------|------|
| `supabase/migrations/004_add_notification_sender.sql` | 数据库迁移：添加 sender_id 字段 |

### 修改文件

| 文件 | 改动说明 |
|------|----------|
| `src/app/api/notifications/route.ts` | GET 查询加入 sender:users join |
| `src/app/api/orders/[id]/dispatch/route.ts` | insert 增加 sender_id |
| `src/app/api/orders/[id]/submit-design/route.ts` | insert 增加 sender_id |
| `src/app/api/orders/[id]/confirm-payment/route.ts` | insert 增加 sender_id |
| `src/app/api/orders/[id]/update-install/route.ts` | insert 增加 sender_id |
| `src/app/api/orders/[id]/cancel/route.ts` | insert 增加 sender_id |
| `src/app/api/orders/[id]/assign-installer/route.ts` | insert 增加 sender_id |
| `src/app/api/orders/[id]/revert/route.ts` | insert 增加 sender_id（多处 insert） |
| `src/app/api/orders/[id]/complete/route.ts` | insert 增加 sender_id |
| `src/app/api/orders/[id]/place-order/route.ts` | insert 增加 sender_id |
| `src/app/api/orders/[id]/set-shipment/route.ts` | insert 增加 sender_id |
| `src/app/api/orders/[id]/after-sales/route.ts` | insert 增加 sender_id |
| `src/app/api/supplements/route.ts` | insert 增加 sender_id |
| `src/components/notifications/notification-list.tsx` | 展示 sender 信息 |
| `src/components/notifications/notification-bell.tsx` | 展示 sender 信息，类型定义更新 |

## 实现步骤

### 阶段一：数据库迁移

- [ ] **Step 1.1** - 创建迁移文件 `supabase/migrations/004_add_notification_sender.sql`
  ```sql
  ALTER TABLE notifications ADD COLUMN sender_id UUID REFERENCES users(id);
  CREATE INDEX idx_notifications_sender ON notifications(sender_id);
  ```

- [ ] **Step 1.2** - 本地执行迁移（如使用 supabase CLI），确认表结构正确
  - 运行 `npx supabase migration up` 或等效命令
  - 验证 `notifications` 表有 `sender_id` 字段

### 阶段二：API 查询层修改

- [ ] **Step 2.1** - 修改 `src/app/api/notifications/route.ts` 的 GET 方法
  - 将 `.select('*, order:orders(id, customer_name, order_no, status)')` 改为：
    ```typescript
    .select(`
      *,
      order:orders(id, customer_name, order_no, status),
      sender:users(id, display_name, role)
    `)
    ```
  - 确保查询结果包含 sender 字段

### 阶段三：API 创建通知处修改（订单相关）

- [ ] **Step 3.1** - 修改 `src/app/api/orders/[id]/dispatch/route.ts`
  - 在 `await adminSupabase.from('notifications').insert({...})` 中加入 `sender_id: user.id`

- [ ] **Step 3.2** - 修改 `src/app/api/orders/[id]/submit-design/route.ts`
  - 同上，在 insert 中加入 `sender_id: user.id`

- [ ] **Step 3.3** - 修改 `src/app/api/orders/[id]/confirm-payment/route.ts`
  - 同上，在 insert 中加入 `sender_id: user.id`

- [ ] **Step 3.4** - 修改 `src/app/api/orders/[id]/update-install/route.ts`
  - 同上，在 insert 中加入 `sender_id: user.id`

- [ ] **Step 3.5** - 修改 `src/app/api/orders/[id]/cancel/route.ts`
  - 同上，在 insert 中加入 `sender_id: user.id`

- [ ] **Step 3.6** - 修改 `src/app/api/orders/[id]/assign-installer/route.ts`
  - 同上，在 insert 中加入 `sender_id: user.id`

- [ ] **Step 3.7** - 修改 `src/app/api/orders/[id]/revert/route.ts`
  - 此文件有多处 `insert`，每一处都需要加入 `sender_id: user.id`
  - 注意：`user` 变量在文件顶部已通过 `parseSessionUser` 获取

- [ ] **Step 3.8** - 修改 `src/app/api/orders/[id]/complete/route.ts`
  - 同上，在 insert 中加入 `sender_id: user.id`

- [ ] **Step 3.9** - 修改 `src/app/api/orders/[id]/place-order/route.ts`
  - 同上，在 insert 中加入 `sender_id: user.id`

- [ ] **Step 3.10** - 修改 `src/app/api/orders/[id]/set-shipment/route.ts`
  - 同上，在 insert 中加入 `sender_id: user.id`

- [ ] **Step 3.11** - 修改 `src/app/api/orders/[id]/after-sales/route.ts`
  - 同上，在 insert 中加入 `sender_id: user.id`

### 阶段四：API 创建通知处修改（其他模块）

- [ ] **Step 4.1** - 修改 `src/app/api/supplements/route.ts`
  - 同上，在 insert 中加入 `sender_id: user.id`

- [ ] **Step 4.2** - **不修改** `src/app/api/cron/check-notifications/route.ts`
  - 系统定时任务没有操作用户，sender_id 保持 NULL 是预期行为
  - 确认该文件的所有 insert 都没有 sender_id（无需改动）

### 阶段五：前端展示修改

- [ ] **Step 5.1** - 修改 `src/components/notifications/notification-list.tsx`
  - 添加角色映射常量：
    ```typescript
    const ROLE_LABELS: Record<string, string> = {
      owner: '老板',
      manager: '店长',
      designer: '设计师',
      sales: '导购',
      installer: '安装工'
    }
    ```
  - 在通知卡片中，title/summary 下方增加来源方展示：
    ```tsx
    {notif.sender && (
      <div className="text-xs text-gray-400 mt-1">
        来自：{ROLE_LABELS[notif.sender.role] || notif.sender.role} {notif.sender.display_name}
      </div>
    )}
    ```
  - 如果无 sender，不显示来源方信息（系统通知无需标注）

- [ ] **Step 5.2** - 修改 `src/components/notifications/notification-bell.tsx`
  - 更新 `Notification` 接口，增加可选的 `sender` 字段：
    ```typescript
    interface Notification {
      id: string
      title: string
      summary: string
      priority: string
      is_read: boolean
      order?: { id: string; customer_name: string; order_no: string }
      sender?: { id: string; display_name: string; role: string }
    }
    ```
  - 在弹窗中的通知展示区域，加入与 NotificationList 一致的来源方展示逻辑

### 阶段六：类型与编译检查

- [ ] **Step 6.1** - 运行 TypeScript 编译检查
  ```bash
  npx tsc --noEmit
  ```
  - 确保无类型错误

- [ ] **Step 6.2** - 运行 ESLint 检查
  ```bash
  npx next lint
  ```
  - 确保无 lint 错误

## 验证步骤

### 功能验证

- [ ] **V1** - 本地启动开发服务器，登录系统
- [ ] **V2** - 以店长/经理身份创建订单并派单给设计师
- [ ] **V3** - 以设计师身份登录，查看消息提醒，确认能看到"来自：店长 XXX"
- [ ] **V4** - 检查消息中心页面（/notifications）也展示来源方
- [ ] **V5** - 触发其他类型通知（如提交设计、确认付款等），确认都有来源方
- [ ] **V6** - 等待或触发系统定时通知（如超期提醒），确认不报错，正常显示

### 回归验证

- [ ] **R1** - 未读通知数量显示正确
- [ ] **R2** - 标记已读功能正常
- [ ] **R3** - 紧急通知弹窗正常弹出
- [ ] **R4** - 消息中心页面正常加载

## 回滚方案

如需回滚：
1. 还原所有代码修改（git checkout 或手动还原）
2. 执行数据库回滚：
   ```sql
   ALTER TABLE notifications DROP COLUMN IF EXISTS sender_id;
   DROP INDEX IF EXISTS idx_notifications_sender;
   ```

## 完成标准

- [ ] 所有实现步骤完成
- [ ] TypeScript 编译通过（`npx tsc --noEmit`）
- [ ] ESLint 通过（`npx next lint`）
- [ ] 派单通知能正确显示来源方
- [ ] 其他人为操作通知能正确显示来源方
- [ ] 系统定时通知正常显示，不报错
- [ ] 未读数、标记已读等原有功能正常
