import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

async function createAdmin() {
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  // Admin client with service role key
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  const phone = process.env.ADMIN_PHONE || '18815292408'
  const password = process.env.ADMIN_PASSWORD || 'change-me-in-production'
  const userName = process.env.ADMIN_NAME || '管理员'

  // 1. Create auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    phone,
    password,
    phone_confirm: true,
    user_metadata: { name: userName }
  })

  if (authError) {
    console.error('Error creating auth user:', authError.message)
    process.exit(1)
  }

  const userId = authData.user.id
  console.log('Created auth user:', userId)

  // 2. Create profile
  const { error: profileError } = await supabase
    .from('profiles')
    .insert({
      id: userId,
      phone,
      name: userName,
      role: 'owner',
      avatar_url: null
    })

  if (profileError) {
    console.error('Error creating profile:', profileError.message)
    process.exit(1)
  }

  console.log('Created admin profile for', phone)
  console.log('Password:', password)
}

createAdmin()
