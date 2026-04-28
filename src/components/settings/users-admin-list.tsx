'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, ChevronRight } from 'lucide-react'
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

function getRoleLabel(user: any): string {
  if (user.role === 'owner' && user.email === ADMIN_EMAIL) return '管理员'
  return roleLabels[user.role] || user.role
}

const roleColors: Record<string, string> = {
  owner: 'bg-purple-100 text-purple-800',
  manager: 'bg-indigo-100 text-indigo-800',
  sales: 'bg-blue-100 text-blue-800',
  designer: 'bg-green-100 text-green-800',
  installer: 'bg-orange-100 text-orange-800',
}

const expiryOptions = [
  { label: '24小时', hours: 24 },
  { label: '1个月', hours: 24 * 30 },
  { label: '1年', hours: 24 * 365 },
  { label: '10年', hours: 24 * 365 * 10 },
  { label: '永久', hours: -1 },
]

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

function hoursToExpiresAt(hours: number): string | null {
  if (hours === -1) return null
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString()
}

// Count staff by role in a staff array
function countStaff(staff: any[]) {
  return {
    manager: staff.filter(s => s.role === 'manager').length,
    sales: staff.filter(s => s.role === 'sales').length,
    designer: staff.filter(s => s.role === 'designer').length,
    installer: staff.filter(s => s.role === 'installer').length,
  }
}

interface Props {
  owners: any[]
  staffByOrg: Record<string, any[]>
}

