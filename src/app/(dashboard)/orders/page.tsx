'use client'

import Link from 'next/link'
import { OrderList } from '@/components/orders/order-list'

export default function OrdersPage() {
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">订单管理</h1>
        <Link
          href="/orders/new"
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          新建订单
        </Link>
      </div>
      <OrderList />
    </div>
  )
}
