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

// 有效期套餐选项
const expiryOptions = [
  { label: '24小时体验', hours: 24 },
  { label: '1个月', hours: 24 * 30 },
  { label: '1年', hours: 24 * 365 },
  { label: '10年', hours: 24 * 365 * 10 },
  { label: '永久有效', hours: 0 }, // 0 表示永不过期
]

// 计算剩余时间显示
function getExpiryDisplay(expiresAt: string | null): { text: string; color: string } {
  if (!expiresAt) {
    return { text: '永久有效', color: 'text-green-600' }
  }
  const expires = new Date(expiresAt)
  const now = new Date()
  if (expires < now) {
    return { text: '已过期', color: 'text-red-600' }
  }
  const diffMs = expires.getTime() - now.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays < 1) {
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    return { text: `剩余${diffHours}小时`, color: 'text-orange-600' }
  }
  if (diffDays < 30) {
    return { text: `剩余${diffDays}天`, color: 'text-orange-600' }
  }
  const months = Math.floor(diffDays / 30)
  if (months < 12) {
    return { text: `剩余${months}个月`, color: 'text-green-600' }
  }
  const years = Math.floor(months / 12)
  return { text: `剩余${years}年`, color: 'text-green-600' }
}

interface Props {
  users: any[]
}

export function UsersAdminList({ users }: Props) {
  const router = useRouter()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editRole, setEditRole] = useState('')
  const [editExpiry, setEditExpiry] = useState<string>('')

  const handleEdit = (user: any) => {
    setEditingId(user.id)
    setEditRole(user.role)
    setEditExpiry(user.expires_at || '')
  }

  const handleSave = async (userId: string) => {
    // 将空字符串转换为 null 表示永久有效
    const expiresAt = editExpiry === '' ? null : editExpiry
    await fetch(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ role: editRole, expires_at: expiresAt }),
    })
    setEditingId(null)
    router.refresh()
  }

  const handleExpiryChange = (hours: number) => {
    if (hours === 0) {
      // 永久有效
      setEditExpiry('')
    } else {
      const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString()
      setEditExpiry(expiresAt)
    }
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
      {users.map((u: any) => {
        const expiryDisplay = getExpiryDisplay(u.expires_at)
        return (
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
                <p className={`text-xs ${expiryDisplay.color}`}>
                  有效期：{expiryDisplay.text}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {editingId === u.id ? (
                <>
                  <div className="flex flex-col gap-1">
                    <select
                      className="px-2 py-1 border rounded text-sm"
                      value={editRole}
                      onChange={(e) => setEditRole(e.target.value)}
                    >
                      {Object.entries(roleLabels).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                    <select
                      className="px-2 py-1 border rounded text-sm"
                      value={editExpiry === '' ? 'permanent' : 'custom'}
                      onChange={(e) => {
                        if (e.target.value === 'permanent') {
                          setEditExpiry('')
                        } else {
                          // 默认选择1年
                          const expiresAt = new Date(Date.now() + 24 * 365 * 60 * 60 * 1000).toISOString()
                          setEditExpiry(expiresAt)
                        }
                      }}
                    >
                      <option value="permanent">永久有效</option>
                      <option value="custom">设置有效期</option>
                    </select>
                    {editExpiry !== '' && (
                      <input
                        type="datetime-local"
                        className="px-2 py-1 border rounded text-sm"
                        value={editExpiry.slice(0, 16)}
                        onChange={(e) => setEditExpiry(new Date(e.target.value).toISOString())}
                      />
                    )}
                  </div>
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
        )
      })}
    </div>
  )
}
