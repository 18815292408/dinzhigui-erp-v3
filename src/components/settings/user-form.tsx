'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const ROLE_LIMITS = { manager: 1, sales: 3, designer: 3, installer: 3 }
const roleLabels: Record<string, string> = { owner: '老板', manager: '店长', sales: '导购', designer: '设计师', installer: '安装/售后' }

interface Props {
  currentUserRole: string
  currentUserId: string
  organizationId: string
  isManagerCreation?: boolean
}

export function UserForm({ currentUserRole, organizationId, isManagerCreation = false }: Props) {
  const [form, setForm] = useState({
    email: '',
    phone: '',
    password: '',
    display_name: '',
    role: isManagerCreation ? 'owner' : 'sales',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [remainingSlots, setRemainingSlots] = useState<Record<string, number>>({
    manager: ROLE_LIMITS.manager,
    sales: ROLE_LIMITS.sales,
    designer: ROLE_LIMITS.designer,
    installer: ROLE_LIMITS.installer,
  })
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    if (isManagerCreation) {
      // No limits for manager creation
      setRemainingSlots({
        manager: 999,
        sales: 999,
        designer: 999,
        installer: 999,
      })
      return
    }
    Promise.all([
      supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'manager').eq('organization_id', organizationId),
      supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'sales').eq('organization_id', organizationId),
      supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'designer').eq('organization_id', organizationId),
      supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'installer').eq('organization_id', organizationId),
    ]).then(([managerRes, salesRes, designerRes, installerRes]) => {
      setRemainingSlots({
        manager: ROLE_LIMITS.manager - (managerRes.count || 0),
        sales: ROLE_LIMITS.sales - (salesRes.count || 0),
        designer: ROLE_LIMITS.designer - (designerRes.count || 0),
        installer: ROLE_LIMITS.installer - (installerRes.count || 0),
      })
    })
  }, [isManagerCreation, organizationId])

  // Build role options based on current user role
  // Manager creation only allowed via isManagerCreation flag (admin panel)
  const roleOptions = isManagerCreation
    ? ['owner']
    : ['manager', 'sales', 'designer', 'installer']

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Validate: email or phone at least one
    if (!form.email && !form.phone) {
      setError('请填写邮箱或手机号（至少填一个）')
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || '创建账号失败')
      }

      setSuccess(true)
      await new Promise(r => setTimeout(r, 1000))
      router.push(isManagerCreation ? '/settings/admin' : '/settings/users')
      router.refresh()
    } catch (err: any) {
      setError(err.message || '创建账号失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-md">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3">
          <p className="text-sm text-green-600">账号创建成功！正在跳转...</p>
        </div>
      )}

      <div className="space-y-2">
        <label className="text-sm font-medium">员工姓名 *</label>
        <Input
          value={form.display_name}
          onChange={(e) => setForm({ ...form, display_name: e.target.value })}
          required
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">角色 *</label>
        <select
          className="w-full px-3 py-2 border rounded-md"
          value={form.role}
          onChange={(e) => setForm({ ...form, role: e.target.value })}
        >
          {roleOptions.map(role => (
            <option key={role} value={role}>
              {roleLabels[role]}（剩余 {remainingSlots[role]} 个）
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">邮箱（与手机二选一）</label>
        <Input
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">手机号（选填）</label>
        <Input
          type="tel"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          placeholder="与邮箱二选一"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">初始密码 *</label>
        <Input
          type="password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required
          minLength={6}
        />
      </div>

      <div className="flex gap-4">
        <Button type="submit" disabled={loading}>
          {loading ? '创建中...' : '创建账号'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          取消
        </Button>
      </div>
    </form>
  )
}
