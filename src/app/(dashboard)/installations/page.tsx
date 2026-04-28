import { cookies } from 'next/headers'
import { InstallationList } from '@/components/installations/installation-list'
import { createAdminClient } from '@/lib/supabase/server'
import { ACTIVE_INSTALLATION_STATUSES, orderBelongsToCustomer, shouldShowInstallationInActiveList } from '@/lib/order-workflow'
import { parseSessionUser } from '@/lib/types'

async function getInstallations() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')

  if (!sessionCookie) return []

  const user = parseSessionUser(sessionCookie.value)
  if (!user) return []

  const adminSupabase = await createAdminClient()
  const orgId = user.organization_id

  // 1. 查询活跃安装记录
  const { data } = await adminSupabase
    .from('installations')
    .select(`
      *,
      customers(id, name, phone, house_type),
      designs(id, title, room_count, final_price, price),
      orders(id, order_no, status, customer_name, customer_phone, house_type)
    `)
    .eq('organization_id', orgId)
    .in('status', [...ACTIVE_INSTALLATION_STATUSES])
    .order('created_at', { ascending: false })

  // 2. 查询所有订单（用于关联过滤）
  const { data: relatedOrders } = await adminSupabase
    .from('orders')
    .select('id, customer_name, customer_phone, status')
    .eq('organization_id', orgId)

  // 3. 查找孤儿订单：处于 pending_shipment / in_install 但没有对应 installation 记录
  const existingOrderIds = new Set((data || []).map((i: any) => i.order_id).filter(Boolean))
  const { data: installPhaseOrders } = await adminSupabase
    .from('orders')
    .select('id, status, order_no, customer_name, customer_phone, house_type, assigned_installer, organization_id')
    .eq('organization_id', orgId)
    .in('status', ['pending_shipment', 'in_install'])

  const orphanOrders = (installPhaseOrders || []).filter(
    (o: any) => !existingOrderIds.has(o.id)
  )

  // 4. 为孤儿订单自动创建安装记录
  if (orphanOrders.length > 0) {
    const creations = orphanOrders.map(async (order: any) => {
      // 查找关联设计
      const { data: design } = await adminSupabase
        .from('designs')
        .select('id')
        .eq('order_id', order.id)
        .maybeSingle()

      // 查找客户
      let customerId = null
      if (order.customer_name) {
        const { data: cust } = await adminSupabase
          .from('customers')
          .select('id')
          .eq('name', order.customer_name)
          .eq('organization_id', orgId)
          .maybeSingle()
        customerId = cust?.id || null
      }

      const { error: createErr } = await adminSupabase
        .from('installations')
        .insert({
          organization_id: order.organization_id,
          order_id: order.id,
          customer_id: customerId,
          design_id: design?.id || null,
          assigned_to: order.assigned_installer,
          status: 'pending',
          issues: '[]',
        })

      if (createErr) {
        console.error('Auto-create installation for orphan order failed:', order.order_no, createErr)
      }
    })

    await Promise.all(creations)

    // 重新查询安装记录（包含刚创建的）
    const { data: refreshed } = await adminSupabase
      .from('installations')
      .select(`
        *,
        customers(id, name, phone, house_type),
        designs(id, title, room_count, final_price, price),
        orders(id, order_no, status, customer_name, customer_phone, house_type)
      `)
      .eq('organization_id', orgId)
      .in('status', [...ACTIVE_INSTALLATION_STATUSES])
      .order('created_at', { ascending: false })

    return (refreshed || []).filter((installation: any) =>
      shouldShowInstallationInActiveList({
        status: installation.status,
        order: installation.orders,
        customerOrders: (relatedOrders || []).filter((order: any) =>
          orderBelongsToCustomer(
            {
              id: installation.customer_id,
              name: installation.customers?.name || installation.orders?.customer_name,
              phone: installation.customers?.phone || installation.orders?.customer_phone,
            },
            order
          )
        ),
      })
    )
  }

  // 5. 正常过滤返回
  return (data || []).filter((installation: any) =>
    shouldShowInstallationInActiveList({
      status: installation.status,
      order: installation.orders,
      customerOrders: (relatedOrders || []).filter((order: any) =>
        orderBelongsToCustomer(
          {
            id: installation.customer_id,
            name: installation.customers?.name || installation.orders?.customer_name,
            phone: installation.customers?.phone || installation.orders?.customer_phone,
          },
          order
        )
      ),
    })
  )
}

export default async function InstallationsPage() {
  const installations: any[] = await getInstallations()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">安装管理</h1>
        <p className="text-muted-foreground">查看和处理安装单</p>
      </div>

      <InstallationList installations={installations} />
    </div>
  )
}
