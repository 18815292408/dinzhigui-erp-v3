import { cookies } from 'next/headers'
import { AIInsightsPanel } from '@/components/dashboard/ai-insights-panel'
import { MonthlyStatsSection } from '@/components/dashboard/monthly-stats-section'
import { OrderFlowCards } from '@/components/dashboard/order-flow-cards'
import { ProcessOrderTable } from '@/components/dashboard/process-order-table'
import { TimeFilter } from './time-filter'
import { createAdminClient } from '@/lib/supabase/server'
import { parseSessionUser } from '@/lib/types'
import { buildDashboardOverview } from '@/lib/dashboard-overview'
import { isActiveOrderStatus, orderBelongsToCustomer, shouldShowCustomerInCreateList } from '@/lib/order-workflow'

async function getDashboardData(timeRange?: string) {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')

  if (!sessionCookie) {
    return { userRole: null, overview: null }
  }

  const user = parseSessionUser(sessionCookie.value)
  if (!user) {
    return { userRole: null, overview: null }
  }

  const adminSupabase = await createAdminClient()
  const orgId = user.organization_id

  // 查询所有订单
  const { data: orders } = await adminSupabase
    .from('orders')
    .select(`
      id,
      order_no,
      customer_name,
      status,
      created_at,
      updated_at,
      completed_at,
      signed_amount,
      final_order_amount,
      created_by,
      assigned_designer,
      assigned_installer
    `)
    .eq('organization_id', orgId)

  const safeOrders = orders || []

  // 收集所有用户 ID
  const userIds = new Set<string>()
  for (const order of safeOrders) {
    if (order.created_by) userIds.add(order.created_by)
    if (order.assigned_designer) userIds.add(order.assigned_designer)
    if (order.assigned_installer) userIds.add(order.assigned_installer)
  }

  // 查询用户
  const { data: users } = userIds.size > 0
    ? await adminSupabase
        .from('users')
        .select('id, display_name, email, phone')
        .in('id', Array.from(userIds))
    : { data: [] }

  // 构建 order_id -> customer_id 映射（优先通过 designs 表关联）
  const orderIds = safeOrders.map(o => o.id)
  const { data: designs } = orderIds.length > 0
    ? await adminSupabase
        .from('designs')
        .select('order_id, customer_id')
        .in('order_id', orderIds)
    : { data: [] }

  const customerMap: Record<string, string> = {}
  for (const d of (designs || [])) {
    if (d.order_id && d.customer_id && !customerMap[d.order_id]) {
      customerMap[d.order_id] = d.customer_id
    }
  }
  const missingOrderIds = orderIds.filter(id => !customerMap[id])
  if (missingOrderIds.length > 0) {
    const missingNames = Array.from(new Set(safeOrders.filter(o => missingOrderIds.includes(o.id)).map(o => o.customer_name).filter(Boolean)))
    if (missingNames.length > 0) {
      const { data: customers } = await adminSupabase
        .from('customers')
        .select('id, name')
        .in('name', missingNames)
        .eq('organization_id', orgId)
      const nameToId: Record<string, string> = {}
      for (const c of (customers || [])) {
        if (c.name && !nameToId[c.name]) {
          nameToId[c.name] = c.id
        }
      }
      for (const o of safeOrders) {
        if (!customerMap[o.id] && nameToId[o.customer_name]) {
          customerMap[o.id] = nameToId[o.customer_name]
        }
      }
    }
  }

  // 统计待创建订单的客户数（没有订单也没有设计方案的客户）
  const { data: allCustomers } = await adminSupabase
    .from('customers')
    .select('id, name, phone, created_at')
    .eq('organization_id', orgId)

  let creationCustomerCount = 0
  const creationCustomers: { id: string; name: string; phone: string; created_at: string }[] = []
  if (allCustomers) {
    for (const c of allCustomers) {
      const customerOrders = safeOrders.filter(o => orderBelongsToCustomer(c, o))
      const customerDesigns = (designs || []).filter((d: any) => d.customer_id === c.id)
      if (customerOrders.length === 0 && customerDesigns.length === 0) {
        creationCustomerCount++
        creationCustomers.push({
          id: c.id,
          name: c.name || '',
          phone: c.phone || '',
          created_at: c.created_at || '',
        })
      }
    }
  }

  const overview = buildDashboardOverview({
    orders: safeOrders,
    users: users || [],
    customerMap,
    timeRange,
    creationCustomerCount,
    creationCustomers,
  })

  return {
    userRole: user.role,
    overview,
  }
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { range?: string }
}) {
  const data = await getDashboardData(searchParams.range)

  const userRole = data?.userRole ?? 'sales'
  const overview = data?.overview

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-semibold text-apple-gray-900 tracking-tight">数据看板</h1>
          <p className="text-[15px] text-apple-gray-500 mt-1">按订单流程查看门店运营状态</p>
        </div>
        <TimeFilter />
      </div>

      {/* 订单流程概览 */}
      {overview && <OrderFlowCards cards={overview.cards} />}

      {/* AI 运营分析 */}
      <AIInsightsPanel userRole={userRole} />

      {/* 推进中订单 */}
      {overview && <ProcessOrderTable orders={overview.processOrders} />}

      {/* 月度业绩 - 仅 owner/manager 可见 */}
      {(userRole === 'owner' || userRole === 'manager') && (
        <MonthlyStatsSection />
      )}
    </div>
  )
}
