'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

const roleLabels: Record<string, string> = {
  owner: '管理员',
  manager: '店长',
  sales: '导购',
  designer: '设计师',
  installer: '安装/售后',
}

const roleColors: Record<string, string> = {
  owner: 'bg-purple-100 text-purple-800',
  manager: 'bg-indigo-100 text-indigo-800',
  sales: 'bg-blue-100 text-blue-800',
  designer: 'bg-green-100 text-green-800',
  installer: 'bg-orange-100 text-orange-800',
}

interface Props {
  users: any[]
}

export function UsersAdminList({ users }: Props) {
  const router = useRouter()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editRole, setEditRole] = useState('')

  const handleEdit = (user: any) => {
    setEditingId(user.id)
    setEditRole(user.role)
  }

  const handleSave = async (userId: string) => {
    await fetch(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ role: editRole }),
    })
    setEditingId(null)
    router.refresh()
  }

  const handleDelete = async (userId: string, userName: string) => {
    if (!confirm(`确定要删除账号 "${userName}" 吗？此操作不可恢复。`)) return
    await fetch(`/api/admin/users/${userId}`, {
      method: 'DELETE',
      credentials: 'include',
    })
    router.refresh()
  }

  return (
    <div className="space-y-3">
      {users.map((u: any) => (
        <div key={u.id} className="flex items-center justify-between p-3 border rounded-lg">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-apple-blue to-apple-purple flex items-center justify-center text-white font-medium">
              {u.display_name?.charAt(0) || '?'}
            </div>
            <div>
              <p className="font-medium">{u.display_name}</p>
              <p className="text-sm text-muted-foreground">
                {u.email || '无邮箱'} {u.phone ? `· ${u.phone}` : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {editingId === u.id ? (
              <>
                <select
                  className="px-2 py-1 border rounded text-sm"
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                >
                  {Object.entries(roleLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
                <Button size="sm" onClick={() => handleSave(u.id)}>保存</Button>
                <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>取消</Button>
              </>
            ) : (
              <>
                <Badge className={roleColors[u.role]}>
                  {roleLabels[u.role]}
                </Badge>
                <p className="text-xs text-muted-foreground">
                  {u.created_at ? `创建于 ${new Date(u.created_at).toLocaleDateString('zh-CN')}` : ''}
                </p>
                <Button variant="ghost" size="sm" onClick={() => handleEdit(u)}>编辑</Button>
                <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleDelete(u.id, u.display_name)}>删除</Button>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
