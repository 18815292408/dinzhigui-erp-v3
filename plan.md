# 用户权限隔离系统实施计划

## 现状分析

### 已有基础
- `orders` 表已有 `created_by`（销售）、`assigned_designer`（设计师）、`assigned_installer`（安装人员）字段
- `orders` API 已有部分角色过滤
- `designs` API 已有设计师过滤
- 数据库 RLS 策略已存在

### 需要完善的部分
1. **客户管理**：未按角色过滤客户数据
2. **安装管理**：未按角色过滤安装记录
3. **已完成订单**：未按角色过滤已完成订单
4. **数据看板**：推进中订单未按角色过滤
5. **店长角色**：目前同 owner，需要与销售相同的权限逻辑
6. **缺少统一权限工具函数**

## 实施步骤

### Step 1: 创建统一权限工具函数 (src/lib/permissions.ts)
- 定义角色类型和权限检查函数
- 构建订单查询过滤条件
- 构建客户查询过滤条件
- 构建安装查询过滤条件
- 构建设计方案查询过滤条件

### Step 2: 更新数据库类型定义 (src/types/database.ts)
- 确保类型定义与数据库一致

### Step 3: 更新后端 API 权限过滤
- `src/app/api/customers/route.ts` - 添加角色过滤
- `src/app/api/customers/[id]/route.ts` - 添加单客户权限校验
- `src/app/api/orders/route.ts` - 完善角色过滤（添加店长）
- `src/app/api/orders/[id]/route.ts` - 完善单订单权限校验
- `src/app/api/designs/route.ts` - 完善角色过滤（添加店长）
- `src/app/api/designs/[id]/route.ts` - 添加单方案权限校验
- `src/app/api/installations/route.ts` - 添加角色过滤
- `src/app/api/installations/[id]/route.ts` - 添加单安装权限校验
- `src/app/api/statistics/monthly/route.ts` - 保持仅 owner/manager 可访问

### Step 4: 更新前端页面权限控制
- `src/app/(dashboard)/customers/page.tsx` - 按角色过滤客户列表
- `src/app/(dashboard)/designs/page.tsx` - 完善设计方案过滤
- `src/app/(dashboard)/installations/page.tsx` - 按角色过滤安装记录
- `src/app/(dashboard)/completed-orders/page.tsx` - 按角色过滤已完成订单
- `src/app/(dashboard)/dashboard/page.tsx` - 数据看板按角色过滤

### Step 5: 更新数据看板统计
- `src/lib/dashboard-overview.ts` - 支持按角色过滤订单数据

### Step 6: 测试验证
- 验证各角色只能看到权限范围内的数据
- 验证无法通过 URL/API 访问无权限数据
