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

  // 获取所有订单
  const { data: allOrders } = await adminSupabase
    .from('orders')
    .select('customer_name, status')
    .eq('organization_id', user.organization_id)

  // 获取所有设计
  const { data: allDesigns } = await adminSupabase
    .from('designs')
    .select('customer_id, status')
    .eq('organization_id', user.organization_id)

  // 计算有进行中订单的客户名称集合（status !== 'completed'）
  const customerNamesWithActiveOrders = new Set(
    (allOrders || [])
      .filter(o => o.status !== 'completed')
      .map(o => o.customer_name)
      .filter(Boolean)
  )

  // 计算有进行中设计的客户ID集合（draft, submitted, confirmed）
  const customerIdsWithActiveDesigns = new Set(
    (allDesigns || [])
      .filter(d => ['draft', 'submitted', 'confirmed'].includes(d.status))
      .map(d => d.customer_id)
      .filter(Boolean)
  )

  // 计算有过任何订单的客户名称集合
  const customerNamesWithAnyOrder = new Set(
    (allOrders || [])
      .map(o => o.customer_name)
      .filter(Boolean)
  )

  // 分类客户
  const customersWithOrders: any[] = []  // 订单跟进
  const customersWithoutOrders: any[] = []  // 订单创建

  for (const c of allCustomers || []) {
    const hasAnyRecord = customerNamesWithAnyOrder.has(c.name) ||
                         customerIdsWithActiveDesigns.has(c.id)
    const isInFollowup = customerNamesWithActiveOrders.has(c.name) ||
                         customerIdsWithActiveDesigns.has(c.id)

    if (!hasAnyRecord) {
      // 从未有过任何记录 → 订单创建
      customersWithoutOrders.push(c)
    } else if (isInFollowup) {
      // 有进行中的订单或设计 → 订单跟进
      const orders = (allOrders || []).filter(
        o => o.customer_name === c.name && o.status !== 'completed'
      )
      const designs = (allDesigns || []).filter(
        d => d.customer_id === c.id && ['draft', 'submitted', 'confirmed'].includes(d.status)
      )
      customersWithOrders.push({ ...c, orders, designs })
    }
    // else: 有过记录但全部完成 → 不返回（消失）
  }

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
