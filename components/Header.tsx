'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Music, Menu, X } from 'lucide-react'
import UserMenu from './UserMenu'

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

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

          {/* Desktop Navigation - All links in header */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link href="/tickets" className="text-orchestra-cream hover:text-orchestra-gold transition-colors">
              Tickets
            </Link>
            <Link href="/studio" className="text-orchestra-cream hover:text-orchestra-gold transition-colors">
              Watch & Explore
            </Link>
            <Link href="/performances" className="text-orchestra-cream hover:text-orchestra-gold transition-colors">
              Performances
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
          </nav>

          {/* Right Side: User Menu */}
          <div className="flex items-center space-x-4">
            <UserMenu />

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden text-orchestra-cream hover:text-orchestra-gold"
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden pb-4">
            <nav className="flex flex-col space-y-4">
              <Link href="/tickets" className="text-orchestra-cream hover:text-orchestra-gold transition-colors">
                Tickets
              </Link>
              <Link href="/studio" className="text-orchestra-cream hover:text-orchestra-gold transition-colors">
                Watch & Explore
              </Link>
              <Link href="/performances" className="text-orchestra-cream hover:text-orchestra-gold transition-colors">
                Performances
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
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}
