import { cookies } from 'next/headers'
import { DesignList } from '@/components/designs/design-list'
import { createAdminClient } from '@/lib/supabase/server'
import { parseSessionUser } from '@/lib/types'

async function getDesignTasks() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')

  if (!sessionCookie) return []

  const user = parseSessionUser(sessionCookie.value)
  if (!user) return []

  const adminSupabase = await createAdminClient()

  // 设计师：看到分配给自己的设计任务（订单状态 pending_design / designing / pending_order）
  let query = adminSupabase
    .from('designs')
    .select('*')
    .eq('organization_id', user.organization_id)
    .in('status', ['draft', 'submitted'])

  // 设计师只看分配给自己的
  if (user.role === 'designer') {
    query = query.eq('created_by', user.id)
  }

  let { data, error } = await query

  // 补全关联数据（避免 join 失败导致整页崩）
  if (data?.length) {
    const orderIds = data.map((d: any) => d.order_id).filter(Boolean)
    if (orderIds.length) {
      const { data: orders } = await adminSupabase
        .from('orders')
        .select('id, order_no, status, customer_name, signed_amount, assigned_designer, design_due_date')
        .in('id', orderIds)
      const ordersMap: any = {}
      orders?.forEach((o: any) => { ordersMap[o.id] = o })

      // 补全设计师名字
      const designerIds = Array.from(new Set(orders?.map((o: any) => o.assigned_designer).filter(Boolean) || []))
      const { data: designers } = await adminSupabase
        .from('users')
        .select('id, display_name')
        .in('id', designerIds)
      const designerMap: any = {}
      designers?.forEach((u: any) => { designerMap[u.id] = u })

      for (const d of data) {
        if (d.order_id) {
          d.orders = ordersMap[d.order_id] || null
          if (d.orders?.assigned_designer) {
            d.orders.assigned_designer_user = designerMap[d.orders.assigned_designer] || null
          }
        }
      }
    }
  }

  // 过滤：只显示设计相关的订单状态
  const designStatuses = ['pending_design', 'designing', 'in_design', 'pending_order']
  const filtered = (data || []).filter((d: any) =>
    d.orders && designStatuses.includes(d.orders.status)
  )

  return filtered
}

export default async function DesignsPage() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')
  const user = sessionCookie ? parseSessionUser(sessionCookie.value) : null

  const designs: any[] = await getDesignTasks()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">方案管理</h1>
        <p className="text-muted-foreground">
          {user?.role === 'designer' ? '查看分配给您的设计任务' : '查看所有设计方案'}
        </p>
      </div>

      <DesignList designs={designs} />
    </div>
  )
}
