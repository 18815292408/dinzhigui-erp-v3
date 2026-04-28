type DashboardOrder = {
  id: string
  order_no: string
  customer_name: string | null
  status: string | null
  created_at?: string | null
  updated_at?: string | null
  completed_at?: string | null
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
    key: 'pending_dispatch',
    label: '待派单',
    description: '签单后等待分配设计师',
    statuses: ['pending_dispatch'],
    href: '/customers',
  },
  {
    key: 'design',
    label: '设计中',
    description: '待接单与出方案阶段',
    statuses: ['pending_design', 'designing'],
    href: '/designs',
  },
  {
    key: 'pending_order',
    label: '待下单',
    description: '方案已提交，等待下单工厂',
    statuses: ['pending_order'],
    href: '/designs',
  },
  {
    key: 'pending_payment',
    label: '待打款',
    description: '工厂订单已确认，等待收款',
    statuses: ['pending_payment'],
    href: '/orders',
  },
  {
    key: 'install',
    label: '出货/安装中',
    description: '等待出货或安装跟进',
    statuses: ['pending_shipment', 'in_install'],
    href: '/installations',
  },
]

const STAGE_META: Record<string, { label: string; nextAction: string; href: string }> = {
  pending_dispatch: { label: '待派单', nextAction: '分配设计师', href: '/customers' },
  pending_design: { label: '待接单', nextAction: '设计师接单', href: '/designs' },
  designing: { label: '设计中', nextAction: '提交方案', href: '/designs' },
  pending_order: { label: '待下单', nextAction: '下单工厂', href: '/designs' },
  pending_payment: { label: '待打款', nextAction: '确认打款', href: '/orders' },
  pending_shipment: { label: '待出货', nextAction: '填写出货/指派安装', href: '/installations' },
  in_install: { label: '安装中', nextAction: '更新安装进度', href: '/installations' },
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

export function buildDashboardOverview({
  orders,
  users,
  now = new Date(),
}: {
  orders: DashboardOrder[]
  users: DashboardUser[]
  now?: Date
}) {
  const names = userNameMap(users)
  const cards = FLOW_CARDS.map((card) => ({
    key: card.key,
    label: card.label,
    description: card.description,
    href: card.href,
    count: orders.filter((order) => card.statuses.includes(order.status as any)).length,
  }))

  cards.push({
    key: 'completed_this_month',
    label: '本月完成',
    description: '本月已归档订单',
    href: '/completed-orders',
    count: orders.filter((order) => order.status === 'completed' && isSameMonth(order.completed_at, now)).length,
  })

  const processOrders = orders
    .filter((order) => Boolean(order.status && STAGE_META[order.status]))
    .sort((a, b) => new Date(b.updated_at || b.created_at || 0).getTime() - new Date(a.updated_at || a.created_at || 0).getTime())
    .slice(0, 12)
    .map((order) => {
      const meta = STAGE_META[order.status || ''] || { label: order.status || '未知', nextAction: '查看订单', href: '/orders' }
      return {
        id: order.id,
        orderNo: order.order_no,
        customerName: order.customer_name || '未知客户',
        stage: order.status || 'unknown',
        stageLabel: meta.label,
        nextAction: meta.nextAction,
        href: meta.href,
        salesName: order.created_by ? names.get(order.created_by) || '未知' : '未指派',
        designerName: order.assigned_designer ? names.get(order.assigned_designer) || '未指派' : '未指派',
        installerName: order.assigned_installer ? names.get(order.assigned_installer) || '未指派' : '未指派',
        amount: orderAmount(order),
        updatedAt: order.updated_at || order.created_at || null,
      }
    })

  return {
    cards,
    processOrders,
  }
}
