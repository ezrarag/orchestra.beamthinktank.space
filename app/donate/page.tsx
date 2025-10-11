'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { Heart, DollarSign, Users, Target, Filter } from 'lucide-react'
// Removed Supabase import for deployment
import { format } from 'date-fns'

/* ✅ ADD THIS TYPE DEFINITION */
type Donation = {
  id: string
  donor_name: string
  amount: number
  message?: string
  city: string
  created_at: string
  anonymous: boolean
}
/* ✅ END TYPE */

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
          anonymous: false,
        },
        {
          id: '2',
          donor_name: 'Anonymous',
          amount: 250,
          message: 'Supporting the arts in our community',
          city: 'Orlando',
          created_at: '2024-12-02T14:30:00Z',
          anonymous: true,
        },
        {
          id: '3',
          donor_name: 'Michael Chen',
          amount: 75,
          message: 'Keep making beautiful music!',
          city: 'Orlando',
          created_at: '2024-12-03T09:15:00Z',
          anonymous: false,
        },
        {
          id: '4',
          donor_name: 'Lisa Rodriguez',
          amount: 500,
          message: 'For the scholarship fund - every child deserves music education',
          city: 'Orlando',
          created_at: '2024-12-04T16:45:00Z',
          anonymous: false,
        },
      ]
      setDonations(mockDonations)
    } catch (error) {
      console.error('Error fetching donations:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterDonations = () => {
    const filtered = donations.filter((donation) => donation.city === selectedCity)
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
        anonymous: isAnonymous,
      }

      setDonations([newDonation, ...donations])
      setShowDonationForm(false)
      setDonationAmount('')
      setDonorName('')
      setDonorMessage('')
      setIsAnonymous(false)

      alert(
        'Thank you for your donation! In production, you would be redirected to Stripe for payment.'
      )
    } catch (error) {
      console.error('Error processing donation:', error)
      alert('There was an error processing your donation. Please try again.')
    }
  }

  const totalDonations = donations.reduce((sum, donation) => sum + donation.amount, 0)
  const cityDonations = donations
    .filter((d) => d.city === selectedCity)
    .reduce((sum, d) => sum + d.amount, 0)

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
      {/* the rest of your component remains unchanged */}
      {/* ... */}
      <Footer />
    </div>
  )
}
