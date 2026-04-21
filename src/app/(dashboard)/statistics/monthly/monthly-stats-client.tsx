'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'

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

export function MonthlyStatsClient() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [stats, setStats] = useState<MonthlyStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchStats() {
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
    fetchStats()
  }, [year, month])

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

    // Don't go beyond current month
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
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">月度统计</h1>
          <p className="text-muted-foreground">查看每月销售和设计师业绩</p>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handlePrevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-lg font-medium min-w-[100px] text-center">
            {formatMonth(year, month)}
          </span>
          <Button variant="outline" size="icon" onClick={handleNextMonth} disabled={!canGoNext()}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="flex items-center justify-center h-64 text-red-500">
          {error}
        </div>
      ) : stats ? (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">本月订单总数</p>
                <p className="text-3xl font-bold">{stats.summary.total_sales_orders}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">完成订单数</p>
                <p className="text-3xl font-bold text-green-600">{stats.summary.total_designer_orders}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">完成订单总金额</p>
                <p className="text-3xl font-bold text-orange-600">
                  {formatCurrency(stats.summary.total_designer_amount)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Sales Statistics */}
          <Card>
            <CardHeader>
              <CardTitle>销售统计</CardTitle>
            </CardHeader>
            <CardContent>
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
                <p className="text-sm text-muted-foreground py-4 text-center">暂无销售数据</p>
              )}
            </CardContent>
          </Card>

          {/* Designer Statistics */}
          <Card>
            <CardHeader>
              <CardTitle>设计师业绩</CardTitle>
            </CardHeader>
            <CardContent>
              {stats.designers && stats.designers.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>设计师</TableHead>
                      <TableHead className="text-right">完成订单数</TableHead>
                      <TableHead className="text-right">总金额</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.designers.map((designer, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{designer.name}</TableCell>
                        <TableCell className="text-right">{designer.count}</TableCell>
                        <TableCell className="text-right text-orange-600 font-medium">
                          {formatCurrency(designer.total_amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground py-4 text-center">暂无设计师数据</p>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  )
}
