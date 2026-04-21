import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Cron security: verify the request has valid cron header or secret
function verifyCronRequest(request: Request): boolean {
  // Check for Vercel Cron header
  const vercelCronHeader = request.headers.get('x-vercel-signature')
  if (vercelCronHeader) {
    return true
  }

  // Check for custom cron secret header
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const requestSecret = request.headers.get('x-cron-secret')
    return requestSecret === cronSecret
  }

  // If no security configured, allow for development
  return process.env.NODE_ENV === 'development'
}

export async function GET(request: Request) {
  // Verify cron request
  if (!verifyCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const adminClient = await createAdminClient()
  const now = new Date()
  const today = now.toISOString().slice(0, 10) // YYYY-MM-DD

  const results = {
    drawing_timeout: { checked: 0, created: 0 },
    payment_overdue: { checked: 0, created: 0 },
    shipment_delay: { checked: 0, created: 0 },
    drawing_reminder: { checked: 0, created: 0 },
    shipment_reminder: { checked: 0, created: 0 },
    errors: [] as string[]
  }

  try {
    // Get all organizations
    const { data: organizations, error: orgError } = await adminClient
      .from('organizations')
      .select('id')

    if (orgError) {
      results.errors.push(`Failed to fetch organizations: ${orgError.message}`)
      return NextResponse.json(results, { status: 500 })
    }

    for (const org of organizations || []) {
      const orgId = org.id

      // ========== 1. Drawing timeout check ==========
      // Status = 'designing' AND current_date > design_due_date
      const { data: designingOrders, error: designingError } = await adminClient
        .from('orders')
        .select('id, order_no, customer_name, assigned_designer, design_due_date')
        .eq('organization_id', orgId)
        .eq('status', 'designing')
        .not('design_due_date', 'is', null)

      if (designingError) {
        results.errors.push(`Drawing timeout query error: ${designingError.message}`)
      } else {
        results.drawing_timeout.checked = (results.drawing_timeout.checked || 0) + (designingOrders?.length || 0)

        for (const order of designingOrders || []) {
          if (order.design_due_date && order.design_due_date < today) {
            // Check if notification already exists
            const { data: existing } = await adminClient
              .from('notifications')
              .select('id')
              .eq('related_order_id', order.id)
              .eq('type', 'drawing_timeout')
              .eq('user_id', order.assigned_designer)
              .single()

            if (!existing) {
              await adminClient.from('notifications').insert({
                organization_id: orgId,
                user_id: order.assigned_designer,
                type: 'drawing_timeout',
                priority: 'urgent',
                title: '出图超时提醒',
                summary: `订单 ${order.order_no} (客户: ${order.customer_name}) 出图已超时，请尽快完成设计`,
                related_order_id: order.id
              })
              results.drawing_timeout.created++
            }
          }
        }
      }

      // ========== 2. Payment overdue check ==========
      // Status = 'pending_payment' AND placed_at + 3 days < now
      const threeDaysAgo = new Date(now)
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
      const threeDaysAgoStr = threeDaysAgo.toISOString()

      const { data: pendingPaymentOrders, error: paymentError } = await adminClient
        .from('orders')
        .select('id, order_no, customer_name, placed_at')
        .eq('organization_id', orgId)
        .eq('status', 'pending_payment')
        .not('placed_at', 'is', null)

      if (paymentError) {
        results.errors.push(`Payment overdue query error: ${paymentError.message}`)
      } else {
        results.payment_overdue.checked = (results.payment_overdue.checked || 0) + (pendingPaymentOrders?.length || 0)

        for (const order of pendingPaymentOrders || []) {
          if (order.placed_at && order.placed_at < threeDaysAgoStr) {
            // Get owner for this organization
            const { data: owner } = await adminClient
              .from('users')
              .select('id')
              .eq('organization_id', orgId)
              .eq('role', 'owner')
              .single()

            if (owner) {
              // Check if notification already exists
              const { data: existing } = await adminClient
                .from('notifications')
                .select('id')
                .eq('related_order_id', order.id)
                .eq('type', 'payment_overdue')
                .eq('user_id', owner.id)
                .single()

              if (!existing) {
                await adminClient.from('notifications').insert({
                  organization_id: orgId,
                  user_id: owner.id,
                  type: 'payment_overdue',
                  priority: 'urgent',
                  title: '待打款超期',
                  summary: `订单 ${order.order_no} (客户: ${order.customer_name}) 已超过3天未打款，请跟进`,
                  related_order_id: order.id
                })
                results.payment_overdue.created++
              }
            }
          }
        }
      }

      // ========== 3. Shipment delay check ==========
      // Status = 'pending_shipment' AND estimated_shipment_date + 3 days < now
      const threeDaysLater = new Date(now)
      threeDaysLater.setDate(threeDaysLater.getDate() + 3)
      const threeDaysLaterStr = threeDaysLater.toISOString().slice(0, 10)

      const { data: pendingShipmentOrders, error: shipmentError } = await adminClient
        .from('orders')
        .select('id, order_no, customer_name, estimated_shipment_date')
        .eq('organization_id', orgId)
        .eq('status', 'pending_shipment')
        .not('estimated_shipment_date', 'is', null)

      if (shipmentError) {
        results.errors.push(`Shipment delay query error: ${shipmentError.message}`)
      } else {
        results.shipment_delay.checked = (results.shipment_delay.checked || 0) + (pendingShipmentOrders?.length || 0)

        for (const order of pendingShipmentOrders || []) {
          if (order.estimated_shipment_date) {
            const shipDate = new Date(order.estimated_shipment_date)
            shipDate.setDate(shipDate.getDate() + 3)
            if (shipDate.toISOString().slice(0, 10) < today) {
              // Get owner for this organization
              const { data: owner } = await adminClient
                .from('users')
                .select('id')
                .eq('organization_id', orgId)
                .eq('role', 'owner')
                .single()

              if (owner) {
                // Check if notification already exists
                const { data: existing } = await adminClient
                  .from('notifications')
                  .select('id')
                  .eq('related_order_id', order.id)
                  .eq('type', 'shipment_delay')
                  .eq('user_id', owner.id)
                  .single()

                if (!existing) {
                  await adminClient.from('notifications').insert({
                    organization_id: orgId,
                    user_id: owner.id,
                    type: 'shipment_delay',
                    priority: 'urgent',
                    title: '安装延误提醒',
                    summary: `订单 ${order.order_no} (客户: ${order.customer_name}) 预计出货日期已过3天仍未出货`,
                    related_order_id: order.id
                  })
                  results.shipment_delay.created++
                }
              }
            }
          }
        }
      }

      // ========== 4. Drawing reminder (1 day before) ==========
      // Status = 'designing' AND design_due_date - 1 day = today
      const tomorrow = new Date(now)
      tomorrow.setDate(tomorrow.getDate() + 1)
      const tomorrowStr = tomorrow.toISOString().slice(0, 10)

      const { data: drawingReminderOrders, error: drawingReminderError } = await adminClient
        .from('orders')
        .select('id, order_no, customer_name, assigned_designer, created_by, design_due_date')
        .eq('organization_id', orgId)
        .eq('status', 'designing')
        .not('design_due_date', 'is', null)

      if (drawingReminderError) {
        results.errors.push(`Drawing reminder query error: ${drawingReminderError.message}`)
      } else {
        results.drawing_reminder.checked = (results.drawing_reminder.checked || 0) + (drawingReminderOrders?.length || 0)

        for (const order of drawingReminderOrders || []) {
          if (order.design_due_date === tomorrowStr) {
            const notifyUsers = [order.assigned_designer, order.created_by].filter(Boolean)

            for (const userId of notifyUsers) {
              // Check if notification already exists
              const { data: existing } = await adminClient
                .from('notifications')
                .select('id')
                .eq('related_order_id', order.id)
                .eq('type', 'drawing_reminder')
                .eq('user_id', userId)
                .single()

              if (!existing) {
                await adminClient.from('notifications').insert({
                  organization_id: orgId,
                  user_id: userId,
                  type: 'drawing_reminder',
                  priority: 'normal',
                  title: '出图提醒',
                  summary: `订单 ${order.order_no} (客户: ${order.customer_name}) 明天到期，请尽快完成设计`,
                  related_order_id: order.id
                })
                results.drawing_reminder.created++
              }
            }
          }
        }
      }

      // ========== 5. Shipment reminder (7 days before) ==========
      // Status = 'pending_shipment' AND estimated_shipment_date - 7 days = today
      const sevenDaysLater = new Date(now)
      sevenDaysLater.setDate(sevenDaysLater.getDate() + 7)
      const sevenDaysLaterStr = sevenDaysLater.toISOString().slice(0, 10)

      const { data: shipmentReminderOrders, error: shipmentReminderError } = await adminClient
        .from('orders')
        .select('id, order_no, customer_name, assigned_designer, estimated_shipment_date')
        .eq('organization_id', orgId)
        .eq('status', 'pending_shipment')
        .not('estimated_shipment_date', 'is', null)

      if (shipmentReminderError) {
        results.errors.push(`Shipment reminder query error: ${shipmentReminderError.message}`)
      } else {
        results.shipment_reminder.checked = (results.shipment_reminder.checked || 0) + (shipmentReminderOrders?.length || 0)

        for (const order of shipmentReminderOrders || []) {
          if (order.estimated_shipment_date === sevenDaysLaterStr) {
            // Check if notification already exists
            const { data: existing } = await adminClient
              .from('notifications')
              .select('id')
              .eq('related_order_id', order.id)
              .eq('type', 'shipment_reminder')
              .eq('user_id', order.assigned_designer)
              .single()

            if (!existing) {
              await adminClient.from('notifications').insert({
                organization_id: orgId,
                user_id: order.assigned_designer,
                type: 'shipment_reminder',
                priority: 'normal',
                title: '出货提醒',
                summary: `订单 ${order.order_no} (客户: ${order.customer_name}) 预计7天后出货，请做好准备`,
                related_order_id: order.id
              })
              results.shipment_reminder.created++
            }
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      executed_at: now.toISOString(),
      ...results
    })
  } catch (error) {
    results.errors.push(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`)
    return NextResponse.json(results, { status: 500 })
  }
}
