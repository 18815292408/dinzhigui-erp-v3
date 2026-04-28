import { cookies } from 'next/headers'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/server'
import { isActiveOrderStatus, orderBelongsToCustomer, shouldShowCustomerInCreateList, shouldShowCustomerInFollowup } from '@/lib/order-workflow'
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

  const { data: allCustomers } = await adminSupabase
    .from('customers')
    .select('*')
    .eq('organization_id', user.organization_id)
    .order('created_at', { ascending: false })

  const { data: allOrders } = await adminSupabase
    .from('orders')
    .select('id, customer_name, customer_phone, status, order_no, signed_amount')
    .eq('organization_id', user.organization_id)

  const { data: allDesigns } = await adminSupabase
    .from('designs')
    .select('customer_id, order_id, status')
    .eq('organization_id', user.organization_id)

  const orderStatusById = new Map(
    (allOrders || []).map((o: any) => [o.id, o.status])
  )

  const customersWithOrders: any[] = []
  const customersWithoutOrders: any[] = []

  for (const c of allCustomers || []) {
    const activeOrders = (allOrders || []).filter(
      (o: any) => orderBelongsToCustomer(c, o) && isActiveOrderStatus(o.status)
    )
    const allCustomerOrders = (allOrders || []).filter(
      (o: any) => orderBelongsToCustomer(c, o)
    )
    const designs = (allDesigns || [])
      .filter((d: any) => d.customer_id === c.id && ['draft', 'submitted'].includes(d.status))
      .map((d: any) => ({
        ...d,
        orderStatus: d.order_id ? orderStatusById.get(d.order_id) : null,
      }))

    if (shouldShowCustomerInFollowup({ orders: activeOrders, designs })) {
      customersWithOrders.push({ ...c, orders: activeOrders, designs })
    } else if (shouldShowCustomerInCreateList({ orders: allCustomerOrders, designs })) {
      customersWithoutOrders.push({ ...c, orders: allCustomerOrders })
    }
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
          <p className="text-muted-foreground">管理客户信息和意向跟进</p>
        </div>
        <Link href="/customers/new">
          <Button>+ 新建客户</Button>
        </Link>
      </div>

      <CustomersPageClient customers={customers} />
    </div>
  )
}
