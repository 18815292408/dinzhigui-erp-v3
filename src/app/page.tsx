import { redirect } from 'next/navigation'

export default async function HomePage() {
  // Skip Supabase check if not configured
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  if (!supabaseUrl || supabaseUrl === 'your-supabase-url') {
    redirect('/login')
  }

  try {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      redirect('/dashboard')
    } else {
      redirect('/login')
    }
  } catch {
    redirect('/login')
  }
}
