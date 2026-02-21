export type BookingRequestStatus = 'pending' | 'approved' | 'rejected'

export interface CreateBookingPayload {
  date: string
  location: string
  instrumentation: string
  notes?: string
  creditsToUse: number
}

export interface CreateBookingResponse {
  success: boolean
  bookingRequestId: string
  remainingCredits: number
  monthlyAllotment: number
}

export interface CreateCommunityBookingInterestPayload {
  orchestraId: string
  orchestraName: string
  instrument: string
}

export interface CreateCommunityBookingInterestResponse {
  success: boolean
  bookingRequestId: string
}
