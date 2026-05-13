export interface ServerChanResponse {
  code: number
  message: string
  data?: {
    pushid: string
    readkey: string
    error: string
    errno: number
  }
}

function buildServerChanUrl(sendkey: string): string {
  if (sendkey.startsWith('sctp')) {
    const match = sendkey.match(/sctp(\d+)t/)
    if (match) {
      return `https://${match[1]}.push.ft07.com/send/${sendkey}.send`
    }
    throw new Error('Invalid sctp sendkey format')
  }
  return `https://sctapi.ftqq.com/${sendkey}.send`
}

export async function sendWechatNotification(
  sendkey: string,
  title: string,
  desp?: string
): Promise<ServerChanResponse> {
  const url = buildServerChanUrl(sendkey)

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json;charset=utf-8',
    },
    body: JSON.stringify({
      title,
      desp: desp || '',
    }),
  })

  const result = (await res.json()) as ServerChanResponse

  if (result.code !== 0) {
    console.error('[ServerChan] Push failed:', result.message, result.data?.error)
  } else {
    console.log('[ServerChan] Push success:', title)
  }

  return result
}

export function buildUrgentNotificationContent(params: {
  type: string
  title: string
  summary: string
  orderNo?: string
  customerName?: string
}): { title: string; desp: string } {
  const { type, title, summary, orderNo, customerName } = params

  const typeLabels: Record<string, string> = {
    new_order: '新订单',
    drawing_timeout: '出图超时',
    payment_overdue: '待打款超期',
    shipment_delay: '安装延误',
    order_completed: '订单完成',
    confirm_payment: '付款确认',
    set_shipment: '安排发货',
    assign_installer: '分配安装',
    update_install: '安装更新',
    place_order: '下单成功',
    supplements: '补料通知',
    order_reverted: '订单回退',
  }

  const typeLabel = typeLabels[type] || title

  const despLines = [
    `**${summary}**`,
    '',
    '---',
    orderNo ? `- 订单号：${orderNo}` : '',
    customerName ? `- 客户：${customerName}` : '',
    `- 时间：${new Date().toLocaleString('zh-CN')}`,
    '',
    '> 来自 定制柜ERP 系统',
  ]

  return {
    title: `【紧急】${typeLabel}`,
    desp: despLines.filter(Boolean).join('\n'),
  }
}

export type SupabaseClient = Awaited<ReturnType<typeof import('@/lib/supabase/server').createAdminClient>>

export async function pushUrgentToWechat(
  adminClient: SupabaseClient,
  userId: string,
  notification: {
    type: string
    title: string
    summary: string
    orderNo?: string
    customerName?: string
  }
) {
  try {
    const { data: user } = await adminClient
      .from('users')
      .select('serverchan_sendkey')
      .eq('id', userId)
      .single()

    if (user?.serverchan_sendkey) {
      const { title, desp } = buildUrgentNotificationContent(notification)
      await sendWechatNotification(user.serverchan_sendkey, title, desp)
    }
  } catch (err) {
    console.error(`[WechatPush] Failed for user ${userId}:`, err)
  }
}
