'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { Calendar, Clock, MapPin, Users, Plus, Filter, Search } from 'lucide-react'
// Removed Supabase import for deployment
import { format } from 'date-fns'

type Rehearsal = {
  id: string
  date: string
  time: string
  duration: number
  location: string
  city?: string
  description?: string
  max_participants: number
  current_participants: number
}

export default function RehearsalsPage() {
  const [rehearsals, setRehearsals] = useState<any[]>([])
  const [filteredRehearsals, setFilteredRehearsals] = useState<any[]>([])
  const [selectedCity, setSelectedCity] = useState('Orlando')
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [showSignupModal, setShowSignupModal] = useState(false)
  const [selectedRehearsal, setSelectedRehearsal] = useState<any | null>(null)

  const cities = ['Orlando', 'Tampa', 'Miami', 'Jacksonville']

  useEffect(() => {
    fetchRehearsals()
  }, [])

  useEffect(() => {
    filterRehearsals()
  }, [rehearsals, selectedCity, searchTerm])

  const fetchRehearsals = async () => {
    try {
      setLoading(true)
      // For demo purposes, using mock data. In production, this would fetch from Supabase
      const mockRehearsals: Rehearsal[] = [
        {
          id: '1',
          date: '2024-12-10',
          time: '19:00',
          duration: 120,
          location: 'Orlando Community Center',
          city: 'Orlando',
          description: 'Full orchestra rehearsal for Winter Concert Series. All sections welcome.',
          max_participants: 60,
          current_participants: 45
        },
        {
          id: '2',
          date: '2024-12-12',
          time: '18:30',
          duration: 90,
          location: 'St. James Cathedral',
          city: 'Orlando',
          description: 'Chamber music rehearsal focusing on string quartets and wind ensembles.',
          max_participants: 20,
          current_participants: 18
        },
        {
          id: '3',
          date: '2024-12-14',
          time: '14:00',
          duration: 180,
          location: 'Dr. Phillips Center',
          city: 'Orlando',
          description: 'Dress rehearsal for Winter Concert Series. Full performance run-through.',
          max_participants: 80,
          current_participants: 65
        },
        {
          id: '4',
          date: '2024-12-17',
          time: '19:00',
          duration: 120,
          location: 'Orlando Community Center',
          city: 'Orlando',
          description: 'Sectional rehearsals: Strings, Woodwinds, Brass, and Percussion.',
          max_participants: 60,
          current_participants: 52
        }
      ]
      
      setRehearsals(mockRehearsals)
    } catch (error) {
      console.error('Error fetching rehearsals:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterRehearsals = () => {
    let filtered = rehearsals.filter(rehearsal => 
      rehearsal.city === selectedCity
    )

    if (searchTerm) {
      filtered = filtered.filter(rehearsal =>
        rehearsal.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rehearsal.location.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    setFilteredRehearsals(filtered)
  }

  const handleSignup = (rehearsal: Rehearsal) => {
    setSelectedRehearsal(rehearsal)
    setShowSignupModal(true)
  }

  const confirmSignup = async () => {
    if (selectedRehearsal) {
      // In production, this would update the database via Supabase
      const updatedRehearsals = rehearsals.map(r => 
        r.id === selectedRehearsal.id 
          ? { ...r, current_participants: r.current_participants + 1 }
          : r
      )
      setRehearsals(updatedRehearsals)
      setShowSignupModal(false)
      setSelectedRehearsal(null)
      alert('Successfully signed up for rehearsal!')
    }
  }

  const getAvailabilityColor = (current: number, max: number) => {
    const percentage = (current / max) * 100
    if (percentage >= 90) return 'text-orchestra-red'
    if (percentage >= 75) return 'text-orchestra-gold'
    return 'text-green-600'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-pattern">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-orchestra-gold text-xl">Loading rehearsals...</div>
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
            Rehearsals
          </h1>
          <p className="text-lg text-orchestra-brown/80 text-center max-w-2xl mx-auto">
            Join our weekly rehearsals and be part of creating beautiful music together.
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
                  placeholder="Search rehearsals..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input-field"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Rehearsals Grid */}
      <section className="px-4 sm:px-6 lg:px-8 mb-16">
        <div className="max-w-7xl mx-auto">
          {filteredRehearsals.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-orchestra-brown text-lg">
                No rehearsals found for {selectedCity}.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredRehearsals.map((rehearsal) => (
                <div key={rehearsal.id} className="card group hover:shadow-2xl transition-all duration-300">
                  <div className="bg-orchestra-gold/20 h-48 rounded-lg mb-4 flex items-center justify-center group-hover:bg-orchestra-gold/30 transition-colors">
                    <Calendar className="h-16 w-16 text-orchestra-gold" />
                  </div>
                  
                  <h3 className="text-xl font-serif text-orchestra-dark mb-2 group-hover:text-orchestra-gold transition-colors">
                    {format(new Date(rehearsal.date), 'MMM dd, yyyy')} Rehearsal
                  </h3>
                  
                  <p className="text-orchestra-brown/80 mb-4 line-clamp-3">
                    {rehearsal.description}
                  </p>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center space-x-2 text-sm text-orchestra-brown">
                      <Clock className="h-4 w-4" />
                      <span>{rehearsal.time} ({rehearsal.duration} min)</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-orchestra-brown">
                      <MapPin className="h-4 w-4" />
                      <span>{rehearsal.location}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-orchestra-brown">
                      <Users className="h-4 w-4" />
                      <span className={getAvailabilityColor(rehearsal.current_participants, rehearsal.max_participants)}>
                        {rehearsal.current_participants}/{rehearsal.max_participants} participants
                      </span>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleSignup(rehearsal)}
                    disabled={rehearsal.current_participants >= rehearsal.max_participants}
                    className={`w-full py-3 px-4 rounded-lg font-semibold transition-all duration-300 ${
                      rehearsal.current_participants >= rehearsal.max_participants
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'btn-primary'
                    }`}
                  >
                    {rehearsal.current_participants >= rehearsal.max_participants 
                      ? 'Full' 
                      : 'Sign Up'
                    }
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Signup Modal */}
      {showSignupModal && selectedRehearsal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card max-w-md w-full">
            <h3 className="text-xl font-serif text-orchestra-dark mb-4">
              Confirm Rehearsal Signup
            </h3>
            <p className="text-orchestra-brown/80 mb-6">
              Are you sure you want to sign up for the rehearsal on{' '}
              {format(new Date(selectedRehearsal.date), 'MMM dd, yyyy')} at{' '}
              {selectedRehearsal.time}?
            </p>
            <div className="flex space-x-4">
              <button
                onClick={() => setShowSignupModal(false)}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={confirmSignup}
                className="btn-primary flex-1"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Call to Action */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-orchestra-cream/30">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-serif text-orchestra-dark mb-6">
            New to the Orchestra?
          </h2>
          <p className="text-lg text-orchestra-brown/80 mb-8">
            We welcome musicians of all skill levels. Contact us to learn more about joining 
            our community and participating in rehearsals.
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
