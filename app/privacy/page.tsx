import React from 'react'
import Link from 'next/link'
import { ShieldCheck, ArrowLeft, Lock, Building2, HeartHandshake } from 'lucide-react'

export const metadata = {
  title: 'Privacy Policy | BEAM Orchestra Platform',
  description: 'Privacy Policy and Data Use Disclosure for BEAM Orchestra Platform & Google Auth Integration.',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#0B0C10] text-white font-sans selection:bg-amber-400 selection:text-black">
      {/* Header Bar */}
      <div className="border-b border-white/10 bg-black/40 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link
            href="/profile"
            className="text-xs font-semibold text-white/70 hover:text-amber-400 flex items-center space-x-1.5 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Musician Portal</span>
          </Link>
          <div className="flex items-center space-x-2 text-amber-400 font-serif font-bold text-sm">
            <ShieldCheck className="w-4 h-4" />
            <span>BEAM Orchestra Platform</span>
          </div>
        </div>
      </div>

      {/* Main Content Body */}
      <main className="max-w-4xl mx-auto px-6 py-12 space-y-8">
        
        {/* Title Section */}
        <div className="space-y-3 border-b border-white/10 pb-8">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 text-xs font-mono font-bold">
            <Lock className="w-3.5 h-3.5" />
            <span>Official Policy Document</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-white leading-tight">
            Privacy Policy & Data Use Disclosure
          </h1>
          <p className="text-sm text-white/60 font-mono">
            Last Updated: August 26, 2026 | Effective Date: August 26, 2026
          </p>
        </div>

        {/* Core Principles Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-black/50 border border-amber-400/20 space-y-2">
            <div className="flex items-center space-x-2 text-amber-300 font-bold">
              <Building2 className="w-4 h-4" />
              <span>Institutional Contracting Security</span>
            </div>
            <p className="text-white/70 leading-relaxed">
              Musician profile data, CVs, and audition recordings are only shared with authorized institutional orchestra managers and recording session producers.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-black/50 border border-purple-500/20 space-y-2">
            <div className="flex items-center space-x-2 text-purple-300 font-bold">
              <HeartHandshake className="w-4 h-4" />
              <span>Village Backing Transparency</span>
            </div>
            <p className="text-white/70 leading-relaxed">
              Patron contributions on <code className="text-amber-300">hood.beamthinktank.space</code> and stream revenues are explicitly mapped to travel, lodging, and per diem funds.
            </p>
          </div>
        </div>

        {/* Detailed Sections */}
        <div className="space-y-8 text-sm text-white/80 leading-relaxed font-sans">
          
          <section className="space-y-3">
            <h2 className="text-xl font-serif font-bold text-white">1. Information We Collect</h2>
            <p>
              When you interact with the BEAM Orchestra Platform (<code className="text-amber-300">orchestra.beamthinktank.space</code>), we collect information to facilitate institutional contracting, ground/lodging logistics dispatch, and village support allocations:
            </p>
            <ul className="list-disc pl-6 space-y-1 text-white/70">
              <li><strong>Account Authentication:</strong> Google Sign-In profile information (Full Name, Email Address, and Profile Picture URL).</li>
              <li><strong>Musician Demographics & Repertoire:</strong> Primary role/instrument, CV documents, vCards, repertoire focus, and recording portfolio links.</li>
              <li><strong>Logistics Geolocation (Optional):</strong> Opt-in GPS coordinates broadcasted via the Live Location Beacon for residency ground transit and housing dispatch.</li>
              <li><strong>Financial Allocation Preferences:</strong> Custom splits configured for travel, hotel lodging, meals, and instrument maintenance.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-serif font-bold text-white">2. How We Use Your Information</h2>
            <p>We use the collected information strictly for orchestra operations and musician support:</p>
            <ul className="list-disc pl-6 space-y-1 text-white/70">
              <li>Pitching verified musician profiles to BEAM partner institutions, halls, and Steinway recording sessions.</li>
              <li>Dispatching travel reimbursements, residency housing, and per diem meals.</li>
              <li>Managing village patron backing from <code className="text-amber-300">hood.beamthinktank.space</code> and stream revenue shares.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-serif font-bold text-white">3. Information Sharing & Third Parties</h2>
            <p>
              We do not sell, rent, or monetize your personal information. Your profile details are shared only with verified BEAM node administrators, contracting orchestra directors, and connected subdomains within the BEAM ecosystem (<code className="text-amber-300">grounds.beamthinktank.space</code> and <code className="text-amber-300">hood.beamthinktank.space</code>).
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-serif font-bold text-white">4. Data Protection & Your Rights</h2>
            <p>
              All recording assets and profile records are stored securely in Google Firebase infrastructure. You retain the right to edit, update, or delete your portfolio recordings and demographic data at any time via your participant dashboard.
            </p>
          </section>

          <section className="space-y-3 border-t border-white/10 pt-6">
            <h2 className="text-xl font-serif font-bold text-white">5. Contact Us</h2>
            <p>
              If you have questions regarding this Privacy Policy or Google Auth data disclosures, please contact our team:
            </p>
            <div className="p-4 rounded-xl bg-black/60 border border-white/10 font-mono text-xs text-amber-300 space-y-1">
              <p>Email: privacy@beamthinktank.space</p>
              <p>Domain: orchestra.beamthinktank.space</p>
              <p>BEAM Think Tank Infrastructure Team</p>
            </div>
          </section>

        </div>

      </main>
    </div>
  )
}
