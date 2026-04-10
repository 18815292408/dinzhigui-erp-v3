import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

  // Use placeholder if not configured
  const url = (supabaseUrl && supabaseUrl !== 'your-supabase-url') ? supabaseUrl : 'https://placeholder.supabase.co'
  const key = supabaseAnonKey || 'placeholder-key'

  return createBrowserClient(url, key)
}
