export const COMPLETED_ORDER_STATUS = 'completed'
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
] as const

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
  return Boolean(customerPhone && orderCustomerPhone && customerPhone === orderCustomerPhone)
}

export function shouldShowCustomerInFollowup(input: {
  orders?: WorkflowOrder[] | null
  designs?: WorkflowDesign[] | null
}) {
  const hasActiveOrder = (input.orders || []).some((order) =>
    isActiveOrderStatus(order.status)
  )
  const hasActiveDesign = (input.designs || []).some((design) =>
    ['draft', 'submitted'].includes(String(design.status || '')) &&
    isActiveOrderStatus(design.orderStatus)
  )

  return hasActiveOrder || hasActiveDesign
}

export function shouldShowCustomerInCreateList(input: {
  orders?: WorkflowOrder[] | null
  designs?: WorkflowDesign[] | null
}) {
  return (input.orders || []).length === 0 && (input.designs || []).length === 0
}

export function shouldShowInstallationInActiveList(input: {
  status?: string | null
  order?: WorkflowOrder | null
  customerOrders?: WorkflowOrder[] | null
}) {
  if (!ACTIVE_INSTALLATION_STATUSES.includes(input.status as any)) {
    return false
  }

  if (input.order) {
    return isActiveOrderStatus(input.order.status)
  }

  const customerOrders = input.customerOrders || []
  if (customerOrders.some((order) => order.status === COMPLETED_ORDER_STATUS)) {
    return false
  }

  return customerOrders.some((order) => isActiveOrderStatus(order.status))
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
    houseType: order.house_type || null,
    designTitle: design.title || null,
    roomCount: design.room_count || null,
    amount: order.final_order_amount ?? order.signed_amount ?? design.final_price ?? design.price ?? null,
    completedAt: order.completed_at || installation.completed_at || null,
    installationFeedback: installation.feedback || null,
  }
}
