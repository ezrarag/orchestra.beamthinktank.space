'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { Heart, DollarSign, Users, Target, Filter } from 'lucide-react'
import { supabase, Donation } from '@/lib/supabase'
import { format } from 'date-fns'

export default function DonatePage() {
  const [donations, setDonations] = useState<Donation[]>([])
  const [filteredDonations, setFilteredDonations] = useState<Donation[]>([])
  const [selectedCity, setSelectedCity] = useState('Orlando')
  const [loading, setLoading] = useState(true)
  const [showDonationForm, setShowDonationForm] = useState(false)
  const [donationAmount, setDonationAmount] = useState('')
  const [donorName, setDonorName] = useState('')
  const [donorMessage, setDonorMessage] = useState('')
  const [isAnonymous, setIsAnonymous] = useState(false)

  const cities = ['Orlando', 'Tampa', 'Miami', 'Jacksonville']

  useEffect(() => {
    fetchDonations()
  }, [])

  useEffect(() => {
    filterDonations()
  }, [donations, selectedCity])

  const fetchDonations = async () => {
    try {
      setLoading(true)
      // For demo purposes, using mock data. In production, this would fetch from Supabase
      const mockDonations: Donation[] = [
        {
          id: '1',
          donor_name: 'Sarah Johnson',
          amount: 100,
          message: 'In memory of my grandmother who loved classical music',
          city: 'Orlando',
          created_at: '2024-12-01T10:00:00Z',
          anonymous: false
        },
        {
          id: '2',
          donor_name: 'Anonymous',
          amount: 250,
          message: 'Supporting the arts in our community',
          city: 'Orlando',
          created_at: '2024-12-02T14:30:00Z',
          anonymous: true
        },
        {
          id: '3',
          donor_name: 'Michael Chen',
          amount: 75,
          message: 'Keep making beautiful music!',
          city: 'Orlando',
          created_at: '2024-12-03T09:15:00Z',
          anonymous: false
        },
        {
          id: '4',
          donor_name: 'Lisa Rodriguez',
          amount: 500,
          message: 'For the scholarship fund - every child deserves music education',
          city: 'Orlando',
          created_at: '2024-12-04T16:45:00Z',
          anonymous: false
        }
      ]
      
      setDonations(mockDonations)
    } catch (error) {
      console.error('Error fetching donations:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterDonations = () => {
    const filtered = donations.filter(donation => 
      donation.city === selectedCity
    )
    setFilteredDonations(filtered)
  }

  const handleDonationSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!donationAmount || parseFloat(donationAmount) <= 0) {
      alert('Please enter a valid donation amount')
      return
    }

    if (!isAnonymous && !donorName.trim()) {
      alert('Please enter your name or check anonymous')
      return
    }

    try {
      // In production, this would integrate with Stripe for payment processing
      const newDonation: Donation = {
        id: Date.now().toString(),
        donor_name: isAnonymous ? 'Anonymous' : donorName,
        amount: parseFloat(donationAmount),
        message: donorMessage,
        city: selectedCity,
        created_at: new Date().toISOString(),
        anonymous: isAnonymous
      }

      setDonations([newDonation, ...donations])
      setShowDonationForm(false)
      setDonationAmount('')
      setDonorName('')
      setDonorMessage('')
      setIsAnonymous(false)
      
      alert('Thank you for your donation! In production, you would be redirected to Stripe for payment.')
    } catch (error) {
      console.error('Error processing donation:', error)
      alert('There was an error processing your donation. Please try again.')
    }
  }

  const totalDonations = donations.reduce((sum, donation) => sum + donation.amount, 0)
  const cityDonations = donations.filter(d => d.city === selectedCity).reduce((sum, d) => sum + d.amount, 0)

  if (loading) {
    return (
      <div className="min-h-screen bg-pattern">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-orchestra-gold text-xl">Loading donations...</div>
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
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-serif text-orchestra-dark mb-6">
            Support Our Mission
          </h1>
          <p className="text-lg text-orchestra-brown/80 max-w-2xl mx-auto">
            Your generous donations help us continue bringing beautiful classical music to our community 
            and supporting young musicians through our scholarship program.
          </p>
        </div>
      </section>

      {/* Donation Stats */}
      <section className="px-4 sm:px-6 lg:px-8 mb-12">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="card text-center">
              <div className="bg-orchestra-gold/20 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <DollarSign className="h-8 w-8 text-orchestra-gold" />
              </div>
              <h3 className="text-2xl font-serif text-orchestra-dark mb-2">
                Total Raised
              </h3>
              <p className="text-3xl font-bold text-orchestra-gold">
                ${totalDonations.toLocaleString()}
              </p>
            </div>
            
            <div className="card text-center">
              <div className="bg-orchestra-gold/20 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Users className="h-8 w-8 text-orchestra-gold" />
              </div>
              <h3 className="text-2xl font-serif text-orchestra-dark mb-2">
                Donors
              </h3>
              <p className="text-3xl font-bold text-orchestra-gold">
                {donations.length}
              </p>
            </div>
            
            <div className="card text-center">
              <div className="bg-orchestra-gold/20 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Target className="h-8 w-8 text-orchestra-gold" />
              </div>
              <h3 className="text-2xl font-serif text-orchestra-dark mb-2">
                {selectedCity} Total
              </h3>
              <p className="text-3xl font-bold text-orchestra-gold">
                ${cityDonations.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Donation Form */}
      <section className="px-4 sm:px-6 lg:px-8 mb-16">
        <div className="max-w-2xl mx-auto">
          <div className="card">
            <h2 className="text-2xl font-serif text-orchestra-dark text-center mb-6">
              Make a Donation
            </h2>
            
            <form onSubmit={handleDonationSubmit} className="space-y-6">
              <div>
                <label className="block text-orchestra-dark font-medium mb-2">
                  Donation Amount ($)
                </label>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={donationAmount}
                  onChange={(e) => setDonationAmount(e.target.value)}
                  className="input-field"
                  placeholder="25.00"
                  required
                />
              </div>

              <div>
                <label className="block text-orchestra-dark font-medium mb-2">
                  City
                </label>
                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="input-field"
                >
                  {cities.map((city) => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="anonymous"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="h-4 w-4 text-orchestra-gold focus:ring-orchestra-gold border-orchestra-gold/30 rounded"
                />
                <label htmlFor="anonymous" className="text-orchestra-dark">
                  Make this donation anonymous
                </label>
              </div>

              {!isAnonymous && (
                <div>
                  <label className="block text-orchestra-dark font-medium mb-2">
                    Your Name
                  </label>
                  <input
                    type="text"
                    value={donorName}
                    onChange={(e) => setDonorName(e.target.value)}
                    className="input-field"
                    placeholder="Enter your name"
                    required={!isAnonymous}
                  />
                </div>
              )}

              <div>
                <label className="block text-orchestra-dark font-medium mb-2">
                  Message (Optional)
                </label>
                <textarea
                  value={donorMessage}
                  onChange={(e) => setDonorMessage(e.target.value)}
                  className="input-field"
                  rows={3}
                  placeholder="Share why you're supporting us..."
                />
              </div>

              <button type="submit" className="btn-primary w-full">
                Donate Now
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Recent Donations */}
      <section className="px-4 sm:px-6 lg:px-8 mb-16">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-serif text-orchestra-dark">
              Recent Donations
            </h2>
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
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDonations.map((donation) => (
              <div key={donation.id} className="card">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="bg-orchestra-gold/20 p-2 rounded-full">
                      <Heart className="h-5 w-5 text-orchestra-gold" />
                    </div>
                    <div>
                      <h3 className="font-medium text-orchestra-dark">
                        {donation.anonymous ? 'Anonymous' : donation.donor_name}
                      </h3>
                      <p className="text-sm text-orchestra-brown">
                        {format(new Date(donation.created_at), 'MMM dd, yyyy')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-orchestra-gold">
                      ${donation.amount}
                    </p>
                  </div>
                </div>
                
                {donation.message && (
                  <p className="text-orchestra-brown/80 italic">
                    "{donation.message}"
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-orchestra-cream/30">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-serif text-orchestra-dark mb-6">
            Every Donation Makes a Difference
          </h2>
          <p className="text-lg text-orchestra-brown/80 mb-8">
            Your support helps us provide music education, maintain our instruments, 
            and bring classical music to audiences throughout our community.
          </p>
          <button 
            onClick={() => setShowDonationForm(true)}
            className="btn-primary"
          >
            Make Another Donation
          </button>
        </div>
      </section>

      <Footer />
    </div>
  )
}
