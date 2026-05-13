// Generate signed upload URL for direct R2 Storage upload
// Bypasses Vercel's 4.5MB serverless function body size limit
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { parseSessionUser } from '@/lib/types'
import { generateUploadUrl } from '@/lib/r2/upload'

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')

  if (!sessionCookie) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 })
  }

  const user = parseSessionUser(sessionCookie.value)
  if (!user) {
    return NextResponse.json({ error: '登录已过期，请重新登录' }, { status: 401 })
  }

  const body = await request.json()
  const { filename } = body

  if (!filename) {
    return NextResponse.json({ error: '缺少文件名' }, { status: 400 })
  }

  try {
    const timestamp = Date.now()
    const ext = filename.includes('.') ? filename.substring(filename.lastIndexOf('.')) : ''
    const safeName = filename
      .substring(0, filename.lastIndexOf('.') > 0 ? filename.lastIndexOf('.') : filename.length)
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .substring(0, 64)
    const cleanFilename = safeName + ext
    const path = `${user.organization_id}/${timestamp}-${cleanFilename}`

    const { signedUrl, publicUrl } = await generateUploadUrl(path)

    return NextResponse.json({
      signedUrl,
      publicUrl,
      path,
      filename,
    })
  } catch (error: any) {
    console.error('R2 upload sign error:', error)
    return NextResponse.json(
      { error: '生成上传链接失败: ' + (error.message || '未知错误') },
      { status: 500 }
    )
  }
}
