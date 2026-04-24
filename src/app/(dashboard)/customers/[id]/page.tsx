import { cookies } from 'next/headers'
import { CustomerDetailClient } from './customer-detail-client'

async function getCustomer(id: string, organizationId: string) {
  const { createAdminClient } = await import('@/lib/supabase/server')
  const adminSupabase = await createAdminClient()
  const { data } = await adminSupabase
    .from('customers')
    .select('*')
    .eq('id', id)
    .eq('organization_id', organizationId)
    .single()

  if (data) {
    // 用 customer_name 关联，因为 orders 表用 customer_name 不是 customer_id
    const { data: orders } = await adminSupabase
      .from('orders')
      .select('*')
      .eq('customer_name', data.name)
      .neq('status', 'completed')
      .order('created_at', { ascending: false })
    return { ...data, orders: orders || [] }
  }

  return { ...data, orders: [] }
}

export default async function CustomerDetailPage({ params }: { params: { id: string } }) {
  // Validate UUID format
  const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!isValidUUID.test(params.id)) {
    return <div>无效的客户ID</div>
  }

  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')
  const { parseSessionUser } = await import('@/lib/types')
  const user = sessionCookie ? parseSessionUser(sessionCookie.value) : null

  // Permission check: owner, manager, sales can edit
  const canEdit = user && ['owner', 'manager', 'sales'].includes(user.role)

  const customer = user
    ? await getCustomer(params.id, user.organization_id)
    : null

  if (!customer) {
    return <div className="p-6">客户不存在</div>
  }

  return (
    <CustomerDetailClient
      customer={customer}
      canEdit={canEdit}
      user={user}
    />
  )
}
