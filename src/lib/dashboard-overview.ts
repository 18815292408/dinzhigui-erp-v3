type DashboardOrder = {
  id: string
  order_no: string
  customer_name: string | null
  status: string | null
  created_at?: string | null
  updated_at?: string | null
  completed_at?: string | null
  cancelled_at?: string | null
  signed_amount?: number | string | null
  final_order_amount?: number | string | null
  created_by?: string | null
  assigned_designer?: string | null
  assigned_installer?: string | null
}

type DashboardUser = {
  id: string
  display_name?: string | null
  name?: string | null
  email?: string | null
  phone?: string | null
}

interface FlowCard {
  key: string
  label: string
  description: string
  statuses: string[]
  href: string
}

const FLOW_CARDS: FlowCard[] = [
  {
    key: 'order_creation',
    label: '订单创建',
    description: '待创建订单的客户',
    statuses: [],
    href: '/customers?tab=create',
  },
  {
    key: 'pending_dispatch',
    label: '待派单',
    description: '签单后等待分配设计师',
    statuses: ['pending_dispatch'],
    href: '/customers?tab=followup&stage=pending_dispatch',
  },
  {
    key: 'design',
    label: '设计中',
    description: '待接单与出方案阶段',
    statuses: ['pending_design', 'designing'],
    href: '/customers?tab=followup&stage=design',
  },
  {
    key: 'pending_order',
    label: '待下单',
    description: '方案已提交，等待下单工厂',
    statuses: ['pending_order'],
    href: '/customers?tab=followup&stage=pending_order',
  },
  {
    key: 'pending_payment',
    label: '待打款',
    description: '工厂订单已确认，等待收款',
    statuses: ['pending_payment'],
    href: '/customers?tab=followup&stage=pending_payment',
  },
  {
    key: 'install',
    label: '出货/安装中',
    description: '等待出货或安装跟进',
    statuses: ['pending_shipment', 'in_install'],
    href: '/customers?tab=followup&stage=install',
  },
  {
    key: 'after_sales',
    label: '售后中',
    description: '安装完成，售后跟进中',
    statuses: ['in_after_sales'],
    href: '/customers?tab=followup&stage=after_sales',
  },
]

const STAGE_META: Record<string, { label: string; nextAction: string; href: string }> = {
  pending_dispatch: { label: '待派单', nextAction: '分配设计师', href: '/customers' },
  pending_design: { label: '待接单', nextAction: '设计师接单', href: '/customers' },
  designing: { label: '设计中', nextAction: '提交方案', href: '/customers' },
  pending_order: { label: '待下单', nextAction: '下单工厂', href: '/customers' },
  pending_payment: { label: '待打款', nextAction: '确认打款', href: '/customers' },
  pending_shipment: { label: '待出货', nextAction: '填写出货/指派安装', href: '/customers' },
  in_install: { label: '安装中', nextAction: '更新安装进度', href: '/customers' },
  in_after_sales: { label: '售后中', nextAction: '确认售后完成', href: '/customers' },
}

function getTimeRangeStart(range: string | undefined, now: Date): Date | null {
  switch (range) {
    case 'today': {
      const start = new Date(now)
      start.setHours(0, 0, 0, 0)
      return start
    }
    case 'week': {
      const start = new Date(now)
      start.setDate(start.getDate() - 7)
      start.setHours(0, 0, 0, 0)
      return start
    }
    case 'month': {
      return new Date(now.getFullYear(), now.getMonth(), 1)
    }
    default:
      return null
  }
}

function toAmount(value: number | string | null | undefined) {
  const numeric = Number(value || 0)
  return Number.isFinite(numeric) ? numeric : 0
}

function userNameMap(users: DashboardUser[]) {
  return new Map(users.map((user) => [
    user.id,
    user.display_name || user.name || user.email || user.phone || '未知',
  ]))
}

function isSameMonth(value: string | null | undefined, now: Date) {
  if (!value) return false
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return false
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()
}

function orderAmount(order: DashboardOrder) {
  return toAmount(order.final_order_amount) || toAmount(order.signed_amount)
}

function isTerminalOrderStatus(status: string | null | undefined) {
  return status === 'completed' || status === 'cancelled'
}



type CreationCustomer = { id: string; name: string; phone: string; created_at: string }

export function buildDashboardOverview({
  orders,
  users,
  customerMap = {},
  now = new Date(),
  timeRange,
  creationCustomerCount = 0,
  creationCustomers = [],
}: {
  orders: DashboardOrder[]
  users: DashboardUser[]
  customerMap?: Record<string, string>
  now?: Date
  timeRange?: string
  creationCustomerCount?: number
  creationCustomers?: CreationCustomer[]
}) {
  const names = userNameMap(users)

  const cards = FLOW_CARDS.map((card) => {
    if (card.key === 'order_creation') {
      // 统计待创建订单的客户数（没有订单也没有设计方案的客户）
      return { key: card.key, label: card.label, description: card.description, href: card.href, count: creationCustomerCount }
    }
    return {
      key: card.key,
      label: card.label,
      description: card.description,
      href: card.href,
      count: orders.filter((order) => card.statuses.includes(order.status as any) && !isTerminalOrderStatus(order.status)).length,
    }
  })

  cards.push({
    key: 'completed_this_month',
    label: '本月完成',
    description: '本月已归档订单',
    href: '/completed-orders',
    count: orders.filter((order) => order.status === 'completed' && isSameMonth(order.completed_at, now)).length,
  })

  cards.push({
    key: 'cancelled_this_month',
    label: '本月退订',
    description: '本月已退订订单',
    href: '/completed-orders?tab=cancelled',
    count: orders.filter((order) => order.status === 'cancelled' && isSameMonth(order.cancelled_at, now)).length,
  })

  // 待跟进客户条目（插入推进中表格最前面，最多 5 个）
  const followupEntries = creationCustomers
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5)
    .map((customer) => ({
      id: customer.id,
      orderNo: '-',
      customerName: customer.name || '未知',
      stage: 'need_followup',
      stageLabel: '待跟进',
      nextAction: '跟进客户',
      href: `/customers/${customer.id}`,
      customerId: customer.id,
      salesName: '-',
      designerName: '-',
      installerName: '-',
      amount: 0,
      updatedAt: customer.created_at,
    }))

  const orderEntries = orders
    .filter((order) => Boolean(order.status && STAGE_META[order.status] && !isTerminalOrderStatus(order.status)))
    .sort((a, b) => new Date(b.updated_at || b.created_at || 0).getTime() - new Date(a.updated_at || a.created_at || 0).getTime())
    .slice(0, 12)
    .map((order) => {
      const meta = STAGE_META[order.status || ''] || { label: order.status || '未知', nextAction: '查看订单', href: '/customers' }
      return {
        id: order.id,
        orderNo: order.order_no,
        customerName: order.customer_name || '未知客户',
        stage: order.status || 'unknown',
        stageLabel: meta.label,
        nextAction: meta.nextAction,
        href: meta.href,
        customerId: customerMap[order.id] || null,
        salesName: order.created_by ? names.get(order.created_by) || '未知' : '未指派',
        designerName: order.assigned_designer ? names.get(order.assigned_designer) || '未指派' : '未指派',
        installerName: order.assigned_installer ? names.get(order.assigned_installer) || '未指派' : '未指派',
        amount: orderAmount(order),
        updatedAt: order.updated_at || order.created_at || null,
      }
    })

  const processOrders = [...followupEntries, ...orderEntries]

  return {
    cards,
    processOrders,
  }
}
