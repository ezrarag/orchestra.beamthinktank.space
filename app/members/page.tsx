'use client'

import { useState, useEffect } from 'react'
import Footer from '@/components/Footer'
import { Users, Music, MapPin, Filter, Search, Mail, Phone } from 'lucide-react'
// Removed Supabase import for deployment
type Member = {
  id: string
  name: string
  instrument: string
  section?: string    // <-- make optional
  city: string
  phone?: string
  email?: string
  join_date?: string
  status?: string
}

export default function MembersPage() {
  const [members, setMembers] = useState<any[]>([])
  const [filteredMembers, setFilteredMembers] = useState<any[]>([])
  const [selectedCity, setSelectedCity] = useState('Orlando')
  const [selectedInstrument, setSelectedInstrument] = useState('All')
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)

  const cities = ['Orlando', 'Tampa', 'Miami', 'Jacksonville']
  const instruments = [
    'All', 'Violin', 'Viola', 'Cello', 'Double Bass', 'Flute', 'Oboe', 'Clarinet', 
    'Bassoon', 'French Horn', 'Trumpet', 'Trombone', 'Tuba', 'Percussion', 'Piano', 'Harp'
  ]

  useEffect(() => {
    fetchMembers()
  }, [])

  useEffect(() => {
    filterMembers()
  }, [members, selectedCity, selectedInstrument, searchTerm])

  const fetchMembers = async () => {
    try {
      setLoading(true)
      // For demo purposes, using mock data. In production, this would fetch from Supabase
      const mockMembers: Member[] = [
        {
          id: '1',
          name: 'Sarah Johnson',
          instrument: 'Violin',
          email: 'sarah.johnson@email.com',
          phone: '(407) 555-0101',
          city: 'Orlando',
          join_date: '2020-03-15',
          status: 'active'
        },
        {
          id: '2',
          name: 'Michael Chen',
          instrument: 'Cello',
          email: 'michael.chen@email.com',
          phone: '(407) 555-0102',
          city: 'Orlando',
          join_date: '2019-08-22',
          status: 'active'
        },
        {
          id: '3',
          name: 'Lisa Rodriguez',
          instrument: 'Flute',
          email: 'lisa.rodriguez@email.com',
          phone: '(407) 555-0103',
          city: 'Orlando',
          join_date: '2021-01-10',
          status: 'active'
        },
        {
          id: '4',
          name: 'David Thompson',
          instrument: 'French Horn',
          email: 'david.thompson@email.com',
          phone: '(407) 555-0104',
          city: 'Orlando',
          join_date: '2018-11-05',
          status: 'active'
        },
        {
          id: '5',
          name: 'Emily Davis',
          instrument: 'Viola',
          email: 'emily.davis@email.com',
          phone: '(407) 555-0105',
          city: 'Orlando',
          join_date: '2022-06-18',
          status: 'active'
        },
        {
          id: '6',
          name: 'Robert Wilson',
          instrument: 'Percussion',
          email: 'robert.wilson@email.com',
          phone: '(407) 555-0106',
          city: 'Orlando',
          join_date: '2020-09-12',
          status: 'active'
        },
        {
          id: '7',
          name: 'Jennifer Lee',
          instrument: 'Oboe',
          email: 'jennifer.lee@email.com',
          phone: '(407) 555-0107',
          city: 'Orlando',
          join_date: '2021-03-25',
          status: 'active'
        },
        {
          id: '8',
          name: 'Christopher Brown',
          instrument: 'Trumpet',
          email: 'christopher.brown@email.com',
          phone: '(407) 555-0108',
          city: 'Orlando',
          join_date: '2019-12-03',
          status: 'active'
        }
      ]
      
      setMembers(mockMembers)
    } catch (error) {
      console.error('Error fetching members:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterMembers = () => {
    let filtered = members.filter(member => 
      member.city === selectedCity && member.status === 'active'
    )

    if (selectedInstrument !== 'All') {
      filtered = filtered.filter(member => member.instrument === selectedInstrument)
    }

    if (searchTerm) {
      filtered = filtered.filter(member =>
        member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.instrument.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    setFilteredMembers(filtered)
  }

  const getInstrumentIcon = (instrument: string) => {
    const iconMap: { [key: string]: string } = {
      'Violin': '🎻',
      'Viola': '🎻',
      'Cello': '🎻',
      'Double Bass': '🎻',
      'Flute': '🎵',
      'Oboe': '🎵',
      'Clarinet': '🎵',
      'Bassoon': '🎵',
      'French Horn': '🎺',
      'Trumpet': '🎺',
      'Trombone': '🎺',
      'Tuba': '🎺',
      'Percussion': '🥁',
      'Piano': '🎹',
      'Harp': '🎼'
    }
    return iconMap[instrument] || '🎵'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-pattern">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-orchestra-gold text-xl">Loading members...</div>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-pattern">
      
      {/* Page Header */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-serif text-orchestra-dark mb-6">
            Our Members
          </h1>
          <p className="text-lg text-orchestra-brown/80 max-w-2xl mx-auto">
            Meet the talented musicians who make up the BEAM Orchestra community. 
            From seasoned professionals to passionate amateurs, we're united by our love of music.
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

              {/* Instrument Filter */}
              <div className="flex items-center space-x-3">
                <Music className="h-5 w-5 text-orchestra-gold" />
                <select
                  value={selectedInstrument}
                  onChange={(e) => setSelectedInstrument(e.target.value)}
                  className="input-field w-auto min-w-[150px]"
                >
                  {instruments.map((instrument) => (
                    <option key={instrument} value={instrument}>{instrument}</option>
                  ))}
                </select>
              </div>

              {/* Search */}
              <div className="flex items-center space-x-3 flex-1">
                <Search className="h-5 w-5 text-orchestra-gold" />
                <input
                  type="text"
                  placeholder="Search members..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input-field"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Members Grid */}
      <section className="px-4 sm:px-6 lg:px-8 mb-16">
        <div className="max-w-7xl mx-auto">
          {filteredMembers.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-orchestra-brown text-lg">
                No members found for the selected criteria.
              </p>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <p className="text-orchestra-brown text-center">
                  Showing {filteredMembers.length} active members in {selectedCity}
                  {selectedInstrument !== 'All' && ` playing ${selectedInstrument}`}
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredMembers.map((member) => (
                  <div key={member.id} className="card group hover:shadow-2xl transition-all duration-300">
                    <div className="text-center mb-4">
                      <div className="bg-orchestra-gold/20 p-4 rounded-full w-16 h-16 mx-auto mb-3 flex items-center justify-center group-hover:bg-orchestra-gold/30 transition-colors">
                        <span className="text-2xl">{getInstrumentIcon(member.instrument)}</span>
                      </div>
                      <h3 className="text-lg font-serif text-orchestra-dark group-hover:text-orchestra-gold transition-colors">
                        {member.name}
                      </h3>
                      <p className="text-orchestra-gold font-medium">
                        {member.instrument}
                      </p>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center space-x-2 text-orchestra-brown">
                        <MapPin className="h-4 w-4" />
                        <span>{member.city}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-orchestra-brown">
                        <Users className="h-4 w-4" />
                        <span>Member since {new Date(member.join_date).getFullYear()}</span>
                      </div>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-orchestra-gold/20">
                      <div className="flex space-x-2">
                        <a
                          href={`mailto:${member.email}`}
                          className="flex-1 bg-orchestra-gold/10 hover:bg-orchestra-gold/20 text-orchestra-gold p-2 rounded text-center transition-colors"
                          title="Send email"
                        >
                          <Mail className="h-4 w-4 mx-auto" />
                        </a>
                        {member.phone && (
                          <a
                            href={`tel:${member.phone}`}
                            className="flex-1 bg-orchestra-gold/10 hover:bg-orchestra-gold/20 text-orchestra-gold p-2 rounded text-center transition-colors"
                            title="Call"
                          >
                            <Phone className="h-4 w-4 mx-auto" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      {/* Instrument Section Breakdown */}
      <section className="px-4 sm:px-6 lg:px-8 mb-16">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-serif text-orchestra-dark text-center mb-12">
            Orchestra Sections
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {['Strings', 'Woodwinds', 'Brass', 'Percussion'].map((section) => {
              const sectionInstruments = {
                'Strings': ['Violin', 'Viola', 'Cello', 'Double Bass'],
                'Woodwinds': ['Flute', 'Oboe', 'Clarinet', 'Bassoon'],
                'Brass': ['French Horn', 'Trumpet', 'Trombone', 'Tuba'],
                'Percussion': ['Percussion', 'Piano', 'Harp']
              }
              
              const sectionMembers = members.filter(member => 
                member.city === selectedCity && 
                sectionInstruments[section as keyof typeof sectionInstruments].includes(member.instrument)
              )
              
              return (
                <div key={section} className="card text-center">
                  <h3 className="text-xl font-serif text-orchestra-dark mb-3">
                    {section}
                  </h3>
                  <p className="text-3xl font-bold text-orchestra-gold mb-2">
                    {sectionMembers.length}
                  </p>
                  <p className="text-sm text-orchestra-brown">
                    {sectionMembers.length === 1 ? 'Member' : 'Members'}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-orchestra-cream/30">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-serif text-orchestra-dark mb-6">
            Join Our Musical Family
          </h2>
          <p className="text-lg text-orchestra-brown/80 mb-8">
            Are you a musician looking to join our community? We welcome players of all skill levels 
            and are always looking for new members to join our orchestra.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="btn-primary">
              Join the Orchestra
            </button>
            <button className="btn-secondary">
              Contact Us
            </button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
