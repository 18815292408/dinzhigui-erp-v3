// Shared types for API routes (replaces auth-cloudflare.ts types)

export interface SessionUser {
  id: string
  email: string
  phone: string | null
  name: string
  role: 'owner' | 'manager' | 'designer' | 'sales' | 'installer'
  organization_id: string
}

export function parseSessionUser(cookieValue: string): SessionUser | null {
  try {
    return JSON.parse(Buffer.from(cookieValue, 'base64').toString()) as SessionUser
  } catch {
    return null
  }
}

export interface Customer {
  id: string
  organization_id: string
  created_by: string | null
  name: string
  phone: string | null
  email: string | null
  address: string | null
  house_type: string | null
  requirements: string | null
  intention_level: 'high' | 'medium' | 'low' | null
  intention_reason: string | null
  estimated_price: number | null
  ai_analyzed_at: string | null
  follow_ups: string
  created_at: string
  updated_at: string
}

export interface Design {
  id: string
  organization_id: string
  customer_id: string | null
  created_by: string | null
  status: 'draft' | 'submitted' | 'confirmed'
  title: string | null
  room_count: number | null
  total_area: number | null
  description: string | null
  final_price: number | null
  attachments: string
  created_at: string
  updated_at: string
}

export interface Installation {
  id: string
  organization_id: string
  customer_id: string | null
  design_id: string | null
  assigned_to: string | null
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  scheduled_date: string | null
  completed_at: string | null
  feedback: string | null
  issues: string
  created_at: string
  updated_at: string
}
