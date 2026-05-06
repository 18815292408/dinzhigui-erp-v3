// Generate signed upload URL for direct Supabase Storage upload
// Bypasses Vercel's 4.5MB serverless function body size limit
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { parseSessionUser } from '@/lib/types'

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

  const adminSupabase = await createAdminClient()
  const timestamp = Date.now()
  // 清理文件名：只保留 ASCII 安全字符，避免 URL 编码问题导致签名校验失败
  const ext = filename.includes('.') ? filename.substring(filename.lastIndexOf('.')) : ''
  const safeName = filename
    .substring(0, filename.lastIndexOf('.') > 0 ? filename.lastIndexOf('.') : filename.length)
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .substring(0, 64)
  const cleanFilename = safeName + ext
  const path = `${user.organization_id}/${timestamp}-${cleanFilename}`

  const { data, error } = await adminSupabase.storage
    .from('cad-files')
    .createSignedUploadUrl(path)

  if (error) {
    console.error('Create signed URL error:', error)
    return NextResponse.json({ error: '生成上传链接失败: ' + error.message }, { status: 500 })
  }

  // Get the public URL for after upload
  const { data: publicUrlData } = adminSupabase.storage
    .from('cad-files')
    .getPublicUrl(path)

  return NextResponse.json({
    signedUrl: data.signedUrl,
    token: data.token,
    path: data.path,
    publicUrl: publicUrlData.publicUrl,
    filename,                     // 原始文件名，用于界面展示
  })
}
