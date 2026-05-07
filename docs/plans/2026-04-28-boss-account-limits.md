# 老板账号限额可配置 实施方案

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 管理员可以为每个老板单独设置各角色账号创建限额，并在账号管理页面联动生效。

**Architecture:** 在 `users` 表增加 `role_limits` JSONB 字段存储每个老板的限额配置。管理员面板增加编辑限额的 UI。账号创建 API 和前端表单均从该字段读取限额，取代硬编码常量。默认值保持现有逻辑（店长1、导购3、设计师3、安装3）。

**Tech Stack:** Next.js 15 (App Router), Supabase (PostgreSQL), TypeScript, Tailwind CSS

---

## 数据流

```
管理员设置限额 → PATCH /api/admin/users/[id] { role_limits } → users.role_limits
                                                                    ↓
老板创建员工 → user-form.tsx (通过 page props 传入) → 显示剩余名额
            → POST /api/users → 读取 owner 的 role_limits 校验
```

---

### Task 1: 数据库迁移 — 添加 role_limits 字段

**Files:**
- Create: `supabase/migrations/008_add_role_limits.sql`

**Step 1: 创建迁移文件**

```sql
-- 给 users 表添加 role_limits JSONB 字段
-- 仅老板(owner)角色使用，存储该老板可创建的各类角色账号数量
-- 格式: {"manager": 2, "sales": 5, "designer": 3, "installer": 3}
-- NULL 表示使用系统默认值
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS role_limits JSONB DEFAULT NULL;
```

**Step 2: 更新 TypeScript 类型**

修改 `src/types/database.ts` 的 users Row/Insert/Update 接口，添加 `role_limits: Record<string, number> | null`。

---

### Task 2: API — 支持读写 role_limits

**Files:**
- Modify: `src/app/api/admin/users/[id]/route.ts`

**Step 1: PATCH 接口增加 role_limits 参数**

在现有 PATCH handler 中：
1. 从 body 解构增加 `role_limits`
2. 校验 `role_limits` 格式（每个值必须是非负整数，key 必须是有效角色）
3. 校验仅 owner 用户可设置（非 owner 忽略此字段）
4. 将 `role_limits` 写入 update 对象

```typescript
// 校验 role_limits
if (role_limits !== undefined) {
  if (targetUser.role !== 'owner') {
    return Response.json({ error: '仅老板账号可设置创建限额' }, { status: 400 })
  }
  const validRoles = ['manager', 'sales', 'designer', 'installer']
  for (const [role, count] of Object.entries(role_limits)) {
    if (!validRoles.includes(role) || typeof count !== 'number' || count < 0 || !Number.isInteger(count)) {
      return Response.json({ error: `无效的限额配置: ${role}=${count}` }, { status: 400 })
    }
  }
  updateData.role_limits = role_limits
}
```

---

### Task 3: API — 创建用户时读取动态限额

**Files:**
- Modify: `src/app/api/users/route.ts`

**Step 1: 从 owner 记录读取限额**

将硬编码的 `ROLE_LIMITS` 替换为从数据库读取：

```typescript
// 获取当前组织的 owner
const { data: owner } = await adminClient
  .from('users')
  .select('role_limits')
  .eq('organization_id', session.organization_id)
  .eq('role', 'owner')
  .single()

// 默认限额
const DEFAULT_LIMITS: Record<string, number> = { manager: 1, sales: 3, designer: 3, installer: 3 }

// owner 可能给老板自己设定的情况下，创建 owner 时限制为 99（不变）
const ROLE_LIMITS: Record<string, number> = { 
  owner: 99, 
  ...DEFAULT_LIMITS, 
  ...(owner?.role_limits as Record<string, number> || {}) 
}
```

---

### Task 4: 管理员面板 — 老板列表增加限额编辑按钮

**Files:**
- Modify: `src/components/settings/users-admin-list.tsx`

**Step 1: 添加限额编辑 Modal 组件**

新增 `LimitsModal` 组件（可放在同一文件中或新建文件）：

