'use client'

import { Fragment, useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Loader2, TrendingUp } from 'lucide-react'
import { formatMoney } from '@/lib/format-amount'

interface SalesOrderDetail {
  id: string
  order_no: string
  customer_name: string
  signed_at: string | null
  signed_amount: number
  payment_status: string
  payment_confirmed_at: string | null
  paid_amount: number
}

interface PaymentDetail {
  id: string
  order_no: string
  customer_name: string
  payment_confirmed_at: string | null
  amount: number
}

interface SalesPerson {
  id: string
  name: string
  signed_count: number
  signed_amount: number
  paid_amount: number
  orders: SalesOrderDetail[]
  payments: PaymentDetail[]
}

interface DesignerOrderDetail {
  id: string
  order_no: string
  customer_name: string
  placed_at: string | null
  amount: number
  factory_records: {
    factory_name: string
    amount: number
  }[]
}

interface DesignerReceivedDetail {
  id: string
  order_no: string
  customer_name: string
  signed_at: string | null
  signed_amount: number
}

interface DesignerReceivedStat {
  id: string
  name: string
  received_count: number
  received_amount: number
  orders: DesignerReceivedDetail[]
}

interface DesignerStat {
  id: string
  name: string
  order_count: number
  total_amount: number
  orders: DesignerOrderDetail[]
}

interface MonthlyStats {
  year: number
  month: number
  sales: SalesPerson[]
  designerReceived: DesignerReceivedStat[]
  designers: DesignerStat[]
  summary: {
    sales_order_count: number
    sales_signed_amount: number
    sales_paid_amount: number
    designer_received_count: number
    designer_received_amount: number
    designer_order_count: number
    designer_order_amount: number
  }
}

function formatCurrency(amount: number): string {
  return formatMoney(amount)
}

function formatMonth(year: number, month: number): string {
  return `${year}年${month}月`
}

function formatDate(value: string | null): string {
  return value ? new Date(value).toLocaleDateString('zh-CN') : '未记录'
}

function SummaryCard({ label, value, tone }: { label: string; value: string | number; tone?: string }) {
  return (
    <div className="rounded-lg border bg-white p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 text-xl font-semibold ${tone || ''}`}>{value}</p>
    </div>
  )
}

