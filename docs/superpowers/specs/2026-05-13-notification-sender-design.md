# 消息提醒增加来源方 - 设计文档

## 问题背景

导购/店长给设计师派单时，设计师在消息提醒中无法看到是谁给他派单的。需要在消息提醒中增加消息的来源方信息，使所有有人为来源的消息都能标注出发送者。

## 现状分析

### 数据库结构

当前 `notifications` 表：
- `id`: UUID 主键
- `organization_id`: UUID 组织ID
- `user_id`: UUID 接收者ID
- `type`: TEXT 通知类型
- `priority`: TEXT 优先级
- `title`: TEXT 标题
- `summary`: TEXT 摘要
- `related_order_id`: UUID 关联订单ID
- `is_read`: BOOLEAN 是否已读
- `created_at`: TIMESTAMPTZ 创建时间

**缺少来源方信息。**

### 通知创建点

系统中约 **14 个 API 文件**会创建通知：
1. 派单（dispatch）→ 给设计师
2. 提交设计（submit-design）→ 给店长/经理
3. 确认付款（confirm-payment）→ 给店长/经理
4. 分配安装工（assign-installer）→ 给安装工
5. 取消订单（cancel）→ 给相关人员
6. 回退订单（revert）→ 多步通知
7. 完成订单（complete）→ 给相关人员
8. 下单（place-order）→ 给店长/经理
9. 设置发货日期（set-shipment）→ 给安装工
10. 售后（after-sales）→ 给相关人员
11. 补单（supplements）→ 给相关人员
12. 定时任务（cron/check-notifications）→ 系统级通知（超期提醒等）

### 前端展示

- `NotificationList`（消息中心页面）：列表展示所有通知
- `NotificationBell`（顶部铃铛弹窗）：展示紧急通知
- 两者均只展示 title、summary、priority，**无来源方信息**

## 设计方案

### 数据库层

在 `notifications` 表中增加 `sender_id` 字段：

```sql
ALTER TABLE notifications ADD COLUMN sender_id UUID REFERENCES users(id);
```

- `sender_id` 允许 NULL
- NULL 表示系统级通知（如定时超期提醒），非 NULL 表示来自某个用户

### API 层

#### 1. 查询通知（GET /api/notifications）

修改 select 语句，join `users` 表获取发送者信息：

```typescript
.from('notifications')
.select(`
  *,
  order:orders(id, customer_name, order_no, status),
  sender:users(id, display_name, role)
`)
```

返回的 sender 字段结构：
```json
{
  "id": "uuid",
  "display_name": "张三",
  "role": "manager"
}
```

#### 2. 所有创建通知的 API

在 `insert({...})` 中统一加上 `sender_id: user.id`。

**例外**：`cron/check-notifications` 是系统定时任务，没有操作用户，保持 `sender_id` 为 NULL。

### 前端层

#### 1. NotificationList（消息中心）

在每条通知卡片中增加来源方展示：
- 如果有 `sender`：显示 `来自：{roleLabel} {display_name}`
- 如果无 `sender`：显示 `来自：系统` 或不显示（根据设计决定）

角色映射：
- `owner` → 老板
- `manager` → 店长
- `designer` → 设计师
- `sales` → 导购
- `installer` → 安装工

#### 2. NotificationBell（弹窗）

同样的来源方展示逻辑，保持与消息中心一致。

#### 3. 样式

来源方信息以较小、较淡的字号展示在 title/summary 下方，不抢视觉焦点。

## 文件清单

### 修改文件

| 文件 | 改动 |
|------|------|
| `supabase/migrations/...add_notification_sender.sql` | 新增迁移文件，添加 sender_id 字段 |
| `src/app/api/notifications/route.ts` | GET 查询加入 sender join |
| `src/app/api/orders/[id]/dispatch/route.ts` | insert 增加 sender_id |
| `src/app/api/orders/[id]/submit-design/route.ts` | insert 增加 sender_id |
| `src/app/api/orders/[id]/confirm-payment/route.ts` | insert 增加 sender_id |
| `src/app/api/orders/[id]/update-install/route.ts` | insert 增加 sender_id |
| `src/app/api/orders/[id]/cancel/route.ts` | insert 增加 sender_id |
| `src/app/api/orders/[id]/assign-installer/route.ts` | insert 增加 sender_id |
| `src/app/api/orders/[id]/revert/route.ts` | insert 增加 sender_id |
| `src/app/api/orders/[id]/complete/route.ts` | insert 增加 sender_id |
| `src/app/api/orders/[id]/place-order/route.ts` | insert 增加 sender_id |
| `src/app/api/orders/[id]/set-shipment/route.ts` | insert 增加 sender_id |
| `src/app/api/orders/[id]/after-sales/route.ts` | insert 增加 sender_id |
| `src/app/api/supplements/route.ts` | insert 增加 sender_id |
| `src/components/notifications/notification-list.tsx` | 展示 sender 信息 |
| `src/components/notifications/notification-bell.tsx` | 展示 sender 信息 |

### 不涉及改动的文件

- `src/app/api/cron/check-notifications/route.ts`：系统定时任务，sender_id 自然为 NULL
- `src/app/api/notifications/[id]/read/route.ts`：只更新 is_read，不影响

## 风险评估

| 风险 | 等级 | 缓解措施 |
|------|------|----------|
| 数据库迁移后现有通知 sender_id 为 NULL | 低 | 历史通知无来源方是预期行为，前端做好 NULL 处理 |
| 14 个 API 文件修改遗漏 | 中 | 使用全局搜索确保所有 `.from('notifications').insert` 都已处理 |
| Supabase join 查询性能 | 低 | 用户通知数量通常不大，且已按 organization_id 过滤 |

## 验收标准

- [ ] 数据库迁移成功，notifications 表有 sender_id 字段
- [ ] 派单后，设计师能在消息提醒中看到"来自：店长 XXX"或"来自：导购 XXX"
- [ ] 其他所有人为操作产生的通知都有来源方
- [ ] 系统定时通知（如超期提醒）正常显示，不报错
- [ ] 消息中心页面和顶部弹窗都展示来源方
- [ ] 无 TypeScript 类型错误
