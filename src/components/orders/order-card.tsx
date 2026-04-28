'use client'

import Link from 'next/link'
import { Order } from '@/lib/types'

const STATUS_LABELS: Record<string, string> = {
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

const STATUS_COLORS: Record<string, string> = {
  pending_dispatch: 'bg-gray-100 text-gray-700',
  pending_design: 'bg-orange-100 text-orange-700',
  designing: 'bg-blue-100 text-blue-700',
  in_design: 'bg-blue-100 text-blue-700',
  pending_order: 'bg-purple-100 text-purple-700',
  pending_payment: 'bg-red-100 text-red-700',
  pending_shipment: 'bg-yellow-100 text-yellow-700',
  in_install: 'bg-green-100 text-green-700',
  completed: 'bg-gray-300 text-gray-600'
}

interface OrderCardProps {
  order: Order
}

export function OrderCard({ order }: OrderCardProps) {
  return (
    <Link href={`/orders/${order.id}`}>
      <div className="bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition cursor-pointer">
        <div className="flex justify-between items-start mb-3">
          <span className="font-mono text-sm">{order.order_no}</span>
          <span className={`px-2 py-1 rounded-full text-xs ${STATUS_COLORS[order.status]}`}>
            {STATUS_LABELS[order.status]}
          </span>
        </div>
        <h3 className="font-semibold mb-1">{order.customer_name}</h3>
        <p className="text-sm text-gray-500 mb-2">{order.customer_phone}</p>
        <div className="text-sm text-gray-400">
          {order.house_type} · {order.house_area}㎡
        </div>
      </div>
    </Link>
  )
}
