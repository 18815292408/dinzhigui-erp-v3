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

function EditModal({ user, onClose, onDeleted }: { user: any; onClose: () => void; onDeleted: () => void }) {
  const [role, setRole] = useState(user.role)
  const [loading, setLoading] = useState(false)

  const handleSave = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ role }),
      })
      if (res.ok) {
        onClose()
        window.location.reload()
      }
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

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl shadow-black/20 p-6 w-80 space-y-4">
        <h3 className="font-semibold">编辑账号</h3>
        <p className="text-sm text-muted-foreground">{user.display_name}</p>
        <select
          className="w-full px-3 py-2 border rounded-md"
          value={role}
          onChange={(e) => setRole(e.target.value)}
        >
          {Object.entries(roleLabels).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <div className="flex gap-2 justify-between">
          <Button
            variant="ghost"
            size="sm"
            className="text-red-500 hover:text-red-600 hover:bg-red-50"
            onClick={handleDelete}
            disabled={loading}
          >
            删除
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>取消</Button>
            <Button size="sm" onClick={handleSave} disabled={loading}>保存</Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function UserList({ users }: { users: any[] }) {
  const [editingUser, setEditingUser] = useState<any>(null)

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
                {user.role !== 'owner' && (
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
          onClose={() => setEditingUser(null)}
          onDeleted={() => window.location.reload()}
        />
      )}
    </>
  )
}