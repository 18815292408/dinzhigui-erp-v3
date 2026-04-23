import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/server'
import { parseSessionUser } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'
import { FileText, Clock, CheckCircle } from 'lucide-react'

const statusConfig = {
  pending_design: { label: '待接单', color: 'bg-orange-100 text-orange-700', icon: Clock },
  designing: { label: '设计中', color: 'bg-blue-100 text-blue-700', icon: CheckCircle },
}

async function getAssignedOrders() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')

  if (!sessionCookie) return []

  const user = parseSessionUser(sessionCookie.value)
  if (!user) return []

  // Only designers should access this page
  if (user.role !== 'designer') {
    return []
  }

  const adminSupabase = await createAdminClient()

  // Fetch orders assigned to this designer with pending_design or designing status
  const { data: orders } = await adminSupabase
    .from('orders')
    .select(`
      *,
      created_by_user:users!created_by(name),
      assigned_designer_user:users!assigned_designer(name)
    `)
    .eq('assigned_designer', user.id)
    .in('status', ['pending_design', 'designing'])
    .order('created_at', { ascending: false })

  // For each designing order, find the associated design
  if (orders && orders.length > 0) {
    const orderIds = orders.map((o: any) => o.id)
    const { data: designs } = await adminSupabase
      .from('designs')
      .select('id, order_id')
      .in('order_id', orderIds)

    const designByOrderId: Record<string, string> = {}
    if (designs) {
      for (const d of designs) {
        designByOrderId[d.order_id] = d.id
      }
    }

    // Attach design ID to each order
    return orders.map((o: any) => ({
      ...o,
      design_id: designByOrderId[o.id] || null,
    }))
  }

  return []
}

async function acceptOrderAndCreateDesign(orderId: string) {
  'use server'

  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')
  if (!sessionCookie) return

  const user = parseSessionUser(sessionCookie.value)
  if (!user) return

  const adminSupabase = await createAdminClient()

  // Update order status to designing
  const { data: order, error } = await adminSupabase
    .from('orders')
    .update({
      status: 'designing',
      updated_at: new Date().toISOString()
    })
    .eq('id', orderId)
    .eq('assigned_designer', user.id)
    .eq('status', 'pending_design')
    .select()
    .single()

  if (error || !order) {
    console.error('Accept order error:', error)
    return
  }

  // Find the customer for this order
  const { data: customer } = await adminSupabase
    .from('customers')
    .select('id, name')
    .eq('name', order.customer_name)
    .eq('organization_id', user.organization_id)
    .single()

  // Create a design record for this order
  const { data: design } = await adminSupabase
    .from('designs')
    .insert({
      organization_id: user.organization_id,
      created_by: user.id,
      customer_id: customer?.id || null,
      order_id: orderId,
      title: `${order.customer_name} - 设计方案`,
      status: 'draft',
      attachments: '[]',
    })
    .select()
    .single()

  if (design) {
    redirect(`/designs/${design.id}`)
  } else {
    // Fallback: redirect to orders page if design creation failed
    redirect('/orders')
  }
}

export default async function AssignedOrdersPage() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')
  const user = sessionCookie ? parseSessionUser(sessionCookie.value) : null

  // Only allow designers to access this page
  if (!user || user.role !== 'designer') {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">此页面仅供设计师访问</p>
      </div>
    )
  }

  const orders = await getAssignedOrders()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">我的订单</h1>
        <p className="text-muted-foreground">选择要开始设计的订单</p>
      </div>

      {orders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">暂无可处理的订单</p>
            <p className="text-sm text-muted-foreground mt-1">等待导购派发新订单</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {orders.map((order: any) => {
            const status = statusConfig[order.status as keyof typeof statusConfig]
            const StatusIcon = status?.icon || Clock

            return (
              <Card key={order.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-medium text-lg">{order.customer_name}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${status?.color || 'bg-gray-100 text-gray-700'}`}>
                          <StatusIcon className="w-3 h-3 inline mr-1" />
                          {status?.label || order.status}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        订单号：{order.order_no}
                      </p>
                      {order.house_type && (
                        <p className="text-sm text-muted-foreground">
                          户型：{order.house_type}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-4">
                      {order.status === 'pending_design' ? (
                        <form action={async () => {
                          'use server'
                          await acceptOrderAndCreateDesign(order.id)
                        }}>
                          <Button type="submit">接单并开始设计</Button>
                        </form>
                      ) : order.design_id ? (
                        <Link href={`/designs/${order.design_id}`}>
                          <Button variant="outline">编辑设计</Button>
                        </Link>
                      ) : (
                        <form action={async () => {
                          'use server'
                          await acceptOrderAndCreateDesign(order.id)
                        }}>
                          <Button type="submit">创建设计</Button>
                        </form>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}