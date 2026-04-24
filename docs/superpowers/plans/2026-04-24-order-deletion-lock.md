# 订单删除锁定机制实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现「下一级锁定上一级」的删除保护机制，导购、设计师、安装师只能删除自己层级的记录，店长/老板可跨级删除。

**Architecture:** 在 DELETE API 入口处增加下游记录检查，店长/老板角色跳过检查直接删除。UI 层在客户管理订单详情页增加删除按钮，方案管理和安装管理列表增加删除按钮及禁用状态。

**Tech Stack:** Next.js App Router, Supabase, TypeScript

---

## 文件修改清单

| 文件 | 改动 |
|------|------|
| `src/app/api/orders/[id]/route.ts` | 增加 DELETE 方法，含锁定检查和所有权检查 |
| `src/app/api/designs/[id]/route.ts` | 已有 DELETE，增加锁定检查和所有权检查 |
| `src/app/api/installations/[id]/route.ts` | 已有 DELETE，增加所有权检查 |
| `src/app/(dashboard)/customers/[id]/page.tsx` | 增加删除订单按钮 |
| `src/components/designs/design-list.tsx` | 增加删除按钮和禁用状态（需预查安装记录） |
| `src/components/installations/installation-list.tsx` | 增加删除按钮 |

---

## Task 1: API - 订单删除锁定检查

**Files:**
- Modify: `src/app/api/orders/[id]/route.ts`

- [ ] **Step 1: 读取当前 orders API 代码**

路径: `src/app/api/orders/[id]/route.ts`

- [ ] **Step 2: 增加 DELETE 方法和锁定检查逻辑**

在 `GET` 和 `PUT` 方法后添加:

```typescript
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')
  if (!sessionCookie) {
    return NextResponse.json({ error: '未登录' }, { status: 401 })
  }

  const user = parseSessionUser(sessionCookie.value)
  if (!user) {
    return NextResponse.json({ error: '无效会话' }, { status: 401 })
  }

  const adminSupabase = await createAdminClient()

  // 店长/老板不受限制
  const canBypassAll = ['owner', 'manager'].includes(user.role)

  // 先获取订单，检查所有权
  const { data: order } = await adminSupabase
    .from('orders')
    .select('created_by')
    .eq('id', params.id)
    .single()

  if (!order) {
    return NextResponse.json({ error: '订单不存在' }, { status: 404 })
  }

  // 非店长/老板只能删自己创建的订单
  if (!canBypassAll) {
    if (user.role === 'sales' && order.created_by !== user.id) {
      return NextResponse.json({ error: '只能删除自己创建的订单' }, { status: 403 })
    }
    // 非销售角色不允许删订单
    if (user.role !== 'sales') {
      return NextResponse.json({ error: '无权删除订单' }, { status: 403 })
    }

    // 检查是否有设计方案
    const { data: designs } = await adminSupabase
      .from('designs')
      .select('id')
      .eq('order_id', params.id)
      .limit(1)

    if (designs && designs.length > 0) {
      return NextResponse.json(
        { error: '该订单还有设计方案，请到方案管理删除设计方案后再试' },
        { status: 400 }
      )
    }

    // 检查是否有安装记录
    const { data: installations } = await adminSupabase
      .from('installations')
      .select('id')
      .eq('order_id', params.id)
      .limit(1)

    if (installations && installations.length > 0) {
      return NextResponse.json(
        { error: '该订单还有安装记录，请到安装管理删除安装记录后再试' },
        { status: 400 }
      )
    }
  }

  // 执行删除
  const { error } = await adminSupabase
    .from('orders')
    .delete()
    .eq('id', params.id)
    .eq('organization_id', user.organization_id)

  if (error) {
    return NextResponse.json({ error: '删除失败' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
```

- [ ] **Step 3: 提交**

```bash
git add src/app/api/orders/[id]/route.ts
git commit -m "feat: 增加订单删除API及下游锁定检查"
```

---

## Task 2: API - 设计方案删除锁定检查

**Files:**
- Modify: `src/app/api/designs/[id]/route.ts`

- [ ] **Step 1: 读取当前 designs API 代码**

路径: `src/app/api/designs/[id]/route.ts`

- [ ] **Step 2: 找到 DELETE 方法，增加所有权检查和锁定检查**

在删除执行前（获取 user 之后）添加:

```typescript
// 店长/老板不受限制
const canBypassAll = ['owner', 'manager'].includes(user.role)

// 先获取设计方案，检查所有权
const { data: design } = await adminSupabase
  .from('designs')
  .select('created_by')
  .eq('id', params.id)
  .single()

if (!design) {
  return NextResponse.json({ error: '设计方案不存在' }, { status: 404 })
}

// 非店长/老板只能删自己创建的设计方案
if (!canBypassAll) {
  if (user.role === 'designer' && design.created_by !== user.id) {
    return NextResponse.json({ error: '只能删除自己创建的设计方案' }, { status: 403 })
  }
  // 非设计师角色不允许删设计方案
  if (user.role !== 'designer') {
    return NextResponse.json({ error: '无权删除设计方案' }, { status: 403 })
  }

  // 检查是否有安装记录
  const { data: installations } = await adminSupabase
    .from('installations')
    .select('id')
    .eq('design_id', params.id)
    .limit(1)

  if (installations && installations.length > 0) {
    return NextResponse.json(
      { error: '该设计方案还有安装记录，请到安装管理删除安装记录后再试' },
      { status: 400 }
    )
  }
}
```

