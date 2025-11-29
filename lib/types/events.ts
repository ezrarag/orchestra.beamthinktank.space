import { Timestamp } from 'firebase/firestore'

export type TicketProvider = 'stripe' | 'external' | 'free'

export interface PriceTier {
  tierId: string
  label: string // "General Admission", "Student", "VIP"
  price: number // in USD cents
  quantity: number // total available
}

export interface Event {
  id: string
  title: string
  series: string // ex. "Black Diaspora Symphony Memorial Concert"
  projectId?: string // optional connection to a BEAM project
  city: string
  venueName: string
  venueAddress: string
  date: Timestamp | Date
  time: string // ex. "7:00 PM"
  description: string
  imageUrl?: string // event poster
  isFree: boolean
  ticketProvider: TicketProvider
  externalTicketUrl?: string
  onSale: boolean
  priceTiers: PriceTier[]
  createdBy: string // userUid
  createdAt: Timestamp | Date
  updatedAt: Timestamp | Date
}

export interface TicketPurchase {
  tierId: string
  quantity: number
  subtotal: number // in cents
}

export interface EventOrder {
  id?: string
  eventId: string
  userId: string
  userEmail?: string
  userName?: string
  tickets: TicketPurchase[]
  stripeSessionId?: string
  stripePaymentIntentId?: string
  status: 'pending' | 'paid' | 'cancelled'
  timestamp: Timestamp | Date
  totalAmount: number // in cents
}

export interface EventRSVP {
  id?: string
  eventId: string
  name: string
  email: string
  timestamp: Timestamp | Date
}

