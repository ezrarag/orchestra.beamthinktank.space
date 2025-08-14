'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { GraduationCap, Target, Users, Award, Filter, BookOpen } from 'lucide-react'
import { supabase, ScholarshipFund } from '@/lib/supabase'

export default function ScholarshipPage() {
  const [scholarshipFunds, setScholarshipFunds] = useState<ScholarshipFund[]>([])
  const [selectedCity, setSelectedCity] = useState('Orlando')
  const [loading, setLoading] = useState(true)
  const [showApplicationForm, setShowApplicationForm] = useState(false)
  const [applicationData, setApplicationData] = useState({
    name: '',
    email: '',
    phone: '',
    city: 'Orlando',
    age: '',
    instrument: '',
    experience: '',
    goals: '',
    financialNeed: ''
  })

  const cities = ['Orlando', 'Tampa', 'Miami', 'Jacksonville']

  useEffect(() => {
    fetchScholarshipFunds()
  }, [])

  const fetchScholarshipFunds = async () => {
    try {
      setLoading(true)
      // For demo purposes, using mock data. In production, this would fetch from Supabase
      const mockScholarshipFunds: ScholarshipFund[] = [
        {
          id: '1',
          city: 'Orlando',
          current_amount: 15000,
          goal_amount: 25000,
          description: 'Supporting young musicians in Orlando with instrument purchases, lessons, and music education programs.',
          last_updated: '2024-12-01T00:00:00Z'
        },
        {
          id: '2',
          city: 'Tampa',
          current_amount: 8000,
          goal_amount: 20000,
          description: 'Providing scholarships for music students in the Tampa Bay area.',
          last_updated: '2024-12-01T00:00:00Z'
        },
        {
          id: '3',
          city: 'Miami',
          current_amount: 12000,
          goal_amount: 30000,
          description: 'Supporting diverse musical talent in Miami with comprehensive scholarship programs.',
          last_updated: '2024-12-01T00:00:00Z'
        },
        {
          id: '4',
          city: 'Jacksonville',
          current_amount: 5000,
          goal_amount: 15000,
          description: 'Building the next generation of musicians in Jacksonville.',
          last_updated: '2024-12-01T00:00Z'
        }
      ]
      
      setScholarshipFunds(mockScholarshipFunds)
    } catch (error) {
      console.error('Error fetching scholarship funds:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApplicationSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // In production, this would submit to Supabase
    alert('Thank you for your application! In production, this would be saved to our database.')
    setShowApplicationForm(false)
    setApplicationData({
      name: '',
      email: '',
      phone: '',
      city: 'Orlando',
      age: '',
      instrument: '',
      experience: '',
      goals: '',
      financialNeed: ''
    })
  }

  const currentFund = scholarshipFunds.find(fund => fund.city === selectedCity)
  const progressPercentage = currentFund ? (currentFund.current_amount / currentFund.goal_amount) * 100 : 0

  if (loading) {
    return (
      <div className="min-h-screen bg-pattern">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-orchestra-gold text-xl">Loading scholarship information...</div>
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
            Scholarship Fund
          </h1>
          <p className="text-lg text-orchestra-brown/80 max-w-2xl mx-auto">
            Supporting the next generation of musicians through comprehensive scholarship programs 
            that make music education accessible to all.
          </p>
        </div>
      </section>

      {/* City Selector */}
      <section className="px-4 sm:px-6 lg:px-8 mb-12">
        <div className="max-w-4xl mx-auto">
          <div className="card">
            <div className="flex items-center justify-center space-x-4">
              <Filter className="h-5 w-5 text-orchestra-gold" />
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="input-field w-auto min-w-[200px]"
              >
                {cities.map((city) => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* Scholarship Progress */}
      {currentFund && (
        <section className="px-4 sm:px-6 lg:px-8 mb-16">
          <div className="max-w-4xl mx-auto">
            <div className="card text-center">
              <h2 className="text-3xl font-serif text-orchestra-dark mb-6">
                {selectedCity} Scholarship Fund
              </h2>
              
              <p className="text-lg text-orchestra-brown/80 mb-8">
                {currentFund.description}
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
                <div>
                  <div className="bg-orchestra-gold/20 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <Target className="h-8 w-8 text-orchestra-gold" />
                  </div>
                  <h3 className="text-xl font-serif text-orchestra-dark mb-2">Goal</h3>
                  <p className="text-2xl font-bold text-orchestra-gold">
                    ${currentFund.goal_amount.toLocaleString()}
                  </p>
                </div>
                
                <div>
                  <div className="bg-orchestra-gold/20 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <Award className="h-8 w-8 text-orchestra-gold" />
                  </div>
                  <h3 className="text-xl font-serif text-orchestra-dark mb-2">Raised</h3>
                  <p className="text-2xl font-bold text-orchestra-gold">
                    ${currentFund.current_amount.toLocaleString()}
                  </p>
                </div>
                
                <div>
                  <div className="bg-orchestra-gold/20 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <GraduationCap className="h-8 w-8 text-orchestra-gold" />
                  </div>
                  <h3 className="text-xl font-serif text-orchestra-dark mb-2">Progress</h3>
                  <p className="text-2xl font-bold text-orchestra-gold">
                    {progressPercentage.toFixed(1)}%
                  </p>
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="mb-6">
                <div className="w-full bg-orchestra-gold/20 rounded-full h-4 mb-2">
                  <div 
                    className="bg-orchestra-gold h-4 rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                  ></div>
                </div>
                <p className="text-sm text-orchestra-brown">
                  ${currentFund.current_amount.toLocaleString()} of ${currentFund.goal_amount.toLocaleString()} raised
                </p>
              </div>
              
              <button 
                onClick={() => setShowApplicationForm(true)}
                className="btn-primary"
              >
                Apply for Scholarship
              </button>
            </div>
          </div>
        </section>
      )}

      {/* What We Fund */}
      <section className="px-4 sm:px-6 lg:px-8 mb-16">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-serif text-orchestra-dark text-center mb-12">
            What We Fund
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="card text-center">
              <div className="bg-orchestra-gold/20 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <BookOpen className="h-8 w-8 text-orchestra-gold" />
              </div>
              <h3 className="text-xl font-serif text-orchestra-dark mb-2">Music Lessons</h3>
              <p className="text-orchestra-brown/80">
                Private and group lessons with qualified music instructors
              </p>
            </div>
            
            <div className="card text-center">
              <div className="bg-orchestra-gold/20 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Award className="h-8 w-8 text-orchestra-gold" />
              </div>
              <h3 className="text-xl font-serif text-orchestra-dark mb-2">Instrument Purchase</h3>
              <p className="text-orchestra-brown/80">
                Assistance with purchasing quality instruments and equipment
              </p>
            </div>
            
            <div className="card text-center">
              <div className="bg-orchestra-gold/20 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Users className="h-8 w-8 text-orchestra-gold" />
              </div>
              <h3 className="text-xl font-serif text-orchestra-dark mb-2">Ensemble Participation</h3>
              <p className="text-orchestra-brown/80">
                Fees for youth orchestras, bands, and chamber groups
              </p>
            </div>
            
            <div className="card text-center">
              <div className="bg-orchestra-gold/20 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <GraduationCap className="h-8 w-8 text-orchestra-gold" />
              </div>
              <h3 className="text-xl font-serif text-orchestra-dark mb-2">Summer Camps</h3>
              <p className="text-orchestra-brown/80">
                Intensive music programs and summer camps
              </p>
            </div>
            
            <div className="card text-center">
              <div className="bg-orchestra-gold/20 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <BookOpen className="h-8 w-8 text-orchestra-gold" />
              </div>
              <h3 className="text-xl font-serif text-orchestra-dark mb-2">Sheet Music</h3>
              <p className="text-orchestra-brown/80">
                Purchase of sheet music and educational materials
              </p>
            </div>
            
            <div className="card text-center">
              <div className="bg-orchestra-gold/20 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Award className="h-8 w-8 text-orchestra-gold" />
              </div>
              <h3 className="text-xl font-serif text-orchestra-dark mb-2">Competition Fees</h3>
              <p className="text-orchestra-brown/80">
                Entry fees for music competitions and festivals
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Application Form Modal */}
      {showApplicationForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-serif text-orchestra-dark mb-6">
              Scholarship Application
            </h3>
            
            <form onSubmit={handleApplicationSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-orchestra-dark font-medium mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={applicationData.name}
                    onChange={(e) => setApplicationData({...applicationData, name: e.target.value})}
                    className="input-field"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-orchestra-dark font-medium mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={applicationData.email}
                    onChange={(e) => setApplicationData({...applicationData, email: e.target.value})}
                    className="input-field"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-orchestra-dark font-medium mb-2">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={applicationData.phone}
                    onChange={(e) => setApplicationData({...applicationData, phone: e.target.value})}
                    className="input-field"
                  />
                </div>
                
                <div>
                  <label className="block text-orchestra-dark font-medium mb-2">
                    City *
                  </label>
                  <select
                    value={applicationData.city}
                    onChange={(e) => setApplicationData({...applicationData, city: e.target.value})}
                    className="input-field"
                    required
                  >
                    {cities.map((city) => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-orchestra-dark font-medium mb-2">
                    Age *
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="25"
                    value={applicationData.age}
                    onChange={(e) => setApplicationData({...applicationData, age: e.target.value})}
                    className="input-field"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-orchestra-dark font-medium mb-2">
                    Primary Instrument *
                  </label>
                  <input
                    type="text"
                    value={applicationData.instrument}
                    onChange={(e) => setApplicationData({...applicationData, instrument: e.target.value})}
                    className="input-field"
                    placeholder="e.g., Violin, Piano, Flute"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-orchestra-dark font-medium mb-2">
                  Musical Experience *
                </label>
                <textarea
                  value={applicationData.experience}
                  onChange={(e) => setApplicationData({...applicationData, experience: e.target.value})}
                  className="input-field"
                  rows={3}
                  placeholder="Describe your musical background, years of study, etc."
                  required
                />
              </div>
              
              <div>
                <label className="block text-orchestra-dark font-medium mb-2">
                  Musical Goals *
                </label>
                <textarea
                  value={applicationData.goals}
                  onChange={(e) => setApplicationData({...applicationData, goals: e.target.value})}
                  className="input-field"
                  rows={3}
                  placeholder="What do you hope to achieve with this scholarship?"
                  required
                />
              </div>
              
              <div>
                <label className="block text-orchestra-dark font-medium mb-2">
                  Financial Need *
                </label>
                <textarea
                  value={applicationData.financialNeed}
                  onChange={(e) => setApplicationData({...applicationData, financialNeed: e.target.value})}
                  className="input-field"
                  rows={3}
                  placeholder="Please explain your financial situation and why you need this scholarship"
                  required
                />
              </div>
              
              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={() => setShowApplicationForm(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary flex-1"
                >
                  Submit Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Call to Action */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-orchestra-cream/30">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-serif text-orchestra-dark mb-6">
            Help Us Support Young Musicians
          </h2>
          <p className="text-lg text-orchestra-brown/80 mb-8">
            Every donation to our scholarship fund directly supports young musicians in their 
            musical journey. Together, we can make music education accessible to all.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="btn-primary">
              Donate to Scholarship Fund
            </button>
            <button 
              onClick={() => setShowApplicationForm(true)}
              className="btn-secondary"
            >
              Apply for Scholarship
            </button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
