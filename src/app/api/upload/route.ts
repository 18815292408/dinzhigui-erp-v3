// Upload API - CAD files to Supabase Storage
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const sessionCookie = request.cookies.get('session')

  if (!sessionCookie) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 })
  }

  const { data: userData } = await import('@/lib/types').then(m =>
    Promise.resolve({ data: m.parseSessionUser(sessionCookie.value) })
  )

  if (!userData) {
    return NextResponse.json({ error: '登录已过期，请重新登录' }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: '请选择要上传的文件' }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = ['.dwg', '.dxf', '.pdf', '.jpg', '.jpeg', '.png']
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase()
    if (!allowedTypes.includes(ext)) {
      return NextResponse.json({ error: '不支持的文件类型，仅支持：dwg、dxf、pdf、jpg、jpeg、png' }, { status: 400 })
    }

    // Max 50MB
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: '文件过大，最大支持 50MB' }, { status: 400 })
    }

    const supabase = await createClient()

    // Generate unique filename
    const timestamp = Date.now()
    const filename = `${userData.organization_id}/${timestamp}-${file.name}`

    // Upload to Supabase Storage
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('cad-files')
      .upload(filename, buffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: true,
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json({ error: '文件上传失败，请重试' }, { status: 500 })
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('cad-files')
      .getPublicUrl(filename)

    return NextResponse.json({
      url: urlData.publicUrl,
      filename: file.name,
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: '文件上传失败，请重试' }, { status: 500 })
  }
}