- [ ] **Step 3: 提交**

```bash
git add src/app/api/designs/[id]/route.ts
git commit -m "feat: 设计方案删除增加安装记录锁定检查"
```

---

## Task 3: UI - 客户管理订单详情页增加删除按钮

**Files:**
- Modify: `src/app/(dashboard)/customers/[id]/page.tsx`

- [ ] **Step 1: 读取当前客户详情页代码**

路径: `src/app/(dashboard)/customers/[id]/page.tsx`

- [ ] **Step 2: 增加删除处理函数**

在文件顶部添加 `'use client'`（如果还没有）并添加状态:

```typescript
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
// ... existing imports
```

在组件内添加:

```typescript
const router = useRouter()
const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
const [deleteError, setDeleteError] = useState<string | null>(null)
const [deleting, setDeleting] = useState(false)
```

添加删除处理函数:

```typescript
const handleDeleteOrder = async () => {
  setDeleting(true)
  setDeleteError(null)
  try {
    const res = await fetch(`/api/orders/${customer.orders[0].id}`, {
      method: 'DELETE',
      credentials: 'include'
    })
    const data = await res.json()
    if (!res.ok) {
      setDeleteError(data.error || '删除失败')
      setDeleting(false)
      return
    }
    router.push('/customers')
    router.refresh()
  } catch (err) {
    setDeleteError('删除失败')
    setDeleting(false)
  }
}
```

- [ ] **Step 3: 在订单信息卡片底部添加删除按钮**

在 `OrderAmountEditor` 组件后添加:

```tsx
{/* 删除订单 */}
{customer.orders && customer.orders.length > 0 && (
  <div className="mt-4 pt-4 border-t border-red-200">
    <button
      onClick={() => setShowDeleteConfirm(true)}
      className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100"
    >
      删除订单
    </button>
  </div>
)}

{/* 删除确认对话框 */}
{showDeleteConfirm && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
      <h3 className="text-lg font-semibold mb-4">确认删除订单</h3>
      <p className="text-gray-600 mb-6">
        确定要删除该订单吗？删除后将无法恢复。
      </p>
      {deleteError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
          {deleteError}
        </div>
      )}
      <div className="flex gap-3 justify-end">
        <button
          onClick={() => {
            setShowDeleteConfirm(false)
            setDeleteError(null)
          }}
          className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
        >
          取消
        </button>
        <button
          onClick={handleDeleteOrder}
          disabled={deleting}
          className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
        >
          {deleting ? '删除中...' : '确认删除'}
        </button>
      </div>
    </div>
  </div>
)}
```

- [ ] **Step 4: 提交**

```bash
git add src/app/\(dashboard\)/customers/\[id\]/page.tsx
git commit -m "feat: 客户管理订单详情页增加删除订单功能"
```

---

## Task 4: UI - 方案管理列表增加删除按钮

**Files:**
- Modify: `src/components/designs/design-list.tsx`
- API 新增（可选）: `src/app/api/designs/[id]/has-installations/route.ts` 或在列表接口中返回安装计数

**关键说明：** 方案管理的删除按钮需要根据是否有下游安装记录显示禁用状态。实现方式有两种：
1. **简单方式**：列表加载时一起查询每个设计方案的安装计数，存储在 state 中
2. **推荐方式**：在设计列表 API 中增加 `has_installations` 字段

建议采用简单方式 - 在组件中为每个 design 存储一个 `hasInstallation: boolean` 状态。

- [ ] **Step 1: 读取当前设计列表代码**

路径: `src/components/designs/design-list.tsx`

- [ ] **Step 2: 读取设计列表 API 代码**

路径: `src/app/api/designs/route.ts` - 查看当前列表返回字段

- [ ] **Step 3: 增加删除功能和禁用状态**

添加状态:

```typescript
const [deleteId, setDeleteId] = useState<string | null>(null)
const [deleteError, setDeleteError] = useState<string | null>(null)
```

添加删除处理函数:

```typescript
const handleDeleteDesign = async (id: string) => {
  try {
    const res = await fetch(`/api/designs/${id}`, {
      method: 'DELETE',
      credentials: 'include'
    })
    const data = await res.json()
    if (!res.ok) {
      setDeleteError(data.error || '删除失败')
      return
    }
    setDesigns(designs.filter(d => d.id !== id))
  } catch (err) {
    setDeleteError('删除失败')
  }
}
```

