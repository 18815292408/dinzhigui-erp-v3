// AI Dashboard Analysis - 基于订单流程的运营分析
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { parseSessionUser } from '@/lib/types'

const STAGE_LABEL: Record<string, string> = {
  pending_dispatch: '待派单',
  pending_design: '待接单',
  designing: '设计中',
  pending_order: '待下单',
  pending_payment: '待打款',
  pending_shipment: '待出货',
  in_install: '安装中',
  completed: '已完成',
}

const STAGE_BOTTLENECK_DAYS: Record<string, number> = {
  pending_dispatch: 1,
  pending_design: 1,
  designing: 7,
  pending_order: 3,
  pending_payment: 2,
  pending_shipment: 1,
  in_install: 7,
}

const STAGE_RESPONSIBLE: Record<string, string> = {
  pending_dispatch: '销售/店长',
  pending_design: '设计师',
  designing: '设计师',
  pending_order: '设计师',
  pending_payment: '店长/老板',
  pending_shipment: '店长/安装师傅',
  in_install: '安装师傅',
}

interface OrderForAnalysis {
  id: string
  order_no: string
  customer_name: string
  status: string
  stage_label: string
  signed_amount: number
  final_order_amount: number
  amount: number
  sales_name: string
  designer_name: string
  installer_name: string
  created_at: string
  updated_at: string
  completed_at: string | null
  days_in_stage: number
  days_since_created: number
  bottleneck_days: number
  is_bottleneck: boolean
}

// GET: 获取最近一次分析结果或历史记录
export async function GET(request: NextRequest) {
  const sessionCookie = request.cookies.get('session')
  if (!sessionCookie) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 })
  }

  const user = parseSessionUser(sessionCookie.value)
  if (!user) {
    return NextResponse.json({ error: '登录已过期，请重新登录' }, { status: 401 })
  }

  const adminSupabase = await createAdminClient()
  const orgId = user.organization_id
  const { searchParams } = new URL(request.url)
  const history = searchParams.get('history') === 'true'

  if (history) {
    const days = parseInt(searchParams.get('days') || '90')
    const dateLimit = new Date()
    dateLimit.setDate(dateLimit.getDate() - days)

    const { data, error } = await adminSupabase
      .from('dashboard_ai_analysis')
      .select('id, insights, summary, total_customers, created_at')
      .eq('organization_id', orgId)
      .gte('created_at', dateLimit.toISOString())
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('Failed to fetch analysis history:', error)
      return NextResponse.json({ error: '获取历史记录失败' }, { status: 500 })
    }

    return NextResponse.json({ data: data || [] })
  }

  // 获取最近 7 天的分析
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)

  const { data, error } = await adminSupabase
    .from('dashboard_ai_analysis')
    .select('*')
    .eq('organization_id', orgId)
    .gte('created_at', weekAgo.toISOString())
    .order('created_at', { ascending: false })
    .limit(1)

  if (error) {
    console.error('Failed to fetch analysis:', error)
    return NextResponse.json({ error: '获取历史分析失败' }, { status: 500 })
  }

  if (!data || data.length === 0) {
    return NextResponse.json({ data: null })
  }

  const latest = data[0]
  return NextResponse.json({
    data: {
      insights: latest.insights,
      summary: latest.summary,
      total_orders: latest.total_customers, // 兼容旧字段名
      analyzed_at: latest.created_at,
    }
  })
}

