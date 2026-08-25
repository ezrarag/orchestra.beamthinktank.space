'use client'

import InstitutionalCohortProfile from '@/components/InstitutionalCohortProfile'
import Link from 'next/link'
import { Building2, Home } from 'lucide-react'

export default function InstitutionalProfilePage() {
  return (
    <div className="min-h-screen bg-[#07080A] text-white">
      {/* Top Navigation Bar */}
      <div className="bg-[#0B0C10] border-b border-white/10 px-6 py-3 flex items-center justify-between">
        <Link
          href="/"
          className="text-xs text-white/60 hover:text-white flex items-center space-x-1.5 transition font-medium"
        >
          <Home className="w-4 h-4 text-amber-400" />
          <span>BEAM Orchestra Home</span>
        </Link>

        <div className="flex items-center space-x-2">
          <span className="px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 text-xs font-mono font-bold flex items-center space-x-1.5">
            <Building2 className="w-3.5 h-3.5" />
            <span>Institutional Cohort & Business Profile</span>
          </span>
        </div>
      </div>

      <InstitutionalCohortProfile />
    </div>
  )
}
