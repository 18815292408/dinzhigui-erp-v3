// Shared types for API routes (replaces auth-cloudflare.ts types)

export const ADMIN_EMAIL = '446465159@qq.com'

export function isAdmin(user: { email: string } | null | undefined): boolean {
  return !!user && user.email === ADMIN_EMAIL
}

export interface SessionUser {
  id: string
  email: string
  phone: string | null
  name: string
  role: 'owner' | 'manager' | 'designer' | 'sales' | 'installer'
  organization_id: string
  can_manage_users?: boolean
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
  order_stage: string | null
  has_active_order: boolean
  created_at: string
  updated_at: string
}

export interface Design {
  id: string
  organization_id: string
  customer_id: string | null
  order_id: string | null
  created_by: string | null
  status: 'draft' | 'submitted'
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

export interface Order {
  id: string
  organization_id: string
  order_no: string
  customer_name: string
  customer_phone: string | null
  customer_address: string | null
  house_type: string | null
  house_area: number | null
  created_by: string | null
  assigned_designer: string | null
  assigned_installer: string | null
  status: 'pending_dispatch' | 'pending_design' | 'designing' | 'pending_order' | 'pending_payment' | 'pending_shipment' | 'in_install' | 'completed'
  design_due_days: number | null
  design_due_date: string | null
  signed_amount: number | null
  final_order_amount: number | null
  factory_records: any[]
  payment_status: 'unpaid' | 'paid'
  payment_confirmed_at: string | null
  estimated_shipment_date: string | null
  installation_status: 'pending_ship' | 'shipped' | 'arrived' | 'delivering' | 'installing' | 'supplement_pending' | 'installed'
  completed_at: string | null
  archived_at: string | null
  remarks: any[]
  designs: Design[]
  created_at: string
  updated_at: string
}