export function MonthlyStatsSection() {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [year, setYear] = useState(new Date().getFullYear())
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [stats, setStats] = useState<MonthlyStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedSales, setExpandedSales] = useState<string | null>(null)
  const [expandedDesignerReceived, setExpandedDesignerReceived] = useState<string | null>(null)
  const [expandedDesigner, setExpandedDesigner] = useState<string | null>(null)

  useEffect(() => {
    if (!isCollapsed) {
      fetchStats()
    }
  }, [year, month, isCollapsed])

  const fetchStats = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/statistics/monthly?year=${year}&month=${month}`, {
        credentials: 'include',
      })
      if (!res.ok) {
        throw new Error('获取统计数据失败')
      }
      const data = await res.json()
      setStats(data)
      setExpandedSales(null)
      setExpandedDesignerReceived(null)
      setExpandedDesigner(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取统计数据失败')
    } finally {
      setLoading(false)
    }
  }

  const handlePrevMonth = () => {
    if (month === 1) {
      setYear(year - 1)
      setMonth(12)
    } else {
      setMonth(month - 1)
    }
  }

  const handleNextMonth = () => {
    if (!canGoNext()) return
    if (month === 12) {
      setYear(year + 1)
      setMonth(1)
    } else {
      setMonth(month + 1)
    }
  }

  const canGoNext = () => {
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1
    return year < currentYear || (year === currentYear && month < currentMonth)
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-orange-500" />
            <CardTitle className="text-lg">月度业绩</CardTitle>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={handlePrevMonth} className="h-8 w-8">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium min-w-[80px] text-center">
                {formatMonth(year, month)}
              </span>
              <Button variant="ghost" size="icon" onClick={handleNextMonth} disabled={!canGoNext()} className="h-8 w-8">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="h-8 px-2"
            >
              {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      {!isCollapsed && (
        <CardContent className="space-y-5">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-32 text-red-500 text-sm">
              {error}
            </div>
          ) : stats ? (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                <SummaryCard label="签单数" value={stats.summary.sales_order_count} />
                <SummaryCard label="签单金额" value={formatCurrency(stats.summary.sales_signed_amount)} tone="text-blue-700" />
                <SummaryCard label="收款金额" value={formatCurrency(stats.summary.sales_paid_amount)} tone="text-green-700" />
                <SummaryCard label="设计师接单数" value={stats.summary.designer_received_count} />
                <SummaryCard label="设计师接单金额" value={formatCurrency(stats.summary.designer_received_amount)} tone="text-purple-700" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <SummaryCard label="设计师下单数" value={stats.summary.designer_order_count} />
                <SummaryCard label="设计师下单总金额" value={formatCurrency(stats.summary.designer_order_amount)} tone="text-orange-700" />
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground">销售签单与收款</h4>
                {stats.sales.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>销售</TableHead>
                        <TableHead className="text-right">签单数</TableHead>
                        <TableHead className="text-right">签单金额</TableHead>
                        <TableHead className="text-right">收款金额</TableHead>
                        <TableHead className="w-20 text-right">明细</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stats.sales.map((salesPerson) => (
                        <Fragment key={salesPerson.id}>
                          <TableRow>
                            <TableCell className="font-medium">{salesPerson.name}</TableCell>
                            <TableCell className="text-right">{salesPerson.signed_count}</TableCell>
                            <TableCell className="text-right">{formatCurrency(salesPerson.signed_amount)}</TableCell>
                            <TableCell className="text-right text-green-700">{formatCurrency(salesPerson.paid_amount)}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setExpandedSales(expandedSales === salesPerson.id ? null : salesPerson.id)}
                              >
                                {expandedSales === salesPerson.id ? '收起' : '展开'}
                              </Button>
                            </TableCell>
                          </TableRow>
                          {expandedSales === salesPerson.id && (
                            <TableRow>
                              <TableCell colSpan={5} className="bg-muted/30">
                                <div className="space-y-4 p-2">
                                  <div>
                                    <p className="mb-2 text-xs font-medium text-muted-foreground">签单明细</p>
                                    <div className="space-y-2">
                                      {salesPerson.orders.map((order) => (
                                        <div key={order.id} className="grid grid-cols-6 gap-2 text-sm">
                                          <span>{order.order_no}</span>
                                          <span>{order.customer_name}</span>
                                          <span>{formatDate(order.signed_at)}</span>
                                          <span className="text-right">{formatCurrency(order.signed_amount)}</span>
                                          <span className="text-right">
                                            <Badge className={order.payment_status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}>
                                              {order.payment_status === 'paid' ? '已收款' : '未收款'}
                                            </Badge>
                                          </span>
                                          <span className="text-right">{formatCurrency(order.paid_amount)}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                  <div>
                                    <p className="mb-2 text-xs font-medium text-muted-foreground">本月收款明细</p>
                                    {salesPerson.payments.length > 0 ? (
                                      <div className="space-y-2">
                                        {salesPerson.payments.map((payment) => (
                                          <div key={payment.id} className="grid grid-cols-4 gap-2 text-sm">
                                            <span>{payment.order_no}</span>
                                            <span>{payment.customer_name}</span>
                                            <span>{formatDate(payment.payment_confirmed_at)}</span>
                                            <span className="text-right text-green-700">{formatCurrency(payment.amount)}</span>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <p className="text-sm text-muted-foreground">本月暂无收款</p>
                                    )}
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </Fragment>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-sm text-muted-foreground py-2 text-center">暂无销售数据</p>
                )}
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground">设计师接单业绩</h4>
                {stats.designerReceived.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>设计师</TableHead>
                        <TableHead className="text-right">接单数</TableHead>
                        <TableHead className="text-right">接单金额</TableHead>
                        <TableHead className="w-20 text-right">明细</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stats.designerReceived.map((designer) => (
                        <Fragment key={designer.id}>
                          <TableRow>
                            <TableCell className="font-medium">{designer.name}</TableCell>
                            <TableCell className="text-right">{designer.received_count}</TableCell>
                            <TableCell className="text-right text-purple-700">{formatCurrency(designer.received_amount)}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setExpandedDesignerReceived(expandedDesignerReceived === designer.id ? null : designer.id)}
                              >
                                {expandedDesignerReceived === designer.id ? '收起' : '展开'}
                              </Button>
                            </TableCell>
                          </TableRow>
                          {expandedDesignerReceived === designer.id && (
                            <TableRow>
                              <TableCell colSpan={4} className="bg-muted/30">
                                <div className="space-y-2 p-2">
                                  {designer.orders.map((order) => (
                                    <div key={order.id} className="grid grid-cols-4 gap-2 text-sm">
                                      <span>{order.order_no}</span>
                                      <span>{order.customer_name}</span>
                                      <span>{formatDate(order.signed_at)}</span>
                                      <span className="text-right text-purple-700">{formatCurrency(order.signed_amount)}</span>
                                    </div>
                                  ))}
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </Fragment>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-sm text-muted-foreground py-2 text-center">暂无设计师接单数据</p>
                )}
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground">设计师下单到工厂业绩</h4>
                {stats.designers.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>设计师</TableHead>
                        <TableHead className="text-right">下单数</TableHead>
                        <TableHead className="text-right">下单总金额</TableHead>
                        <TableHead className="w-20 text-right">明细</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stats.designers.map((designer) => (
                        <Fragment key={designer.id}>
                          <TableRow>
                            <TableCell className="font-medium">{designer.name}</TableCell>
                            <TableCell className="text-right">{designer.order_count}</TableCell>
                            <TableCell className="text-right text-orange-700">{formatCurrency(designer.total_amount)}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setExpandedDesigner(expandedDesigner === designer.id ? null : designer.id)}
                              >
                                {expandedDesigner === designer.id ? '收起' : '展开'}
                              </Button>
                            </TableCell>
                          </TableRow>
                          {expandedDesigner === designer.id && (
                            <TableRow>
                              <TableCell colSpan={4} className="bg-muted/30">
                                <div className="space-y-3 p-2">
                                  {designer.orders.map((order) => (
                                    <div key={order.id} className="rounded border bg-white p-3">
                                      <div className="grid grid-cols-4 gap-2 text-sm">
                                        <span>{order.order_no}</span>
                                        <span>{order.customer_name}</span>
                                        <span>{formatDate(order.placed_at)}</span>
                                        <span className="text-right text-orange-700">{formatCurrency(order.amount)}</span>
                                      </div>
                                      {order.factory_records.length > 0 && (
                                        <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                                          {order.factory_records.map((record, idx) => (
                                            <span key={`${order.id}-${idx}`} className="rounded bg-muted px-2 py-1">
                                              {record.factory_name}: {formatCurrency(record.amount)}
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </Fragment>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-sm text-muted-foreground py-2 text-center">暂无设计师下单数据</p>
                )}
              </div>
            </>
          ) : null}
        </CardContent>
      )}
    </Card>
  )
}
