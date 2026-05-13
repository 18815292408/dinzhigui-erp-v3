export const COMPLETED_ORDER_STATUS = 'completed'
export const CANCELLED_ORDER_STATUS = 'cancelled'
export const ACTIVE_INSTALLATION_STATUSES = ['pending', 'in_progress'] as const
export const COMPLETED_INSTALLATION_STATUSES = ['completed', 'cancelled'] as const
export const ACTIVE_ORDER_STATUSES = [
  'pending_dispatch',
  'pending_design',
  'designing',
  'in_design',
  'pending_order',
  'pending_payment',
  'pending_shipment',
  'in_install',
  'in_after_sales',
] as const
export const TERMINAL_ORDER_STATUSES = ['completed', 'cancelled'] as const

type WorkflowOrder = {
  customer_id?: string | null
  customer_name?: string | null
  customer_phone?: string | null
  status?: string | null
}

type WorkflowDesign = {
  status?: string | null
  orderStatus?: string | null
}

export function isActiveOrderStatus(status?: string | null) {
  return Boolean(status && ACTIVE_ORDER_STATUSES.includes(status as any))
}

export function isTerminalOrderStatus(status?: string | null) {
  return Boolean(status && TERMINAL_ORDER_STATUSES.includes(status as any))
}

function normalizeText(value?: string | null) {
  return String(value || '').trim()
}

export function orderBelongsToCustomer(customer: {
  id?: string | null
  name?: string | null
  phone?: string | null
}, order: WorkflowOrder) {
  if (order.customer_id && customer.id && order.customer_id === customer.id) {
    return true
  }

  const customerName = normalizeText(customer.name)
  const orderCustomerName = normalizeText(order.customer_name)
  if (customerName && orderCustomerName && customerName === orderCustomerName) {
    return true
  }

  const customerPhone = normalizeText(customer.phone)
  const orderCustomerPhone = normalizeText(order.customer_phone)
  if (customerPhone && orderCustomerPhone && customerPhone === orderCustomerPhone) {
    return true
  }

  return false
}

export function shouldShowCustomerInCreateList({
  orders,
  designs,
}: {
  orders: any[]
  designs: any[]
}) {
  const activeOrders = orders.filter((o) => isActiveOrderStatus(o.status))
  const activeDesigns = designs.filter(
    (d) => d.status === 'draft' || (d.status === 'submitted' && d.orderStatus === 'pending_design')
  )

  return activeOrders.length === 0 && activeDesigns.length === 0
}

export function shouldShowCustomerInFollowup({
  orders,
  designs,
}: {
  orders: any[]
  designs: any[]
}) {
  const activeOrders = orders.filter((o) => isActiveOrderStatus(o.status))
  const activeDesigns = designs.filter(
    (d) => d.status === 'draft' || (d.status === 'submitted' && d.orderStatus === 'pending_design')
  )

  return activeOrders.length > 0 || activeDesigns.length > 0
}

export function shouldShowInstallationInActiveList({
  status,
  order,
  customerOrders,
}: {
  status?: string
  order?: any
  customerOrders?: any[]
}) {
  if (status === 'pending' || status === 'in_progress') {
    return true
  }

  if (status === 'completed' && order?.status === 'in_after_sales') {
    return true
  }

  return false
}

export function buildInstallationCardView(input: {
  customer?: any
  design?: any
  order?: any
}) {
  const customer = input.customer || {}
  const design = input.design || {}
  const order = input.order || {}

  return {
    customerName: customer.name || order.customer_name || null,
    customerPhone: customer.phone || order.customer_phone || null,
    customerAddress: customer.address || order.customer_address || null,
    houseType: customer.house_type || order.house_type || null,
    orderNo: order.order_no || null,
    designTitle: design.title || null,
    roomCount: design.room_count || null,
    finalPrice: design.final_price ?? design.price ?? null,
  }
}

export function buildCompletedOrderCardView(input: {
  order: any
  design?: any
  installation?: any
}) {
  const order = input.order || {}
  const design = input.design || {}
  const installation = input.installation || {}

  return {
    id: order.id,
    orderNo: order.order_no || null,
    customerName: order.customer_name || null,
    customerPhone: order.customer_phone || null,
    customerAddress: order.customer_address || null,
    houseType: order.house_type || null,
    designTitle: design.title || null,
    roomCount: design.room_count || null,
    amount: order.final_order_amount ?? order.signed_amount ?? design.final_price ?? design.price ?? null,
    completedAt: order.completed_at || installation.completed_at || null,
    cancelledAt: order.cancelled_at || null,
    cancelledBy: order.cancelled_by || null,
    status: order.status || null,
    installationFeedback: installation.feedback || null,
  }
}
