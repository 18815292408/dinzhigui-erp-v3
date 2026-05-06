'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { buildCompletedOrderCardView } from '@/lib/order-workflow'
import { Trash2 } from 'lucide-react'
import Link from 'next/link'

export function CompletedOrderList({ orders, userRole }: { orders: any[]; userRole: string }) {
  const router = useRouter()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const canDelete = ['owner', 'manager'].includes(userRole)

  const handleDelete = async (orderId: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!confirm('确定要删除该已完成订单吗？此操作不可恢复。')) return

    setDeletingId(orderId)
    setError(null)

    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || '删除失败')
      }

      router.refresh()
    } catch (err: any) {
      setError(err.message || '删除失败')
    } finally {
      setDeletingId(null)
    }
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        暂无已完成订单
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
          <button className="ml-2 underline" onClick={() => setError(null)}>关闭</button>
        </div>
      )}

      {orders.map((order) => {
        const card = buildCompletedOrderCardView({
          order,
          design: order.design,
          installation: order.installation,
        })

        return (
          <Card key={card.id} className="p-4 hover:bg-gray-50 transition-colors">
            <Link href={`/completed-orders/${card.id}`} className="block">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium truncate">{card.customerName || '未知客户'}</h3>
                    <Badge className="bg-green-100 text-green-800">已完成</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    订单号：{card.orderNo || '无'} · 联系方式：{card.customerPhone || '无'}
                    {card.houseType && ` · ${card.houseType}`}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    方案：{card.designTitle || '无'}
                    {card.roomCount && ` · ${card.roomCount}室`}
                    {card.completedAt && ` · 完成于 ${new Date(card.completedAt).toLocaleDateString('zh-CN')}`}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm text-muted-foreground">订单金额</p>
                  <p className="font-semibold text-green-700">
                    {card.amount ? `¥${card.amount.toLocaleString()}` : '未填写'}
                  </p>
                </div>
              </div>
            </Link>

            {canDelete && (
              <div className="mt-3 pt-3 border-t border-gray-100 flex justify-end">
                <button
                  onClick={(e) => handleDelete(card.id, e)}
                  disabled={deletingId === card.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                  {deletingId === card.id ? '删除中...' : '删除订单'}
                </button>
              </div>
            )}
          </Card>
        )
      })}
    </div>
  )
}
