'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { buildInstallationCardView } from '@/lib/order-workflow'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { MapPin } from 'lucide-react'

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
    <div className="grid gap-4">
      {deleteError && (
        <div className="text-red-600 text-sm mb-2">{deleteError}</div>
      )}
      {installations.map((inst) => {
        const card = buildInstallationCardView({
          customer: inst.customers,
          design: inst.designs,
          order: inst.orders,
        })

        return (
          <Card key={inst.id} className="overflow-hidden hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <Link href={`/installations/${inst.id}`} className="flex-1 min-w-0">
                  <div className="space-y-1">
                    <h3 className="font-medium text-base">{card.customerName || '未知客户'}</h3>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      {card.orderNo && <span>订单号：{card.orderNo}</span>}
                      <span>方案：{card.designTitle || '无'}</span>
                      {card.roomCount && <span>{card.roomCount}室</span>}
                      {card.houseType && <span>({card.houseType})</span>}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <span>联系方式：{card.customerPhone || '无'}</span>
                    </div>
                    {card.customerAddress && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{card.customerAddress}</span>
                      </div>
                    )}
                  </div>
                </Link>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge className={
                    inst.orders?.status === 'in_after_sales'
                      ? 'bg-purple-100 text-purple-800'
                      : (statusConfig[inst.status as keyof typeof statusConfig]?.color || 'bg-gray-100 text-gray-800')
                  }>
                    {inst.orders?.status === 'in_after_sales' ? '售后中' : (statusConfig[inst.status as keyof typeof statusConfig]?.label || inst.status)}
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
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
