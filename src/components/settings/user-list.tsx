'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

import { ADMIN_EMAIL } from '@/lib/types'

const roleLabels: Record<string, string> = {
  owner: '老板',
  manager: '店长',
  sales: '导购',
  designer: '设计师',
  installer: '安装/售后',
}

function getRoleLabel(u: { role: string; email?: string | null }): string {
  if (u.role === 'owner' && u.email === ADMIN_EMAIL) return '管理员'
  return roleLabels[u.role] || u.role
}

const roleColors: Record<string, string> = {
  owner: 'bg-purple-100 text-purple-800',
  manager: 'bg-purple-100 text-purple-800',
  sales: 'bg-blue-100 text-blue-800',
  designer: 'bg-green-100 text-green-800',
  installer: 'bg-orange-100 text-orange-800',
}

function EditModal({ user, isSelf, onClose, onDeleted }: { user: any; isSelf?: boolean; onClose: () => void; onDeleted: () => void }) {
  const [form, setForm] = useState({
    display_name: user.display_name || '',
    email: user.email || '',
    phone: user.phone || '',
    role: user.role,
    password: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const isOwnerSelf = isSelf && user.role === 'owner'

  const handleSave = async () => {
    setError('')
    if (isOwnerSelf) {
      // Owner editing self: only password
      if (!form.password || form.password.length < 6) {
        setError('密码至少6位')
        return
      }
    } else {
      // Editing staff: full validation
      if (!form.display_name) {
        setError('请填写员工姓名')
        return
      }
      if (!form.email && !form.phone) {
        setError('邮箱和手机号不能同时为空')
        return
      }
      if (form.password && form.password.length < 6) {
        setError('密码至少6位')
        return
      }
    }

    setLoading(true)
    try {
      const body: any = {}
      if (isOwnerSelf) {
        body.password = form.password
      } else {
        body.display_name = form.display_name
        body.email = form.email || null
        body.phone = form.phone || null
        body.role = form.role
        if (form.password) body.password = form.password
      }

      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || '保存失败')
        return
      }
      onClose()
      window.location.reload()
    } catch (e: any) {
      setError(e.message || '保存失败')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm(`确定要删除账号 "${user.display_name}" 吗？此操作不可恢复。`)) return
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (res.ok) {
        onClose()
        onDeleted()
      }
    } finally {
      setLoading(false)
    }
  }

  // Role options exclude owner (cannot change staff to owner)
  const editableRoles = Object.entries(roleLabels).filter(([value]) => value !== 'owner')

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl shadow-black/20 p-6 w-96 space-y-4 max-h-[90vh] overflow-y-auto">
        <h3 className="font-semibold">编辑账号</h3>
        <p className="text-sm text-muted-foreground">{user.display_name}</p>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="space-y-3">
          {isOwnerSelf ? (
            <div className="space-y-1">
              <label className="text-sm font-medium">新密码</label>
              <input
                type="password"
                className="w-full px-3 py-2 border rounded-md text-sm"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="请输入新密码"
                autoFocus
              />
              <p className="text-xs text-muted-foreground">密码至少6位</p>
            </div>
          ) : (
            <>
              <div className="space-y-1">
                <label className="text-sm font-medium">员工姓名</label>
                <input
                  className="w-full px-3 py-2 border rounded-md text-sm"
                  value={form.display_name}
                  onChange={(e) => setForm({ ...form, display_name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">角色</label>
                <select
                  className="w-full px-3 py-2 border rounded-md text-sm"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                >
                  {editableRoles.map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">邮箱</label>
                <input
                  type="email"
                  className="w-full px-3 py-2 border rounded-md text-sm"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="与手机二选一"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">手机号</label>
                <input
                  type="tel"
                  className="w-full px-3 py-2 border rounded-md text-sm"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="与邮箱二选一"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">新密码</label>
                <input
                  type="password"
                  className="w-full px-3 py-2 border rounded-md text-sm"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="留空则不修改密码"
                />
                <p className="text-xs text-muted-foreground">如需修改密码请填写，至少6位</p>
              </div>
            </>
          )}
        </div>

        <div className="flex gap-2 justify-between pt-2">
          {!isOwnerSelf && (
            <Button
              variant="ghost"
              size="sm"
              className="text-red-500 hover:text-red-600 hover:bg-red-50"
              onClick={handleDelete}
              disabled={loading}
            >
              删除
            </Button>
          )}
          <div className={`flex gap-2 ${isOwnerSelf ? 'ml-auto' : ''}`}>
            <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>取消</Button>
            <Button size="sm" onClick={handleSave} disabled={loading}>
              {loading ? '保存中...' : '保存'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function UserList({ users, currentUserId }: { users: any[]; currentUserId?: string }) {
  const [editingUser, setEditingUser] = useState<any>(null)

  // Can edit if: not owner, OR is the current owner editing themselves
  const canEdit = (user: any) => user.role !== 'owner' || user.id === currentUserId

  return (
    <>
      <div className="grid gap-4">
        {users.map((user) => (
          <Card key={user.id} className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">{user.display_name}</h3>
                <p className="text-sm text-muted-foreground">
                  {user.email} {user.phone ? `· ${user.phone}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={roleColors[user.role]}>
                  {getRoleLabel(user)}
                </Badge>
                {canEdit(user) && (
                  <Button variant="ghost" size="sm" onClick={() => setEditingUser(user)}>
                    编辑
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
      {editingUser && (
        <EditModal
          user={editingUser}
          isSelf={editingUser.id === currentUserId}
          onClose={() => setEditingUser(null)}
          onDeleted={() => window.location.reload()}
        />
      )}
    </>
  )
}