export function UsersAdminList({ owners, staffByOrg }: Props) {
  const router = useRouter()
  const [expandedOrg, setExpandedOrg] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editRole, setEditRole] = useState('')
  const [editExpiry, setEditExpiry] = useState<string | null>(null)

  const handleEdit = (user: any) => {
    setEditingId(user.id)
    setEditRole(user.role)
    setEditExpiry(user.expires_at || null)
  }

  const handleSave = async (userId: string) => {
    await fetch(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ role: editRole, expires_at: editExpiry }),
    })
    setEditingId(null)
    router.refresh()
  }

  const handleDelete = async (userId: string, userName: string, isOwner: boolean) => {
    const warn = isOwner ? '该老板旗下的所有员工账号也将一并删除！\n' : ''
    if (!confirm(`${warn}确定要删除账号 "${userName}" 吗？此操作不可恢复。`)) return
    await fetch(`/api/admin/users/${userId}`, {
      method: 'DELETE',
      credentials: 'include',
    })
    router.refresh()
  }

  const toggleExpand = (orgId: string) => {
    setExpandedOrg(expandedOrg === orgId ? null : orgId)
  }

  // Render a single user row (used for both owners and staff)
  const renderUserRow = (u: any, isStaff: boolean) => {
    const expiryDisplay = getExpiryDisplay(u.expires_at)
    const isEditing = editingId === u.id

    return (
      <div key={u.id} className={`flex items-center justify-between p-3 border rounded-lg ${isStaff ? 'bg-gray-50/50 ml-8' : 'bg-white'}`}>
        <div className="flex items-center gap-4">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-medium text-sm ${
            u.role === 'owner' ? 'bg-gradient-to-br from-purple-500 to-purple-700' :
            u.role === 'manager' ? 'bg-gradient-to-br from-indigo-500 to-indigo-700' :
            'bg-gradient-to-br from-apple-blue to-apple-purple'
          }`}>
            {u.display_name?.charAt(0) || '?'}
          </div>
          <div>
            <p className="font-medium text-sm">{u.display_name}</p>
            <p className="text-xs text-muted-foreground">
              {u.email || '无邮箱'} {u.phone ? `· ${u.phone}` : ''}
            </p>
            <p className={`text-xs ${expiryDisplay.color}`}>
              有效期：{expiryDisplay.text}
              {isStaff && <span className="text-gray-400 ml-1">（随老板账号）</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <div className="flex flex-col gap-1">
                <select
                  className="px-2 py-1 border rounded text-xs"
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                >
                  {Object.entries(roleLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
                <div className="flex flex-wrap gap-1">
                  {expiryOptions.map((opt) => (
                    <button
                      key={opt.hours}
                      type="button"
                      className={`px-2 py-0.5 text-xs rounded border ${
                        (opt.hours === -1 && editExpiry === null) ||
                        (opt.hours !== -1 && editExpiry === hoursToExpiresAt(opt.hours))
                          ? 'bg-blue-100 border-blue-500 text-blue-700'
                          : 'bg-gray-50 border-gray-300 text-gray-600 hover:bg-gray-100'
                      }`}
                      onClick={() => setEditExpiry(opt.hours === -1 ? null : hoursToExpiresAt(opt.hours))}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <Button size="sm" onClick={() => handleSave(u.id)}>保存</Button>
              <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>取消</Button>
            </>
          ) : (
            <>
              <Badge className={roleColors[u.role]}>
                {getRoleLabel(u)}
              </Badge>
              <p className="text-xs text-muted-foreground w-24 text-right">
                {u.created_at ? new Date(u.created_at).toLocaleDateString('zh-CN') : ''}
              </p>
              <Button variant="ghost" size="sm" onClick={() => handleEdit(u)}>编辑</Button>
              <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleDelete(u.id, u.display_name, false)}>删除</Button>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {owners.map((owner: any) => {
        const staff = staffByOrg[owner.organization_id] || []
        const isExpanded = expandedOrg === owner.organization_id
        const counts = countStaff(staff)
        const totalStaff = staff.length
        const expiryDisplay = getExpiryDisplay(owner.expires_at)

        return (
          <div key={owner.id}>
            {/* Owner row */}
            <div
              className="flex items-center justify-between p-3 border rounded-lg bg-white hover:bg-gray-50/50 cursor-pointer transition-colors"
              onClick={() => toggleExpand(owner.organization_id)}
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  )}
                </div>
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center text-white font-medium text-sm">
                  {owner.display_name?.charAt(0) || '?'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">{owner.display_name}</p>
                    <Badge className={roleColors.owner}>{getRoleLabel(owner)}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {owner.email || '无邮箱'} {owner.phone ? `· ${owner.phone}` : ''}
                    <span className="mx-2">|</span>
                    <span className={expiryDisplay.color}>{expiryDisplay.text}</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {counts.manager > 0 && <span className="bg-indigo-50 px-1.5 py-0.5 rounded">店长 {counts.manager}</span>}
                  {counts.sales > 0 && <span className="bg-blue-50 px-1.5 py-0.5 rounded">导购 {counts.sales}</span>}
                  {counts.designer > 0 && <span className="bg-green-50 px-1.5 py-0.5 rounded">设计 {counts.designer}</span>}
                  {counts.installer > 0 && <span className="bg-orange-50 px-1.5 py-0.5 rounded">安装 {counts.installer}</span>}
                  {totalStaff === 0 && <span className="text-gray-400">暂无员工</span>}
                  <span className="text-gray-400 ml-1">({totalStaff})</span>
                </div>
                <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleEdit(owner) }}>编辑</Button>
                <Button variant="ghost" size="sm" className="text-red-600" onClick={(e) => { e.stopPropagation(); handleDelete(owner.id, owner.display_name, true) }}>删除</Button>
              </div>
            </div>

            {/* Staff rows - expandable */}
            {isExpanded && staff.length > 0 && (
              <div className="ml-4 mt-1 space-y-1 border-l-2 border-purple-200 pl-4">
                {staff.map((s: any) => renderUserRow(s, true))}
              </div>
            )}
            {isExpanded && staff.length === 0 && (
              <div className="ml-4 mt-1 border-l-2 border-purple-200 pl-4 py-3 text-center text-sm text-muted-foreground">
                该老板暂无员工账号
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
