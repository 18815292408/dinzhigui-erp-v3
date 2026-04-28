'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { buildCompletedOrderCardView } from '@/lib/order-workflow'
import Link from 'next/link'

export function CompletedOrderList({ orders }: { orders: any[] }) {
  if (orders.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        暂无已完成订单
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => {
        const card = buildCompletedOrderCardView({
          order,
          design: order.design,
          installation: order.installation,
        })

        return (
          <Link key={card.id} href={`/completed-orders/${card.id}`}>
            <Card className="p-4 hover:bg-gray-50 transition-colors cursor-pointer">
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
            </Card>
          </Link>
        )
      })}
    </div>
  )
}
