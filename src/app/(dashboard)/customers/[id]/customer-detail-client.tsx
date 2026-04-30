'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { FollowUpForm } from '@/components/customers/follow-up-form'
import { OrderAmountEditor } from '@/components/customers/order-amount-editor'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TransferDesignButton } from '@/components/customers/transfer-design-button'
import { BackButton } from '@/components/ui/back-button'
import { OrderStatusFlow } from '@/components/orders/order-status-flow'
import { FactorySelector } from '@/components/orders/factory-selector'
import { formatMoney } from '@/lib/format-amount'

const STATUS_LABELS: Record<string, string> = {
  pending_dispatch: '待派单',
  pending_design: '待接单',
  designing: '设计中',
  pending_order: '待下单',
  pending_payment: '待打款',
  pending_shipment: '待出货',
  in_install: '安装中',
  completed: '已完结',
}

interface FollowUp {
  content: string
  date: string
}

interface User {
  id: string
  display_name: string
}

interface Customer {
  id: string
  name: string
  phone: string | null
  house_type: string | null
  address: string | null
  estimated_price: number | null
  requirements: string | null
  follow_ups: string | string[]
  orders: any[]
}

interface CustomerDetailClientProps {
  customer: Customer
  canEdit: boolean
  user: { id: string; role: string; organization_id: string } | null
  designers: User[]
  installers: User[]
}

