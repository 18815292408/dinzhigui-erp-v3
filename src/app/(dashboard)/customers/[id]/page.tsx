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
    // 先查客户自己的 orders（匹配 customer_name）
    const { data: byName, error: err1 } = await adminSupabase
      .from('orders')
      .select('*')
      .eq('customer_name', data.name)
      .order('created_at', { ascending: false })
    if (err1) console.error('byName error:', err1)

    let orders = byName || []

    // 如果按 customer_name 找不到，尝试按 customer_id 找
    if (!orders.length) {
      const { data: byId, error: err2 } = await adminSupabase
        .from('orders')
        .select('*')
        .eq('customer_id', data.id)
        .order('created_at', { ascending: false })
      if (err2) console.error('byId error:', err2)
      orders = byId || []
    }

    // 单独补全用户关联（避免 join 失败导致整页崩）
    if (orders.length) {
      for (const o of orders) {
        if (o.assigned_designer) {
          const u = await adminSupabase.from('users').select('id, display_name').eq('id', o.assigned_designer).eq('organization_id', organizationId).single()
          o.assigned_designer_user = u.data
        }
        if (o.assigned_installer) {
          const u = await adminSupabase.from('users').select('id, display_name').eq('id', o.assigned_installer).eq('organization_id', organizationId).single()
          o.assigned_installer_user = u.data
        }
      }
    }

    return { ...data, orders }
  }

  return { ...data, orders: [] }
}

export default async function CustomerDetailPage({ params }: { params: { id: string } }) {
  const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!isValidUUID.test(params.id)) {
    return <div>无效的客户ID</div>
  }

  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')
  const { parseSessionUser } = await import('@/lib/types')
  const user = sessionCookie ? parseSessionUser(sessionCookie.value) : null

  const canEdit = Boolean(user && ['owner', 'manager', 'sales'].includes(user.role))

  // 获取安装师傅列表（用于派单和指派安装）
  const { createAdminClient } = await import('@/lib/supabase/server')
  const adminSupabase = await createAdminClient()
  const { data: designers } = await adminSupabase
    .from('users')
    .select('id, display_name')
    .eq('organization_id', user?.organization_id)
    .eq('role', 'designer')
  const { data: installers } = await adminSupabase
    .from('users')
    .select('id, display_name')
    .eq('organization_id', user?.organization_id)
    .eq('role', 'installer')

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
      designers={designers || []}
      installers={installers || []}
    />
  )
}
