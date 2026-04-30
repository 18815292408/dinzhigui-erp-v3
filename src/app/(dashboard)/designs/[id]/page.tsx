import { cookies } from 'next/headers'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/server'
import { parseSessionUser } from '@/lib/types'
import { formatMoney } from '@/lib/format-amount'
import { DesignDeleteButton } from '@/components/designs/design-delete-button'
import { BackButton } from '@/components/ui/back-button'
import { DesignEditForm } from '@/components/designs/design-edit-form'
import { PlaceOrderCard } from '@/components/designs/place-order-card'
import { OrderStatusFlow } from '@/components/orders/order-status-flow'

const statusConfig = {
  draft: { label: '设计中', color: 'bg-gray-100 text-gray-800' },
  submitted: { label: '已提交', color: 'bg-blue-100 text-blue-800' },
}

const orderStatusLabels: Record<string, string> = {
  pending_dispatch: '待派单',
  pending_design: '待接单',
  designing: '设计中',
  in_design: '设计中',
  pending_order: '待下单',
  pending_payment: '待打款',
  pending_shipment: '待出货',
  in_install: '安装中',
  completed: '已完结',
}

async function getDesign(id: string) {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')

  if (!sessionCookie) return null

  const user = parseSessionUser(sessionCookie.value)
  if (!user) return null

  const adminSupabase = await createAdminClient()

  // 先查 design 基本数据
  const { data: design } = await adminSupabase
    .from('designs')
    .select('*')
    .eq('id', id)
    .eq('organization_id', user.organization_id)
    .single()

  if (!design) return null

  // 补全关联数据（通过 order_id 精确匹配）
  if (design.order_id) {
    const { data: order } = await adminSupabase
      .from('orders')
      .select('id, order_no, status, customer_name, customer_phone, signed_amount, factory_records, assigned_designer, design_due_date')
      .eq('id', design.order_id)
      .single()
    design.orders = order

    if (order?.assigned_designer) {
      const u = await adminSupabase.from('users').select('id, display_name').eq('id', order.assigned_designer).eq('organization_id', user.organization_id).single()
      design.orders.assigned_designer_user = u.data
    }
  } else if (design.customer_id) {
    // 兜底：order_id 为空时，通过 customer_id 匹配（优先匹配 pending_order 状态）
    const { data: ordersByCustomer } = await adminSupabase
      .from('orders')
      .select('id, order_no, status, customer_name, customer_phone, signed_amount, factory_records, assigned_designer, design_due_date')
      .eq('customer_id', design.customer_id)
      .order('created_at', { ascending: false })
      .limit(1)
    if (ordersByCustomer?.[0]) {
      design.orders = ordersByCustomer[0]
      if (ordersByCustomer[0].assigned_designer) {
        const u = await adminSupabase.from('users').select('id, display_name').eq('id', ordersByCustomer[0].assigned_designer).eq('organization_id', user.organization_id).single()
        design.orders.assigned_designer_user = u.data
      }
    }
  }

  // 补全客户信息
  if (design.customer_id) {
    const { data: customer } = await adminSupabase.from('customers').select('id, name, phone, house_type').eq('id', design.customer_id).single()
    design.customers = customer
  } else if (design.orders?.customer_name) {
    const { data: customerByName } = await adminSupabase.from('customers').select('id, name, phone, house_type').eq('name', design.orders.customer_name).single()
    design.customers = customerByName
  }

  return design
}

