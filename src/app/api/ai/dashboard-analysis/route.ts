// AI Dashboard Analysis - DeepSeek powered insights
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { parseSessionUser } from '@/lib/types'

interface CustomerData {
  id: string
  name: string
  phone: string | null
  house_type: string | null
  requirements: string | null
  estimated_price: number | null
  follow_ups: any
  created_at: string
}

interface DesignData {
  id: string
  customer_id: string | null
  status: string
  title: string | null
  description: string | null
  room_count: number | null
  total_area: number | null
  final_price: number | null
  price: number | null
  created_at: string
}

interface InstallationData {
  id: string
  customer_id: string | null
  design_id: string | null
  status: string
  scheduled_date: string | null
  feedback: string | null
  created_at: string
}

interface AnalysisCustomer {
  id: string
  name: string
  phone: string | null
  house_type: string | null
  requirements: string | null
  estimated_price: number | null
  created_at: string
  days_since_created: number
  last_followup_date: string | null
  last_followup_content: string | null
  days_since_last_followup: number | null
  follow_ups_count: number
  follow_ups_history: Array<{ content: string; date: string }>
  has_design: boolean
  design_status: string | null
  design_count: number
  design_details: Array<{
    title: string | null
    description: string | null
    room_count: number | null
    total_area: number | null
    price: number | null
    status: string
  }>
  has_installation: boolean
  installation_status: string | null
  installation_count: number
  installation_details: Array<{
    scheduled_date: string | null
    feedback: string | null
    status: string
  }>
}

// GET: Retrieve latest analysis or history
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
    // Get all history (last 90 days by default)
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

  // Get latest analysis from last 7 days
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
      total_customers: latest.total_customers,
      analyzed_at: latest.created_at,
    }
  })
}

