'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { OrderStatusFlow } from '@/components/orders/order-status-flow'
import { FactorySelector } from '@/components/orders/factory-selector'

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

const INSTALLATION_STATUS_LABELS: Record<string, string> = {
  pending_ship: '待出货',
  shipped: '已出货',
  arrived: '已到货',
  delivering: '送货中',
  installing: '安装中',
  supplement_pending: '补件中',
  installed: '已完成'
}

interface Order {
  id: string
  order_no: string
  customer_name: string
  customer_phone: string
  customer_address: string
  house_type: string
  house_area: number
  status: string
  design_due_days: number
  design_due_date: string
  factory_records: any[]
  payment_status: string
  estimated_shipment_date: string
  installation_status: string
  created_by_user: { name: string }
  assigned_designer_user: { name: string }
  assigned_installer_user: { name: string }
}

interface User {
  id: string
  name: string
  role: string
}

export default function OrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [order, setOrder] = useState<Order | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    fetchOrder()
    fetchUsers()
  }, [])

  const fetchOrder = async () => {
    const { data } = await supabase
      .from('orders')
      .select('*, created_by_user:users!created_by(name), assigned_designer_user:users!assigned_designer(name), assigned_installer_user:users!assigned_installer(name)')
      .eq('id', params.id)
      .single()
    setOrder(data)
    setLoading(false)
  }

  const fetchUsers = async () => {
    const { data } = await supabase.from('users').select('id, name, role')
    setUsers(data || [])
  }

  const handleDispatch = async (designerId: string) => {
    setActionLoading(true)
    await supabase.from('orders').update({ assigned_designer: designerId, status: 'pending_design' }).eq('id', params.id)
    await supabase.from('notifications').insert({
      user_id: designerId,
      type: 'new_order',
      priority: 'urgent',
      title: '新订单派发',
      summary: `客户 ${order?.customer_name} 的订单已派给您`,
      related_order_id: params.id
    })
    setActionLoading(false)
    fetchOrder()
  }

  const handleAccept = async (designDays: number) => {
    setActionLoading(true)
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + designDays)
    await supabase.from('orders').update({
      status: 'designing',
      design_due_days: designDays,
      design_due_date: dueDate.toISOString().slice(0, 10)
    }).eq('id', params.id)
    setActionLoading(false)
    fetchOrder()
  }

  const handleSubmitDesign = async () => {
    setActionLoading(true)
    await supabase.from('orders').update({ status: 'pending_order' }).eq('id', params.id)
    setActionLoading(false)
    fetchOrder()
  }

  const handlePlaceOrder = async (factoryRecords: any[]) => {
    setActionLoading(true)
    await supabase.from('orders').update({
      status: 'pending_payment',
      factory_records: factoryRecords
    }).eq('id', params.id)
    setActionLoading(false)
    fetchOrder()
  }

  const handleConfirmPayment = async () => {
    setActionLoading(true)
    await supabase.from('orders').update({
      status: 'pending_shipment',
      payment_status: 'paid'
    }).eq('id', params.id)
    setActionLoading(false)
    fetchOrder()
  }

  const handleSetShipment = async (date: string, installerId: string) => {
    setActionLoading(true)
    await supabase.from('orders').update({
      status: 'in_install',
      estimated_shipment_date: date,
      assigned_installer: installerId,
      installation_status: 'pending_ship'
    }).eq('id', params.id)
    await supabase.from('notifications').insert({
      user_id: installerId,
      type: 'new_install',
      priority: 'urgent',
      title: '新订单待安装',
      summary: `订单 ${order?.order_no} 已分配给您`,
      related_order_id: params.id
    })
    setActionLoading(false)
    fetchOrder()
  }

  const handleUpdateInstall = async (status: string) => {
    setActionLoading(true)
    await supabase.from('orders').update({ installation_status: status }).eq('id', params.id)
    if (status === 'supplement_pending') {
      await supabase.from('notifications').insert({
        user_id: order?.assigned_designer_user?.id,
        type: 'supplement_request',
        priority: 'urgent',
        title: '补件申请',
        summary: `订单 ${order?.order_no} 有补件需要处理`,
        related_order_id: params.id
      })
    }
    setActionLoading(false)
    fetchOrder()
  }

  const handleComplete = async () => {
    setActionLoading(true)
    await supabase.from('orders').update({
      status: 'completed',
      installation_status: 'installed'
    }).eq('id', params.id)
    setActionLoading(false)
    fetchOrder()
  }

  if (loading) return <div className="p-6">加载中...</div>
  if (!order) return <div className="p-6">订单不存在</div>

  const designers = users.filter(u => u.role === 'designer')
  const installers = users.filter(u => u.role === 'installer')

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-700">← 返回</button>
        <h1 className="text-2xl font-bold">订单详情</h1>
        <span className="px-3 py-1 bg-gray-100 rounded-full text-sm">{STATUS_LABELS[order.status]}</span>
      </div>

      <OrderStatusFlow currentStatus={order.status} />

      <div className="bg-white rounded-xl shadow-sm p-6 mt-6">
        <h2 className="text-lg font-semibold mb-4">客户信息</h2>
        <div className="grid grid-cols-2 gap-4">
          <div><span className="text-gray-500">客户姓名：</span>{order.customer_name}</div>
          <div><span className="text-gray-500">联系电话：</span>{order.customer_phone}</div>
          <div><span className="text-gray-500">地址：</span>{order.customer_address}</div>
          <div><span className="text-gray-500">户型：</span>{order.house_type}</div>
          <div><span className="text-gray-500">面积：</span>{order.house_area}㎡</div>
        </div>
      </div>

      {order.status === 'pending_dispatch' && (
        <div className="bg-white rounded-xl shadow-sm p-6 mt-6">
          <h2 className="text-lg font-semibold mb-4">派单给设计师</h2>
          <div className="flex flex-wrap gap-2">
            {designers.map(d => (
              <button
                key={d.id}
                onClick={() => handleDispatch(d.id)}
                disabled={actionLoading}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
              >
                {d.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {order.status === 'pending_design' && (
        <div className="bg-white rounded-xl shadow-sm p-6 mt-6">
          <h2 className="text-lg font-semibold mb-4">接单（选择出图时间）</h2>
          <div className="flex gap-2">
            {[7, 10, 12, 15].map(days => (
              <button
                key={days}
                onClick={() => handleAccept(days)}
                disabled={actionLoading}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
              >
                {days}天
              </button>
            ))}
          </div>
        </div>
      )}

      {order.status === 'designing' && (
        <div className="bg-white rounded-xl shadow-sm p-6 mt-6">
          <h2 className="text-lg font-semibold mb-4">设计中</h2>
          <p className="text-gray-500 mb-4">预计出图日期：{order.design_due_date}</p>
          <button
            onClick={handleSubmitDesign}
            disabled={actionLoading}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
          >
            提交方案
          </button>
        </div>
      )}

      {order.status === 'pending_order' && (
        <div className="bg-white rounded-xl shadow-sm p-6 mt-6">
          <h2 className="text-lg font-semibold mb-4">下单至工厂</h2>
          <FactorySelector
            value={order.factory_records || []}
            onChange={handlePlaceOrder}
          />
        </div>
      )}

      {order.status === 'pending_payment' && (
        <div className="bg-white rounded-xl shadow-sm p-6 mt-6">
          <h2 className="text-lg font-semibold mb-4">待打款</h2>
          <button
            onClick={handleConfirmPayment}
            disabled={actionLoading}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
          >
            确认打款
          </button>
        </div>
      )}

      {order.status === 'pending_shipment' && (
        <div className="bg-white rounded-xl shadow-sm p-6 mt-6">
          <h2 className="text-lg font-semibold mb-4">填写出货时间</h2>
          <div className="space-y-4">
            <input
              type="date"
              id="shipment-date"
              className="w-full px-3 py-2 border rounded-lg"
            />
            <div>
              <label className="block text-sm font-medium mb-2">指派安装人员</label>
              <div className="flex flex-wrap gap-2">
                {installers.map(i => (
                  <button
                    key={i.id}
                    onClick={() => {
                      const dateInput = document.getElementById('shipment-date') as HTMLInputElement
                      if (dateInput?.value) handleSetShipment(dateInput.value, i.id)
                    }}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                  >
                    {i.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {order.status === 'in_install' && (
        <div className="bg-white rounded-xl shadow-sm p-6 mt-6">
          <h2 className="text-lg font-semibold mb-4">安装进度</h2>
          <p className="text-gray-500 mb-4">当前状态：{INSTALLATION_STATUS_LABELS[order.installation_status]}</p>
          <div className="flex flex-wrap gap-2">
            {['shipped', 'arrived', 'delivering', 'installing', 'supplement_pending', 'installed'].map(status => (
              <button
                key={status}
                onClick={() => handleUpdateInstall(status)}
                disabled={actionLoading}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
              >
                {INSTALLATION_STATUS_LABELS[status]}
              </button>
            ))}
          </div>
          {order.installation_status === 'installed' && (
            <button
              onClick={handleComplete}
              disabled={actionLoading}
              className="mt-4 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
            >
              确认完成
            </button>
          )}
        </div>
      )}
    </div>
  )
}
