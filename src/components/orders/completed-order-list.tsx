'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { buildCompletedOrderCardView } from '@/lib/order-workflow'
import { Trash2, MapPin } from 'lucide-react'
import Link from 'next/link'

export function CompletedOrderList({ orders, userRole, status = 'completed' }: { orders: any[]; userRole: string; status?: 'completed' | 'cancelled' }) {
  const router = useRouter()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const canDelete = ['owner', 'manager'].includes(userRole)

  const handleDelete = async (orderId: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!confirm('确定要删除该订单吗？此操作不可恢复。')) return

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
        {status === 'cancelled' ? '暂无已退订订单' : '暂无已完成订单'}
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

      <div className="grid gap-4">
        {orders.map((order) => {
          const card = buildCompletedOrderCardView({
            order,
            design: order.design,
            installation: order.installation,
          })

          const isCancelled = card.status === 'cancelled'

          return (
            <Card key={card.id} className="overflow-hidden hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <Link 
                  href={`/completed-orders/${card.id}`} 
                  className="block no-underline text-inherit"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-medium text-base truncate">
                          {card.customerName || '未知客户'}
                        </h3>
                        {isCancelled ? (
                          <Badge variant="secondary" className="bg-red-100 text-red-700 hover:bg-red-100">
                            已退订
                          </Badge>
                        ) : (
                          <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                            已完成
                          </Badge>
                        )}
                      </div>
                      
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <div className="flex flex-wrap gap-x-4 gap-y-1">
                          <span>订单号：{card.orderNo || '无'}</span>
                          {card.customerPhone && (
                            <span>联系方式：{card.customerPhone}</span>
                          )}
                          {card.houseType && (
                            <span>{card.houseType}</span>
                          )}
                        </div>
                        
                        <div className="flex flex-wrap gap-x-4 gap-y-1">
                          <span>方案：{card.designTitle || '无'}</span>
                          {card.roomCount && (
                            <span>{card.roomCount}室</span>
                          )}
                          {card.completedAt && (
                            <span>完成于 {new Date(card.completedAt).toLocaleDateString('zh-CN')}</span>
                          )}
                          {card.cancelledAt && (
                            <span>退订于 {new Date(card.cancelledAt).toLocaleDateString('zh-CN')}</span>
                          )}
                        </div>

                        {card.customerAddress && (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{card.customerAddress}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-right shrink-0">
                      <p className="text-xs text-muted-foreground mb-1">订单金额</p>
                      <p className={`font-semibold text-lg ${isCancelled ? 'text-red-600' : 'text-green-700'}`}>
                        {card.amount ? `¥${card.amount.toLocaleString()}` : '未填写'}
                      </p>
                    </div>
                  </div>
                </Link>

                {canDelete && (
                  <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end">
                    <button
                      onClick={(e) => handleDelete(card.id, e)}
                      disabled={deletingId === card.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="w-4 h-4" />
                      {deletingId === card.id ? '删除中...' : '删除订单'}
                    </button>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
