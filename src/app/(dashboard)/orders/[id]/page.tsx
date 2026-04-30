'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { OrderStatusFlow } from '@/components/orders/order-status-flow'
import { FactorySelector } from '@/components/orders/factory-selector'
import { DesignEditForm } from '@/components/designs/design-edit-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { wanToYuan, yuanToWan, formatMoney } from '@/lib/format-amount'
import Link from 'next/link'

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
  assigned_installer: string | null
  signed_amount: number | null
  final_order_amount: number | null
  created_by_user: { id: string; name: string }
  assigned_designer_user: { id: string; name: string }
  assigned_installer_user: { id: string; name: string }
  designs: any[]
}

interface User {
  id: string
  name: string
  role: string
}

interface Installation {
  id: string
  status: string
  scheduled_date: string | null
  assigned_to: string | null
  feedback: string | null
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
  const [installation, setInstallation] = useState<Installation | null>(null)
  const supabase = createClient()

  useEffect(() => {
    fetchOrder()
    fetchUsers()
    fetch('/api/auth/session', { credentials: 'include' })
      .then(res => res.json())
      .then(data => setCurrentUser(data.user))
      .catch(console.error)
  }, [])

  useEffect(() => {
    if (order?.status === 'in_install') {
      fetchInstallation()
    }
  }, [order?.status, order?.id])

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
    const { data } = await supabase.from('users').select('id, display_name, role')
    const usersList = (data || []).map((u: any) => ({
      ...u,
      name: u.display_name || u.name
    }))
    setUsers(usersList)
  }

  const fetchInstallation = async () => {
    try {
      const res = await fetch(`/api/installations`, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        const found = (data.data || []).find((i: any) => i.order_id === params.id)
        if (found) setInstallation(found)
      }
    } catch (err) {
      console.error('Failed to fetch installation:', err)
    }
  }

  const handleUpdateSignedAmount = async () => {
    setActionLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/orders/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ signed_amount: wanToYuan(signedAmountInput) })
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

  const handleConfirmPayment = async (factoryRecords: any[]) => {
    setActionLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/orders/${params.id}/confirm-payment`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ factory_records: factoryRecords })
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
  const isOwnerOrManager = currentUser && ['owner', 'manager'].includes(currentUser.role)
  const isAssignedDesigner = currentUser?.id === order.assigned_designer_user?.id
  const isAssignedInstaller = currentUser?.id === order.assigned_installer_user?.id
  const design = order.designs?.[0]

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

      {/* 客户信息 */}
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
                  {formatMoney(order.signed_amount)}
                </span>
                <button
                  onClick={() => {
                    setSignedAmountInput(yuanToWan(order.signed_amount))
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

      {/* 设计方案区域 */}
      {design && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>设计方案</CardTitle>
          </CardHeader>
          <CardContent>
            {order.status === 'designing' && isAssignedDesigner ? (
              <DesignEditForm
                design={design}
                signedAmount={order.signed_amount}
                onSaved={fetchOrder}
              />
            ) : (
              <DesignReadOnly design={design} signedAmount={order.signed_amount} />
            )}

            {order.status === 'designing' && isAssignedDesigner && (
              <div className="mt-6 pt-6 border-t">
                <p className="text-sm text-gray-500 mb-3">方案完善后提交，进入待下单阶段</p>
                <button
                  onClick={handleSubmitDesign}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                >
                  提交方案
                </button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 安装信息区域 */}
      {order.status === 'in_install' && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>安装信息</CardTitle>
          </CardHeader>
          <CardContent>
            {installation ? (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-gray-500">安装单状态：</span>{installation.status === 'pending' ? '待安装' : installation.status === 'in_progress' ? '进行中' : installation.status === 'completed' ? '已完成' : installation.status}</div>
                  <div><span className="text-gray-500">预约日期：</span>{installation.scheduled_date || '待定'}</div>
                </div>
                <Link
                  href={`/installations/${installation.id}`}
                  className="inline-block mt-2 text-sm text-blue-600 hover:underline"
                >
                  去安装管理查看详情 →
                </Link>
              </div>
            ) : (
              <p className="text-sm text-gray-500">安装单信息加载中...</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* 派单 */}
      {order.status === 'pending_dispatch' && isOwnerOrManager && (
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

      {/* 待下单 */}
      {order.status === 'pending_order' && isAssignedDesigner && (
        <div className="bg-white rounded-xl shadow-sm p-6 mt-6">
          <h2 className="text-lg font-semibold mb-4">下单至工厂</h2>
          <FactorySelector
            value={order.factory_records || []}
            showConfirm
            hideAmount
            onConfirm={handlePlaceOrder}
            confirmText={actionLoading ? '下单中...' : '确认下单'}
          />
        </div>
      )}

      {/* 待打款 */}
      {order.status === 'pending_payment' && isOwnerOrManager && (
        <div className="bg-white rounded-xl shadow-sm p-6 mt-6">
          <h2 className="text-lg font-semibold mb-4">待打款</h2>
          <p className="text-sm text-gray-500 mb-4">
            请填写各工厂的打款金额，确认后订单进入待出货阶段
          </p>
          <FactorySelector
            value={order.factory_records || []}
            showConfirm
            onConfirm={handleConfirmPayment}
            confirmText={actionLoading ? '处理中...' : '确认打款'}
          />
          {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
        </div>
      )}

      {/* 待出货：填写出货时间即可，安装师傅已在确认打款时指派 */}
      {order.status === 'pending_shipment' && (isOwnerOrManager || isAssignedInstaller) && (
        <div className="bg-white rounded-xl shadow-sm p-6 mt-6">
          <h2 className="text-lg font-semibold mb-4">填写出货时间</h2>
          <div className="space-y-4">
            <input
              type="date"
              id="shipment-date"
              className="w-full px-3 py-2 border rounded-lg"
            />
            <button
              onClick={() => {
                const dateInput = document.getElementById('shipment-date') as HTMLInputElement
                if (!dateInput?.value) {
                  setError('请填写出货日期')
                  return
                }
                if (!order.assigned_installer) {
                  setError('请先指派安装师傅')
                  return
                }
                handleSetShipment(dateInput.value, order.assigned_installer)
              }}
              disabled={actionLoading}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
            >
              {actionLoading ? '处理中...' : '确认出货'}
            </button>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
        </div>
      )}

      {/* 安装中 */}
      {order.status === 'in_install' && isAssignedInstaller && (
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

// 设计方案只读展示
function DesignReadOnly({ design, signedAmount }: { design: any; signedAmount?: number | null }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 border rounded-lg">
          <p className="text-sm text-gray-500">房间数量</p>
          <p className="font-medium">{design.room_count || '未填写'}</p>
        </div>
        <div className="p-4 border rounded-lg">
          <p className="text-sm text-gray-500">总面积</p>
          <p className="font-medium">{design.total_area ? `${design.total_area} ㎡` : '未填写'}</p>
        </div>
        <div className="p-4 border rounded-lg">
          <p className="text-sm text-gray-500">成交价</p>
          <p className="font-medium">
            {signedAmount ? `${formatMoney(signedAmount)}（来自订单）` : design.final_price ? `¥${design.final_price}` : '未填写'}
          </p>
        </div>
      </div>

      {design.description && (
        <div className="p-4 border rounded-lg">
          <p className="text-sm text-gray-500 mb-1">方案描述</p>
          <p className="text-sm whitespace-pre-wrap">{design.description}</p>
        </div>
      )}

      {(design.kujiale_link || design.cad_file_url) && (
        <div className="grid grid-cols-2 gap-4">
          {design.kujiale_link && (
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-gray-500">酷家乐链接</p>
              <a
                href={design.kujiale_link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline break-all"
              >
                {design.kujiale_link}
              </a>
            </div>
          )}
          {design.cad_file_url && (
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-gray-500">CAD文件</p>
              <a
                href={design.cad_file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline"
              >
                {design.cad_file || '点击下载'}
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
