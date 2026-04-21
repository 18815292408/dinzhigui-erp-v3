'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { OrderCard } from './order-card'
import { Order } from '@/lib/types'

const STATUS_LABELS: Record<string, string> = {
  pending_dispatch: '待派单',
  pending_design: '待接单',
  designing: '设计中',
  pending_order: '待下单',
  pending_payment: '待打款',
  pending_shipment: '待出货',
  in_install: '安装中',
  completed: '已完结'
}

export function OrderList() {
  const [orders, setOrders] = useState<Order[]>([])
  const [filter, setFilter] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchOrders()
  }, [])

  const fetchOrders = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
    setOrders(data || [])
    setLoading(false)
  }

  const filteredOrders = filter === 'all'
    ? orders
    : orders.filter(o => o.status === filter)

  if (loading) {
    return <div className="text-center py-12">加载中...</div>
  }

  return (
    <div>
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1 rounded-full text-sm whitespace-nowrap ${
            filter === 'all' ? 'bg-blue-500 text-white' : 'bg-gray-100'
          }`}
        >
          全部
        </button>
        {Object.entries(STATUS_LABELS).map(([value, label]) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={`px-3 py-1 rounded-full text-sm whitespace-nowrap ${
              filter === value ? 'bg-blue-500 text-white' : 'bg-gray-100'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredOrders.map(order => (
          <OrderCard key={order.id} order={order} />
        ))}
      </div>

      {filteredOrders.length === 0 && (
        <div className="text-center py-12 text-gray-500">暂无订单</div>
      )}
    </div>
  )
}
