'use client'

import { useState, useEffect } from 'react'
import { Brain, AlertTriangle, TrendingUp, Users, Clock, Lightbulb, X, ChevronDown, ChevronUp, Sparkles, RefreshCw, History, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface CustomerInsight {
  id: string
  name: string
  phone: string | null
  intention_level: string | null
  last_followup?: string
  days_since_created?: number
  days_since_last_followup?: number | null
  design_status?: string
  issue?: string
}

interface Insight {
  category: string
  title: string
  customers?: CustomerInsight[]
  recommendations?: string[]
  summary: string
  priority: 'high' | 'medium' | 'low'
}

interface AnalysisResult {
  insights: Insight[]
  summary: string
  analyzed_at: string
  total_customers: number
}

interface HistoryItem {
  id: string
  summary: string
  total_customers: number
  created_at: string
  insights: Insight[]
}

const categoryConfig: Record<string, { icon: any; color: string; bgColor: string; label: string }> = {
  immediate_followup: {
    icon: AlertTriangle,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    label: '立即跟进',
  },
  risk_customers: {
    icon: AlertTriangle,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    label: '风险客户',
  },
  ready_to_close: {
    icon: TrendingUp,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    label: '即将成交',
  },
  silent_customers: {
    icon: Clock,
    color: 'text-gray-500',
    bgColor: 'bg-gray-100',
    label: '沉默客户',
  },
  new_customers: {
    icon: Users,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    label: '本周新客',
  },
  recommendations: {
    icon: Lightbulb,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    label: '运营建议',
  },
}

const priorityConfig: Record<string, { label: string; bg: string; text: string }> = {
  high: { label: '紧急', bg: 'bg-red-100', text: 'text-red-700' },
  medium: { label: '提醒', bg: 'bg-orange-100', text: 'text-orange-700' },
  low: { label: '参考', bg: 'bg-green-100', text: 'text-green-700' },
}

function InsightCard({ insight }: { insight: Insight }) {
  const [expanded, setExpanded] = useState(false)
  const config = categoryConfig[insight.category] || categoryConfig.recommendations
  const Icon = config.icon
  const priority = priorityConfig[insight.priority] || priorityConfig.low

  const hasCustomers = insight.customers && insight.customers.length > 0
  const hasRecommendations = insight.recommendations && insight.recommendations.length > 0

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-apple-gray-200/50">
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg ${config.bgColor} flex items-center justify-center`}>
            <Icon className={`w-4 h-4 ${config.color}`} />
          </div>
          <div>
            <h4 className="text-[14px] font-semibold text-apple-gray-900">{insight.title}</h4>
            <span className={`inline-block mt-0.5 text-[10px] font-medium px-2 py-0.5 rounded-full ${priority.bg} ${priority.text}`}>
              {priority.label}
            </span>
          </div>
        </div>
        <span className={`text-[10px] font-medium px-2 py-1 rounded-full ${config.bgColor} ${config.color}`}>
          {config.label}
        </span>
      </div>

      {/* Summary */}
      <p className="text-[12px] text-apple-gray-500 mb-3">{insight.summary}</p>

      {/* Content based on category */}
      {hasCustomers && (
        <div className="space-y-2">
          {insight.customers!.slice(0, expanded ? undefined : 3).map((customer) => (
            <div
              key={customer.id}
              className="flex items-center justify-between p-2 rounded-lg bg-apple-gray-50/50"
            >
              <div>
                <p className="text-[13px] font-medium text-apple-gray-900">{customer.name}</p>
                <p className="text-[11px] text-apple-gray-500">{customer.phone || '无电话'}</p>
              </div>
              <div className="text-right">
                {customer.days_since_last_followup !== undefined && customer.days_since_last_followup !== null && (
                  <p className="text-[11px] text-apple-gray-500">
                    {customer.days_since_last_followup === 0 ? '今天跟进' : `${customer.days_since_last_followup}天未跟进`}
                  </p>
                )}
                {customer.design_status && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">
                    {customer.design_status === 'confirmed' ? '设计已确认' : customer.design_status === 'draft' ? '草稿' : '已提交'}
                  </span>
                )}
              </div>
            </div>
          ))}
          {insight.customers!.length > 3 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-[12px] text-blue-600 hover:text-blue-700 transition-colors w-full justify-center"
            >
              {expanded ? (
                <>
                  <ChevronUp className="w-3 h-3" /> 收起
                </>
              ) : (
                <>
                  <ChevronDown className="w-3 h-3" /> 查看更多({insight.customers!.length - 3}位)
                </>
              )}
            </button>
          )}
        </div>
      )}

      {hasRecommendations && (
        <div className="space-y-2">
          {insight.recommendations!.map((rec, idx) => (
            <div key={idx} className="flex items-start gap-2 p-2 rounded-lg bg-yellow-50">
              <span className="w-4 h-4 rounded-full bg-yellow-200 text-yellow-800 text-[10px] font-medium flex items-center justify-center flex-shrink-0 mt-0.5">
                {idx + 1}
              </span>
              <p className="text-[12px] text-apple-gray-700">{rec}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

interface AIInsightsPanelProps {
  userRole: string
}

export function AIInsightsPanel({ userRole }: AIInsightsPanelProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [isManager, setIsManager] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [historyList, setHistoryList] = useState<HistoryItem[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [selectedHistory, setSelectedHistory] = useState<HistoryItem | null>(null)

  // Check if user can run analysis
  useEffect(() => {
    const canAnalyze = ['owner', 'manager'].includes(userRole)
    setIsManager(canAnalyze)
    setLoading(false)
  }, [userRole])

  // Load stored analysis on mount
  useEffect(() => {
    if (loading) return

    const fetchStoredAnalysis = async () => {
      try {
        const response = await fetch('/api/ai/dashboard-analysis', {
          method: 'GET',
        })
        if (response.ok) {
          const data = await response.json()
          if (data.data) {
            setAnalysisResult(data.data)
          }
        }
      } catch (err) {
        console.error('Failed to fetch stored analysis:', err)
      }
    }

    fetchStoredAnalysis()
  }, [loading])

  const runAnalysis = async () => {
    setIsAnalyzing(true)
    setError(null)

    try {
      const response = await fetch('/api/ai/dashboard-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '分析失败')
      }

      setAnalysisResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const closeAnalysis = () => {
    setAnalysisResult(null)
    setError(null)
  }

  const loadHistory = async () => {
    setLoadingHistory(true)
    try {
      const response = await fetch('/api/ai/dashboard-analysis?history=true', {
        method: 'GET',
      })
      if (response.ok) {
        const data = await response.json()
        setHistoryList(data.data || [])
      }
    } catch (err) {
      console.error('Failed to fetch history:', err)
    } finally {
      setLoadingHistory(false)
    }
  }

  const openHistory = async () => {
    setShowHistory(true)
    await loadHistory()
  }

  const viewHistoryItem = (item: HistoryItem) => {
    setSelectedHistory(item)
  }

  // Loading state
  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="w-8 h-8 rounded-full border-2 border-apple-purple/30 border-t-apple-purple animate-spin" />
          </div>
        </CardContent>
      </Card>
    )
  }

  // Initial state with analyze button (only for manager/owner)
  if (!analysisResult && !error && !isAnalyzing) {
    return (
      <>
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col items-center justify-center py-6">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-apple-purple to-apple-blue flex items-center justify-center mb-4 shadow-lg">
                <Sparkles className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-[16px] font-semibold text-apple-gray-900 mb-1">AI 运营分析</h3>
              <p className="text-[13px] text-apple-gray-500 mb-4 text-center">基于客户数据，AI 为你提供运营洞察</p>
              {isManager ? (
                <div className="flex gap-2">
                  <Button onClick={runAnalysis} size="lg" className="gap-2 bg-apple-purple hover:bg-apple-purple/90">
                    <Brain className="w-4 h-4" />
                    开始 AI 分析
                  </Button>
                  <Button variant="outline" size="lg" onClick={openHistory} className="gap-2">
                    <History className="w-4 h-4" />
                    历史记录
                  </Button>
                </div>
              ) : (
                <p className="text-[13px] text-apple-gray-400">仅店长和管理员可以使用此功能</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* History Modal */}
        {showHistory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="fixed inset-0 bg-black/30" onClick={() => setShowHistory(false)} />
            <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col z-10 mx-4">
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="text-[16px] font-semibold">AI 运营分析历史记录</h3>
                <Button variant="ghost" size="icon-sm" onClick={() => setShowHistory(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                {loadingHistory ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-8 h-8 rounded-full border-2 border-apple-purple/30 border-t-apple-purple animate-spin" />
                  </div>
                ) : historyList.length === 0 ? (
                  <div className="text-center py-8 text-[14px] text-apple-gray-500">
                    暂无历史记录
                  </div>
                ) : (
                  <div className="space-y-2">
                    {historyList.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-apple-gray-50 cursor-pointer transition-colors"
                        onClick={() => viewHistoryItem(item)}
                      >
                        <div>
                          <p className="text-[14px] font-medium text-apple-gray-900">
                            {new Date(item.created_at).toLocaleString('zh-CN')}
                          </p>
                          <p className="text-[12px] text-apple-gray-500">
                            分析 {item.total_customers} 位客户
                          </p>
                        </div>
                        <Button variant="ghost" size="sm" className="gap-1">
                          <Eye className="w-3 h-3" />
                          查看
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* History Detail Modal */}
        {selectedHistory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="fixed inset-0 bg-black/30" onClick={() => setSelectedHistory(null)} />
            <div className="relative bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col z-10 mx-4">
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="text-[16px] font-semibold">
                  {new Date(selectedHistory.created_at).toLocaleString('zh-CN')} 的分析结果
                </h3>
                <Button variant="ghost" size="icon-sm" onClick={() => setSelectedHistory(null)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {selectedHistory.insights.map((insight, index) => (
                    <InsightCard key={index} insight={insight} />
                  ))}
                </div>
                <div className="text-center text-[12px] text-apple-gray-500 py-2 border-t">
                  共分析 {selectedHistory.total_customers} 位客户
                </div>
              </div>
            </div>
          </div>
        )}
      </>
    )
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-apple-purple/10 flex items-center justify-center">
                <Brain className="w-5 h-5 text-apple-purple" />
              </div>
              <div>
                <CardTitle className="text-[16px] font-semibold">AI 运营分析</CardTitle>
                <p className="text-[12px] text-apple-gray-500 font-normal">
                  {analysisResult?.analyzed_at
                    ? `最近分析于 ${new Date(analysisResult.analyzed_at).toLocaleString('zh-CN')}`
                    : '点击分析获取洞察'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isManager && (
                <Button variant="outline" size="sm" onClick={openHistory} className="gap-1">
                  <History className="w-3 h-3" />
                  历史
                </Button>
              )}
              {isManager && analysisResult && (
                <Button variant="outline" size="sm" onClick={runAnalysis} disabled={isAnalyzing} className="gap-1">
                  {isAnalyzing ? (
                    <>
                      <div className="w-3 h-3 rounded-full border-2 border-apple-purple/30 border-t-apple-purple animate-spin" />
                      分析中...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-3 h-3" />
                      重新分析
                    </>
                  )}
                </Button>
              )}
              {analysisResult && (
                <Button variant="ghost" size="icon-sm" onClick={closeAnalysis}>
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Error state */}
          {error && (
            <div className="bg-red-50 rounded-xl p-4 text-red-600 text-[13px]">
              {error}
            </div>
          )}

          {/* Loading state */}
          {isAnalyzing && (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="w-10 h-10 rounded-full border-4 border-apple-purple/20 border-t-apple-purple animate-spin mb-4" />
              <p className="text-[14px] text-apple-gray-600">AI 正在分析客户数据...</p>
              <p className="text-[12px] text-apple-gray-400 mt-1">请稍候</p>
            </div>
          )}

          {/* Insights grid */}
          {analysisResult && !isAnalyzing && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {analysisResult.insights.map((insight, index) => (
                  <InsightCard key={index} insight={insight} />
                ))}
              </div>

              {/* Summary footer */}
              <div className="text-center text-[12px] text-apple-gray-500 py-2 border-t border-apple-gray-100 pt-3">
                共分析 {analysisResult.total_customers} 位客户
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* History Modal */}
      {showHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/30" onClick={() => setShowHistory(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col z-10 mx-4">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-[16px] font-semibold">AI 运营分析历史记录</h3>
              <Button variant="ghost" size="icon-sm" onClick={() => setShowHistory(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {loadingHistory ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-8 h-8 rounded-full border-2 border-apple-purple/30 border-t-apple-purple animate-spin" />
                </div>
              ) : historyList.length === 0 ? (
                <div className="text-center py-8 text-[14px] text-apple-gray-500">
                  暂无历史记录
                </div>
              ) : (
                <div className="space-y-2">
                  {historyList.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-apple-gray-50 cursor-pointer transition-colors"
                      onClick={() => viewHistoryItem(item)}
                    >
                      <div>
                        <p className="text-[14px] font-medium text-apple-gray-900">
                          {new Date(item.created_at).toLocaleString('zh-CN')}
                        </p>
                        <p className="text-[12px] text-apple-gray-500">
                          分析 {item.total_customers} 位客户
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" className="gap-1">
                        <Eye className="w-3 h-3" />
                        查看
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* History Detail Modal */}
      {selectedHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/30" onClick={() => setSelectedHistory(null)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col z-10 mx-4">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-[16px] font-semibold">
                {new Date(selectedHistory.created_at).toLocaleString('zh-CN')} 的分析结果
              </h3>
              <Button variant="ghost" size="icon-sm" onClick={() => setSelectedHistory(null)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {selectedHistory.insights.map((insight, index) => (
                  <InsightCard key={index} insight={insight} />
                ))}
              </div>
              <div className="text-center text-[12px] text-apple-gray-500 py-2 border-t">
                共分析 {selectedHistory.total_customers} 位客户
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
