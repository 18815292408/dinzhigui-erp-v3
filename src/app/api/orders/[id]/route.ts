import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { parseSessionUser } from '@/lib/types'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      created_by_user:users!created_by(name),
      assigned_designer_user:users!assigned_designer(name),
      assigned_installer_user:users!assigned_installer(name)
    `)
    .eq('id', params.id)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()

  const { data, error } = await supabase
    .from('orders')
    .update({
      ...body,
      updated_at: new Date().toISOString()
    })
    .eq('id', params.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')

  if (!sessionCookie) {
    return NextResponse.json({ error: '未登录' }, { status: 401 })
  }

  const user = parseSessionUser(sessionCookie.value)
  if (!user) {
    return NextResponse.json({ error: '无效会话' }, { status: 401 })
  }

  const adminSupabase = await createAdminClient()

  // 店长/老板不受限制
  const canBypassAll = ['owner', 'manager'].includes(user.role)

  // 先获取订单，检查所有权
  const { data: order } = await adminSupabase
    .from('orders')
    .select('created_by')
    .eq('id', params.id)
    .single()

  if (!order) {
    return NextResponse.json({ error: '订单不存在' }, { status: 404 })
  }

  if (!canBypassAll) {
    // 非店长/老板：销售角色只能删自己创建的订单
    if (user.role === 'sales') {
      if (order.created_by !== user.id) {
        return NextResponse.json({ error: '只能删除自己创建的订单' }, { status: 403 })
      }
    } else {
      // 非销售角色不允许删订单
      return NextResponse.json({ error: '无权删除订单' }, { status: 403 })
    }

    // 检查是否有设计方案
    const { data: designs } = await adminSupabase
      .from('designs')
      .select('id')
      .eq('order_id', params.id)
      .limit(1)

    if (designs && designs.length > 0) {
      return NextResponse.json(
        { error: '该订单还有设计方案，请到方案管理删除设计方案后再试' },
        { status: 400 }
      )
    }

    // 检查是否有安装记录
    const { data: installations } = await adminSupabase
      .from('installations')
      .select('id')
      .eq('order_id', params.id)
      .limit(1)

    if (installations && installations.length > 0) {
      return NextResponse.json(
        { error: '该订单还有安装记录，请到安装管理删除安装记录后再试' },
        { status: 400 }
      )
    }
  }

  // 执行删除
  const { error } = await adminSupabase
    .from('orders')
    .delete()
    .eq('id', params.id)
    .eq('organization_id', user.organization_id)

  if (error) {
    return NextResponse.json({ error: '删除失败' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
