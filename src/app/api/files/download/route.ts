// 生成 R2 预签名下载链接（支持私有桶）
import { NextRequest, NextResponse } from 'next/server'
import { parseSessionUser } from '@/lib/types'
import { generateDownloadUrl } from '@/lib/r2/download'

export async function GET(request: NextRequest) {
  const sessionCookie = request.cookies.get('session')

  if (!sessionCookie) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 })
  }

  const user = parseSessionUser(sessionCookie.value)
  if (!user) {
    return NextResponse.json({ error: '登录已过期，请重新登录' }, { status: 401 })
  }

  const path = request.nextUrl.searchParams.get('path')
  if (!path) {
    return NextResponse.json({ error: '缺少文件路径' }, { status: 400 })
  }

  // 校验文件属于当前组织
  const orgPrefix = `${user.organization_id}/`
  if (!path.startsWith(orgPrefix)) {
    return NextResponse.json({ error: '无权访问该文件' }, { status: 403 })
  }

  try {
    const signedUrl = await generateDownloadUrl(path)
    return NextResponse.redirect(signedUrl)
  } catch (error: any) {
    console.error('Download error:', error)
    return NextResponse.json(
      { error: '生成下载链接失败: ' + (error.message || '未知错误') },
      { status: 500 }
    )
  }
}
