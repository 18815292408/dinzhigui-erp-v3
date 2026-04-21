'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Loader2, TrendingUp } from 'lucide-react'

interface SalesPerson {
  name: string
  count: number
  orders: {
    order_no: string
    customer_name: string
    created_at: string
  }[]
}

interface DesignerStat {
  name: string
  count: number
  total_amount: number
  orders: {
    order_no: string
    customer_name: string
    amount: number
  }[]
}

interface MonthlyStats {
  year: number
  month: number
  sales: SalesPerson[]
  designers: DesignerStat[]
  summary: {
    total_sales_orders: number
    total_designer_orders: number
    total_designer_amount: number
  }
}

function formatCurrency(amount: number): string {
  return `¥${amount.toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function formatMonth(year: number, month: number): string {
  return `${year}年${month}月`
}

export function MonthlyStatsSection() {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [year, setYear] = useState(new Date().getFullYear())
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [stats, setStats] = useState<MonthlyStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isCollapsed) {
      fetchStats()
    }
  }, [year, month, isCollapsed])

  const fetchStats = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/statistics/monthly?year=${year}&month=${month}`)
      if (!res.ok) {
        throw new Error('获取统计数据失败')
      }
      const data = await res.json()
      setStats(data)
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
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1

    if (year > currentYear || (year === currentYear && month >= currentMonth)) {
      return
    }

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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-orange-500" />
            <CardTitle className="text-lg">月度业绩</CardTitle>
          </div>
          <div className="flex items-center gap-3">
            {/* Month Navigation */}
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
        <CardContent className="space-y-4">
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
              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">本月订单</p>
                  <p className="text-xl font-bold">{stats.summary.total_sales_orders}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">完成订单</p>
                  <p className="text-xl font-bold text-green-600">{stats.summary.total_designer_orders}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">订单总金额</p>
                  <p className="text-xl font-bold text-orange-600">
                    {formatCurrency(stats.summary.total_designer_amount)}
                  </p>
                </div>
              </div>

              {/* Tables */}
              <div className="grid grid-cols-2 gap-4">
                {/* Sales Statistics */}
                <div>
                  <h4 className="text-sm font-medium mb-2 text-muted-foreground">销售统计</h4>
                  {stats.sales && stats.sales.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>导购</TableHead>
                          <TableHead className="text-right">订单数</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {stats.sales.map((salesPerson, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">{salesPerson.name}</TableCell>
                            <TableCell className="text-right">{salesPerson.count}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-sm text-muted-foreground py-2 text-center">暂无数据</p>
                  )}
                </div>

                {/* Designer Statistics */}
                <div>
                  <h4 className="text-sm font-medium mb-2 text-muted-foreground">设计师业绩</h4>
                  {stats.designers && stats.designers.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>设计师</TableHead>
                          <TableHead className="text-right">完成数</TableHead>
                          <TableHead className="text-right">总金额</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {stats.designers.map((designer, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">{designer.name}</TableCell>
                            <TableCell className="text-right">{designer.count}</TableCell>
                            <TableCell className="text-right text-orange-600">
                              {formatCurrency(designer.total_amount)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-sm text-muted-foreground py-2 text-center">暂无数据</p>
                  )}
                </div>
              </div>
            </>
          ) : null}
        </CardContent>
      )}
    </Card>
  )
}
