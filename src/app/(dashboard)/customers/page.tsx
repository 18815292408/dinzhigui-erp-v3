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

  // 获取无订单客户（订单创建）
  const [customersWithoutOrders, customersWithOrders] = await Promise.all([
    // 订单创建：客户没有进行中订单
    adminSupabase
      .from('customers')
      .select('*')
      .eq('organization_id', user.organization_id)
      .eq('has_active_order', false)
      .order('created_at', { ascending: false }),
    // 订单跟进：客户有进行中订单
    adminSupabase
      .from('customers')
      .select('*, orders(id, order_no, signed_amount, status, order_stage)')
      .eq('organization_id', user.organization_id)
      .eq('has_active_order', true)
      .order('created_at', { ascending: false }),
  ])
  return {
    withoutOrders: customersWithoutOrders.data || [],
    withOrders: customersWithOrders.data || []
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
