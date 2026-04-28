import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { parseSessionUser } from '@/lib/types'
import { cookies } from 'next/headers'

// 一次性回填脚本：将 installations 表中 customer_id 为空的记录，按 order.customer_name 匹配 customers 表来补全
export async function POST() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')
  if (!sessionCookie) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = parseSessionUser(sessionCookie.value)
  if (!user || !['owner', 'manager'].includes(user.role)) {
    return NextResponse.json({ error: '无权操作' }, { status: 403 })
  }

  const adminSupabase = await createAdminClient()

  // 获取所有 customer_id 为空的安装记录
  const { data: nullCustomerInstallations } = await adminSupabase
    .from('installations')
    .select('id, order_id, organization_id')
    .is('customer_id', null)
    .eq('organization_id', user.organization_id)

  if (!nullCustomerInstallations?.length) {
    return NextResponse.json({ message: '没有需要回填的记录', count: 0 })
  }

  let updated = 0
  for (const inst of nullCustomerInstallations) {
    // 通过 order 找 customer_name
    const { data: order } = await adminSupabase
      .from('orders')
      .select('customer_name, customer_id')
      .eq('id', inst.order_id)
      .single()

    if (!order?.customer_name) continue

    // 按 customer_name 查找 customers.id
    const { data: customer } = await adminSupabase
      .from('customers')
      .select('id')
      .eq('name', order.customer_name)
      .eq('organization_id', user.organization_id)
      .single()

    if (customer?.id) {
      await adminSupabase
        .from('installations')
        .update({ customer_id: customer.id })
        .eq('id', inst.id)
      updated++
    }
  }

  return NextResponse.json({ message: `回填完成，共更新 ${updated} 条记录`, count: updated })
}
