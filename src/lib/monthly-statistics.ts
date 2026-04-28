type UserLike = {
  id: string
  display_name?: string | null
  name?: string | null
  email?: string | null
  phone?: string | null
}

type FactoryRecord = {
  factory_name?: string | null
  amount?: number | string | null
}

type OrderLike = {
  id: string
  order_no: string
  customer_name: string | null
  created_by: string | null
  assigned_designer: string | null
  design_created_by?: string | null
  created_at: string | null
  updated_at: string | null
  signed_amount: number | string | null
  final_order_amount: number | string | null
  payment_status: string | null
  payment_confirmed_at: string | null
  factory_records: FactoryRecord[] | string | null
  status: string | null
}

type MonthlyStatisticsInput = {
  year: number
  month: number
  orders: OrderLike[]
  users: UserLike[]
}

function toAmount(value: number | string | null | undefined) {
  const numeric = Number(value || 0)
  return Number.isFinite(numeric) ? numeric : 0
}

function parseFactoryRecords(value: OrderLike['factory_records']): FactoryRecord[] {
  if (Array.isArray(value)) return value
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function isInMonth(value: string | null | undefined, year: number, month: number) {
  if (!value) return false
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return false
  return date.getFullYear() === year && date.getMonth() + 1 === month
}

function userNameById(users: UserLike[]) {
  return new Map(users.map((user) => [
    user.id,
    user.display_name || user.name || user.email || user.phone || '未知',
  ]))
}

function orderAmount(order: OrderLike) {
  const finalAmount = toAmount(order.final_order_amount)
  if (finalAmount > 0) return finalAmount

  const factoryTotal = parseFactoryRecords(order.factory_records)
    .reduce((sum, record) => sum + toAmount(record.amount), 0)
  if (factoryTotal > 0) return factoryTotal

  return toAmount(order.signed_amount)
}

export function buildMonthlyStatistics({ year, month, orders, users }: MonthlyStatisticsInput) {
  const names = userNameById(users)
  const salesById: Record<string, any> = {}
  const designerById: Record<string, any> = {}

  for (const order of orders) {
    if (isInMonth(order.created_at, year, month)) {
      const salesId = order.created_by || 'unknown-sales'
      salesById[salesId] ||= {
        id: salesId,
        name: names.get(salesId) || '未知',
        signed_count: 0,
        signed_amount: 0,
        paid_amount: 0,
        orders: [],
        payments: [],
      }

      const signedAmount = toAmount(order.signed_amount)
      salesById[salesId].signed_count += 1
      salesById[salesId].signed_amount += signedAmount
      salesById[salesId].orders.push({
        id: order.id,
        order_no: order.order_no,
        customer_name: order.customer_name || '未知',
        signed_at: order.created_at,
        signed_amount: signedAmount,
        payment_status: order.payment_status || 'unpaid',
        payment_confirmed_at: order.payment_confirmed_at,
        paid_amount: order.payment_status === 'paid' ? orderAmount(order) : 0,
      })
    }

    if (order.payment_status === 'paid' && isInMonth(order.payment_confirmed_at, year, month)) {
      const salesId = order.created_by || 'unknown-sales'
      salesById[salesId] ||= {
        id: salesId,
        name: names.get(salesId) || '未知',
        signed_count: 0,
        signed_amount: 0,
        paid_amount: 0,
        orders: [],
        payments: [],
      }

      const paidAmount = orderAmount(order)
      salesById[salesId].paid_amount += paidAmount
      salesById[salesId].payments.push({
        id: order.id,
        order_no: order.order_no,
        customer_name: order.customer_name || '未知',
        payment_confirmed_at: order.payment_confirmed_at,
        amount: paidAmount,
      })
    }

    const factoryRecords = parseFactoryRecords(order.factory_records)
    if (factoryRecords.length > 0 && isInMonth(order.updated_at, year, month)) {
      const designerId = order.assigned_designer || order.design_created_by || 'unknown-designer'
      designerById[designerId] ||= {
        id: designerId,
        name: names.get(designerId) || '未知',
        order_count: 0,
        total_amount: 0,
        orders: [],
      }

      const amount = orderAmount(order)
      designerById[designerId].order_count += 1
      designerById[designerId].total_amount += amount
      designerById[designerId].orders.push({
        id: order.id,
        order_no: order.order_no,
        customer_name: order.customer_name || '未知',
        placed_at: order.updated_at,
        amount,
        factory_records: factoryRecords.map((record) => ({
          factory_name: record.factory_name || '未填写',
          amount: toAmount(record.amount),
        })),
      })
    }
  }

  const sales = Object.values(salesById)
  const designers = Object.values(designerById)

  return {
    year,
    month,
    sales,
    designers,
    summary: {
      sales_order_count: sales.reduce((sum, item: any) => sum + item.signed_count, 0),
      sales_signed_amount: sales.reduce((sum, item: any) => sum + item.signed_amount, 0),
      sales_paid_amount: sales.reduce((sum, item: any) => sum + item.paid_amount, 0),
      designer_order_count: designers.reduce((sum, item: any) => sum + item.order_count, 0),
      designer_order_amount: designers.reduce((sum, item: any) => sum + item.total_amount, 0),
    },
  }
}