export default async function DesignDetailPage({ params }: { params: { id: string } }) {
  const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!isValidUUID.test(params.id)) {
    return <div className="p-6">无效的方案ID</div>
  }

  const design: any = await getDesign(params.id)
  if (!design) {
    return <div className="p-6">方案不存在</div>
  }

  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')
  const user = sessionCookie ? parseSessionUser(sessionCookie.value) : null
  const canEdit = user && ['owner', 'manager', 'designer'].includes(user.role)
  const isAssignedDesigner = user?.id === design.orders?.assigned_designer
  const order = design.orders

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <BackButton href="/designs" label="返回方案列表" />
          <h1 className="text-2xl font-semibold mt-2">{design.title}</h1>
          <p className="text-muted-foreground">
            客户：{design.customers?.name || order?.customer_name || '未知'}
            {design.customers?.house_type && ` (${design.customers.house_type})`}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Badge className={statusConfig[design.status as keyof typeof statusConfig]?.color}>
            {statusConfig[design.status as keyof typeof statusConfig]?.label}
          </Badge>
        </div>
      </div>

      {/* 订单流程上下文 */}
      {order && (
        <Card>
          <CardHeader>
            <CardTitle>关联订单</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <OrderStatusFlow currentStatus={order.status} />
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">订单号：</span>
                <Link href={`/customers/${design.customers?.id || ''}`} className="text-blue-600 hover:underline">
                  {order.order_no}
                </Link>
              </div>
              <div>
                <span className="text-muted-foreground">当前阶段：</span>
                <span className="font-medium">{orderStatusLabels[order.status] || order.status}</span>
              </div>
              <div>
                <span className="text-muted-foreground">设计师：</span>
                {order.assigned_designer_user?.display_name || '未指派'}
              </div>
              <div>
                <span className="text-muted-foreground">签单金额：</span>
                {formatMoney(order.signed_amount)}
              </div>
            </div>
            <div>
              <Link href={`/customers/${design.customers?.id || ''}`} className="text-sm text-blue-600 hover:underline">
                去客户详情页查看完整流程 →
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 待接单：设计师需重新接单（通过通知接单） */}
      {order?.status === 'pending_design' && isAssignedDesigner && (
        <Card>
          <CardContent className="py-6 text-center text-gray-500">
            <p>订单已回退至待接单状态，请通过消息中心的通知重新接单</p>
          </CardContent>
        </Card>
      )}

      {/* 设计方案编辑区（仅 designing/in_design 且分配给当前设计师时显示） */}
      {['designing', 'in_design'].includes(order?.status) && isAssignedDesigner && (
        <Card>
          <CardHeader>
            <CardTitle>编辑设计方案</CardTitle>
          </CardHeader>
          <CardContent>
            <DesignEditForm
              design={design}
              signedAmount={order.signed_amount}
              submitSuccessHref="/designs"
            />
          </CardContent>
        </Card>
      )}

      {/* 设计方案只读区（其他人查看 designing/in_design 状态） */}
      {['designing', 'in_design'].includes(order?.status) && !isAssignedDesigner && (
        <DesignReadOnly design={design} signedAmount={order.signed_amount} />
      )}

      {/* pending_order：下单到工厂 */}
      {order?.status === 'pending_order' && (
        <>
          <DesignReadOnly design={design} signedAmount={order.signed_amount} />
          <PlaceOrderCard
            orderId={order.id}
            customerId={design.customers?.id || ''}
            initialValue={order.factory_records || []}
          />
        </>
      )}

      {/* pending_payment 及之后：只读展示 */}
      {order && ['pending_payment', 'pending_shipment', 'in_install', 'completed'].includes(order.status) && (
        <DesignReadOnly design={design} signedAmount={order.signed_amount} />
      )}

      {/* 删除按钮（仅草稿状态且有权限时） */}
      {canEdit && order?.status === 'designing' && (
        <div className="flex gap-4">
          <DesignDeleteButton designId={design.id} />
        </div>
      )}
    </div>
  )
}

function DesignReadOnly({ design, signedAmount }: { design: any; signedAmount?: number | null }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>方案信息</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 border rounded-lg">
            <p className="text-sm text-muted-foreground">房间数量</p>
            <p className="font-medium">{design.room_count || '未填写'}</p>
          </div>
          <div className="p-4 border rounded-lg">
            <p className="text-sm text-muted-foreground">总面积</p>
            <p className="font-medium">{design.total_area ? `${design.total_area} ㎡` : '未填写'}</p>
          </div>
          <div className="p-4 border rounded-lg">
            <p className="text-sm text-muted-foreground">成交价</p>
            <p className="font-medium">
              {signedAmount ? `${formatMoney(signedAmount)}（来自订单）` : design.final_price ? `¥${design.final_price}` : '未填写'}
            </p>
          </div>
        </div>

        {design.description && (
          <div className="p-4 border rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">方案描述</p>
            <p className="text-sm whitespace-pre-wrap">{design.description}</p>
          </div>
        )}

        {(design.kujiale_link || design.cad_file_url) && (
          <div className="grid grid-cols-2 gap-4">
            {design.kujiale_link && (
              <div className="p-4 border rounded-lg">
                <p className="text-sm text-muted-foreground">酷家乐链接</p>
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
                <p className="text-sm text-muted-foreground">CAD文件</p>
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
      </CardContent>
    </Card>
  )
}
