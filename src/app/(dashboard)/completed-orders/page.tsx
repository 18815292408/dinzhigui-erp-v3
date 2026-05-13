import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/server'
import { COMPLETED_ORDER_STATUS, CANCELLED_ORDER_STATUS } from '@/lib/order-workflow'
import { parseSessionUser } from '@/lib/types'
import { CompletedOrdersClient } from './completed-orders-client'

async function getCompletedOrders() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')

  if (!sessionCookie) return []

  const user = parseSessionUser(sessionCookie.value)
  if (!user) return []

  const adminSupabase = await createAdminClient()

  // 按角色过滤已完成订单
  let query = adminSupabase
    .from('orders')
    .select('*')
    .eq('organization_id', user.organization_id)
    .eq('status', COMPLETED_ORDER_STATUS)

  if (user.role === 'sales') {
    query = query.eq('created_by', user.id)
  } else if (user.role === 'designer') {
    query = query.eq('assigned_designer', user.id)
  } else if (user.role === 'installer') {
    query = query.eq('assigned_installer', user.id)
  }

  const { data: orders } = await query.order('completed_at', { ascending: false })

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

async function getCancelledOrders() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')

  if (!sessionCookie) return []

  const user = parseSessionUser(sessionCookie.value)
  if (!user) return []

  const adminSupabase = await createAdminClient()

  // 按角色过滤已退订订单
  let query = adminSupabase
    .from('orders')
    .select('*')
    .eq('organization_id', user.organization_id)
    .eq('status', CANCELLED_ORDER_STATUS)

  if (user.role === 'sales') {
    query = query.eq('created_by', user.id)
  } else if (user.role === 'designer') {
    query = query.eq('assigned_designer', user.id)
  } else if (user.role === 'installer') {
    query = query.eq('assigned_installer', user.id)
  }

  const { data: orders } = await query.order('cancelled_at', { ascending: false })

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
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')
  const user = sessionCookie ? parseSessionUser(sessionCookie.value) : null

  const [completedOrders, cancelledOrders] = await Promise.all([
    getCompletedOrders(),
    getCancelledOrders(),
  ])

  return (
    <div className="space-y-4 lg:space-y-6">
      <div>
        <h1 className="text-xl lg:text-2xl font-semibold">订单归档</h1>
        <p className="text-sm text-muted-foreground">查看已完成和已退订的订单</p>
      </div>

      <CompletedOrdersClient
        completedOrders={completedOrders}
        cancelledOrders={cancelledOrders}
        userRole={user?.role || ''}
      />
    </div>
  )
}
