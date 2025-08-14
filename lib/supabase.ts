import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types
export interface Performance {
  id: string
  title: string
  date: string
  time: string
  venue: string
  description: string
  city: string
  ticket_price: number
  image_url?: string
  created_at: string
}

export interface Member {
  id: string
  name: string
  instrument: string
  email: string
  phone?: string
  city: string
  join_date: string
  status: 'active' | 'inactive'
}

export interface Rehearsal {
  id: string
  date: string
  time: string
  duration: number
  location: string
  city: string
  description: string
  max_participants: number
  current_participants: number
}

export interface Donation {
  id: string
  donor_name: string
  amount: number
  message?: string
  city: string
  created_at: string
  anonymous: boolean
}

export interface ScholarshipFund {
  id: string
  city: string
  current_amount: number
  goal_amount: number
  description: string
  last_updated: string
}
