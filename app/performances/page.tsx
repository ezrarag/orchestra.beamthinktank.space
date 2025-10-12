'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { Calendar, Clock, MapPin, DollarSign, Filter, Search } from 'lucide-react'
// Removed Supabase import for deployment
import { format } from 'date-fns'

type Performance = {
  id: string
  title: string
  date: string
  time: string
  venue?: string
  city?: string
  description?: string
  ticket_price?: number
  created_at?: string
}

export default function PerformancesPage() {
  const [performances, setPerformances] = useState<any[]>([])
  const [filteredPerformances, setFilteredPerformances] = useState<any[]>([])
  const [selectedCity, setSelectedCity] = useState('Orlando')
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)

  const cities = ['Orlando', 'Tampa', 'Miami', 'Jacksonville']

  useEffect(() => {
    fetchPerformances()
  }, [])

  useEffect(() => {
    filterPerformances()
  }, [performances, selectedCity, searchTerm])

  const fetchPerformances = async () => {
    try {
      setLoading(true)
      // For demo purposes, using mock data. In production, this would fetch from Supabase
      const mockPerformances: Performance[] = [
        {
          id: '1',
          title: 'Winter Concert Series',
          date: '2024-12-15',
          time: '19:00',
          venue: 'Orlando Philharmonic Hall',
          description: 'A celebration of classical masterpieces featuring our full orchestra performing works by Beethoven, Mozart, and Tchaikovsky.',
          city: 'Orlando',
          ticket_price: 25,
          created_at: '2024-01-01T00:00:00Z'
        },
        {
          id: '2',
          title: 'Chamber Music Evening',
          date: '2024-12-22',
          time: '20:00',
          venue: 'St. James Cathedral',
          description: 'Intimate performances by our chamber ensembles featuring string quartets and wind quintets.',
          city: 'Orlando',
          ticket_price: 15,
          created_at: '2024-01-01T00:00:00Z'
        },
        {
          id: '3',
          title: 'New Year\'s Gala',
          date: '2025-01-01',
          time: '21:00',
          venue: 'Grand Bohemian Hotel',
          description: 'Ring in the new year with classical favorites and champagne reception.',
          city: 'Orlando',
          ticket_price: 50,
          created_at: '2024-01-01T00:00:00Z'
        },
        {
          id: '4',
          title: 'Spring Symphony',
          date: '2025-03-15',
          time: '18:30',
          venue: 'Dr. Phillips Center',
          description: 'Our spring concert featuring Vivaldi\'s Four Seasons and contemporary compositions.',
          city: 'Orlando',
          ticket_price: 30,
          created_at: '2024-01-01T00:00:00Z'
        }
      ]
      
      setPerformances(mockPerformances)
    } catch (error) {
      console.error('Error fetching performances:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterPerformances = () => {
    let filtered = performances.filter(performance => 
      performance.city === selectedCity
    )

    if (searchTerm) {
      filtered = filtered.filter(performance =>
        performance.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        performance.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        performance.venue.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    setFilteredPerformances(filtered)
  }

  const handlePurchaseTicket = (performance: Performance) => {
    // In production, this would integrate with Stripe for ticket sales
    alert(`Redirecting to ticket purchase for ${performance.title}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-pattern">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-orchestra-gold text-xl">Loading performances...</div>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-pattern">
      <Header />
      
      {/* Page Header */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-serif text-orchestra-dark text-center mb-6">
            Performances
          </h1>
          <p className="text-lg text-orchestra-brown/80 text-center max-w-2xl mx-auto">
            Experience the magic of live classical music with our upcoming performances and events.
          </p>
        </div>
      </section>

      {/* Filters and Search */}
      <section className="px-4 sm:px-6 lg:px-8 mb-12">
        <div className="max-w-7xl mx-auto">
          <div className="card">
            <div className="flex flex-col lg:flex-row gap-6 items-center">
              {/* City Filter */}
              <div className="flex items-center space-x-3">
                <Filter className="h-5 w-5 text-orchestra-gold" />
                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="input-field w-auto min-w-[150px]"
                >
                  {cities.map((city) => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </div>

              {/* Search */}
              <div className="flex items-center space-x-3 flex-1">
                <Search className="h-5 w-5 text-orchestra-gold" />
                <input
                  type="text"
                  placeholder="Search performances..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input-field"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Performances Grid */}
      <section className="px-4 sm:px-6 lg:px-8 mb-16">
        <div className="max-w-7xl mx-auto">
          {filteredPerformances.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-orchestra-brown text-lg">
                No performances found for {selectedCity}.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredPerformances.map((performance) => (
                <div key={performance.id} className="card group hover:shadow-2xl transition-all duration-300">
                  <div className="bg-orchestra-gold/20 h-48 rounded-lg mb-4 flex items-center justify-center group-hover:bg-orchestra-gold/30 transition-colors">
                    <Calendar className="h-16 w-16 text-orchestra-gold" />
                  </div>
                  
                  <h3 className="text-xl font-serif text-orchestra-dark mb-2 group-hover:text-orchestra-gold transition-colors">
                    {performance.title}
                  </h3>
                  
                  <p className="text-orchestra-brown/80 mb-4 line-clamp-3">
                    {performance.description}
                  </p>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center space-x-2 text-sm text-orchestra-brown">
                      <Calendar className="h-4 w-4" />
                      <span>{format(new Date(performance.date), 'MMM dd, yyyy')}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-orchestra-brown">
                      <Clock className="h-4 w-4" />
                      <span>{performance.time}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-orchestra-brown">
                      <MapPin className="h-4 w-4" />
                      <span>{performance.venue}</span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <DollarSign className="h-5 w-5 text-orchestra-gold" />
                      <span className="text-xl font-serif text-orchestra-dark">
                        ${performance.ticket_price}
                      </span>
                    </div>
                    <button
                      onClick={() => handlePurchaseTicket(performance)}
                      className="btn-primary text-sm py-2 px-4"
                    >
                      Buy Tickets
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-orchestra-cream/30">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-serif text-orchestra-dark mb-6">
            Can't Find What You're Looking For?
          </h2>
          <p className="text-lg text-orchestra-brown/80 mb-8">
            Contact us to learn about upcoming performances, special events, or to request specific pieces.
          </p>
          <button className="btn-secondary">
            Contact Us
          </button>
        </div>
      </section>

      <Footer />
    </div>
  )
}
