# 手机适配实现计划

## 目标
让"定制大师"ERP系统在手机浏览器上能够正常使用，解决字体过小、布局错乱、操作困难等问题。

## 技术栈
- Next.js 14 + React 18 + TypeScript
- Tailwind CSS v3.4
- 现有组件库（自定义）

## 核心问题诊断

### 1. 布局问题
- `layout.tsx` 使用固定 `pl-[280px]` 为侧边栏留空，移动端会挤压内容区
- 侧边栏固定宽度 280px，在手机上占据整个屏幕且无法收起
- Header 内容过多，移动端会溢出

### 2. 字体问题
- 大量使用固定像素字体（`text-[13px]`, `text-[15px]`, `text-[17px]`）
- 没有针对不同屏幕尺寸调整字体大小

### 3. 表格问题
- 数据表格列数多，移动端会溢出屏幕
- 表格操作按钮在小屏幕上难以点击

### 4. 交互问题
- 没有移动端导航菜单
- 按钮和链接的点击区域过小

## 实现方案

### Phase 1: 全局基础适配
1. **添加 viewport meta 标签** - 确保页面正确缩放
2. **创建移动端侧边栏** - 汉堡菜单 + 抽屉式导航
3. **响应式布局框架** - 修改 dashboard layout，移动端取消固定左边距
4. **响应式字体系统** - 使用 Tailwind 响应式前缀调整字体

### Phase 2: 组件级适配
1. **Header 组件** - 移动端简化显示，隐藏部分信息
2. **Sidebar 组件** - 改为响应式抽屉菜单
3. **Table 组件** - 添加横向滚动支持，优化移动端显示
4. **Card 组件** - 调整移动端内边距和间距

### Phase 3: 页面级适配
1. **Dashboard 页面** - 统计卡片改为网格布局，表格可滚动
2. **Customers 页面** - 客户列表改为卡片式或横向滚动表格
3. **Designs 页面** - 方案列表适配
4. **Installations 页面** - 安装列表适配
5. **Settings 页面** - 设置页面适配
6. **Login 页面** - 登录页已相对适配，微调即可

### Phase 4: 细节优化
1. **按钮点击区域** - 确保移动端可点击区域 >= 44px
2. **表单输入** - 调整输入框大小和间距
3. **模态框/对话框** - 移动端全屏或接近全屏

## 文件修改清单

### 核心布局文件
- `src/app/layout.tsx` - 添加 viewport
- `src/app/(dashboard)/layout.tsx` - 响应式布局
- `src/components/layout/sidebar.tsx` - 移动端抽屉菜单
- `src/components/layout/header.tsx` - 响应式头部

### 组件文件
- `src/components/ui/table.tsx` - 表格响应式
- `src/components/ui/card.tsx` - 卡片响应式
- `src/components/ui/button.tsx` - 按钮响应式
- `src/components/ui/dialog.tsx` - 对话框响应式

### 页面文件（主要页面）
- `src/app/(dashboard)/dashboard/page.tsx` - 仪表盘
- `src/app/(dashboard)/customers/page.tsx` - 客户管理
- `src/app/(dashboard)/designs/page.tsx` - 方案管理
- `src/app/(dashboard)/installations/page.tsx` - 安装管理
- `src/app/(dashboard)/completed-orders/page.tsx` - 已完成订单
- `src/app/(dashboard)/factories/page.tsx` - 工厂管理
- `src/app/(dashboard)/settings/admin/page.tsx` - 管理员面板
- `src/app/(dashboard)/settings/users/page.tsx` - 账号管理
- `src/app/(dashboard)/notifications/page.tsx` - 消息中心

## 验证方式
1. 使用 Chrome DevTools 模拟不同手机尺寸
2. 检查所有页面在 375px、390px、414px 宽度下的显示效果
3. 验证所有交互功能在移动端可正常使用
