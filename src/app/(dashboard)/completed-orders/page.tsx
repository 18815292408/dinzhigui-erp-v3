import { cookies } from 'next/headers'
import { CompletedOrderList } from '@/components/orders/completed-order-list'
import { createAdminClient } from '@/lib/supabase/server'
import { COMPLETED_ORDER_STATUS } from '@/lib/order-workflow'
import { parseSessionUser } from '@/lib/types'

async function getCompletedOrders() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')

  if (!sessionCookie) return []

  const user = parseSessionUser(sessionCookie.value)
  if (!user) return []

  const adminSupabase = await createAdminClient()
  const { data: orders } = await adminSupabase
    .from('orders')
    .select('*')
    .eq('organization_id', user.organization_id)
    .eq('status', COMPLETED_ORDER_STATUS)
    .order('completed_at', { ascending: false })

  const orderIds = (orders || []).map((order: any) => order.id)
  if (orderIds.length === 0) return []

  const [{ data: designs }, { data: installations }] = await Promise.all([
    adminSupabase
      .from('designs')
      .select('id, order_id, title, room_count, total_area, final_price, price')
      .in('order_id', orderIds),
    adminSupabase
      .from('installations')
      .select('id, order_id, status, completed_at, feedback')
      .in('order_id', orderIds),
  ])

  const designByOrderId = new Map((designs || []).map((design: any) => [design.order_id, design]))
  const installationByOrderId = new Map((installations || []).map((installation: any) => [installation.order_id, installation]))

  return (orders || []).map((order: any) => ({
    ...order,
    design: designByOrderId.get(order.id) || null,
    installation: installationByOrderId.get(order.id) || null,
  }))
}

export default async function CompletedOrdersPage() {
  const orders = await getCompletedOrders()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">已完成订单</h1>
        <p className="text-muted-foreground">查看已归档的完成订单和客户信息</p>
      </div>

      <CompletedOrderList orders={orders} />
    </div>
  )
}
