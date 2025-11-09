'use client'

import { Music, Mail, Phone, MapPin, Facebook, Instagram, Twitter } from 'lucide-react'
import Link from 'next/link'
import { useUserRole } from '@/lib/hooks/useUserRole'

export default function Footer() {
  const { role } = useUserRole()
  const isAdmin = role === 'beam_admin'
  return (
    <footer className="bg-orchestra-dark text-orchestra-cream">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo and Description */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <Music className="h-8 w-8 text-orchestra-gold" />
              <span className="text-2xl font-serif text-orchestra-gold font-bold">
                BEAM Orchestra
              </span>
            </div>
            <p className="text-orchestra-cream/80 mb-4 max-w-md">
              Building Excellence in Arts and Music. Join our community of passionate musicians 
              and experience the transformative power of classical music.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-orchestra-gold hover:text-orchestra-cream transition-colors">
                <Facebook className="h-6 w-6" />
              </a>
              <a href="#" className="text-orchestra-gold hover:text-orchestra-cream transition-colors">
                <Instagram className="h-6 w-6" />
              </a>
              <a href="#" className="text-orchestra-gold hover:text-orchestra-cream transition-colors">
                <Twitter className="h-6 w-6" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-serif text-orchestra-gold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/performances" className="text-orchestra-cream/80 hover:text-orchestra-gold transition-colors">
                  Performances
                </Link>
              </li>
              <li>
                <Link href="/rehearsals" className="text-orchestra-cream/80 hover:text-orchestra-gold transition-colors">
                  Rehearsals
                </Link>
              </li>
              <li>
                <Link href="/members" className="text-orchestra-cream/80 hover:text-orchestra-gold transition-colors">
                  Members
                </Link>
              </li>
              <li>
                <Link href="/donate" className="text-orchestra-cream/80 hover:text-orchestra-gold transition-colors">
                  Donate
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-lg font-serif text-orchestra-gold mb-4">Contact</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <MapPin className="h-5 w-5 text-orchestra-gold" />
                <span className="text-orchestra-cream/80">Orlando, FL</span>
              </div>
              <div className="flex items-center space-x-2">
                <Mail className="h-5 w-5 text-orchestra-gold" />
                <a href="mailto:info@beamorchestra.org" className="text-orchestra-cream/80 hover:text-orchestra-gold transition-colors">
                  info@beamorchestra.org
                </a>
              </div>
              <div className="flex items-center space-x-2">
                <Phone className="h-5 w-5 text-orchestra-gold" />
                <a href="tel:+14075551234" className="text-orchestra-cream/80 hover:text-orchestra-gold transition-colors">
                  (407) 555-1234
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-orchestra-gold/30 mt-8 pt-8">
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <p className="text-orchestra-cream/60">
              © 2024 BEAM Orchestra. All rights reserved. Building Excellence in Arts and Music.
            </p>
            {isAdmin && (
              <Link 
                href="/admin/dashboard" 
                className="text-xs text-orchestra-gold/60 hover:text-orchestra-gold transition-colors"
              >
                Admin
              </Link>
            )}
          </div>
        </div>
      </div>
    </footer>
  )
}
