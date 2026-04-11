// Auth - Login (Supports both Supabase and Demo mode)
import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import type { SessionUser } from '@/lib/types'

const DEMO_ORG_ID = '00000000-0000-0000-0000-000000000001'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, phone, password } = body

    // Check if Supabase is configured
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    const isSupabaseConfigured = supabaseUrl && supabaseUrl !== 'your-supabase-url' && supabaseUrl.startsWith('http')

    if (isSupabaseConfigured) {
      const supabase = await createClient()
      const adminSupabase = await createAdminClient()

      console.log('Login attempt:', { email, phone, passwordLength: password?.length })

      let authResult
      let userId

      if (email) {
        // Login with email
        console.log('Trying email login with:', email)
        authResult = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        console.log('Email login result:', authResult.error?.message || 'success', 'user:', authResult.data?.user?.id)
        userId = authResult.data?.user?.id
      } else if (phone) {
        // Custom phone login: normalize phone and find user by phone in users table
        const normalizedPhone = phone.replace(/^\+86/, '')
        const { data: userProfile } = await adminSupabase
          .from('users')
          .select('id, email')
          .eq('phone', normalizedPhone)
          .single()

        if (!userProfile || !userProfile.email) {
          return NextResponse.json({ error: '该手机号未注册' }, { status: 401 })
        }

        console.log('Phone login - found user email:', userProfile.email)
        authResult = await supabase.auth.signInWithPassword({
          email: userProfile.email,
          password,
        })
        console.log('Phone login result:', authResult.error?.message || 'success')
        userId = authResult.data?.user?.id
      } else {
        return NextResponse.json({ error: '请提供邮箱或手机号' }, { status: 401 })
      }

      const { data, error } = authResult

      console.log('Auth result:', error ? error.message : 'success')

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 401 })
      }

      // Get user profile with role
      const { data: profile } = await adminSupabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      // Check if account has expired
      if (profile?.expires_at) {
        const expiresAt = new Date(profile.expires_at)
        if (expiresAt < new Date()) {
          return NextResponse.json({ error: '账号已过期，请联系管理员续期' }, { status: 403 })
        }
      }

      const user: SessionUser = {
        id: data.user.id,
        email: data.user.email || email,
        phone: profile?.phone || null,
        name: profile?.display_name || profile?.name || data.user.email || '用户',
        role: profile?.role || 'owner',
        organization_id: profile?.organization_id || DEMO_ORG_ID,
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
    }

    // Demo mode fallback
    if (email === 'demo@phone.local' && password === 'demo123') {
      const user: SessionUser = {
        id: 'demo-user-id',
        email: 'demo@phone.local',
        phone: '18815292408',
        name: '演示管理员',
        role: 'owner',
        organization_id: DEMO_ORG_ID,
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
    }

    return NextResponse.json({ error: '无效的凭据' }, { status: 401 })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: '登录失败' }, { status: 500 })
  }
}
