import { auth } from '@/lib/firebase'
import type {
  CreateBookingPayload,
  CreateBookingResponse,
  CreateCommunityBookingInterestPayload,
  CreateCommunityBookingInterestResponse,
} from '@/lib/types/booking'

export async function createBookingRequest(payload: CreateBookingPayload): Promise<CreateBookingResponse> {
  const currentUser = auth?.currentUser
  if (!currentUser) {
    throw new Error('You must be signed in to submit a booking request.')
  }

  const token = await currentUser.getIdToken()
  const response = await fetch('/api/bookings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data?.error || 'Failed to submit booking request.')
  }

  return data as CreateBookingResponse
}

export async function createCommunityBookingInterest(
  payload: CreateCommunityBookingInterestPayload,
): Promise<CreateCommunityBookingInterestResponse> {
  const currentUser = auth?.currentUser
  if (!currentUser) {
    throw new Error('You must be signed in to apply to a community orchestra.')
  }

  const token = await currentUser.getIdToken()
  const response = await fetch('/api/bookings/community', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data?.error || 'Failed to submit community orchestra request.')
  }

  return data as CreateCommunityBookingInterestResponse
}
