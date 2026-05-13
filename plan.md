# 个人订单模式功能设计方案

## 1. 需求概述

为店长（manager）角色在客户管理模块中增加"个人订单模式"切换功能，解决订单跟进界面因显示所有订单导致的混乱问题。

## 2. 现状分析

### 2.1 页面结构
- 客户管理页面: `src/app/(dashboard)/customers/page.tsx` (Server Component)
- 客户端组件: `src/app/(dashboard)/customers/customers-page-client.tsx`
- 包含两个标签页：订单创建、订单跟进
- 订单跟进有阶段筛选标签（全部、待派单、设计中、待下单、待打款、出货/安装中、售后中）

### 2.2 权限体系
- 角色类型: `owner` | `manager` | `designer` | `sales` | `installer`
- 店长角色: `manager`
- 当前权限逻辑（permissions.ts）:
  - `owner/manager` 默认可以看到全部订单
  - `sales` 只能看自己创建的订单
  - `designer` 只能看自己负责的订单
  - `installer` 只能看自己负责的订单

### 2.3 数据流
- Server Component `getCustomers()` 从 Supabase 查询客户和订单数据
- 根据用户角色在服务端进行数据过滤
- 将过滤后的数据传递给 Client Component 进行展示和阶段筛选

## 3. 设计方案

### 3.1 核心设计思路

由于当前服务端已经根据角色过滤数据（manager 能看到全部），而需求是**让 manager 在"看全部"和"只看自己的"之间切换**，因此需要：

1. **前端状态管理**: 使用 URL query parameter `?personal=true` 来持久化切换状态
2. **服务端支持**: `getCustomers()` 读取 `personal` 参数，对 manager 角色额外过滤 `created_by = user.id`
3. **权限控制**: 仅对 `manager` 角色显示切换控件，其他角色不显示
4. **筛选兼容性**: 客户端阶段筛选逻辑不变，基于服务端已过滤的数据进行再筛选

### 3.2 数据流设计

```
用户切换"个人订单模式"
  ↓
更新 URL: ?tab=followup&stage=pending_dispatch&personal=true
  ↓
Server Component page.tsx 读取 personal 参数
  ↓
getCustomers() 中: if (user.role === 'manager' && personal) 增加 .eq('created_by', user.id)
  ↓
返回过滤后的 customers 数据
  ↓
Client Component 基于已有数据进行阶段筛选展示
```

### 3.3 界面设计

- 在 Tabs 下方、内容区域上方添加切换控件
- 仅当 `user.role === 'manager'` 时显示
- 使用自定义 Toggle Switch 组件，样式与现有 UI 一致
- 视觉反馈：
  - 激活状态：蓝色背景，显示"只看我的订单"
  - 未激活状态：灰色背景，显示"显示全部订单"

### 3.4 筛选逻辑

筛选逻辑保持"先应用个人订单模式过滤，再应用标签筛选"：

```
全部订单 → [个人订单模式过滤] → 店长自己的订单 → [阶段标签筛选] → 最终展示
```

## 4. 改动范围

### 4.1 修改文件

1. **`src/app/(dashboard)/customers/page.tsx`**
   - `getCustomers()` 增加 `personalMode` 参数
   - 对 manager 角色应用个人订单过滤
   - 将 `userRole` 传递给 Client Component

2. **`src/app/(dashboard)/customers/customers-page-client.tsx`**
   - 接收 `userRole` prop
   - 读取 `personal` URL 参数
   - 添加 Toggle Switch 控件（仅 manager 可见）
   - 处理切换逻辑，更新 URL

### 4.2 新增文件

无新增文件，使用内联 Toggle 组件即可。

## 5. 实现细节

### 5.1 服务端过滤逻辑

```typescript
// 在 getCustomers() 中，订单查询部分
let orderQuery = adminSupabase
  .from('orders')
  .select('...')
  .eq('organization_id', user.organization_id)

if (user.role === 'sales') {
  orderQuery = orderQuery.eq('created_by', user.id)
} else if (user.role === 'designer') {
  orderQuery = orderQuery.eq('assigned_designer', user.id)
} else if (user.role === 'installer') {
  orderQuery = orderQuery.eq('assigned_installer', user.id)
} else if (user.role === 'manager' && personalMode) {
  // 店长的个人订单模式
  orderQuery = orderQuery.eq('created_by', user.id)
}
```

同时客户查询也需要同步过滤：
```typescript
if (user.role === 'sales' || (user.role === 'manager' && personalMode)) {
  customerQuery = customerQuery.eq('created_by', user.id)
}
```

### 5.2 URL 参数管理

- 参数名: `personal`
- 值: `true` 表示激活，不存在或 `false` 表示未激活
- 切换标签页时保留 `personal` 参数
- 切换阶段时保留 `personal` 参数

### 5.3 阶段计数兼容性

`stageCounts` 计算基于 `customers.withOrders`，由于服务端已经过滤，计数自动正确。

## 6. 测试计划

1. **权限测试**: 非 manager 角色登录，确认不显示切换控件
2. **功能测试**: manager 角色切换模式，确认数据正确过滤
3. **筛选兼容性测试**: 在个人订单模式下切换阶段标签，确认筛选正确
4. **URL 持久化测试**: 刷新页面后切换状态保持
5. **标签页切换测试**: 从跟进切换到创建再切回，确认状态保持

## 7. 风险评估

- **低风险**: 仅影响 manager 角色的数据展示，不影响数据写入
- **回滚策略**: 移除 URL 参数和过滤条件即可恢复
- **性能影响**: 无额外性能开销，反而可能减少数据查询量
