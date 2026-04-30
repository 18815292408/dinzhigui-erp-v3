import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { confirmFactoryArrival, normalizeFactoryRecords } from '@/lib/factory-shipment'
import { createAdminClient } from '@/lib/supabase/server'
import { parseSessionUser, type SessionUser } from '@/lib/types'

async function getSessionUser() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')
  if (!sessionCookie) return null
  return parseSessionUser(sessionCookie.value)
}

function canConfirmArrival(user: SessionUser, assignedInstaller: string | null) {
  return ['owner', 'manager'].includes(user.role) || assignedInstaller === user.id
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const adminSupabase = await createAdminClient()
  const orderId = params.id
  const { factory_id } = await request.json()

  if (!factory_id) {
    return NextResponse.json({ error: 'factory_id is required' }, { status: 400 })
  }

  const { data: currentOrder, error: readError } = await adminSupabase
    .from('orders')
    .select('id, assigned_installer, factory_records, organization_id')
    .eq('id', orderId)
    .eq('organization_id', user.organization_id)
    .single()

  if (readError || !currentOrder) {
    return NextResponse.json({ error: '订单不存在或无权操作' }, { status: 404 })
  }

  if (!canConfirmArrival(user, currentOrder.assigned_installer)) {
    return NextResponse.json({ error: '无权操作' }, { status: 403 })
  }

  const arrivalDate = new Date().toISOString()
  let factoryUpdate
  try {
    factoryUpdate = confirmFactoryArrival(
      normalizeFactoryRecords(currentOrder.factory_records),
      factory_id,
      arrivalDate
    )
  } catch (err: any) {
    return NextResponse.json({ error: err.message || '确认工厂到货失败' }, { status: 400 })
  }

  const orderUpdates: Record<string, unknown> = {
    factory_records: factoryUpdate.records,
    updated_at: arrivalDate,
  }

  if (factoryUpdate.allArrived) {
    orderUpdates.status = 'in_install'
    orderUpdates.installation_status = 'arrived'
  }

  const { data: order, error: updateError } = await adminSupabase
    .from('orders')
    .update(orderUpdates)
    .eq('id', orderId)
    .eq('organization_id', user.organization_id)
    .select()
    .single()

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  if (factoryUpdate.allArrived) {
    const { error: installationError } = await adminSupabase
      .from('installations')
      .update({
        status: 'in_progress',
        arrival_date: arrivalDate.slice(0, 10),
        updated_at: arrivalDate,
      })
      .eq('order_id', orderId)
      .eq('organization_id', user.organization_id)

    if (installationError) {
      return NextResponse.json({ error: installationError.message }, { status: 500 })
    }
  }

  return NextResponse.json({
    order,
    allArrived: factoryUpdate.allArrived,
  })
}
