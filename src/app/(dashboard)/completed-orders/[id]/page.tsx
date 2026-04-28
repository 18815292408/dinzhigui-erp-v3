import { cookies } from 'next/headers'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BackButton } from '@/components/ui/back-button'
import { buildCompletedOrderCardView } from '@/lib/order-workflow'
import { createAdminClient } from '@/lib/supabase/server'
import { parseSessionUser } from '@/lib/types'
import { formatMoney } from '@/lib/format-amount'

async function getCompletedOrder(id: string) {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')

  if (!sessionCookie) return null

  const user = parseSessionUser(sessionCookie.value)
  if (!user) return null

  const adminSupabase = await createAdminClient()
  const { data: order } = await adminSupabase
    .from('orders')
    .select('*')
    .eq('id', id)
    .eq('organization_id', user.organization_id)
    .eq('status', 'completed')
    .single()

  if (!order) return null

  const [{ data: design }, { data: installation }] = await Promise.all([
    adminSupabase
      .from('designs')
      .select('id, title, room_count, total_area, final_price, price, description, cad_file_url, kujiale_link')
      .eq('order_id', id)
      .maybeSingle(),
    adminSupabase
      .from('installations')
      .select('id, status, scheduled_date, completed_at, feedback')
      .eq('order_id', id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  return { ...order, design, installation }
}

export default async function CompletedOrderDetailPage({ params }: { params: { id: string } }) {
  const order: any = await getCompletedOrder(params.id)
  if (!order) {
    return <div className="p-6">已完成订单不存在</div>
  }

  const card = buildCompletedOrderCardView({
    order,
    design: order.design,
    installation: order.installation,
  })

  return (
    <div className="space-y-6">
      <div>
        <BackButton href="/completed-orders" label="返回已完成订单" />
        <h1 className="text-2xl font-semibold mt-2">已完成订单详情</h1>
        <p className="text-muted-foreground">
          {card.orderNo || '无订单号'} · {card.customerName || '未知客户'}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>客户信息</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-muted-foreground">客户姓名：</span>{card.customerName || '未知'}</div>
            <div><span className="text-muted-foreground">联系电话：</span>{card.customerPhone || '无'}</div>
            <div><span className="text-muted-foreground">地址：</span>{order.customer_address || '无'}</div>
            <div><span className="text-muted-foreground">房型：</span>{card.houseType || '未知'}</div>
            <div><span className="text-muted-foreground">面积：</span>{order.house_area ? `${order.house_area}㎡` : '未知'}</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>订单信息</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-muted-foreground">订单号：</span>{card.orderNo || '无'}</div>
            <div><span className="text-muted-foreground">签单金额：</span>{formatMoney(order.signed_amount)}</div>
            <div><span className="text-muted-foreground">最终金额：</span>{formatMoney(order.final_order_amount)}</div>
            <div>
              <span className="text-muted-foreground">完成时间：</span>
              {card.completedAt ? new Date(card.completedAt).toLocaleString('zh-CN') : '未知'}
            </div>
            <div><span className="text-muted-foreground">付款状态：</span>{order.payment_status === 'paid' ? '已付款' : '未付款'}</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>方案信息</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-muted-foreground">方案名称：</span>{card.designTitle || '无'}</div>
            <div><span className="text-muted-foreground">房间数量：</span>{card.roomCount ? `${card.roomCount}室` : '未知'}</div>
            <div><span className="text-muted-foreground">总面积：</span>{order.design?.total_area ? `${order.design.total_area}㎡` : '未知'}</div>
            <div><span className="text-muted-foreground">方案金额：</span>{formatMoney(order.design?.final_price ?? order.design?.price)}</div>
          </div>
          {order.design?.description && (
            <p className="text-sm text-muted-foreground">{order.design.description}</p>
          )}
          <div className="flex gap-4">
            {order.design?.cad_file_url && (
              <a className="text-sm text-blue-600 hover:underline" href={order.design.cad_file_url} target="_blank" rel="noopener noreferrer">
                下载 CAD 图纸
              </a>
            )}
            {order.design?.kujiale_link && (
              <a className="text-sm text-blue-600 hover:underline" href={order.design.kujiale_link} target="_blank" rel="noopener noreferrer">
                查看酷家乐方案
              </a>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>安装结果</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-muted-foreground">安装状态：</span>{order.installation?.status === 'completed' ? '已完成' : '已归档'}</div>
            <div>
              <span className="text-muted-foreground">安装完成时间：</span>
              {order.installation?.completed_at ? new Date(order.installation.completed_at).toLocaleString('zh-CN') : '未知'}
            </div>
          </div>
          <div className="mt-4 text-sm">
            <span className="text-muted-foreground">安装反馈：</span>
            <p className="mt-1">{card.installationFeedback || '无'}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
