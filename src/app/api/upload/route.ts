// Upload API - Any files to R2 Storage
import { NextRequest, NextResponse } from 'next/server'
import { parseSessionUser } from '@/lib/types'
import { uploadFile } from '@/lib/r2/upload'

export async function POST(request: NextRequest) {
  const sessionCookie = request.cookies.get('session')

  if (!sessionCookie) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 })
  }

  const user = parseSessionUser(sessionCookie.value)
  if (!user) {
    return NextResponse.json({ error: '登录已过期，请重新登录' }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: '请选择要上传的文件' }, { status: 400 })
    }

    const allowedTypes = [
      '.dwg', '.dxf', '.pdf', '.jpg', '.jpeg', '.png', '.gif', '.bmp',
      '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.rtf',
      '.zip', '.rar', '.7z', '.tar', '.gz',
      '.mp3', '.mp4', '.avi', '.mov', '.wmv',
      '.svg', '.eps', '.ai', '.psd', '.tiff',
    ]
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase()
    if (ext && !allowedTypes.includes(ext)) {
      return NextResponse.json({ error: '不支持的文件类型' }, { status: 400 })
    }

    // Max 500MB
    if (file.size > 500 * 1024 * 1024) {
      return NextResponse.json({ error: '文件过大，最大支持 500MB' }, { status: 400 })
    }

    const timestamp = Date.now()
    const filename = `${user.organization_id}/${timestamp}-${file.name}`

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const result = await uploadFile(buffer, filename, file.type || 'application/octet-stream')

    return NextResponse.json({
      url: result.publicUrl,
      filename: file.name,
      path: result.path,
    })
  } catch (error: any) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: '文件上传失败: ' + (error.message || '请重试') },
      { status: 500 }
    )
  }
}
