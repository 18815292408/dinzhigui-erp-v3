import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth'
import { sendWechatNotification } from '@/lib/serverchan'

export async function POST(request: NextRequest) {
  const session = await requireSession()
  if (session instanceof NextResponse) return session

  const body = await request.json()
  const { sendkey } = body

  if (!sendkey) {
    return NextResponse.json({ error: 'SendKey 不能为空' }, { status: 400 })
  }

  try {
    const result = await sendWechatNotification(
      sendkey,
      '【测试】定制柜ERP 消息推送测试',
      '这是一条测试消息，如果你收到了，说明配置成功！\n\n> 来自 定制柜ERP 系统'
    )

    if (result.code !== 0) {
      return NextResponse.json(
        { error: result.message || result.data?.error || '推送失败' },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '推送失败' },
      { status: 500 }
    )
  }
}
