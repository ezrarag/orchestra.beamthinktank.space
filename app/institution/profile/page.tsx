'use client'

import InstitutionalCohortProfile from '@/components/InstitutionalCohortProfile'
import Link from 'next/link'
import { ArrowLeft, User as UserIcon, Building2 } from 'lucide-react'

export default function InstitutionalProfilePage() {
  return (
    <div className="min-h-screen bg-[#07080A] text-white">
      {/* Top Navigation Bar */}
      <div className="bg-[#0B0C10] border-b border-white/10 px-6 py-3 flex items-center justify-between">
        <Link
          href="/profile"
          className="text-xs text-white/60 hover:text-white flex items-center space-x-1.5 transition font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Switch to Participant Profile</span>
        </Link>

        <div className="flex items-center space-x-2">
          <span className="px-3 py-1 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 text-xs font-mono font-bold flex items-center space-x-1">
            <Building2 className="w-3.5 h-3.5" />
            <span>Institutional Cohort Profile</span>
          </span>
        </div>
      </div>

      <InstitutionalCohortProfile />
    </div>
  )
}
