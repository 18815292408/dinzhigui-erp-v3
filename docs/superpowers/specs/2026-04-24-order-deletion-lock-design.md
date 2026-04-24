# 订单删除锁定机制设计

## 背景

当前系统中，安装管理和方案管理可以删除订单相关记录，但客户管理没有删除订单的入口。此外，删除时没有检查下游是否有关联记录，导致数据一致性被破坏。

需要实现「下一级锁定上一级」的删除保护机制。

## 业务规则

### 层级锁定规则

| 操作 | 检查项 | 有下游时 |
|------|--------|----------|
| 删安装记录 | 无 | 直接删除 |
| 删设计方案 | installations 表是否有 design_id 关联 | 有则阻止，提示"还有安装记录" |
| 删订单 | designs 表是否有 order_id 关联<br>installations 表是否有 order_id 关联 | 有则阻止，提示"还有设计方案/安装记录" |

### 角色权限

| 角色 | 删除权限 |
|------|----------|
| 导购(sales) | 只能删自己订单 |
| 设计师(designer) | 只能删自己设计方案 |
| 安装师(installer) | 只能删自己安装记录 |
| 店长(owner) / 老板(manager) | 任意层级均可删（不受锁定限制） |

---

## API 改动

### DELETE /api/orders/[id]

```typescript
// 检查逻辑：
1. 如果当前用户是 owner 或 manager → 直接删除（跳过下游检查）
2. 否则：
   a) 检查 designs 表是否有 order_id = :id 的记录
   b) 检查 installations 表是否有 order_id = :id 的记录
   c) 如果 a) 或 b) 有结果 → 返回 400，提示"下游还有记录，请到方案管理/安装管理删除后再试"
3. 删除 orders 表中 id = :id 的记录
```

### DELETE /api/designs/[id]

```typescript
// 检查逻辑：
1. 如果当前用户是 owner 或 manager → 直接删除
2. 否则：
   a) 检查 installations 表是否有 design_id = :id 的记录
   b) 如果有 → 返回 400，提示"还有安装记录，请到安装管理删除后再试"
3. 删除 designs 表中 id = :id 的记录
```

### DELETE /api/installations/[id]

```typescript
// 无下游检查，直接删除
1. 如果是 owner 或 manager → 直接删
2. 如果是其他角色 → 只能删自己创建的安装记录
```

---

## UI 改动

### 1. 客户管理 - 订单详情页

路径：`src/app/(dashboard)/customers/[id]/page.tsx`

- 在订单信息卡片下方增加「删除订单」按钮
- 红色危险按钮，点击后弹出确认对话框
- 删除前调用 API，API 返回锁定提示时对话框显示错误信息

### 2. 方案管理 - 设计列表

路径：`src/components/designs/design-list.tsx`

- 每个设计卡片增加「删除」按钮
- 点击前检查是否有安装记录关联
- 如果有安装记录，按钮禁用，显示 tooltip"还有安装记录，无法删除"

### 3. 安装管理 - 安装列表

路径：`src/components/installations/installation-list.tsx` 或类似

- 每个安装卡片增加「删除」按钮
- 无下游检查，直接可删

### 4. 禁用状态样式

```tsx
// 禁用按钮
<button disabled className="opacity-50 cursor-not-allowed" title="下游还有安装记录，无法删除">
  删除
</button>
```

---

## 错误提示文案

| 场景 | 提示 |
|------|------|
| 订单有设计方案时删订单 | "该订单还有设计方案，请到方案管理删除设计方案后再试" |
| 订单有安装记录时删订单 | "该订单还有安装记录，请到安装管理删除安装记录后再试" |
| 设计方案有安装记录时删方案 | "该设计方案还有安装记录，请到安装管理删除安装记录后再试" |

---

## 实现顺序

1. API: orders/[id]/route.ts - 增加 DELETE 方法和锁定检查
2. API: designs/[id]/route.ts - 增加锁定检查
3. UI: 客户管理订单详情页 - 增加删除按钮
4. UI: 方案管理列表 - 增加删除按钮和禁用状态
5. UI: 安装管理列表 - 增加删除按钮（如果还没有）
