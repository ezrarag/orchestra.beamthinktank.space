'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { doc, getDoc, collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore'
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth'
import { db, auth } from '@/lib/firebase'
import { useUserRole } from '@/lib/hooks/useUserRole'
import { Event, EventRSVP, PriceTier, EventNotification } from '@/lib/types/events'
import { Calendar, Clock, MapPin, DollarSign, ExternalLink, ArrowLeft, Mail, LogIn } from 'lucide-react'
import { format } from 'date-fns'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import TicketsFooter from '@/components/TicketsFooter'
import UserAvatarMenu from '@/components/UserAvatarMenu'
import { loadStripe } from '@stripe/stripe-js'

// Only initialize Stripe if publishable key exists (for paid events)
const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY 
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null

export default function EventDetailPage() {
  const params = useParams()
  const router = useRouter()
  const eventId = params.eventId as string
  const { user } = useUserRole()
  const [event, setEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedTier, setSelectedTier] = useState<PriceTier | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [processing, setProcessing] = useState(false)
  const [scrollY, setScrollY] = useState(0)
  
  // RSVP form state (for free events)
  const [rsvpName, setRsvpName] = useState('')
  const [rsvpEmail, setRsvpEmail] = useState('')
  const [hasPlusOne, setHasPlusOne] = useState(false)
  const [plusOneName, setPlusOneName] = useState('')
  const [rsvpSubmitting, setRsvpSubmitting] = useState(false)
  const [rsvpSubmitted, setRsvpSubmitted] = useState(false)
  const [showEmailLogin, setShowEmailLogin] = useState(false)
  const [signingIn, setSigningIn] = useState(false)

  // Pre-fill email if user is logged in
  useEffect(() => {
    if (user?.email && !rsvpEmail) {
      setRsvpEmail(user.email)
      if (user.displayName && !rsvpName) {
        setRsvpName(user.displayName)
      }
    }
  }, [user])

  // Track scroll position
  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

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

  const handleGoogleSignIn = async () => {
    if (!auth) {
      alert('Firebase Auth is not available. Please configure Firebase.')
      return
    }

    setSigningIn(true)
    try {
      const provider = new GoogleAuthProvider()
      const result = await signInWithPopup(auth, provider)
      
      // Pre-fill form with Google account info
      if (result.user.email) {
        setRsvpEmail(result.user.email)
      }
      if (result.user.displayName) {
        setRsvpName(result.user.displayName)
      }
      setShowEmailLogin(false)
    } catch (error: any) {
      console.error('Error signing in:', error)
      if (error.code !== 'auth/popup-closed-by-user') {
        alert(`Sign in failed: ${error.message}`)
      }
    } finally {
      setSigningIn(false)
    }
  }

  const handleRSVP = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!rsvpName || !rsvpEmail || !event || !db) {
      alert('Please fill in all fields')
      return
    }

    setRsvpSubmitting(true)

    try {
      // Build RSVP data, only including plusOneName if it has a value (Firestore doesn't allow undefined)
      const rsvpData: any = {
        eventId: event.id,
        name: rsvpName,
        email: rsvpEmail,
        hasPlusOne: hasPlusOne,
        timestamp: serverTimestamp() as Timestamp,
      }
      
      // Only include plusOneName if it has a value
      if (hasPlusOne && plusOneName && plusOneName.trim()) {
        rsvpData.plusOneName = plusOneName.trim()
      }
      
      // Create RSVP
      await addDoc(collection(db, 'eventRSVPs'), rsvpData)
      
      // Create notification
      const ticketCount = hasPlusOne ? 2 : 1
      const notificationData: Omit<EventNotification, 'id'> = {
        userId: user?.uid || undefined,
        email: rsvpEmail,
        eventId: event.id,
        eventTitle: event.title,
        type: 'rsvp_confirmed',
        message: `You've reserved ${ticketCount} free ticket${ticketCount > 1 ? 's' : ''} for ${event.title}${hasPlusOne && plusOneName ? ` (with ${plusOneName})` : hasPlusOne ? ' (with guest)' : ''}`,
        read: false,
        timestamp: serverTimestamp() as Timestamp,
      }
      
      await addDoc(collection(db, 'eventNotifications'), notificationData)
      
      // Store email in localStorage so avatar shows even if not logged in
      localStorage.setItem('rsvpEmail', rsvpEmail)
      
      setRsvpSubmitted(true)
      setRsvpName('')
      setRsvpEmail('')
      setHasPlusOne(false)
      setPlusOneName('')
      
      // Redirect to tickets page after 2 seconds
      setTimeout(() => {
        router.push('/tickets')
      }, 2000)
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

      if (!stripePromise) {
        throw new Error('Stripe is not configured')
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
                      <p className="text-white/70 text-sm mb-4">We'll send you event details via email.</p>
                      <p className="text-white/60 text-xs">Redirecting to tickets page...</p>
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
                        <div className="space-y-2">
                          {user ? (
                            <div className="flex items-center gap-2 px-4 py-2 bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-lg">
                              <Mail className="h-4 w-4 text-[#D4AF37]" />
                              <span className="text-white text-sm flex-1">{user.email}</span>
                              <span className="text-xs text-[#D4AF37]">✓ Signed in</span>
                            </div>
                          ) : (
                            <>
                              <input
                                type="email"
                                value={rsvpEmail}
                                onChange={(e) => setRsvpEmail(e.target.value)}
                                onFocus={() => setShowEmailLogin(true)}
                                placeholder="Enter your email"
                                className="w-full px-4 py-2 bg-black/50 border border-white/20 rounded-lg text-white focus:outline-none focus:border-[#D4AF37]"
                                required
                              />
                              {showEmailLogin && !rsvpEmail && (
                                <button
                                  type="button"
                                  onClick={handleGoogleSignIn}
                                  disabled={signingIn}
                                  className="w-full px-4 py-2 bg-white hover:bg-gray-100 text-black font-medium rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                  {signingIn ? (
                                    <>
                                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
                                      <span>Signing in...</span>
                                    </>
                                  ) : (
                                    <>
                                      <svg className="h-5 w-5" viewBox="0 0 24 24">
                                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                                      </svg>
                                      <span>Sign in with Google</span>
                                    </>
                                  )}
                                </button>
                              )}
                            </>
                          )}
                        </div>
                        {!user && rsvpEmail && (
                          <button
                            type="button"
                            onClick={handleGoogleSignIn}
                            disabled={signingIn}
                            className="mt-2 w-full px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                          >
                            <LogIn className="h-4 w-4" />
                            <span>Use Google account instead</span>
                          </button>
                        )}
                      </div>
                      
                      {/* Plus One Option */}
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm text-white/70 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={hasPlusOne}
                            onChange={(e) => {
                              setHasPlusOne(e.target.checked)
                              if (!e.target.checked) {
                                setPlusOneName('')
                              }
                            }}
                            className="w-4 h-4 rounded border-white/20 bg-black/50 text-[#D4AF37] focus:ring-[#D4AF37] focus:ring-2"
                          />
                          <span>I'm bringing a guest (+1)</span>
                        </label>
                        
                        {hasPlusOne && (
                          <div className="ml-6">
                            <label className="block text-xs font-medium text-white/70 mb-1">
                              Guest Name (Optional)
                            </label>
                            <input
                              type="text"
                              value={plusOneName}
                              onChange={(e) => setPlusOneName(e.target.value)}
                              placeholder="Enter guest name"
                              className="w-full px-3 py-2 bg-black/50 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:border-[#D4AF37]"
                            />
                            <p className="text-xs text-white/50 mt-1">
                              We'll reserve 2 seats total
                            </p>
                          </div>
                        )}
                      </div>
                      
                      <button
                        type="submit"
                        disabled={rsvpSubmitting}
                        className="w-full px-6 py-3 bg-[#D4AF37] hover:bg-[#B8941F] text-black font-bold rounded-lg transition-colors disabled:opacity-50"
                      >
                        {rsvpSubmitting ? 'Submitting...' : `Reserve ${hasPlusOne ? '2' : '1'} Free Ticket${hasPlusOne ? 's' : ''}`}
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

      <TicketsFooter />

      {/* User Avatar Menu with Notifications */}
      <UserAvatarMenu scrollY={scrollY} showThreshold={0} />
    </div>
  )
}

