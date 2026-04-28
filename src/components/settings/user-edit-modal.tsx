'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const roleLabels: Record<string, string> = {
  owner: '老板',
  manager: '店长',
  sales: '导购',
  designer: '设计师',
  installer: '安装/售后',
}

interface Props {
  user: any
  onUpdated: () => void
}

export function UserEditModal({ user, onUpdated }: Props) {
  const [open, setOpen] = useState(false)
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
        setOpen(false)
        onUpdated()
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>编辑</Button>
      {open && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl shadow-black/20 p-6 w-80 space-y-4">
            <h3 className="font-semibold">编辑账号</h3>
            <p className="text-sm">{user.display_name}</p>
            <select
              className="w-full px-3 py-2 border rounded-md"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              {Object.entries(roleLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setOpen(false)}>取消</Button>
              <Button size="sm" onClick={handleSave} disabled={loading}>保存</Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
