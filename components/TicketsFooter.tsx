'use client'

import Link from 'next/link'
import { Music } from 'lucide-react'

export default function TicketsFooter() {
  return (
    <footer className="bg-transparent border-t border-white/10 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2 text-white/70 hover:text-[#D4AF37] transition-colors">
            <Music className="h-5 w-5" />
            <span className="text-sm font-medium">BEAM Orchestra</span>
          </Link>

          {/* Navigation Links */}
          <nav className="flex items-center gap-6 text-sm">
            <Link href="/tickets" className="text-white/60 hover:text-[#D4AF37] transition-colors">
              Tickets
            </Link>
            <Link href="/studio" className="text-white/60 hover:text-[#D4AF37] transition-colors">
              Studio
            </Link>
            <Link href="/performances" className="text-white/60 hover:text-[#D4AF37] transition-colors">
              Performances
            </Link>
            <Link href="/members" className="text-white/60 hover:text-[#D4AF37] transition-colors">
              Members
            </Link>
            <Link href="/donate" className="text-white/60 hover:text-[#D4AF37] transition-colors">
              Donate
            </Link>
          </nav>

          {/* Copyright */}
          <p className="text-xs text-white/40">
            © 2024 BEAM Orchestra
          </p>
        </div>
      </div>
    </footer>
  )
}





