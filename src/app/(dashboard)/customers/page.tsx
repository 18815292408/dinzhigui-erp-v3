import { cookies } from 'next/headers'
import { CustomerList } from '@/components/customers/customer-list'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/server'
import { parseSessionUser } from '@/lib/types'

async function getCustomers() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')

  if (!sessionCookie) {
    return []
  }

  const user = parseSessionUser(sessionCookie.value)
  if (!user) {
    return []
  }

  const adminSupabase = await createAdminClient()

  // 获取所有客户和有进行中设计方案的客户ID（有设计方案后客户就不在客户列表显示）
  const [allCustomers, activeDesigns] = await Promise.all([
    adminSupabase
      .from('customers')
      .select('*')
      .eq('organization_id', user.organization_id)
      .order('created_at', { ascending: false }),
    adminSupabase
      .from('designs')
      .select('customer_id')
      .in('status', ['draft', 'submitted', 'confirmed']),
  ])

  const activeCustomerIds = new Set(activeDesigns.data?.map(d => d.customer_id).filter(Boolean) || [])

  // 过滤掉有进行中设计方案的客户
  return (allCustomers.data || []).filter(c => !activeCustomerIds.has(c.id))
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

      <CustomerList customers={customers} />
    </div>
  )
}