```typescript
function LimitsModal({ owner, onClose, onSaved }: { 
  owner: any, 
  onClose: () => void, 
  onSaved: () => void 
}) {
  const defaultLimits = { manager: 1, sales: 3, designer: 3, installer: 3 }
  const currentLimits = owner.role_limits || defaultLimits
  
  const [limits, setLimits] = useState(currentLimits)
  const [loading, setLoading] = useState(false)
  
  const roleLabels: Record<string, string> = { manager: '店长', sales: '导购', designer: '设计师', installer: '安装/售后' }
  
  const handleSave = async () => {
    setLoading(true)
    const res = await fetch(`/api/admin/users/${owner.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role_limits: limits })
    })
    if (res.ok) { onSaved(); onClose() }
    else { alert('保存失败') }
    setLoading(false)
  }
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl p-6 w-[400px] shadow-2xl">
        <h3 className="text-lg font-semibold mb-4">编辑账号限额 - {owner.display_name || owner.email}</h3>
        <div className="space-y-4">
          {Object.entries(roleLabels).map(([role, label]) => (
            <div key={role} className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">{label}</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setLimits({ ...limits, [role]: Math.max(0, (limits[role] || 0) - 1) })}
                  className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
                >−</button>
                <input
                  type="number"
                  value={limits[role] || 0}
                  onChange={(e) => setLimits({ ...limits, [role]: Math.max(0, parseInt(e.target.value) || 0) })}
                  className="w-16 text-center border rounded-lg py-1 text-sm"
                  min={0}
                />
                <button
                  onClick={() => setLimits({ ...limits, [role]: (limits[role] || 0) + 1 })}
                  className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
                >+</button>
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">取消</button>
          <button onClick={handleSave} disabled={loading}
            className="px-4 py-2 text-sm bg-apple-blue text-white rounded-lg hover:bg-blue-600 disabled:opacity-50">
            {loading ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  )
}
```

**Step 2: 在老板行添加"限额"按钮**

在 `renderUserRow` 头部（老板行）的操作按钮区域，删除和编辑按钮旁边增加：

```tsx
<button onClick={() => setEditingLimits(u)}
  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors"
>
  限额
</button>
```

添加状态：`const [editingLimits, setEditingLimits] = useState<any>(null)`

在组件底部渲染：`{editingLimits && <LimitsModal owner={editingLimits} onClose={() => setEditingLimits(null)} onSaved={() => { setEditingLimits(null); router.refresh() }} />}`

---

### Task 5: 账号管理 — 前端表单联动动态限额

**Files:**
- Modify: `src/components/settings/user-form.tsx`
- Modify: `src/app/(dashboard)/settings/users/new/page.tsx`
- Modify: `src/app/(dashboard)/settings/users/page.tsx`

**Step 1: page.tsx 传入 roleLimits props**

在 `src/app/(dashboard)/settings/users/page.tsx` 中，查询 owner 的 role_limits 并传给 UserList（虽然 UserList 目前不需要，但 page 需要传给 new page）。

实际上，`new/page.tsx` 是独立的，需要自己查询。但 new/page.tsx 目前只传 `currentUserRole`, `currentUserId`, `organizationId` 给 UserForm。最简单的方式是 new/page.tsx 读取 owner 的 role_limits 并传下去。

或者在 UserForm 的 useEffect 中，直接查询 owner 的 role_limits。这更简单，因为 UserForm 是客户端组件，可以直接请求 API。

**Step 2: 新建 GET API 获取当前组织限额**

创建 `src/app/api/users/limits/route.ts`：

```typescript
// GET /api/users/limits - 获取当前组织的角色创建限额
export async function GET() {
  const session = await requireSession()
  
  const adminClient = createAdminClient()
  const { data: owner } = await adminClient
    .from('users')
    .select('role_limits')
    .eq('organization_id', session.organization_id)
    .eq('role', 'owner')
    .single()
  
  const DEFAULT_LIMITS = { manager: 1, sales: 3, designer: 3, installer: 3 }
  return Response.json({ limits: { ...DEFAULT_LIMITS, ...(owner?.role_limits as any || {}) } })
}
```

**Step 3: 更新 UserForm 读取动态限额**

修改 `src/components/settings/user-form.tsx`：
- 删除硬编码的 `ROLE_LIMITS` 常量（第9行）
- 在 useEffect 中 fetch `/api/users/limits` 获取限额
- 如果 `isManagerCreation` 依然不限制（返回 999）

```typescript
useEffect(() => {
  async function fetchLimits() {
    if (isManagerCreation) {
      setRemainingSlots({ manager: 999, sales: 999, designer: 999, installer: 999 })
      return
    }
    
    // 获取动态限额
    const limitsRes = await fetch('/api/users/limits')
    const { limits: roleLimits } = await limitsRes.json()
    
    // 查询已有各角色数量
    const { data: existing, error } = await supabase
      .from('users')
      .select('role')
      .eq('organization_id', organizationId)
    
    if (!error && existing) {
      const counts: Record<string, number> = { manager: 0, sales: 0, designer: 0, installer: 0 }
      existing.forEach((u) => { if (counts[u.role] !== undefined) counts[u.role]++ })
      
      setRemainingSlots({
        manager: Math.max(0, (roleLimits.manager || 1) - counts.manager),
        sales: Math.max(0, (roleLimits.sales || 3) - counts.sales),
        designer: Math.max(0, (roleLimits.designer || 3) - counts.designer),
        installer: Math.max(0, (roleLimits.installer || 3) - counts.installer),
      })
    }
  }
  
  fetchLimits()
}, [isManagerCreation, organizationId])
```

---

### Task 6: 验证与测试

**Step 1: 本地验证清单**

- [ ] 管理员登录 → 管理员面板 → 老板列表看到"限额"按钮
- [ ] 点击"限额" → 弹出编辑框，显示当前限额（默认：店长1、导购3、设计师3、安装3）
- [ ] 修改店长为2 → 保存成功
- [ ] 该老板登录 → 账号管理 → 添加员工，店长剩余名额显示2
- [ ] 该老板创建2个店长后，再创建显示名额不足
- [ ] 另一个老板（未修改限额）→ 店长剩余名额仍为1（默认值）
- [ ] 非管理员看不到管理员面板入口

**Step 2: 运行已有回归测试**

```bash
node scripts/order-workflow-regression.test.mjs
```
