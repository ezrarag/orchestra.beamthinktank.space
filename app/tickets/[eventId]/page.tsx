'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { doc, getDoc, collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useUserRole } from '@/lib/hooks/useUserRole'
import { Event, EventRSVP, PriceTier } from '@/lib/types/events'
import { Calendar, Clock, MapPin, DollarSign, ExternalLink, ArrowLeft } from 'lucide-react'
import { format } from 'date-fns'
import Link from 'next/link'
import Footer from '@/components/Footer'
import { loadStripe } from '@stripe/stripe-js'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

export default function EventDetailPage() {
  const params = useParams()
  const eventId = params.eventId as string
  const { user } = useUserRole()
  const [event, setEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedTier, setSelectedTier] = useState<PriceTier | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [processing, setProcessing] = useState(false)
  
  // RSVP form state (for free events)
  const [rsvpName, setRsvpName] = useState('')
  const [rsvpEmail, setRsvpEmail] = useState('')
  const [rsvpSubmitting, setRsvpSubmitting] = useState(false)
  const [rsvpSubmitted, setRsvpSubmitted] = useState(false)

  useEffect(() => {
    if (eventId && db) {
      loadEvent()
    }
  }, [eventId])

  const loadEvent = async () => {
    if (!db || !eventId) return
    
    try {
      setLoading(true)
      const eventDoc = await getDoc(doc(db, 'events', eventId))
      
      if (!eventDoc.exists()) {
        setEvent(null)
        return
      }

      const data = eventDoc.data()
      const eventData: Event = {
        id: eventDoc.id,
        ...data,
        date: data.date?.toDate ? data.date.toDate() : data.date,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt,
      } as Event

      setEvent(eventData)
      if (eventData.priceTiers && eventData.priceTiers.length > 0) {
        setSelectedTier(eventData.priceTiers[0])
      }
    } catch (error) {
      console.error('Error loading event:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (date: Date | Timestamp) => {
    if (date instanceof Timestamp) {
      return format(date.toDate(), 'EEEE, MMMM d, yyyy')
    }
    return format(date, 'EEEE, MMMM d, yyyy')
  }

  const handleRSVP = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!rsvpName || !rsvpEmail || !event || !db) {
      alert('Please fill in all fields')
      return
    }

    setRsvpSubmitting(true)

    try {
      const rsvpData: Omit<EventRSVP, 'id'> = {
        eventId: event.id,
        name: rsvpName,
        email: rsvpEmail,
        timestamp: serverTimestamp() as Timestamp,
      }

      await addDoc(collection(db, 'eventRSVPs'), rsvpData)
      setRsvpSubmitted(true)
      setRsvpName('')
      setRsvpEmail('')
    } catch (error) {
      console.error('Error submitting RSVP:', error)
      alert('Failed to submit RSVP. Please try again.')
    } finally {
      setRsvpSubmitting(false)
    }
  }

  const handleBuyTickets = async () => {
    if (!event || !selectedTier) {
      alert('Please select a ticket tier')
      return
    }

    if (event.ticketProvider === 'external' && event.externalTicketUrl) {
      window.open(event.externalTicketUrl, '_blank')
      return
    }

    if (event.ticketProvider !== 'stripe') {
      return
    }

    setProcessing(true)

    try {
      // Get auth token if user is signed in
      let authHeader = ''
      if (user) {
        const token = await user.getIdToken()
        authHeader = `Bearer ${token}`
      }

      const response = await fetch('/api/tickets/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authHeader && { 'Authorization': authHeader }),
        },
        body: JSON.stringify({
          eventId: event.id,
          tierId: selectedTier.tierId,
          quantity: quantity,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session')
      }

      const stripe = await stripePromise
      if (!stripe) {
        throw new Error('Stripe failed to load')
      }

      const { error } = await stripe.redirectToCheckout({
        sessionId: data.sessionId,
      })

      if (error) {
        throw error
      }
    } catch (error) {
      console.error('Error creating checkout:', error)
      alert('Failed to start checkout. Please try again.')
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D4AF37]"></div>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Event Not Found</h1>
          <Link
            href="/tickets"
            className="inline-flex items-center gap-2 text-[#D4AF37] hover:text-[#B8941F] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Tickets
          </Link>
        </div>
      </div>
    )
  }

  const isPast = event.date instanceof Date 
    ? event.date < new Date()
    : event.date instanceof Timestamp && event.date.toDate() < new Date()

  return (
    <div className="min-h-screen bg-black">
      {/* Hero Section with Image */}
      <section className="relative">
        {event.imageUrl ? (
          <div className="h-[60vh] w-full relative">
            <img
              src={event.imageUrl}
              alt={event.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
          </div>
        ) : (
          <div className="h-[40vh] w-full bg-gradient-to-br from-[#D4AF37]/20 to-black" />
        )}
        
        <div className="absolute bottom-0 left-0 right-0 p-8">
          <div className="max-w-7xl mx-auto">
            <Link
              href="/tickets"
              className="inline-flex items-center gap-2 text-[#D4AF37] hover:text-[#B8941F] mb-4 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Tickets
            </Link>
            <p className="text-[#D4AF37] text-sm font-medium uppercase tracking-wide mb-2">
              {event.series}
            </p>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4">
              {event.title}
            </h1>
          </div>
        </div>
      </section>

      {/* Content Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Event Details */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <h2 className="text-2xl font-bold text-white mb-6">Event Details</h2>
              
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <Calendar className="h-5 w-5 text-[#D4AF37] mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-white font-semibold">Date & Time</p>
                    <p className="text-white/70">{formatDate(event.date)}</p>
                    <p className="text-white/70">{event.time}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <MapPin className="h-5 w-5 text-[#D4AF37] mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-white font-semibold">Venue</p>
                    <p className="text-white/70">{event.venueName}</p>
                    {event.venueAddress && (
                      <p className="text-white/70">{event.venueAddress}</p>
                    )}
                    <p className="text-white/70">{event.city}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Description */}
            {event.description && (
              <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                <h2 className="text-2xl font-bold text-white mb-4">About</h2>
                <p className="text-white/80 leading-relaxed whitespace-pre-line">
                  {event.description}
                </p>
              </div>
            )}
          </div>

          {/* Sidebar - Ticket Purchase */}
          <div className="lg:col-span-1">
            <div className="bg-white/5 border border-white/10 rounded-xl p-6 sticky top-8">
              {isPast ? (
                <div className="text-center py-8">
                  <p className="text-white/60 text-lg mb-4">This event has passed</p>
                </div>
              ) : !event.onSale ? (
                <div className="text-center py-8">
                  <p className="text-white/60 text-lg mb-4">Tickets not yet on sale</p>
                </div>
              ) : event.isFree ? (
                <div>
                  <h3 className="text-xl font-bold text-white mb-4">Reserve Your Free Ticket</h3>
                  {rsvpSubmitted ? (
                    <div className="text-center py-8">
                      <p className="text-green-400 text-lg mb-2">✓ RSVP Confirmed!</p>
                      <p className="text-white/70 text-sm">We'll send you event details via email.</p>
                    </div>
                  ) : (
                    <form onSubmit={handleRSVP} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-white/70 mb-2">
                          Name *
                        </label>
                        <input
                          type="text"
                          value={rsvpName}
                          onChange={(e) => setRsvpName(e.target.value)}
                          className="w-full px-4 py-2 bg-black/50 border border-white/20 rounded-lg text-white focus:outline-none focus:border-[#D4AF37]"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-white/70 mb-2">
                          Email *
                        </label>
                        <input
                          type="email"
                          value={rsvpEmail}
                          onChange={(e) => setRsvpEmail(e.target.value)}
                          className="w-full px-4 py-2 bg-black/50 border border-white/20 rounded-lg text-white focus:outline-none focus:border-[#D4AF37]"
                          required
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={rsvpSubmitting}
                        className="w-full px-6 py-3 bg-[#D4AF37] hover:bg-[#B8941F] text-black font-bold rounded-lg transition-colors disabled:opacity-50"
                      >
                        {rsvpSubmitting ? 'Submitting...' : 'Reserve Free Ticket'}
                      </button>
                    </form>
                  )}
                </div>
              ) : event.ticketProvider === 'external' ? (
                <div>
                  <h3 className="text-xl font-bold text-white mb-4">Get Tickets</h3>
                  <p className="text-white/70 text-sm mb-6">
                    Tickets are available through our partner ticketing system.
                  </p>
                  <button
                    onClick={handleBuyTickets}
                    className="w-full px-6 py-3 bg-[#D4AF37] hover:bg-[#B8941F] text-black font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    Get Tickets
                    <ExternalLink className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div>
                  <h3 className="text-xl font-bold text-white mb-4">Buy Tickets</h3>
                  
                  {event.priceTiers && event.priceTiers.length > 0 && (
                    <div className="space-y-4 mb-6">
                      <div>
                        <label className="block text-sm font-medium text-white/70 mb-2">
                          Ticket Type
                        </label>
                        <select
                          value={selectedTier?.tierId || ''}
                          onChange={(e) => {
                            const tier = event.priceTiers?.find(t => t.tierId === e.target.value)
                            setSelectedTier(tier || null)
                          }}
                          className="w-full px-4 py-2 bg-black/50 border border-white/20 rounded-lg text-white focus:outline-none focus:border-[#D4AF37]"
                        >
                          {event.priceTiers.map((tier) => (
                            <option key={tier.tierId} value={tier.tierId}>
                              {tier.label} - ${(tier.price / 100).toFixed(2)}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-white/70 mb-2">
                          Quantity
                        </label>
                        <input
                          type="number"
                          min="1"
                          max={selectedTier?.quantity || 10}
                          value={quantity}
                          onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                          className="w-full px-4 py-2 bg-black/50 border border-white/20 rounded-lg text-white focus:outline-none focus:border-[#D4AF37]"
                        />
                      </div>

                      {selectedTier && (
                        <div className="pt-4 border-t border-white/10">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-white/70">Subtotal</span>
                            <span className="text-white font-semibold">
                              ${((selectedTier.price * quantity) / 100).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    onClick={handleBuyTickets}
                    disabled={processing || !selectedTier}
                    className="w-full px-6 py-3 bg-[#D4AF37] hover:bg-[#B8941F] text-black font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {processing ? 'Processing...' : 'Buy Tickets'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}

