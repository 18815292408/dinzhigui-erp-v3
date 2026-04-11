// Auth - Login
import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import type { SessionUser } from '@/lib/types'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, phone, password } = body

    const supabase = await createClient()
    const adminSupabase = await createAdminClient()

    let authResult
    let userId

    if (email) {
      authResult = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      userId = authResult.data?.user?.id
    } else if (phone) {
      const normalizedPhone = phone.replace(/^\+86/, '')
      const { data: userProfile } = await adminSupabase
        .from('users')
        .select('id, email')
        .eq('phone', normalizedPhone)
        .single()

      if (!userProfile || !userProfile.email) {
        return NextResponse.json({ error: '该手机号未注册' }, { status: 401 })
      }

      authResult = await supabase.auth.signInWithPassword({
        email: userProfile.email,
        password,
      })
      userId = authResult.data?.user?.id
    } else {
      return NextResponse.json({ error: '请提供邮箱或手机号' }, { status: 401 })
    }

    const { data, error } = authResult

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }

    const { data: profile } = await adminSupabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (profile?.expires_at) {
      const expiresAt = new Date(profile.expires_at)
      if (expiresAt < new Date()) {
        return NextResponse.json({ error: '账号已过期，请联系管理员续期' }, { status: 403 })
      }
    }

    if (!profile?.organization_id) {
      return NextResponse.json({ error: '用户没有所属组织，请联系管理员' }, { status: 403 })
    }

    const user: SessionUser = {
      id: data.user.id,
      email: data.user.email || email,
      phone: profile?.phone || null,
      name: profile?.display_name || profile?.name || data.user.email || '用户',
      role: profile?.role || 'owner',
      organization_id: profile?.organization_id,
    }

    const sessionData = Buffer.from(JSON.stringify(user)).toString('base64')

    const response = NextResponse.json({ success: true, user })
    response.cookies.set('session', sessionData, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
    })

    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: '登录失败' }, { status: 500 })
  }
}