// POST: Run new analysis
export async function POST(request: NextRequest) {
  // 1. Auth check
  const sessionCookie = request.cookies.get('session')
  if (!sessionCookie) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 })
  }

  const user = parseSessionUser(sessionCookie.value)
  if (!user) {
    return NextResponse.json({ error: '登录已过期，请重新登录' }, { status: 401 })
  }

  // 2. Only manager and owner can run analysis
  if (!['owner', 'manager'].includes(user.role)) {
    return NextResponse.json({ error: '只有店长或管理员可以运行AI分析' }, { status: 403 })
  }

  // 3. Fetch all organization data
  const adminSupabase = await createAdminClient()
  const orgId = user.organization_id

  const [customersResult, designsResult, installationsResult] = await Promise.all([
    adminSupabase
      .from('customers')
      .select('id, name, phone, house_type, requirements, estimated_price, follow_ups, created_at')
      .eq('organization_id', orgId),
    adminSupabase
      .from('designs')
      .select('id, customer_id, status, title, description, room_count, total_area, final_price, price, created_at')
      .eq('organization_id', orgId),
    adminSupabase
      .from('installations')
      .select('id, customer_id, design_id, status, scheduled_date, feedback, created_at')
      .eq('organization_id', orgId)
      .not('status', 'in', '(completed,cancelled)'),
  ])

  const customers: CustomerData[] = customersResult.data || []
  const designs: DesignData[] = designsResult.data || []
  const installations: InstallationData[] = installationsResult.data || []

  // 4. Process customer data for analysis
  const now = new Date()

  const customerAnalysisData: AnalysisCustomer[] = customers.map(c => {
    let followUps: Array<{ content: string; date: string }> = []
    try {
      followUps = typeof c.follow_ups === 'string' ? JSON.parse(c.follow_ups) : (c.follow_ups || [])
    } catch { }

    // Sort follow-ups by date descending (newest first)
    const sortedFollowUps = followUps.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    const lastFollowUp = sortedFollowUps[0] || null

    const daysSinceCreated = Math.floor((now.getTime() - new Date(c.created_at).getTime()) / (1000 * 60 * 60 * 24))
    const daysSinceLastFollowUp = lastFollowUp
      ? Math.floor((now.getTime() - new Date(lastFollowUp.date).getTime()) / (1000 * 60 * 60 * 24))
      : null

    const customerDesigns = designs.filter(d => d.customer_id === c.id)
    const customerInstallations = installations.filter(i => i.customer_id === c.id)

    // 收集方案的详细信息
    const designDetails = customerDesigns.map(d => ({
      title: d.title,
      description: d.description,
      room_count: d.room_count,
      total_area: d.total_area,
      price: d.final_price || d.price,
      status: d.status,
    }))

    // 收集安装的详细信息
    const installationDetails = customerInstallations.map(i => ({
      scheduled_date: i.scheduled_date,
      feedback: i.feedback,
      status: i.status,
    }))

    return {
      id: c.id,
      name: c.name,
      phone: c.phone,
      house_type: c.house_type,
      requirements: c.requirements,
      estimated_price: c.estimated_price,
      created_at: c.created_at,
      days_since_created: daysSinceCreated,
      last_followup_date: lastFollowUp?.date || null,
      last_followup_content: lastFollowUp?.content || null,
      days_since_last_followup: daysSinceLastFollowUp,
      follow_ups_count: sortedFollowUps.length,
      follow_ups_history: sortedFollowUps.slice(0, 5),
      has_design: customerDesigns.length > 0,
      design_status: customerDesigns[0]?.status || null,
      design_count: customerDesigns.length,
      design_details: designDetails,
      has_installation: customerInstallations.length > 0,
      installation_status: customerInstallations[0]?.status || null,
      installation_count: customerInstallations.length,
      installation_details: installationDetails,
    }
  })

  // 5. Call DeepSeek API
  const deepseekApiKey = process.env.DEEPSEEK_API_KEY
  if (!deepseekApiKey || deepseekApiKey === 'your-deepseek-api-key') {
    return NextResponse.json({ error: 'DeepSeek API 未配置，请在环境变量中设置 DEEPSEEK_API_KEY' }, { status: 500 })
  }

  const prompt = `你是一个全屋定制门店的AI运营助手。请分析以下客户数据，生成结构化的运营洞察。

客户数据：
${JSON.stringify(customerAnalysisData, null, 2)}

请仔细分析每个客户的完整数据，包括：
- follow_ups_history: 最近的跟进记录（包含内容和时间）
- follow_ups_count: 跟进总次数
- intention_reason: AI分析理由
- requirements: 客户需求描述
- 跟进记录中的内容能反映客户的真实意向和需求变化

请按以下6个类别生成洞察（必须返回严格JSON格式）：
1. **immediate_followup**: 需要立即跟进的客户（有重要跟进内容待处理，或超过7天未跟进）
2. **risk_customers**: 风险客户（超过14天未跟进，或跟进记录显示意向下降或冷淡）
3. **ready_to_close**: 可以成交的客户（有已确认的设计方案，或跟进记录显示客户已确定意向）
4. **silent_customers**: 沉默客户（有设计方案但超过30天无进展，或跟进记录显示长时间无互动）
5. **new_customers**: 本周新客户（7天内新增的客户）
6. **recommendations**: 门店运营建议（基于所有客户数据，给出2-4条具体可执行的建议，要结合跟进记录中的具体内容）

每个类别的结构：
- category: 类别标识
- title: 中文标题（15字以内）
- customers: 相关客户数组（recommendations类别除外）
- recommendations: 建议数组（仅recommendations类别）
- summary: 一句话总结（30字以内）
- priority: high（紧急）/ medium（提醒）/ low（参考）

返回格式（必须是可以直接JSON.parse的JSON字符串，不要有其他任何文字）：
{
  "insights": [
    {"category": "immediate_followup", "title": "立即跟进", "customers": [...], "summary": "...", "priority": "high"},
    {"category": "risk_customers", "title": "风险客户", "customers": [...], "summary": "...", "priority": "high"},
    {"category": "ready_to_close", "title": "即将成交", "customers": [...], "summary": "...", "priority": "medium"},
    {"category": "silent_customers", "title": "沉默客户", "customers": [...], "summary": "...", "priority": "medium"},
    {"category": "new_customers", "title": "本周新客", "customers": [...], "summary": "...", "priority": "low"},
    {"category": "recommendations", "title": "运营建议", "recommendations": [...], "summary": "...", "priority": "low"}
  ],
  "summary": "整体分析总结（50字以内）"
}

【重要】输出规范：
- 所有文字必须使用中文，禁止出现英文字段名或英文单词（除了客户姓名拼音）
- design_status字段值映射：draft=草稿，submitted=已提交，confirmed=已确认
- installation_status字段值映射：pending=待处理，in_progress=进行中，completed=已完成，cancelled=已取消
- recommendations中的客户名称必须使用真实姓名，不要用姓氏缩写
- 每个recommendations建议要具体，结合跟进记录中的具体内容和客户情况，不要说"某客户"或"某个"
- 必须返回严格JSON格式，不要有markdown代码块
- 每个customer对象只需包含id, name, phone, days_since_last_followup, days_since_created, design_status字段
- 如果某类别没有客户，返回空数组
- recommendations类别没有customers字段，只有recommendations数组`

  try {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${deepseekApiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: '你是一个专业的全屋定制门店运营顾问。请分析客户数据并给出可操作的建议。只返回JSON，不要有其他文字。所有输出必须使用中文，禁止出现英文字段名或英文单词（除了客户姓名拼音）。方案状态映射：draft=草稿，submitted=已提交，confirmed=已确认。安装状态映射：pending=待处理，in_progress=进行中，completed=已完成，cancelled=已取消。'
          },
          {
            role: 'user',
            content: prompt
          }
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

    // Parse and validate the response
    let parsedResult: any
    try {
      parsedResult = JSON.parse(analysisContent)
    } catch {
      console.error('Failed to parse AI response:', analysisContent)
      return NextResponse.json({ error: 'AI分析格式异常' }, { status: 500 })
    }

    const analyzedAt = new Date().toISOString()

    // 6. Save to database
    const { error: saveError } = await adminSupabase
      .from('dashboard_ai_analysis')
      .insert({
        organization_id: orgId,
        insights: parsedResult.insights,
        summary: parsedResult.summary,
        total_customers: customers.length,
        analyzed_by: user.id,
      })

    if (saveError) {
      console.error('Failed to save analysis:', saveError)
      // Don't fail the whole request if save fails
    }

    return NextResponse.json({
      ...parsedResult,
      analyzed_at: analyzedAt,
      total_customers: customers.length,
    })
  } catch (error) {
    console.error('Analysis error:', error)
    return NextResponse.json({ error: '分析过程异常' }, { status: 500 })
  }
}
