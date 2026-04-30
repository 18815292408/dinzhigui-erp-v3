import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { normalizeFactoryRecords, setFactoryShipmentDate } from '@/lib/factory-shipment'
import { createAdminClient } from '@/lib/supabase/server'
import { parseSessionUser, type SessionUser } from '@/lib/types'

async function getSessionUser() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')
  if (!sessionCookie) return null
  return parseSessionUser(sessionCookie.value)
}

function canOperateShipment(user: SessionUser, assignedInstaller: string | null) {
  return ['owner', 'manager'].includes(user.role) || assignedInstaller === user.id
}

// PATCH: update one factory's shipment date inside orders.factory_records.
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const adminSupabase = await createAdminClient()
  const orderId = params.id
  const { factory_id, shipment_date } = await request.json()

  if (!factory_id || !shipment_date) {
    return NextResponse.json({ error: 'factory_id and shipment_date are required' }, { status: 400 })
  }

  const { data: currentOrder, error: readError } = await adminSupabase
    .from('orders')
    .select('id, assigned_installer, factory_records, installation_status, status')
    .eq('id', orderId)
    .eq('organization_id', user.organization_id)
    .single()

  if (readError || !currentOrder) {
    return NextResponse.json({ error: '订单不存在或无权操作' }, { status: 404 })
  }

  if (!canOperateShipment(user, currentOrder.assigned_installer)) {
    return NextResponse.json({ error: '无权操作' }, { status: 403 })
  }

  let factoryUpdate
  try {
    factoryUpdate = setFactoryShipmentDate(
      normalizeFactoryRecords(currentOrder.factory_records),
      factory_id,
      shipment_date
    )
  } catch (err: any) {
    return NextResponse.json({ error: err.message || '更新工厂出货日期失败' }, { status: 400 })
  }

  const updates: Record<string, unknown> = {
    factory_records: factoryUpdate.records,
    updated_at: new Date().toISOString(),
  }

  const { data: order, error } = await adminSupabase
    .from('orders')
    .update(updates)
    .eq('id', orderId)
    .eq('organization_id', user.organization_id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!order) return NextResponse.json({ error: '订单不存在' }, { status: 404 })

  return NextResponse.json(order)
}

// POST: legacy order-level shipment assignment flow used by the order detail page.
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const adminSupabase = await createAdminClient()
  const { estimated_shipment_date, installer_id } = await request.json()
  const orderId = params.id

  const { data: orderForCheck } = await adminSupabase
    .from('orders')
    .select('assigned_installer')
    .eq('id', orderId)
    .eq('organization_id', user.organization_id)
    .single()

  if (!orderForCheck || !canOperateShipment(user, orderForCheck.assigned_installer)) {
    return NextResponse.json({ error: '无权操作' }, { status: 403 })
  }

  const { data: order, error } = await adminSupabase
    .from('orders')
    .update({
      status: 'in_install',
      estimated_shipment_date,
      assigned_installer: installer_id,
      installation_status: 'pending_ship',
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId)
    .eq('status', 'pending_shipment')
    .eq('organization_id', user.organization_id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!order) return NextResponse.json({ error: '订单不存在或无权操作' }, { status: 404 })

  const { data: design } = await adminSupabase
    .from('designs')
    .select('id')
    .eq('order_id', orderId)
    .single()

  let customerId = order.customer_id
  if (!customerId && order.customer_name) {
    const { data: cust } = await adminSupabase
      .from('customers')
      .select('id')
      .eq('name', order.customer_name)
      .eq('organization_id', order.organization_id)
      .single()
    customerId = cust?.id || null
  }

  const { data: existingInstallations } = await adminSupabase
    .from('installations')
    .select('id')
    .eq('order_id', orderId)
    .eq('organization_id', order.organization_id)
    .order('created_at', { ascending: false })
    .limit(1)

  const existingInstallation = existingInstallations?.[0]
  const installationPayload = {
    customer_id: customerId,
    design_id: design?.id || null,
    assigned_to: installer_id,
    status: 'pending',
    updated_at: new Date().toISOString(),
  }

  const { error: installError } = existingInstallation
    ? await adminSupabase
      .from('installations')
      .update(installationPayload)
      .eq('id', existingInstallation.id)
    : await adminSupabase
      .from('installations')
      .insert({
        organization_id: order.organization_id,
        order_id: orderId,
        ...installationPayload,
        issues: '[]',
      })

  if (installError) {
    console.error('Create installation on set-shipment error:', installError)
  }

  if (installer_id) {
    await adminSupabase.from('notifications').insert({
      organization_id: order.organization_id,
      user_id: installer_id,
      type: 'new_install',
      priority: 'urgent',
      title: '新订单待安装',
      summary: `订单 ${order.order_no} (${order.customer_name || '未知'}) 已分配给您，请确认接单`,
      related_order_id: orderId,
    })
  }

  return NextResponse.json(order)
}
