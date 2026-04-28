import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { buildMonthlyStatistics } from '@/lib/monthly-statistics'
import { createAdminClient } from '@/lib/supabase/server'
import { parseSessionUser } from '@/lib/types'

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')

    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = parseSessionUser(sessionCookie.value)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!['owner', 'manager'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const year = Number(searchParams.get('year') || new Date().getFullYear())
    const month = Number(searchParams.get('month') || new Date().getMonth() + 1)

    const adminSupabase = await createAdminClient()
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const endDate = new Date(year, month, 0).toISOString().slice(0, 10)

    const { data: monthlyOrders, error: ordersError } = await adminSupabase
      .from('orders')
      .select(`
        id,
        order_no,
        customer_name,
        created_by,
        assigned_designer,
        created_at,
        updated_at,
        signed_amount,
        final_order_amount,
        payment_status,
        payment_confirmed_at,
        factory_records,
        status
      `)
      .eq('organization_id', user.organization_id)
      .or(
        `and(created_at.gte.${startDate},created_at.lte.${endDate}T23:59:59),and(payment_confirmed_at.gte.${startDate},payment_confirmed_at.lte.${endDate}T23:59:59),and(updated_at.gte.${startDate},updated_at.lte.${endDate}T23:59:59)`
      )

    if (ordersError) {
      return NextResponse.json(
        { error: 'Failed to fetch monthly statistics', detail: ordersError.message },
        { status: 500 }
      )
    }

    const orderIds = (monthlyOrders || []).map((order: any) => order.id)
    const { data: designs } = orderIds.length > 0
      ? await adminSupabase
        .from('designs')
        .select('order_id, created_by')
        .in('order_id', orderIds)
      : { data: [] }

    const designCreatorByOrderId = new Map(
      (designs || []).map((design: any) => [design.order_id, design.created_by])
    )
    const ordersWithDesigners = (monthlyOrders || []).map((order: any) => ({
      ...order,
      design_created_by: designCreatorByOrderId.get(order.id) || null,
    }))

    const userIds = Array.from(new Set(ordersWithDesigners.flatMap((order: any) => [
      order.created_by,
      order.assigned_designer,
      order.design_created_by,
    ]).filter(Boolean)))

    const { data: users } = userIds.length > 0
      ? await adminSupabase
        .from('users')
        .select('id, display_name, email, phone')
        .in('id', userIds)
      : { data: [] }

    return NextResponse.json(buildMonthlyStatistics({
      year,
      month,
      orders: ordersWithDesigners,
      users: users || [],
    }))
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal error', detail: err.message }, { status: 500 })
  }
}
