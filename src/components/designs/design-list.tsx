'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

const statusConfig: Record<string, { label: string; color: string }> = {
  draft: { label: '设计中', color: 'bg-gray-100 text-gray-800' },
  submitted: { label: '已提交', color: 'bg-blue-100 text-blue-800' },
}

const orderStatusConfig: Record<string, { label: string; color: string }> = {
  pending_dispatch: { label: '待派单', color: 'bg-gray-100 text-gray-800' },
  pending_design: { label: '待接单', color: 'bg-yellow-100 text-yellow-800' },
  designing: { label: '设计中', color: 'bg-purple-100 text-purple-800' },
  in_design: { label: '设计中', color: 'bg-purple-100 text-purple-800' },
  pending_order: { label: '待下单', color: 'bg-orange-100 text-orange-800' },
  pending_payment: { label: '待打款', color: 'bg-red-100 text-red-800' },
  pending_shipment: { label: '待出货', color: 'bg-indigo-100 text-indigo-800' },
  in_install: { label: '安装中', color: 'bg-cyan-100 text-cyan-800' },
  completed: { label: '已完结', color: 'bg-green-100 text-green-800' },
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
        暂无设计任务
      </div>
    )
  }

  return (
    <div className="grid gap-4">
      {deleteError && (
        <div className="text-red-600 text-sm mb-2">{deleteError}</div>
      )}
      {designs.map((design) => {
        const order = design.orders
        const orderStatus = order?.status
        const config = orderStatusConfig[orderStatus] || { label: orderStatus || '未知', color: 'bg-gray-100 text-gray-800' }

        return (
          <Card key={design.id} className="p-4 hover:bg-gray-50 transition-colors">
            <div className="flex items-center justify-between">
              <Link href={`/designs/${design.id}`} className="flex-1">
                <h3 className="font-medium">{design.title}</h3>
                <p className="text-sm text-muted-foreground">
                  订单号：{order?.order_no || '无'} · 客户：{order?.customer_name || '未知'}
                  {design.total_area ? ` · ${design.total_area}㎡` : ''}
                </p>
              </Link>
              <div className="flex items-center gap-2">
                <Badge className={config.color}>
                  {config.label}
                </Badge>
                <button
                  onClick={() => handleDeleteDesign(design.id)}
                  className="text-sm text-red-600 hover:text-red-700"
                >
                  删除
                </button>
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}
