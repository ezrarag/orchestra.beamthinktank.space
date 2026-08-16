'use client'

import { useState, useEffect, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Users, 
  Music, 
  Calendar, 
  DollarSign, 
  Coins, 
  Upload, 
  Play,
  ChevronDown,
  ChevronUp,
  MapPin,
  Clock,
  Award,
  Info,
  Download,
  Phone,
  Mail,
  Linkedin,
  CheckCircle,
  AlertCircle,
  ArrowLeft
} from 'lucide-react'
import { getEnsembleConfig, EnsembleConfig } from '@/lib/config/ensembles'
import MusicianProfileModal from '@/components/MusicianProfileModal'
import { useUserRole } from '@/lib/hooks/useUserRole'
import { db } from '@/lib/firebase'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import Link from 'next/link'
import { useParams } from 'next/navigation'

type MusicianDetail = {
  id?: string
  name: string
  email?: string | null
  phone?: string | null
  status: 'Pending' | 'Interested' | 'Confirmed' | 'Open' | 'pending' | 'interested' | 'confirmed' | 'open'
  source?: string
  notes?: string | null
  bio?: string | null
  headshotUrl?: string | null
  mediaEmbedUrl?: string | null
  supportLink?: string | null
  instrument?: string
  role?: string
  projectId?: string
}

type RosterSection = {
  instrument: string
  needed: number
  confirmed: number
  remaining: number
  percentage: number
  musicians: string[]
  musicianDetails: MusicianDetail[]
}

const navigationSections = [
  { id: 'roster', label: 'Roster', icon: Users },
  { id: 'materials', label: 'Materials', icon: Upload },
  { id: 'compensation', label: 'Compensation', icon: DollarSign },
  { id: 'schedule', label: 'Rehearsals', icon: Calendar },
  { id: 'faq', label: 'FAQ', icon: Info }
]

function groupByInstrument(musicians: any[]): RosterSection[] {
  const instrumentRequirements: Record<string, number> = {
    'Violin I': 6,
    'Violin II': 6,
    'Viola': 6,
    'Cello': 4,
    'Bass': 3,
    'Flute': 2,
    'Oboe': 2,
    'Clarinet': 2,
    'Bassoon': 2,
    'Horn': 4,
    'Trumpet': 3,
    'Trombone': 3,
    'Tuba': 1,
    'Conductor': 1,
  }

  const map: Record<string, any[]> = {}
  
  musicians.forEach((m) => {
    const instrument = m.instrument || 'Other'
    if (!map[instrument]) map[instrument] = []
    
    let status: 'Pending' | 'Interested' | 'Confirmed' | 'Open' = 'Interested'
    if (m.status === 'confirmed' || m.status === 'Confirmed') status = 'Confirmed'
    else if (m.status === 'pending' || m.status === 'Pending') status = 'Pending'
    else if (m.status === 'open' || m.status === 'Open') status = 'Open'
    
    map[instrument].push({
      name: m.name || 'Unknown',
      email: m.email || null,
      phone: m.phone || null,
      status,
      source: m.source || 'Unknown',
      notes: m.notes || '',
      bio: m.bio || '',
      headshotUrl: m.headshotUrl || '',
      mediaEmbedUrl: m.mediaEmbedUrl || '',
      supportLink: m.supportLink || '',
      instrument,
    })
  })

  const allInstruments = new Set([
    ...Object.keys(instrumentRequirements),
    ...Object.keys(map),
  ])

  return Array.from(allInstruments).map((instrument) => {
    const details = map[instrument] || []
    const confirmed = details.filter((m) => m.status === 'Confirmed').length
    const needed = instrumentRequirements[instrument] || 0
    const remaining = Math.max(0, needed - confirmed)
    const percentage = needed > 0 ? Math.round((confirmed / needed) * 100) : 0

    return {
      instrument,
      needed,
      confirmed,
      remaining,
      percentage,
      musicians: details.filter((m) => m.status === 'Confirmed').map((m) => m.name),
      musicianDetails: details,
    }
  })
}

