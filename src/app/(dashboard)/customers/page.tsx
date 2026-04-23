import { cookies } from 'next/headers'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/server'
import { parseSessionUser } from '@/lib/types'
import { CustomersPageClient } from './customers-page-client'

async function getCustomers() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')

  if (!sessionCookie) {
    return { withoutOrders: [], withOrders: [] }
  }

  const user = parseSessionUser(sessionCookie.value)
  if (!user) {
    return { withoutOrders: [], withOrders: [] }
  }

  const adminSupabase = await createAdminClient()

  // 获取所有客户
  const { data: allCustomers } = await adminSupabase
    .from('customers')
    .select('*')
    .eq('organization_id', user.organization_id)
    .order('created_at', { ascending: false })

  // 获取所有订单（用于计算客户状态）
  const { data: allOrders } = await adminSupabase
    .from('orders')
    .select('customer_name, status, order_no, signed_amount')
    .eq('organization_id', user.organization_id)

  // 计算有订单的客户名称集合（用于确定"订单创建"）
  const customerNamesWithOrders = new Set(
    (allOrders || [])
      .map(o => o.customer_name)
      .filter(Boolean)
  )

  // 计算有进行中订单的客户名称集合（非 completed 状态，用于确定"订单跟进"）
  const customerNamesWithActiveOrders = new Set(
    (allOrders || [])
      .filter(o => o.status !== 'completed')
      .map(o => o.customer_name)
      .filter(Boolean)
  )

  // 订单创建：从未有过订单的客户
  const customersWithoutOrders = (allCustomers || []).filter(
    c => !customerNamesWithOrders.has(c.name)
  )

  // 订单跟进：有进行中订单的客户
  const customersWithOrdersData = (allCustomers || []).filter(
    c => customerNamesWithActiveOrders.has(c.name)
  )

  // 为订单跟进客户附加订单信息
  const customersWithOrders = customersWithOrdersData.map(c => {
    const orders = (allOrders || []).filter(
      o => o.customer_name === c.name && o.status !== 'completed'
    )
    return { ...c, orders }
  })

  return {
    withoutOrders: customersWithoutOrders,
    withOrders: customersWithOrders
  }
}

export default async function CustomersPage() {
  const customers = await getCustomers()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">客户管理</h1>
          <p className="text-muted-foreground">管理客户信息和意向跟踪</p>
        </div>
        <Link href="/customers/new">
          <Button>+ 新建客户</Button>
        </Link>
      </div>

      <CustomersPageClient customers={customers} />
    </div>
  )
}
