// 删除 R2 存储桶中的文件
import { NextRequest, NextResponse } from 'next/server'
import { parseSessionUser } from '@/lib/types'
import { deleteFile } from '@/lib/r2/delete'

export async function POST(request: NextRequest) {
  const sessionCookie = request.cookies.get('session')

  if (!sessionCookie) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 })
  }

  const user = parseSessionUser(sessionCookie.value)
  if (!user) {
    return NextResponse.json({ error: '登录已过期，请重新登录' }, { status: 401 })
  }

  const { path } = await request.json()

  if (!path || typeof path !== 'string') {
    return NextResponse.json({ error: '缺少文件路径' }, { status: 400 })
  }

  // 校验文件属于当前组织
  const orgPrefix = `${user.organization_id}/`
  if (!path.startsWith(orgPrefix)) {
    return NextResponse.json({ error: '无权删除该文件' }, { status: 403 })
  }

  try {
    await deleteFile(path)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Delete error:', error)
    return NextResponse.json(
      { error: '文件删除失败: ' + (error.message || '未知错误') },
      { status: 500 }
    )
  }
}