在卡片内增加删除按钮（带禁用状态）:

```tsx
{/* 在卡片底部操作区添加，hasInstallation 由列表加载时查询得出 */}
<button
  onClick={() => handleDeleteDesign(design.id)}
  disabled={design.hasInstallation}
  title={design.hasInstallation ? '还有安装记录，无法删除' : '删除'}
  className={`text-sm ${design.hasInstallation
    ? 'text-gray-400 cursor-not-allowed'
    : 'text-red-600 hover:text-red-700'
  }`}
>
  删除
</button>
```

**如何获取 hasInstallation：**

在列表 API (`src/app/api/designs/route.ts`) 中增加子查询，为每个设计返回是否有安装记录：

```typescript
// designs 列表查询中增加
const { data: designs } = await adminSupabase
  .from('designs')
  .select('*, installations(count)')
  // ... 后续处理中将 count > 0 的标记为 hasInstallation: true
```

或在前端组件中遍历 designs 时，为每个 design 调用 API 查询。

- [ ] **Step 4: 提交**

```bash
git add src/components/designs/design-list.tsx
git commit -m "feat: 方案管理列表增加删除设计方案功能和禁用状态"
```

---

## Task 5: API - 安装记录删除所有权检查

**Files:**
- Modify: `src/app/api/installations/[id]/route.ts`

- [ ] **Step 1: 读取当前 installations API 代码**

路径: `src/app/api/installations/[id]/route.ts`

- [ ] **Step 2: 找到 DELETE 方法，增加所有权检查**

在删除执行前（获取 user 之后）添加:

```typescript
// 店长/老板不受限制
const canBypassAll = ['owner', 'manager'].includes(user.role)

// 先获取安装记录，检查所有权
const { data: installation } = await adminSupabase
  .from('installations')
  .select('created_by')
  .eq('id', params.id)
  .single()

if (!installation) {
  return NextResponse.json({ error: '安装记录不存在' }, { status: 404 })
}

// 非店长/老板只能删自己创建的安装记录
if (!canBypassAll) {
  if (user.role === 'installer' && installation.created_by !== user.id) {
    return NextResponse.json({ error: '只能删除自己创建的安装记录' }, { status: 403 })
  }
  // 非安装师角色不允许删安装记录
  if (user.role !== 'installer') {
    return NextResponse.json({ error: '无权删除安装记录' }, { status: 403 })
  }
}
// 安装记录无下游检查，直接删
```

- [ ] **Step 3: 提交**

```bash
git add src/app/api/installations/[id]/route.ts
git commit -m "feat: 安装记录删除增加所有权检查"
```

---

## Task 6: UI - 安装管理列表增加删除按钮

**Files:**
- Modify: `src/components/installations/installation-list.tsx` 或 `src/app/(dashboard)/installations/page.tsx`

- [ ] **Step 1: 找到安装列表组件和卡片结构**

路径可能在: `src/components/installations/installation-list.tsx` 或 `src/app/(dashboard)/installations/page.tsx`

- [ ] **Step 2: 增加删除功能和确认对话框**

参考 Task 4 的模式，为每个安装卡片增加删除按钮和确认对话框。

- [ ] **Step 3: 提交**

```bash
git add <installation-list-file>
git commit -m "feat: 安装管理列表增加删除安装记录功能"
```

---

## Task 7: 整体测试

- [ ] **Step 1: 启动开发服务器**

```bash
npm run dev
```

- [ ] **Step 2: 测试场景**

1. **客户管理删除订单（有设计方案时）**
   - 创建一个有设计方案的订单
   - 到客户管理尝试删除
   - 预期: 提示"该订单还有设计方案，请到方案管理删除设计方案后再试"

2. **客户管理删除订单（有安装记录时）**
   - 创建一个有安装记录的订单
   - 到客户管理尝试删除
   - 预期: 提示"该订单还有安装记录，请到安装管理删除安装记录后再试"

3. **方案管理删除设计方案（有安装记录时）**
   - 创建一个有安装记录的设计方案
   - 到方案管理尝试删除
   - 预期: 提示"该设计方案还有安装记录，请到安装管理删除安装记录后再试"

4. **店长/老板跨级删除**
   - 用店长或老板账号登录
   - 尝试删除有下游记录的订单/方案
   - 预期: 直接删除成功

5. **客户管理成功删除无下游订单**
   - 创建一个没有任何下游记录的订单
   - 到客户管理删除
   - 预期: 删除成功

- [ ] **Step 3: 最终提交**

所有功能完成后，提交所有变更:

```bash
git add -A
git commit -m "feat: 实现订单删除锁定机制 - 下一级锁定上一级

- API: 订单删除增加下游记录检查
- API: 设计方案删除增加安装记录检查
- UI: 客户管理订单详情增加删除按钮
- UI: 方案管理列表增加删除按钮
- UI: 安装管理列表增加删除按钮

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```
