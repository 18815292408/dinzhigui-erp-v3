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
  const [editingAmount, setEditingAmount] = useState(false)
  const [signedAmountInput, setSignedAmountInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<{ id: string; role: string } | null>(null)
  const supabase = createClient()

  useEffect(() => {
    fetchOrder()
    fetchUsers()
    // 获取当前用户信息
    fetch('/api/auth/session', { credentials: 'include' })
      .then(res => res.json())
      .then(data => setCurrentUser(data.user))
      .catch(console.error)
  }, [])

  const fetchOrder = async () => {
    try {
      const res = await fetch(`/api/orders/${params.id}`, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setOrder(data)
      }
    } catch (err) {
      console.error('Failed to fetch order:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchUsers = async () => {
    const { data } = await supabase.from('users').select('id, display_name, name, role')
    const usersList = (data || []).map((u: any) => ({
      ...u,
      name: u.display_name || u.name
    }))
    setUsers(usersList)
  }

  const handleUpdateSignedAmount = async () => {
    setActionLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/orders/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ signed_amount: parseFloat(signedAmountInput) })
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || '更新失败')
      }
      setEditingAmount(false)
      fetchOrder()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  const handleDispatch = async (designerId: string) => {
    setActionLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/orders/${params.id}/dispatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ designer_id: designerId })
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || '派单失败')
      }
      fetchOrder()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  const handleSubmitDesign = async () => {
    setActionLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/orders/${params.id}/submit-design`, {
        method: 'POST',
        credentials: 'include'
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || '提交方案失败')
      }
      fetchOrder()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  const handlePlaceOrder = async (factoryRecords: any[]) => {
    setActionLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/orders/${params.id}/place-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ factory_records: factoryRecords })
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || '下单失败')
      }
      fetchOrder()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  const handleConfirmPayment = async () => {
    setActionLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/orders/${params.id}/confirm-payment`, {
        method: 'POST',
        credentials: 'include'
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || '确认打款失败')
      }
      fetchOrder()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  const handleSetShipment = async (date: string, installerId: string) => {
    setActionLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/orders/${params.id}/set-shipment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          estimated_shipment_date: date,
          installer_id: installerId
        })
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || '设置出货失败')
      }
      fetchOrder()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  const handleUpdateInstall = async (status: string) => {
    setActionLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/orders/${params.id}/update-install`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ installation_status: status })
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || '更新安装进度失败')
      }
      fetchOrder()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  const handleComplete = async () => {
    setActionLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/orders/${params.id}/complete`, {
        method: 'POST',
        credentials: 'include'
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || '完成订单失败')
      }
      fetchOrder()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) return <div className="p-6">加载中...</div>
  if (!order) return <div className="p-6">订单不存在</div>

  const designers = users.filter(u => u.role === 'designer')
  const installers = users.filter(u => u.role === 'installer')
  const canPerformActions = currentUser && !['owner', 'manager'].includes(currentUser.role)

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-700">← 返回</button>
        <h1 className="text-2xl font-bold">订单详情</h1>
        <span className="px-3 py-1 bg-gray-100 rounded-full text-sm">{STATUS_LABELS[order.status]}</span>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg">
          {error}
        </div>
      )}

      <OrderStatusFlow currentStatus={order.status} />

      <div className="bg-white rounded-xl shadow-sm p-6 mt-6">
        <h2 className="text-lg font-semibold mb-4">客户信息</h2>
        <div className="grid grid-cols-2 gap-4">
          <div><span className="text-gray-500">客户姓名：</span>{order.customer_name}</div>
          <div><span className="text-gray-500">联系电话：</span>{order.customer_phone}</div>
          <div><span className="text-gray-500">地址：</span>{order.customer_address}</div>
          <div><span className="text-gray-500">户型：</span>{order.house_type}</div>
          <div><span className="text-gray-500">面积：</span>{order.house_area}㎡</div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500">签单金额：</span>
            {editingAmount ? (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={signedAmountInput}
                  onChange={(e) => setSignedAmountInput(e.target.value)}
                  className="w-24 px-2 py-1 border rounded"
                  placeholder="万元"
                />
                <span className="text-gray-500">万</span>
                <button
                  onClick={handleUpdateSignedAmount}
                  disabled={actionLoading}
                  className="px-2 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 disabled:opacity-50"
                >
                  保存
                </button>
                <button
                  onClick={() => setEditingAmount(false)}
                  className="px-2 py-1 bg-gray-200 rounded text-sm hover:bg-gray-300"
                >
                  取消
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className={order.signed_amount ? 'text-green-600 font-medium' : 'text-gray-400'}>
                  {order.signed_amount ? `¥${order.signed_amount}万` : '未填写'}
                </span>
                <button
                  onClick={() => {
                    setSignedAmountInput(order.signed_amount?.toString() || '')
                    setEditingAmount(true)
                  }}
                  className="text-blue-500 text-sm hover:underline"
                >
                  修改
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {order.status === 'pending_dispatch' && canPerformActions && (
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

      {order.status === 'designing' && canPerformActions && (
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

      {order.status === 'pending_order' && canPerformActions && (
        <div className="bg-white rounded-xl shadow-sm p-6 mt-6">
          <h2 className="text-lg font-semibold mb-4">下单至工厂</h2>
          <FactorySelector
            value={order.factory_records || []}
            onChange={handlePlaceOrder}
          />
        </div>
      )}

      {order.status === 'pending_payment' && canPerformActions && (
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

      {order.status === 'pending_shipment' && canPerformActions && (
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

      {order.status === 'in_install' && canPerformActions && (
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