// POST: 运行新的 AI 分析
export async function POST(request: NextRequest) {
  const sessionCookie = request.cookies.get('session')
  if (!sessionCookie) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 })
  }

  const user = parseSessionUser(sessionCookie.value)
  if (!user) {
    return NextResponse.json({ error: '登录已过期，请重新登录' }, { status: 401 })
  }

  if (!['owner', 'manager'].includes(user.role)) {
    return NextResponse.json({ error: '只有店长或管理员可以运行AI分析' }, { status: 403 })
  }

  const adminSupabase = await createAdminClient()
  const orgId = user.organization_id

  // 1. 查询所有订单
  const { data: orders } = await adminSupabase
    .from('orders')
    .select(`
      id, order_no, customer_name, status,
      signed_amount, final_order_amount,
      created_by, assigned_designer, assigned_installer,
      created_at, updated_at, completed_at
    `)
    .eq('organization_id', orgId)

  if (!orders || orders.length === 0) {
    return NextResponse.json({ error: '暂无订单数据，无法分析' }, { status: 400 })
  }

  // 2. 收集用户 ID 并查询
  const userIds = new Set<string>()
  for (const o of orders) {
    if (o.created_by) userIds.add(o.created_by)
    if (o.assigned_designer) userIds.add(o.assigned_designer)
    if (o.assigned_installer) userIds.add(o.assigned_installer)
  }

  const { data: users } = await adminSupabase
    .from('users')
    .select('id, display_name, email, phone')
    .in('id', Array.from(userIds))

  const userNameMap = new Map((users || []).map(u => [
    u.id,
    u.display_name || u.email || u.phone || '未知',
  ]))

  // 3. 构建分析数据
  const now = new Date()

  const orderAnalysisData: OrderForAnalysis[] = orders
    .map(o => {
      const status = o.status || 'unknown'
      const stageLabel = STAGE_LABEL[status] || status
      const amount = Number(o.final_order_amount || o.signed_amount || 0)
      const daysInStage = Math.floor(
        (now.getTime() - new Date(o.updated_at || o.created_at).getTime()) / (1000 * 60 * 60 * 24)
      )
      const daysSinceCreated = Math.floor(
        (now.getTime() - new Date(o.created_at).getTime()) / (1000 * 60 * 60 * 24)
      )
      const bottleneckDays = STAGE_BOTTLENECK_DAYS[status] || 999

      return {
        id: o.id,
        order_no: o.order_no,
        customer_name: o.customer_name || '未知',
        status,
        stage_label: stageLabel,
        signed_amount: Number(o.signed_amount || 0),
        final_order_amount: Number(o.final_order_amount || 0),
        amount,
        sales_name: o.created_by ? userNameMap.get(o.created_by) || '未指派' : '未指派',
        designer_name: o.assigned_designer ? userNameMap.get(o.assigned_designer) || '未指派' : '未指派',
        installer_name: o.assigned_installer ? userNameMap.get(o.assigned_installer) || '未指派' : '未指派',
        created_at: o.created_at,
        updated_at: o.updated_at || o.created_at,
        completed_at: o.completed_at,
        days_in_stage: daysInStage,
        days_since_created: daysSinceCreated,
        bottleneck_days: bottleneckDays,
        is_bottleneck: status !== 'completed' && daysInStage > bottleneckDays,
      }
    })

  // 4. 统计摘要（预计算，帮助 AI 更准确）
  const activeOrders = orderAnalysisData.filter(o => o.status !== 'completed')
  const completedThisWeek = orderAnalysisData.filter(o => {
    if (o.status !== 'completed' || !o.completed_at) return false
    const d = new Date(o.completed_at)
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    return d >= weekAgo
  })
  const createdThisWeek = orderAnalysisData.filter(o => o.days_since_created <= 7)
  const bottleneckOrders = orderAnalysisData.filter(o => o.is_bottleneck)
  const totalPendingAmount = activeOrders.reduce((sum, o) => sum + o.amount, 0)

  const summary = {
    total_orders: orders.length,
    active_orders: activeOrders.length,
    completed_orders: orders.length - activeOrders.length,
    completed_this_week: completedThisWeek.length,
    created_this_week: createdThisWeek.length,
    bottleneck_count: bottleneckOrders.length,
    total_pending_amount: totalPendingAmount,
    stage_distribution: {} as Record<string, number>,
  }

  for (const o of activeOrders) {
    summary.stage_distribution[o.stage_label] =
      (summary.stage_distribution[o.stage_label] || 0) + 1
  }

  // 5. 调用 DeepSeek API
  const deepseekApiKey = process.env.DEEPSEEK_API_KEY
  if (!deepseekApiKey || deepseekApiKey === 'your-deepseek-api-key') {
    return NextResponse.json({ error: 'DeepSeek API 未配置，请在环境变量中设置 DEEPSEEK_API_KEY' }, { status: 500 })
  }

  const prompt = `你是一个全屋定制门店的AI运营助手。请分析以下订单流程数据，帮老板发现紧急问题和运营洞察。

## 门店数据摘要
- 总订单数：${summary.total_orders}
- 进行中订单：${summary.active_orders}
- 已完成订单：${summary.completed_orders}
- 本周新增：${summary.created_this_week}
- 本周完成：${summary.completed_this_week}
- 卡点订单数：${summary.bottleneck_count}
- 各阶段待收款总额：${totalPendingAmount.toLocaleString('zh-CN')} 元
- 各阶段分布：${JSON.stringify(summary.stage_distribution)}

## 订单流程说明
全屋定制订单流程：待派单 → 待接单 → 设计中 → 待下单 → 待打款 → 待出货 → 安装中 → 已完成

各阶段含义和卡点阈值：
- 待派单(>1天为卡点)：销售签单后等待分配设计师
- 待接单(>1天为卡点)：设计师被分配后未接单
- 设计中(>7天为卡点)：设计师出方案中
- 待下单(>3天为卡点)：方案已确认，等待下单给工厂
- 待打款(>2天为卡点)：工厂单已下，等待客户打款 — 这是老板最关心的资金回流阶段
- 待出货(>1天为卡点)：款项已到，等待出货/指派安装
- 安装中(>7天为卡点)：安装师傅正在安装

## 全部订单明细
${JSON.stringify(orderAnalysisData, null, 2)}

## 分析要求

请按以下4个类别生成洞察，返回严格JSON格式：

1. **bottleneck_orders**（流程卡点）- priority: high
   找出所有 is_bottleneck=true 的订单，按阶段分组说明。每阶段列出卡住的订单号和客户名，说明卡了几天、谁负责。
   title 示例：「待打款卡点 - X笔订单等待收款」

2. **revenue_attention**（金额关注）- priority: high
   - 各阶段卡了多少金额（特别是待打款阶段）
   - 高金额订单（金额>=10000元）当前进度
   - 本周预计可完成的订单金额
   title 示例：「待打款阶段卡了 ¥XX - 需立即跟进」

3. **weekly_pulse**（本周动态）- priority: medium
   - 本周新增了哪些订单
   - 本周完成了哪些订单
   - 有没有阶段推进的好消息
   title 示例：「本周新增X单，完成X单」

4. **recommendations**（运营建议）- priority: high（这是最重要的输出）
   基于以上全部数据，给出老板可立即执行的建议，不限制数量但每条都要有价值。每条建议要：
   - 具体到订单号或人员
   - 说明为什么紧急/重要
   - 给出明确的行动方向
   重点关注：催打款、清卡点、调配人力

## 输出规范
- 每个 insight 对象包含：category, title, summary（一句话，25字以内）, priority（high/medium/low）
- bottleneck_orders 包含 orders 数组，每项：order_no, customer_name, stage_label, days_in_stage, amount, responsible
- revenue_attention 包含 items 数组，每项：label（如"待打款阶段"）, amount, order_count, detail（如"共3笔，最大单笔¥8000"）
- weekly_pulse 包含 items 数组，每项：label, detail
- recommendations 包含 recommendations 字符串数组
- 所有文字必须使用中文
- 如果某类别没有数据，也要返回该类别，但内容说明"暂无"
- 必须返回可直接 JSON.parse 的 JSON，不要 markdown 代码块

返回格式：
{
  "insights": [
    {"category": "bottleneck_orders", "title": "...", "summary": "...", "priority": "high", "orders": [...]},
    {"category": "revenue_attention", "title": "...", "summary": "...", "priority": "high", "items": [...]},
    {"category": "weekly_pulse", "title": "...", "summary": "...", "priority": "medium", "items": [...]},
    {"category": "recommendations", "title": "运营建议", "summary": "...", "priority": "low", "recommendations": [...]}
  ],
  "summary": "整体分析总结（50字以内）"
}`

  try {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${deepseekApiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-v4-flash',
        messages: [
          {
            role: 'system',
            content: '你是一个专业的全屋定制门店运营顾问，擅长从订单流程数据中发现瓶颈和资金风险。你的分析直接给老板看，要抓重点、讲人话、给行动方案。只返回JSON，不要其他文字。所有输出必须使用中文。',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('DeepSeek API error:', errorText)
      return NextResponse.json({ error: 'AI分析服务异常，请检查API配置' }, { status: 500 })
    }

    const data = await response.json()
    const analysisContent = data.choices?.[0]?.message?.content

    if (!analysisContent) {
      return NextResponse.json({ error: 'AI分析返回为空' }, { status: 500 })
    }

    let parsedResult: any
    try {
      parsedResult = JSON.parse(analysisContent)
    } catch {
      console.error('Failed to parse AI response:', analysisContent)
      return NextResponse.json({ error: 'AI分析格式异常' }, { status: 500 })
    }

    const analyzedAt = new Date().toISOString()

    // 6. 保存到数据库
    const { error: saveError } = await adminSupabase
      .from('dashboard_ai_analysis')
      .insert({
        organization_id: orgId,
        insights: parsedResult.insights,
        summary: parsedResult.summary,
        total_customers: orders.length,
        analyzed_by: user.id,
      })

    if (saveError) {
      console.error('Failed to save analysis:', saveError)
    }

    return NextResponse.json({
      insights: parsedResult.insights,
      summary: parsedResult.summary,
      analyzed_at: analyzedAt,
      total_orders: orders.length,
    })
  } catch (error) {
    console.error('Analysis error:', error)
    return NextResponse.json({ error: '分析过程异常' }, { status: 500 })
  }
}
