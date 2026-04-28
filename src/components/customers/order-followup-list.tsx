'use client'

import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface OrderSummary {
  id: string
  order_no: string
  status: string
  signed_amount: number | null
}

interface CustomerWithOrders {
  id: string
  name: string
  phone: string | null
  house_type: string | null
  orders?: OrderSummary[]
}

const STAGE_LABELS: Record<string, string> = {
  pending_dispatch: '待派单',
  pending_design: '待接单',
  designing: '设计中',
  in_design: '设计中',
  pending_order: '待下单',
  pending_payment: '待打款',
  pending_shipment: '待出货',
  in_install: '安装中',
  completed: '已完结'
}

const STAGE_COLORS: Record<string, string> = {
  pending_dispatch: 'bg-gray-100 text-gray-700',
  pending_design: 'bg-orange-100 text-orange-700',
  designing: 'bg-blue-100 text-blue-700',
  in_design: 'bg-blue-100 text-blue-700',
  pending_order: 'bg-purple-100 text-purple-700',
  pending_payment: 'bg-yellow-100 text-yellow-700',
  pending_shipment: 'bg-cyan-100 text-cyan-700',
  in_install: 'bg-green-100 text-green-700',
  completed: 'bg-gray-100 text-gray-500'
}

export function OrderFollowupList({ customers }: { customers: CustomerWithOrders[] }) {
  if (customers.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        暂无订单跟进中的客户
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {customers.map((customer) => {
        const order = customer.orders?.[0]
        return (
          <Link key={customer.id} href={`/customers/${customer.id}`}>
            <Card className="p-4 hover:bg-gray-50 transition-colors cursor-pointer">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium">{customer.name}</h3>
                {order && (
                  <Badge className={STAGE_COLORS[order.status] || 'bg-gray-100'}>
                    {STAGE_LABELS[order.status] || order.status}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                {customer.phone} · {customer.house_type || '未填写房型'}
              </p>
              {order && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    订单号: {order.order_no}
                  </span>
                  {order.signed_amount && (
                    <span className="text-green-600 font-medium">
                      签单: ¥{(order.signed_amount / 10000).toFixed(1)}万
                    </span>
                  )}
                </div>
              )}
            </Card>
          </Link>
        )
      })}
    </div>
  )
}
