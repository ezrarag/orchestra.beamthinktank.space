'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Music, Menu, X, MapPin } from 'lucide-react'

const cities = ['Orlando', 'Tampa', 'Miami', 'Jacksonville']

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [selectedCity, setSelectedCity] = useState('Orlando')

  return (
    <header className="bg-orchestra-dark/90 backdrop-blur-md border-b border-orchestra-gold/30 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <Music className="h-8 w-8 text-orchestra-gold" />
            <span className="text-2xl font-serif text-orchestra-gold font-bold">
              BEAM Orchestra
            </span>
          </Link>

          {/* City Selector */}
          <div className="hidden md:flex items-center space-x-2">
            <MapPin className="h-5 w-5 text-orchestra-gold" />
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="bg-transparent text-orchestra-cream border border-orchestra-gold/30 rounded-lg px-3 py-1 focus:outline-none focus:ring-2 focus:ring-orchestra-gold"
            >
              {cities.map((city) => (
                <option key={city} value={city} className="bg-orchestra-dark text-orchestra-cream">
                  {city}
                </option>
              ))}
            </select>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link href="/performances" className="text-orchestra-cream hover:text-orchestra-gold transition-colors">
              Performances
            </Link>
            <Link href="/rehearsals" className="text-orchestra-cream hover:text-orchestra-gold transition-colors">
              Rehearsals
            </Link>
            <Link href="/training" className="text-orchestra-cream hover:text-orchestra-gold transition-colors">
              Training
            </Link>
            <Link href="/members" className="text-orchestra-cream hover:text-orchestra-gold transition-colors">
              Members
            </Link>
            <Link href="/donate" className="text-orchestra-cream hover:text-orchestra-gold transition-colors">
              Donate
            </Link>
            <Link href="/scholarship" className="text-orchestra-cream hover:text-orchestra-gold transition-colors">
              Scholarship
            </Link>
          </nav>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden text-orchestra-cream hover:text-orchestra-gold"
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden pb-4">
            <div className="flex flex-col space-y-4">
              <div className="flex items-center space-x-2">
                <MapPin className="h-5 w-5 text-orchestra-gold" />
                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="bg-transparent text-orchestra-cream border border-orchestra-gold/30 rounded-lg px-3 py-1 focus:outline-none focus:ring-2 focus:ring-orchestra-gold"
                >
                  {cities.map((city) => (
                    <option key={city} value={city} className="bg-orchestra-dark text-orchestra-cream">
                      {city}
                    </option>
                  ))}
                </select>
              </div>
              <Link href="/performances" className="text-orchestra-cream hover:text-orchestra-gold transition-colors">
                Performances
              </Link>
              <Link href="/rehearsals" className="text-orchestra-cream hover:text-orchestra-gold transition-colors">
                Rehearsals
              </Link>
              <Link href="/training" className="text-orchestra-cream hover:text-orchestra-gold transition-colors">
                Training
              </Link>
              <Link href="/members" className="text-orchestra-cream hover:text-orchestra-gold transition-colors">
                Members
              </Link>
              <Link href="/donate" className="text-orchestra-cream hover:text-orchestra-gold transition-colors">
                Donate
              </Link>
              <Link href="/scholarship" className="text-orchestra-cream hover:text-orchestra-gold transition-colors">
                Scholarship
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
