import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { formatMoney } from '@/lib/format-amount'

type ProcessOrder = {
  id: string
  orderNo: string
  customerName: string
  stage: string
  stageLabel: string
  nextAction: string
  href: string
  salesName: string
  designerName: string
  installerName: string
  amount: number
  updatedAt: string | null
}

function formatTime(value: string | null) {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '-'
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const stageBadgeVariant: Record<string, string> = {
  pending_dispatch: 'secondary',
  pending_design: 'default',
  designing: 'default',
  pending_order: 'default',
  pending_payment: 'default',
  pending_shipment: 'default',
  in_install: 'default',
}

export function ProcessOrderTable({ orders }: { orders: ProcessOrder[] }) {
  if (orders.length === 0) {
    return (
      <div className="rounded-lg border bg-white p-12 text-center">
        <p className="text-sm text-muted-foreground">暂无推进中的订单</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-white">
      <div className="px-6 py-4 border-b">
        <h2 className="text-base font-semibold">推进中订单</h2>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>订单号</TableHead>
              <TableHead>客户</TableHead>
              <TableHead>当前阶段</TableHead>
              <TableHead>销售</TableHead>
              <TableHead>设计师</TableHead>
              <TableHead>安装</TableHead>
              <TableHead className="text-right">金额</TableHead>
              <TableHead>更新时间</TableHead>
              <TableHead>下一步</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="font-medium">{order.orderNo}</TableCell>
                <TableCell>{order.customerName}</TableCell>
                <TableCell>
                  <Badge variant={(stageBadgeVariant[order.stage] as any) || 'secondary'}>
                    {order.stageLabel}
                  </Badge>
                </TableCell>
                <TableCell>{order.salesName}</TableCell>
                <TableCell>{order.designerName}</TableCell>
                <TableCell>{order.installerName}</TableCell>
                <TableCell className="text-right">
                  {formatMoney(order.amount)}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatTime(order.updatedAt)}
                </TableCell>
                <TableCell>
                  <Link
                    href={`${order.href}/${order.id}`}
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    {order.nextAction}
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