export default function EnsembleProjectHubPage() {
  const params = useParams()
  const slug = (params?.slug as string) || 'black-diaspora-symphony'
  const config = getEnsembleConfig(slug)

  const { user } = useUserRole()
  const [rosterData, setRosterData] = useState<RosterSection[]>([])
  const [rosterLoading, setRosterLoading] = useState(true)
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null)
  const [showMusicianModal, setShowMusicianModal] = useState(false)
  const [selectedMusician, setSelectedMusician] = useState<any>(null)
  const [activeSection, setActiveSection] = useState('roster')

  useEffect(() => {
    if (!db) {
      setRosterLoading(false)
      return
    }

    const q = query(
      collection(db, 'projectMusicians'),
      where('projectId', '==', slug)
    )

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const musicians: MusicianDetail[] = snapshot.docs.map((doc) => {
          const data = doc.data()
          return {
            id: doc.id,
            name: data.name || '',
            email: data.email || null,
            phone: data.phone || null,
            instrument: data.instrument || '',
            status: data.status || 'pending',
            role: data.role || 'musician',
            notes: data.notes || null,
            bio: data.bio || null,
            headshotUrl: data.headshotUrl || null,
            mediaEmbedUrl: data.mediaEmbedUrl || null,
            supportLink: data.supportLink || null,
            source: data.source || '',
            projectId: data.projectId || '',
          }
        })
        const grouped = groupByInstrument(musicians)
        setRosterData(grouped)
        setRosterLoading(false)
      },
      (error) => {
        console.error(`Error loading roster for ${slug}:`, error)
        setRosterLoading(false)
      }
    )

    return () => unsubscribe()
  }, [slug])

  const totalNeeded = rosterData.reduce((sum, section) => sum + section.needed, 0) || config.recruitmentTarget
  const totalConfirmed = rosterData.reduce((sum, section) => sum + section.confirmed, 0) || config.confirmedMusicians
  const overallPercentage = Math.round((totalConfirmed / totalNeeded) * 100)

  const scrollToSection = (sectionId: string) => {
    setActiveSection(sectionId)
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const handleOpenMusicianProfile = (instrument: string | undefined, musician: MusicianDetail) => {
    setSelectedMusician({
      name: musician.name,
      email: musician.email || '',
      status: musician.status,
      source: musician.source || '',
      notes: musician.notes || undefined,
      bio: musician.bio || undefined,
      headshotUrl: musician.headshotUrl || undefined,
      mediaEmbedUrl: musician.mediaEmbedUrl || undefined,
      supportLink: musician.supportLink || undefined,
      instrument: instrument || musician.instrument || '',
    })
    setShowMusicianModal(true)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 text-white">
      {/* Top Breadcrumb Nav */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <Link 
          href="/training" 
          className="inline-flex items-center text-purple-300 hover:text-white transition-colors text-sm font-medium mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Training Projects
        </Link>
      </div>

      {/* Hero Header */}
      <section className="relative overflow-hidden py-12 px-4 sm:px-6 lg:px-8 border-b border-white/10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-4xl mx-auto">
            <span className="inline-block px-4 py-1.5 bg-purple-500/20 text-purple-300 text-sm font-semibold rounded-full mb-4 border border-purple-500/30">
              {config.city} • {config.status} Contract Project
            </span>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-white mb-6">
              {config.name}
            </h1>
            <p className="text-xl text-purple-200 mb-8 leading-relaxed">
              {config.subtitle}
            </p>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10">
              <div>
                <div className="text-2xl font-bold text-white">{totalConfirmed} / {totalNeeded}</div>
                <div className="text-xs text-purple-300 font-medium mt-1">Musicians Confirmed</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-400">${config.compensation.usdTotal}</div>
                <div className="text-xs text-purple-300 font-medium mt-1">Max USD Stipend</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-amber-400">{config.compensation.beamCoinsTotal} Coins</div>
                <div className="text-xs text-purple-300 font-medium mt-1">BEAM Rewards</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-400">{overallPercentage}%</div>
                <div className="text-xs text-purple-300 font-medium mt-1">Roster Filled</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Navigation Sticky Bar */}
      <div className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-white/10 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-center space-x-2 md:space-x-6 py-3 overflow-x-auto">
          {navigationSections.map((sec) => {
            const Icon = sec.icon
            return (
              <button
                key={sec.id}
                onClick={() => scrollToSection(sec.id)}
                className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeSection === sec.id
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-gray-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-4 h-4 mr-2" />
                {sec.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">
        {/* Roster Section */}
        <section id="roster" className="scroll-mt-20">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">Ensemble Roster Status</h2>
              <p className="text-gray-400">Current player recruitment and section progress</p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold text-purple-300">{overallPercentage}%</span>
              <span className="text-xs text-gray-400 block">Overall Target</span>
            </div>
          </div>

          <div className="w-full bg-white/10 rounded-full h-3 mb-8 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-purple-500 to-blue-500 h-full rounded-full transition-all duration-1000"
              style={{ width: `${Math.min(overallPercentage, 100)}%` }}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rosterData.map((sec) => (
              <div key={sec.instrument} className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 hover:border-purple-500/30 transition-all">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-bold text-white">{sec.instrument}</h3>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-300">
                    {sec.confirmed} / {sec.needed}
                  </span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2 mb-4">
                  <div 
                    className="bg-purple-400 h-full rounded-full"
                    style={{ width: `${Math.min(sec.percentage, 100)}%` }}
                  />
                </div>
                <div className="space-y-2 max-h-36 overflow-y-auto pr-1 text-sm">
                  {sec.musicianDetails.map((m, idx) => (
                    <div 
                      key={idx} 
                      onClick={() => handleOpenMusicianProfile(sec.instrument, m)}
                      className="flex items-center justify-between p-2 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer transition-colors"
                    >
                      <span className="text-gray-200 font-medium truncate">{m.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                        m.status === 'Confirmed' ? 'bg-green-500/20 text-green-300' : 'bg-amber-500/20 text-amber-300'
                      }`}>
                        {m.status}
                      </span>
                    </div>
                  ))}
                  {sec.musicianDetails.length === 0 && (
                    <span className="text-xs text-gray-500 italic">Positions open for application</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Materials / Repertoire Section */}
        <section id="materials" className="scroll-mt-20">
          <h2 className="text-3xl font-bold text-white mb-6">Repertoire & Audition Excerpts</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {config.repertoire.map((rep) => (
              <div key={rep.title} className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
                <div className="text-xs font-semibold text-purple-400 uppercase tracking-wider mb-1">{rep.composer}</div>
                <h3 className="text-2xl font-bold text-white mb-3">{rep.title}</h3>
                <p className="text-gray-300 text-sm leading-relaxed mb-6">{rep.description}</p>
                <div className="flex items-center justify-between pt-4 border-t border-white/10">
                  <span className="text-xs text-gray-400">Audition excerpts available</span>
                  <button className="inline-flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold rounded-lg transition-colors">
                    <Download className="w-4 h-4 mr-2" />
                    Download Parts
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Compensation Section */}
        <section id="compensation" className="scroll-mt-20">
          <h2 className="text-3xl font-bold text-white mb-6">Compensation & BEAM Rewards</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-gradient-to-br from-purple-900/40 to-slate-900/40 backdrop-blur-md rounded-2xl p-8 border border-purple-500/30">
              <div className="flex items-center space-x-3 mb-6">
                <DollarSign className="w-8 h-8 text-green-400" />
                <div>
                  <h3 className="text-xl font-bold text-white">USD Project Stipend</h3>
                  <p className="text-xs text-gray-400">Up to ${config.compensation.usdTotal} total payout</p>
                </div>
              </div>
              <div className="space-y-4">
                {config.compensation.rates.map((rate) => (
                  <div key={rate.event} className="flex justify-between items-center p-3 rounded-lg bg-white/5">
                    <div>
                      <span className="text-white font-medium block">{rate.event}</span>
                      <span className="text-xs text-gray-400">{rate.hours}</span>
                    </div>
                    <span className="text-lg font-bold text-green-400">${rate.usd}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gradient-to-br from-amber-900/40 to-slate-900/40 backdrop-blur-md rounded-2xl p-8 border border-amber-500/30">
              <div className="flex items-center space-x-3 mb-6">
                <Coins className="w-8 h-8 text-amber-400" />
                <div>
                  <h3 className="text-xl font-bold text-white">BEAM Coin Earnings</h3>
                  <p className="text-xs text-gray-400">Up to {config.compensation.beamCoinsTotal} BEAM Coins per project</p>
                </div>
              </div>
              <div className="space-y-4">
                {config.compensation.rates.map((rate) => (
                  <div key={rate.event} className="flex justify-between items-center p-3 rounded-lg bg-white/5">
                    <div>
                      <span className="text-white font-medium block">{rate.event}</span>
                      <span className="text-xs text-gray-400">{rate.hours}</span>
                    </div>
                    <span className="text-lg font-bold text-amber-400">+{rate.beam} Coins</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Schedule Section */}
        <section id="schedule" className="scroll-mt-20">
          <h2 className="text-3xl font-bold text-white mb-6">Rehearsal & Performance Schedule</h2>
          <div className="space-y-4">
            {config.rehearsalSchedule.map((item, idx) => (
              <div key={idx} className="flex flex-col md:flex-row items-start md:items-center justify-between bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
                <div className="flex items-center space-x-4 mb-4 md:mb-0">
                  <div className="w-12 h-12 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center font-bold">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">{item.title}</h3>
                    <span className="text-sm text-gray-400">{item.date} • {item.time}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-3 text-sm text-gray-300">
                  <MapPin className="w-4 h-4 text-purple-400" />
                  <span>{item.location}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ Section */}
        <section id="faq" className="scroll-mt-20">
          <h2 className="text-3xl font-bold text-white mb-6">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {config.faqs.map((faq, idx) => (
              <div key={idx} className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                <button
                  onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                  className="w-full flex justify-between items-center p-6 text-left hover:bg-white/5 transition-colors"
                >
                  <span className="font-semibold text-white">{faq.question}</span>
                  {expandedFaq === idx ? (
                    <ChevronUp className="w-5 h-5 text-purple-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </button>
                {expandedFaq === idx && (
                  <div className="p-6 pt-0 text-gray-300 text-sm leading-relaxed border-t border-white/5">
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Musician Profile Modal */}
      {showMusicianModal && selectedMusician && (
        <MusicianProfileModal
          isOpen={showMusicianModal}
          onClose={() => setShowMusicianModal(false)}
          musician={selectedMusician}
        />
      )}
    </div>
  )
}
