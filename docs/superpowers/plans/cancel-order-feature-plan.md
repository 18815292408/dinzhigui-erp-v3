# 退订功能模块实现计划

## 1. 需求概述

在/customers/ID页面添加"退订订单"按钮，实现订单退订功能。退订后的订单状态变为"cancelled"，与已完成订单类似归档，但从主要流程界面中移除。

## 2. 技术架构分析

### 2.1 现有订单状态
- `pending_dispatch`, `pending_design`, `designing`, `pending_order`, `pending_payment`, `pending_shipment`, `in_install`, `in_after_sales`, `completed`
- 需要新增: `cancelled`

### 2.2 关键文件
- `src/lib/types.ts` - Order类型定义
- `src/lib/order-workflow.ts` - 订单工作流常量与函数
- `src/lib/permissions.ts` - 权限控制
- `src/app/(dashboard)/customers/[id]/customer-detail-client.tsx` - 客户详情页
- `src/app/(dashboard)/completed-orders/page.tsx` - 已完成订单页
- `src/app/(dashboard)/dashboard/page.tsx` - Dashboard
- `src/components/dashboard/monthly-stats-section.tsx` - 月度业绩
- `src/components/dashboard/ai-insights-panel.tsx` - AI运营分析
- `src/lib/monthly-statistics.ts` - 月度统计逻辑
- `src/lib/dashboard-overview.ts` - Dashboard概览逻辑
- `src/app/api/orders/[id]/complete/route.ts` - 完成订单API参考

### 2.3 数据库
- `orders` 表 status 字段为 TEXT，支持新增 cancelled 状态
- 需要添加 cancelled_at 字段记录退订时间
- 需要添加 cancelled_by 字段记录退订人

## 3. 实现步骤

### 步骤1: 数据库迁移
- 添加 `cancelled_at` 和 `cancelled_by` 字段到 orders 表

### 步骤2: 更新类型定义和工作流
- `src/lib/types.ts`: Order status 添加 'cancelled'
- `src/lib/order-workflow.ts`: 添加 CANCELLED_ORDER_STATUS, 更新 isActiveOrderStatus 等函数

### 步骤3: 更新权限控制
- `src/lib/permissions.ts`: 添加 canCancelOrder 函数

### 步骤4: 实现退订API
- `src/app/api/orders/[id]/cancel/route.ts`: POST 退订接口

### 步骤5: 更新客户详情页
- `src/app/(dashboard)/customers/[id]/customer-detail-client.tsx`: 添加退订按钮和确认对话框

### 步骤6: 更新已完成订单页面
- `src/app/(dashboard)/completed-orders/page.tsx`: 添加标签页支持已完成/已退订
- `src/components/orders/completed-order-list.tsx`: 支持显示退订订单

### 步骤7: 更新Dashboard
- `src/lib/dashboard-overview.ts`: 过滤掉 cancelled 订单
- `src/components/dashboard/monthly-stats-section.tsx`: 添加退订统计展示
- `src/lib/monthly-statistics.ts`: 添加退订统计数据

### 步骤8: 更新AI运营分析
- `src/app/api/ai/dashboard-analysis/route.ts`: 排除 cancelled 订单

### 步骤9: 更新其他相关页面
- 客户列表、方案管理、安装管理等页面过滤 cancelled 订单

### 步骤10: 编写测试
- 添加 order-workflow-regression.test.mjs 测试用例
- 添加 cancel-order API 测试

## 4. 权限规则

退订按钮可点击角色：
- owner (老板)
- manager (店长)
- 订单的 assigned_designer (设计师)
- 订单的 created_by (导购/销售)

退订条件：
- 订单状态不是 completed 且不是 cancelled
- 订单 installation_status 不是 'installed'

## 5. 界面设计

### 客户详情页
- 在"删除订单"按钮旁边或上方添加"退订订单"按钮
- 红色系按钮，点击后弹出确认对话框
- 已退订订单显示退订状态标签

### 已完成订单页
- 两个标签页: "已完成订单" | "已退订订单"
- 使用 Tabs 组件实现

### 月度业绩模块
- 新增退订统计卡片和表格
- 显示每个人退订的订单数和金额
- 重新排版SummaryCard区域

## 6. 数据验证

- 退订时记录操作人、时间、订单信息到日志
- 退订后订单从所有活跃流程中移除
- 退订订单不可再次操作
