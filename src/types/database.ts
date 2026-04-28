export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          name?: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_at?: string
        }
      }
      users: {
        Row: {
          id: string
          organization_id: string
          email: string | null
          phone: string | null
          display_name: string | null
          role: 'owner' | 'manager' | 'designer' | 'sales' | 'installer'
          expires_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          organization_id: string
          email?: string | null
          phone?: string | null
          display_name?: string | null
          role: 'owner' | 'manager' | 'designer' | 'sales' | 'installer'
          expires_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          organization_id?: string
          email?: string | null
          phone?: string | null
          display_name?: string | null
          role?: 'owner' | 'manager' | 'designer' | 'sales' | 'installer'
          expires_at?: string | null
          updated_at?: string
        }
      }
      customers: {
        Row: {
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
          ai_analyzed_at: string | null
          follow_ups: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          created_by?: string | null
          name: string
          phone?: string | null
          email?: string | null
          address?: string | null
          house_type?: string | null
          requirements?: string | null
          intention_level?: 'high' | 'medium' | 'low' | null
          intention_reason?: string | null
          ai_analyzed_at?: string | null
          follow_ups?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          phone?: string | null
          intention_level?: 'high' | 'medium' | 'low' | null
          intention_reason?: string | null
          ai_analyzed_at?: string | null
          follow_ups?: Json
          updated_at?: string
        }
      }
      designs: {
        Row: {
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
          price: number | null
          attachments: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          customer_id?: string | null
          order_id?: string | null
          created_by?: string | null
          status?: 'draft' | 'submitted'
          title?: string | null
          room_count?: number | null
          total_area?: number | null
          description?: string | null
          price?: number | null
          attachments?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          customer_id?: string | null
          order_id?: string | null
          status?: 'draft' | 'submitted'
          title?: string | null
          room_count?: number | null
          total_area?: number | null
          description?: string | null
          price?: number | null
          attachments?: Json
          updated_at?: string
        }
      }
      installations: {
        Row: {
          id: string
          organization_id: string
          customer_id: string | null
          design_id: string | null
          assigned_to: string | null
          created_by: string | null
          status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
          scheduled_date: string | null
          completed_at: string | null
          feedback: string | null
          issues: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          customer_id?: string | null
          design_id?: string | null
          assigned_to?: string | null
          created_by?: string | null
          status?: 'pending' | 'in_progress' | 'completed' | 'cancelled'
          scheduled_date?: string | null
          completed_at?: string | null
          feedback?: string | null
          issues?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          status?: 'pending' | 'in_progress' | 'completed' | 'cancelled'
          scheduled_date?: string | null
          completed_at?: string | null
          feedback?: string | null
          issues?: Json
          updated_at?: string
        }
      }
      intention_analysis_logs: {
        Row: {
          id: string
          customer_id: string | null
          input_data: Json
          output_level: string
          output_reason: string | null
          api_response: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          customer_id?: string | null
          input_data: Json
          output_level: string
          output_reason?: string | null
          api_response?: Json | null
          created_at?: string
        }
        Update: {
          output_level?: string
          output_reason?: string | null
          api_response?: Json | null
        }
      }
    }
  }
}
