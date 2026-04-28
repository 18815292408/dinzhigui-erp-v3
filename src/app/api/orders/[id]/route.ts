import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { parseSessionUser } from '@/lib/types'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')

  if (!sessionCookie) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = parseSessionUser(sessionCookie.value)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const adminSupabase = await createAdminClient()

  // 补全用户关联（避免 join 失败）
  const { data: order } = await adminSupabase
    .from('orders')
    .select('*, designs(*)')
    .eq('id', params.id)
    .single()

  if (!order) {
    return NextResponse.json({ error: '订单不存在' }, { status: 404 })
  }

  // 补全设计师/安装师名字
  if (order.assigned_designer) {
    const u = await adminSupabase.from('users').select('id, display_name').eq('id', order.assigned_designer).eq('organization_id', user.organization_id).single()
    order.assigned_designer_user = u.data
  }
  if (order.assigned_installer) {
    const u = await adminSupabase.from('users').select('id, display_name').eq('id', order.assigned_installer).eq('organization_id', user.organization_id).single()
    order.assigned_installer_user = u.data
  }

  return NextResponse.json(order)
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')

  if (!sessionCookie) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = parseSessionUser(sessionCookie.value)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const adminSupabase = await createAdminClient()
  const body = await request.json()

  // owner/manager 可以操作，sales 只能操作自己创建的订单
  let query = adminSupabase
    .from('orders')
    .update({
      ...body,
      updated_at: new Date().toISOString()
    })
    .eq('id', params.id)

  if (user.role === 'sales') {
    query = query.eq('created_by', user.id)
  }

  const { data, error } = await query.select().single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ error: '订单不存在或无权操作' }, { status: 404 })
  }

  return NextResponse.json(data)
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
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

    const canBypassAll = ['owner', 'manager'].includes(user.role)

    const { data: order, error: orderErr } = await adminSupabase
      .from('orders')
      .select('created_by')
      .eq('id', params.id)
      .single()

    if (orderErr) {
      console.error('DELETE order - fetch error:', orderErr)
      return NextResponse.json({ error: orderErr.message }, { status: 500 })
    }

    if (!order) {
      return NextResponse.json({ error: '订单不存在' }, { status: 404 })
    }

    if (!canBypassAll) {
      if (user.role === 'sales') {
        if (order.created_by !== user.id) {
          return NextResponse.json({ error: '只能删除自己创建的订单' }, { status: 403 })
        }
      } else {
        return NextResponse.json({ error: '无权删除订单' }, { status: 403 })
      }
    }

    // 检查是否有设计方案（所有角色均需检查）
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

    // 检查是否有安装记录（所有角色均需检查）
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

    // 清理关联通知
    await adminSupabase.from('notifications').update({ related_order_id: null }).eq('related_order_id', params.id)

    const { error: deleteErr } = await adminSupabase
      .from('orders')
      .delete()
      .eq('id', params.id)
      .eq('organization_id', user.organization_id)

    if (deleteErr) {
      console.error('DELETE order - delete error:', deleteErr)
      const msg = deleteErr.message || ''
      if (msg.includes('designs_order_id_fkey')) {
        return NextResponse.json({ error: '该订单关联了设计方案，请先到方案管理删除设计方案后再试' }, { status: 400 })
      }
      if (msg.includes('installations_order_id_fkey')) {
        return NextResponse.json({ error: '该订单关联了安装记录，请先到安装管理删除安装记录后再试' }, { status: 400 })
      }
      return NextResponse.json({ error: '删除失败：' + deleteErr.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('DELETE order - uncaught:', err)
    const msg = err.message || ''
    if (msg.includes('foreign key constraint')) {
      if (msg.includes('designs_order_id_fkey')) {
        return NextResponse.json({ error: '该订单关联了设计方案，请先到方案管理删除设计方案后再试' }, { status: 400 })
      }
      if (msg.includes('installations_order_id_fkey')) {
        return NextResponse.json({ error: '该订单关联了安装记录，请先到安装管理删除安装记录后再试' }, { status: 400 })
      }
    }
    return NextResponse.json({ error: '删除失败：' + (err.message || '未知错误') }, { status: 500 })
  }
}
