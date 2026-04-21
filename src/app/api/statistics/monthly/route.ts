import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString())
    const month = parseInt(searchParams.get('month') || (new Date().getMonth() + 1).toString())

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role, organization_id')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found', detail: userError?.message }, { status: 400 })
    }

    if (!['owner', 'manager'].includes(userData?.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const endDate = new Date(year, month, 0).toISOString().slice(0, 10)

    const { data: salesStats, error: salesError } = await supabase
      .from('orders')
      .select(`
        created_by,
        users!created_by(name),
        order_no,
        customer_name,
        created_at
      `)
      .eq('organization_id', userData?.organization_id)
      .gte('created_at', startDate)
      .lte('created_at', `${endDate}T23:59:59`)

    if (salesError) {
      return NextResponse.json({ error: 'Failed to fetch sales stats', detail: salesError.message }, { status: 500 })
    }

    const salesByPerson: Record<string, { name: string, count: number, orders: any[] }> = {}
    salesStats?.forEach(order => {
      const salesId = order.created_by
      if (!salesByPerson[salesId]) {
        salesByPerson[salesId] = {
          name: order.users?.name || '未知',
          count: 0,
          orders: []
        }
      }
      salesByPerson[salesId].count++
      salesByPerson[salesId].orders.push({
        order_no: order.order_no,
        customer_name: order.customer_name,
        created_at: order.created_at
      })
    })

    const { data: designerStats, error: designerError } = await supabase
      .from('orders')
      .select(`
        assigned_designer,
        users!assigned_designer(name),
        order_no,
        customer_name,
        factory_records,
        completed_at
      `)
      .eq('organization_id', userData?.organization_id)
      .eq('status', 'completed')
      .gte('completed_at', startDate)
      .lte('completed_at', `${endDate}T23:59:59`)

    if (designerError) {
      return NextResponse.json({ error: 'Failed to fetch designer stats', detail: designerError.message }, { status: 500 })
    }

    const designerByPerson: Record<string, { name: string, count: number, total_amount: number, orders: any[] }> = {}
    designerStats?.forEach(order => {
      const designerId = order.assigned_designer
      if (!designerByPerson[designerId]) {
        designerByPerson[designerId] = {
          name: order.users?.name || '未知',
          count: 0,
          total_amount: 0,
          orders: []
        }
      }
      designerByPerson[designerId].count++
      const records = order.factory_records || []
      const total = records.reduce((sum: number, r: any) => sum + (r.amount || 0), 0)
      designerByPerson[designerId].total_amount += total
      designerByPerson[designerId].orders.push({
        order_no: order.order_no,
        customer_name: order.customer_name,
        amount: total
      })
    })

    return NextResponse.json({
      year,
      month,
      sales: Object.values(salesByPerson),
      designers: Object.values(designerByPerson),
      summary: {
        total_sales_orders: salesStats?.length || 0,
        total_designer_orders: designerStats?.length || 0,
        total_designer_amount: Object.values(designerByPerson).reduce((sum, d) => sum + d.total_amount, 0)
      }
    })
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal error', detail: err.message }, { status: 500 })
  }
}
