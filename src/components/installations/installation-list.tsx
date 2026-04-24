'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

const statusConfig = {
  pending: { label: '待安装', color: 'bg-yellow-100 text-yellow-800' },
  in_progress: { label: '进行中', color: 'bg-blue-100 text-blue-800' },
  completed: { label: '已完成', color: 'bg-green-100 text-green-800' },
  cancelled: { label: '已取消', color: 'bg-gray-100 text-gray-800' },
}

export function InstallationList({ installations }: { installations: any[] }) {
  const router = useRouter()
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDeleteInstallation = async (id: string) => {
    if (!confirm('确定要删除该安装记录吗？')) return
    setDeletingId(id)
    try {
      setDeleteError(null)
      const res = await fetch(`/api/installations/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const data = await res.json()
      if (!res.ok) {
        setDeleteError(data.error || '删除失败')
        return
      }
      router.refresh()
    } catch (err) {
      setDeleteError('删除失败')
    } finally {
      setDeletingId(null)
    }
  }

  if (installations.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        暂无安装单
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {deleteError && (
        <div className="text-red-600 text-sm mb-2">{deleteError}</div>
      )}
      {installations.map((inst) => (
        <Card key={inst.id} className="p-4 hover:bg-gray-50 transition-colors">
          <div className="flex items-center justify-between">
            <Link href={`/installations/${inst.id}`} className="flex-1">
              <h3 className="font-medium">{inst.customers?.name || '未知客户'}</h3>
              <p className="text-sm text-muted-foreground">
                方案：{inst.designs?.title || '无'}
                {inst.designs?.final_price && ` · ¥${inst.designs.final_price.toLocaleString()}`}
                {inst.designs?.room_count && ` · ${inst.designs.room_count}室`}
                {inst.customers?.house_type && ` (${inst.customers.house_type})`}
              </p>
              <p className="text-sm text-muted-foreground">
                联系方式：{inst.customers?.phone || '无'}
              </p>
            </Link>
            <div className="flex items-center gap-2">
              <Badge className={statusConfig[inst.status as keyof typeof statusConfig]?.color}>
                {statusConfig[inst.status as keyof typeof statusConfig]?.label}
              </Badge>
              <button
                onClick={() => handleDeleteInstallation(inst.id)}
                disabled={deletingId === inst.id}
                className="text-sm disabled:opacity-50 text-red-600 hover:text-red-700"
              >
                {deletingId === inst.id ? '删除中...' : '删除'}
              </button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}