export function CustomerDetailClient({ customer, canEdit, user, designers, installers }: CustomerDetailClientProps) {
  const router = useRouter()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const followUps = (typeof customer.follow_ups === 'string'
    ? JSON.parse(customer.follow_ups || '[]')
    : (customer.follow_ups || [])) as FollowUp[]

  const order = customer.orders?.[0]
  const design = order?.designs?.[0]

  const handleDeleteOrder = async () => {
    const orderId = customer.orders?.[0]?.id
    if (!orderId) return

    setDeleting(true)
    setDeleteError(null)
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'DELETE',
        credentials: 'include'
      })
      const data = await res.json()
      if (!res.ok) {
        setDeleteError(data.error || '删除失败')
        setDeleting(false)
        return
      }
      router.push('/customers')
      router.refresh()
    } catch (err) {
      setDeleteError('删除失败')
      setDeleting(false)
    }
  }

  const handleConfirmPaymentOnly = async (factoryRecords?: any[]) => {
    if (!order?.id) return
    setActionLoading(true)
    setActionError(null)
    try {
      const res = await fetch(`/api/orders/${order.id}/confirm-payment`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ factory_records: factoryRecords }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || '确认打款失败')
      }
      router.refresh()
    } catch (err: any) {
      setActionError(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  const handleAssignInstaller = async (installerId: string) => {
    if (!order?.id) return
    setActionLoading(true)
    setActionError(null)
    try {
      const res = await fetch(`/api/orders/${order.id}/assign-installer`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          installer_id: installerId,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || '分配安装师傅失败')
      }
      router.push(`/customers/${customer.id}`)
      router.refresh()
    } catch (err: any) {
      setActionError(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  const handleSetShipment = async (date: string) => {
    if (!order?.id) return
    setActionLoading(true)
    setActionError(null)
    try {
      const res = await fetch(`/api/orders/${order.id}/set-shipment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          estimated_shipment_date: date,
        })
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || '设置出货失败')
      }
      router.push(`/customers/${customer.id}`)
      router.refresh()
    } catch (err: any) {
      setActionError(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  const handleUpdateInstallStatus = async (status: string) => {
    if (!order?.id) return
    setActionLoading(true)
    setActionError(null)
    try {
      const res = await fetch(`/api/orders/${order.id}/update-install`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ installation_status: status })
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || '更新失败')
      }
      router.refresh()
    } catch (err: any) {
      setActionError(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  const handleCompleteOrder = async () => {
    if (!order?.id) return
    setActionLoading(true)
    setActionError(null)
    try {
      const res = await fetch(`/api/orders/${order.id}/complete`, {
        method: 'POST',
        credentials: 'include',
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || '完成订单失败')
      }
      router.refresh()
    } catch (err: any) {
      setActionError(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  const handleRevert = async () => {
    if (!order?.id) return
    if (!confirm('确定要回退到上一阶段吗？')) return
    setActionLoading(true)
    setActionError(null)
    try {
      const res = await fetch(`/api/orders/${order.id}/revert`, {
        method: 'POST',
        credentials: 'include',
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || '回退失败')
      }
      // 强制刷新页面确保状态更新
      router.push(`/customers/${customer.id}`)
      router.refresh()
    } catch (err: any) {
      setActionError(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <BackButton href="/customers" label="返回客户列表" />
          <h1 className="text-2xl font-semibold mt-2">{customer.name}</h1>
          <p className="text-muted-foreground">
            电话：{customer.phone || '未填写'}
          </p>
        </div>
        <div className="flex items-center gap-4">
          {canEdit && user && !order && (
            <TransferDesignButton customerId={customer.id} customerName={customer.name} organizationId={user.organization_id} />
          )}
        </div>
      </div>

      {/* 流程进度条 */}
      {order && (
        <OrderStatusFlow currentStatus={order.status} />
      )}

      {/* 客户信息卡片 */}
      <Card>
        <CardHeader>
          <CardTitle>基本信息</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">房型：</span>
              {customer.house_type || '未填写'}
            </div>
            <div>
              <span className="text-muted-foreground">地址：</span>
              {customer.address || '未填写'}
            </div>
            <div>
              <span className="text-muted-foreground">预估价格：</span>
              {customer.estimated_price ? `¥${customer.estimated_price.toLocaleString()}` : '未填写'}
            </div>
            <div className="col-span-2">
              <span className="text-muted-foreground">需求：</span>
              {customer.requirements || '未填写'}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 订单信息 + 流程操作区 */}
      {order && (
        <Card>
          <CardHeader>
            <CardTitle>订单流程</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">订单编号：</span>
                {order.order_no || order.id}
              </div>
              <div>
                <span className="text-muted-foreground">当前阶段：</span>
                <span className="font-medium">{STATUS_LABELS[order.status] || order.status}</span>
              </div>
              <div>
                <span className="text-muted-foreground">设计师：</span>
                {order.assigned_designer_user?.display_name || order.assigned_designer || '未指派'}
              </div>
              <div>
                <span className="text-muted-foreground">安装师傅：</span>
                {order.assigned_installer_user?.display_name || order.assigned_installer || '未指派'}
              </div>
            </div>

            {/* 金额编辑 */}
            <OrderAmountEditor
              orderId={order.id}
              signedAmount={order.signed_amount}
              finalOrderAmount={order.final_order_amount}
            />

            {actionError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
                {actionError}
              </div>
            )}

            {/* ====== 各状态操作区 ====== */}

            {/* pending_design：等待设计师接单 */}
            {order.status === 'pending_design' && (
              <div className="p-4 bg-orange-50 rounded-lg">
                <p className="text-sm text-orange-800">
                  订单已派给 <strong>{order.assigned_designer_user?.display_name || order.assigned_designer || '设计师'}</strong>，等待设计师接单。
                </p>
              </div>
            )}

            {/* 回退按钮（仅店长/老板可见，非首尾阶段显示） */}
            {user && ['owner', 'manager'].includes(user.role) && order.status !== 'completed' && order.status !== 'pending_dispatch' && (
              <div className="pt-3 border-t border-gray-100">
                <button
                  onClick={handleRevert}
                  disabled={actionLoading}
                  className="text-sm text-gray-400 hover:text-orange-500 disabled:opacity-50"
                >
                  {actionLoading ? '回退中...' : '⟲ 回退到上一阶段'}
                </button>
              </div>
            )}

            {/* designing：设计方案进行中 */}
            {order.status === 'designing' && (
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800 mb-2">
                  设计师 <strong>{order.assigned_designer_user?.display_name || order.assigned_designer}</strong> 正在出图中
                  {order.design_due_date && `（预计 ${order.design_due_date} 出图）`}
                </p>
                <a
                  href={`/designs/${design?.id || ''}`}
                  className="text-sm text-blue-600 hover:underline font-medium"
                >
                  去设计方案页查看 →
                </a>
              </div>
            )}

            {/* pending_order：方案已提交，等待下单 */}
            {order.status === 'pending_order' && (
              <div className="p-4 bg-purple-50 rounded-lg">
                <p className="text-sm text-purple-800 mb-2">
                  方案已提交，等待 <strong>{order.assigned_designer_user?.display_name || order.assigned_designer}</strong> 下单至工厂
                </p>
                <a
                  href={`/designs/${design?.id || ''}`}
                  className="text-sm text-blue-600 hover:underline font-medium"
                >
                  去方案详情页下单 →
                </a>
              </div>
            )}
            {/* pending_payment：店长确认打款并指派安装师傅 */}
            {order.status === 'pending_payment' && (
              <div className="p-4 bg-yellow-50 rounded-lg space-y-3">
                <p className="text-sm text-yellow-800 font-medium">
                  方案已下单，请确认打款
                </p>

                {/* 工厂金额编辑（老板/店长可编辑金额并确认打款） */}
                {Array.isArray(order.factory_records) && order.factory_records.length > 0 && (
                  <div className="bg-white rounded-lg p-3">
                    {user && ['owner', 'manager'].includes(user.role) ? (
                      <FactorySelector
                        value={order.factory_records}
                        showConfirm
                        onConfirm={handleConfirmPaymentOnly}
                        confirmText={actionLoading ? '处理中...' : '确认打款'}
                      />
                    ) : (
                      <div className="space-y-2">
                        {order.factory_records.map((record: any, idx: number) => (
                          <div key={idx} className="flex justify-between text-sm">
                            <span>{record.factory_name}</span>
                            <span className="font-medium">{formatMoney(record.amount)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 金额汇总对比 */}
                <div className="bg-white/60 rounded-lg p-3 text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-yellow-800">签单金额：</span>
                    <span className="font-medium">
                      {order.signed_amount ? formatMoney(order.signed_amount) : '未填写'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-yellow-800">最终下单销售额：</span>
                    <span className="font-medium">
                      {order.final_order_amount ? formatMoney(order.final_order_amount) : '未填写'}
                    </span>
                  </div>
                </div>

                {actionError && (
                  <p className="text-sm text-red-600">{actionError}</p>
                )}
              </div>
            )}

            {/* pending_shipment：分配安装师傅 */}
            {order.status === 'pending_shipment' && (
              <div className="p-4 bg-cyan-50 rounded-lg space-y-3">
                {!order.assigned_installer ? (
                  <>
                    <p className="text-sm text-cyan-800">
                      已打款，请分配安装师傅
                    </p>
                    {user && ['owner', 'manager'].includes(user.role) && (
                      <>
                        <div>
                          <label className="text-sm font-medium block mb-2">选择安装师傅</label>
                          <div className="flex flex-wrap gap-2">
                            {installers.map(i => (
                              <button
                                key={i.id}
                                onClick={() => handleAssignInstaller(i.id)}
                                disabled={actionLoading}
                                className="px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 text-sm"
                              >
                                {i.display_name}
                              </button>
                            ))}
                            {installers.length === 0 && (
                              <p className="text-sm text-gray-400">暂无可用安装师傅</p>
                            )}
                          </div>
                        </div>
                        {actionError && (
                          <p className="text-sm text-red-600">{actionError}</p>
                        )}
                      </>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-cyan-800">
                    已分配安装师傅 <strong>{order.assigned_installer_user?.display_name || order.assigned_installer}</strong>，
                    等待安装师傅进入安装管理填写出货日期
                  </p>
                )}
              </div>
            )}

            {/* in_install：安装中 */}
            {order.status === 'in_install' && (
              <div className="p-4 bg-green-50 rounded-lg space-y-3">
                <p className="text-sm text-green-800 mb-2">
                  安装中（安装师傅：<strong>{order.assigned_installer_user?.display_name || order.assigned_installer}</strong>）
                </p>
                <div className="text-sm text-gray-600 mb-1">
  安装进度：{
                    {
                      pending_ship: '待出货',
                      shipped: '已出货',
                      arrived: '已到货',
                      delivering: '送货中',
                      installing: '安装中',
                      supplement_pending: '补件中',
                      installed: '已完成'
                    }[String(order.installation_status || '')] || order.installation_status || '未知'
                  }
                </div>
                <a
                  href="/installations"
                  className="text-sm text-blue-600 hover:underline font-medium"
                >
                  去安装管理查看进度 →
                </a>
                {order.installation_status === 'installed' && (
                  <div className="mt-3">
                    <button
                      onClick={handleCompleteOrder}
                      disabled={actionLoading}
                      className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 text-sm"
                    >
                      {actionLoading ? '处理中...' : '确认完成订单'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* completed：已完结 */}
            {order.status === 'completed' && (
              <div className="p-4 bg-gray-100 rounded-lg">
                <p className="text-sm text-gray-700 font-medium">
                  订单已完成
                  {order.completed_at && `（${new Date(order.completed_at).toLocaleDateString('zh-CN')}）`}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 跟进记录 */}
      <Card>
        <CardHeader>
          <CardTitle>跟进记录</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {followUps.length > 0 ? followUps.map((up, index) => (
            <div key={index} className="p-4 border rounded-lg">
              <p className="text-sm">{up.content}</p>
              <p className="text-xs text-muted-foreground mt-2">
                {new Date(up.date).toLocaleString('zh-CN')}
              </p>
            </div>
          )) : (
            <p className="text-sm text-muted-foreground">暂无跟进记录</p>
          )}
          {canEdit ? (
            <FollowUpForm customerId={customer.id} />
          ) : (
            <p className="text-sm text-muted-foreground">无编辑权限</p>
          )}
        </CardContent>
      </Card>

      {/* 删除订单按钮 */}
      {order && order.status !== 'completed' && (
        <div className="pt-4 border-t border-red-100">
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 text-sm"
          >
            删除订单
          </button>
        </div>
      )}

      {/* 删除订单对话框 */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">确认删除订单</h3>
            <p className="text-gray-600 mb-6">
              确定要删除该订单吗？删除后将无法恢复。
            </p>
            {deleteError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
                {deleteError}
              </div>
            )}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false)
                  setDeleteError(null)
                }}
                className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                取消
              </button>
              <button
                onClick={handleDeleteOrder}
                disabled={deleting}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
              >
                {deleting ? '删除中...' : '确认删除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
