'use client'

import { useState, useEffect } from 'react'
import Footer from '@/components/Footer'
import { Calendar, Clock, MapPin, ExternalLink, DollarSign } from 'lucide-react'
import { format } from 'date-fns'
import Link from 'next/link'
import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Event } from '@/lib/types/events'

export default function TicketsPage() {
  const [selectedCity, setSelectedCity] = useState<string>('All')
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [cities, setCities] = useState<string[]>(['All'])

  useEffect(() => {
    if (db) {
      loadEvents()
    }
  }, [])

  const loadEvents = async () => {
    if (!db) return
    
    try {
      setLoading(true)
      const eventsRef = collection(db, 'events')
      // Get events that are on sale OR future events
      const now = new Date()
      const q = query(
        eventsRef,
        orderBy('date', 'asc')
      )
      const snapshot = await getDocs(q)
      
      const eventsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate ? doc.data().date.toDate() : doc.data().date,
        createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : doc.data().createdAt,
        updatedAt: doc.data().updatedAt?.toDate ? doc.data().updatedAt.toDate() : doc.data().updatedAt,
      })) as Event[]
      
      // Filter to show onSale events or future events
      const filteredEvents = eventsData.filter(event => {
        const eventDate = event.date instanceof Timestamp ? event.date.toDate() : event.date
        return event.onSale || eventDate >= now
      })
      
      setEvents(filteredEvents)
      
      // Extract unique cities
      const uniqueCities = Array.from(new Set(filteredEvents.map(e => e.city)))
      setCities(['All', ...uniqueCities.sort()])
    } catch (error) {
      console.error('Error loading events:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredEvents = selectedCity === 'All'
    ? events
    : events.filter(event => event.city === selectedCity)

  const formatDate = (date: Date | Timestamp) => {
    const dateObj = date instanceof Timestamp ? date.toDate() : date
    return {
      month: format(dateObj, 'MMM').toUpperCase(),
      day: format(dateObj, 'd'),
      full: format(dateObj, 'MMMM d, yyyy')
    }
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Hero Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 border-b border-white/10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <span className="inline-block px-4 py-2 bg-[#D4AF37]/20 text-[#D4AF37] text-sm font-bold rounded-full mb-4">
              {selectedCity}
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
              Tickets & Performances
            </h1>
            <p className="text-lg md:text-xl text-white/80 max-w-2xl mx-auto">
              Reserve seats for upcoming BEAM Orchestra concerts and partner projects.
            </p>
          </div>
        </div>
      </section>

      {/* City Filter */}
      <section className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center gap-4">
            <label className="text-white/70 text-sm">Filter by city:</label>
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-[#D4AF37] transition-colors"
            >
              {cities.map((city) => (
                <option key={city} value={city} className="bg-black">
                  {city}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Events Grid */}
      <section className="px-4 sm:px-6 lg:px-8 pb-16">
        <div className="max-w-7xl mx-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D4AF37]"></div>
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-white/60 text-lg">
                {selectedCity === 'All' 
                  ? 'No upcoming performances found.'
                  : `No upcoming performances found for ${selectedCity}.`}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredEvents.map((event) => {
                const dateInfo = formatDate(event.date)
                const eventDate = event.date instanceof Timestamp ? event.date.toDate() : event.date
                const isPast = eventDate < new Date()
                const isOnSale = event.onSale && !isPast

                return (
                  <div
                    key={event.id}
                    className="group relative bg-white/5 border border-white/10 rounded-xl p-6 hover:border-[#D4AF37]/50 transition-all duration-300 hover:shadow-lg hover:shadow-[#D4AF37]/10"
                  >
                    {/* Event Image */}
                    {event.imageUrl && (
                      <img
                        src={event.imageUrl}
                        alt={event.title}
                        className="w-full h-48 object-cover rounded-lg mb-4"
                      />
                    )}

                    {/* Date Badge */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex flex-col items-center justify-center w-16 h-16 bg-[#D4AF37]/20 rounded-lg border border-[#D4AF37]/30">
                        <span className="text-[#D4AF37] text-xs font-bold">{dateInfo.month}</span>
                        <span className="text-white text-2xl font-bold">{dateInfo.day}</span>
                      </div>
                      {isPast && (
                        <span className="px-3 py-1 bg-white/10 text-white/70 text-xs font-medium rounded-full">
                          Past Event
                        </span>
                      )}
                      {!isPast && !isOnSale && (
                        <span className="px-3 py-1 bg-white/10 text-white/70 text-xs font-medium rounded-full">
                          Coming Soon
                        </span>
                      )}
                    </div>

                    {/* Series Label */}
                    <p className="text-[#D4AF37] text-xs font-medium uppercase tracking-wide mb-2">
                      {event.series}
                    </p>

                    {/* Title */}
                    <h3 className="text-xl font-bold text-white mb-3 group-hover:text-[#D4AF37] transition-colors">
                      {event.title}
                    </h3>

                    {/* Description */}
                    <p className="text-white/70 text-sm mb-4 line-clamp-2">
                      {event.description}
                    </p>

                    {/* Venue & Time Info */}
                    <div className="space-y-2 mb-6">
                      <div className="flex items-center gap-2 text-sm text-white/60">
                        <MapPin className="h-4 w-4" />
                        <span>{event.venueName}, {event.city}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-white/60">
                        <Clock className="h-4 w-4" />
                        <span>{event.time}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-white/60">
                        <Calendar className="h-4 w-4" />
                        <span>{dateInfo.full}</span>
                      </div>
                      {!event.isFree && event.priceTiers && event.priceTiers.length > 0 && (
                        <div className="flex items-center gap-2 text-sm text-white/60">
                          <DollarSign className="h-4 w-4" />
                          <span>
                            ${(event.priceTiers[0].price / 100).toFixed(2)}
                            {event.priceTiers.length > 1 && ` - $${(event.priceTiers[event.priceTiers.length - 1].price / 100).toFixed(2)}`}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* CTA Button */}
                    <div className="mt-auto">
                      {isOnSale ? (
                        <Link
                          href={`/tickets/${event.id}`}
                          className="inline-flex items-center justify-center w-full px-6 py-3 bg-[#D4AF37] hover:bg-[#B8941F] text-black font-bold rounded-lg transition-all duration-300 shadow-lg hover:shadow-[#D4AF37]/50"
                        >
                          {event.isFree ? 'Reserve Free Ticket' : event.ticketProvider === 'external' ? 'Get Tickets' : 'Buy Tickets'}
                        </Link>
                      ) : isPast ? (
                        <button
                          disabled
                          className="inline-flex items-center justify-center w-full px-6 py-3 bg-white/5 border border-white/10 text-white/40 font-medium rounded-lg cursor-not-allowed"
                        >
                          Past Event
                        </button>
                      ) : (
                        <Link
                          href={`/tickets/${event.id}`}
                          className="inline-flex items-center justify-center w-full px-6 py-3 bg-transparent border-2 border-[#D4AF37] hover:bg-[#D4AF37]/10 text-[#D4AF37] font-bold rounded-lg transition-all duration-300"
                        >
                          View Details
                        </Link>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  )
}

