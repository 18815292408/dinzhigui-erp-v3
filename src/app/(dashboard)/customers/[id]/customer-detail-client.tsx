'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { FollowUpForm } from '@/components/customers/follow-up-form'
import { OrderAmountEditor } from '@/components/customers/order-amount-editor'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TransferDesignButton } from '@/components/customers/transfer-design-button'
import { BackButton } from '@/components/ui/back-button'

interface Order {
  id: string
  order_no: string | null
  status: string
  signed_amount: number | null
  final_order_amount: number | null
}

interface FollowUp {
  content: string
  date: string
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
  orders: Order[]
}

interface CustomerDetailClientProps {
  customer: Customer
  canEdit: boolean
  user: { id: string; role: string; organization_id: string } | null
}

export function CustomerDetailClient({ customer, canEdit, user }: CustomerDetailClientProps) {
  const router = useRouter()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const followUps = (typeof customer.follow_ups === 'string'
    ? JSON.parse(customer.follow_ups || '[]')
    : (customer.follow_ups || [])) as FollowUp[]

  const statusMap: Record<string, string> = {
    pending_dispatch: '待派单',
    pending_design: '等待设计师接单',
    designing: '设计中',
    in_design: '设计中',
    pending_order: '等待下单',
    pending_payment: '等待打款',
    pending_shipment: '等待出货',
    in_install: '安装中',
    completed: '已完成',
  }

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <BackButton href="/customers" label="返回客户列表" />
          <h1 className="text-2xl font-semibold mt-2">{customer.name}</h1>
          <p className="text-muted-foreground">{customer.phone}</p>
        </div>
        <div className="flex items-center gap-4">
          {canEdit && user && (
            <TransferDesignButton customerId={customer.id} customerName={customer.name} organizationId={user.organization_id} />
          )}
        </div>
      </div>

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

      {/* 订单信息 */}
      {customer.orders && customer.orders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>订单信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">订单编号：</span>
                {customer.orders[0].order_no || customer.orders[0].id}
              </div>
              <div>
                <span className="text-muted-foreground">订单阶段：</span>
                {statusMap[customer.orders[0].status] || customer.orders[0].status}
              </div>
              <div className="col-span-2">
                <OrderAmountEditor
                  orderId={customer.orders[0].id}
                  signedAmount={customer.orders[0].signed_amount}
                  finalOrderAmount={customer.orders[0].final_order_amount}
                />
              </div>
            </div>

            {/* 删除订单 */}
            <div className="mt-4 pt-4 border-t border-red-200">
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100"
              >
                删除订单
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 删除确认对话框 */}
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
    </div>
  )
}
