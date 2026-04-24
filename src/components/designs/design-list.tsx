'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

const statusConfig = {
  draft: { label: '草稿', color: 'bg-gray-100 text-gray-800' },
  submitted: { label: '已提交', color: 'bg-blue-100 text-blue-800' },
  confirmed: { label: '已确认', color: 'bg-green-100 text-green-800' },
}

export function DesignList({ designs }: { designs: any[] }) {
  const router = useRouter()
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const handleDeleteDesign = async (id: string) => {
    if (!confirm('确定要删除该设计方案吗？')) return
    try {
      setDeleteError(null)
      const res = await fetch(`/api/designs/${id}`, {
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
    }
  }
  if (designs.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        暂无设计方案
      </div>
    )
  }

  return (
    <div className="grid gap-4">
      {deleteError && (
        <div className="text-red-600 text-sm mb-2">{deleteError}</div>
      )}
      {designs.map((design) => (
        <Card key={design.id} className="p-4 hover:bg-gray-50 transition-colors">
          <div className="flex items-center justify-between">
            <Link href={`/designs/${design.id}`} className="flex-1">
              <h3 className="font-medium">{design.title}</h3>
              <p className="text-sm text-muted-foreground">
                客户：{design.customers?.name || '未知'} {design.customers?.house_type ? `(${design.customers.house_type})` : ''} · {design.total_area ? `${design.total_area}㎡` : ''}
                {design.orders?.order_no && ` · 订单号：${design.orders.order_no}`}
              </p>
            </Link>
            <div className="flex items-center gap-2">
              <Badge className={statusConfig[design.status as keyof typeof statusConfig]?.color}>
                {statusConfig[design.status as keyof typeof statusConfig]?.label}
              </Badge>
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
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}