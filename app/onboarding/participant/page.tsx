'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  User, 
  Music, 
  MapPin, 
  Plane, 
  Home as HomeIcon, 
  Utensils, 
  Wrench, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  Sparkles, 
  ShieldCheck, 
  Coins, 
  Briefcase,
  Compass
} from 'lucide-react'
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth'
import { auth, db } from '@/lib/firebase'
import { useUserRole } from '@/lib/hooks/useUserRole'
import { upsertProfile, getProfileById } from '@/lib/profiles'
import type { Profile, PipelineSourceTag } from '@/lib/types/profile'
import { useRouter } from 'next/navigation'
import AuthButtons from '@/components/AuthButtons'
import Link from 'next/link'

const ROLE_OPTIONS = [
  { id: 'string_player', label: 'String Player', description: 'Violin, Viola, Cello, Double Bass, Harp' },
  { id: 'woodwind_brass', label: 'Winds & Brass', description: 'Flute, Oboe, Clarinet, Bassoon, Horn, Trumpet, Trombone, Tuba' },
  { id: 'percussion_keyboards', label: 'Percussion & Timpani', description: 'Timpani, Mallets, Auxiliary Percussion, Piano' },
  { id: 'conductor', label: 'Conductor', description: 'Music Director, Guest Conductor, Assistant Conductor' },
  { id: 'composer_arranger', label: 'Composer / Arranger', description: 'Orchestrator, Transcriber, Original Composition' },
  { id: 'media_editor', label: 'Media Editor', description: 'Audio Engineer, Video Editor, Content Producer' }
]

const PIPELINE_SOURCES: PipelineSourceTag[] = [
  'BDSO Core',
  'Concord Candidate',
  'MYSO Alumni',
  'ASO Sub/Reject List',
  'BEAM Talent Pipeline'
]

const CITY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  'milwaukee, wi': { lat: 43.0389, lng: -87.9065 },
  'milwaukee': { lat: 43.0389, lng: -87.9065 },
  'madison, wi': { lat: 43.0731, lng: -89.4012 },
  'concord': { lat: 43.2081, lng: -71.5376 },
  'chicago, il': { lat: 41.8781, lng: -87.6298 },
  'orlando, fl': { lat: 28.5383, lng: -81.3792 },
  'miami, fl': { lat: 25.7617, lng: -80.1918 },
  'tampa, fl': { lat: 27.9506, lng: -82.4572 },
  'atlanta, ga': { lat: 33.749, lng: -84.388 }
}

function parseCoordinates(cityState: string): { lat: number; lng: number } {
  const normalized = cityState.trim().toLowerCase()
  if (CITY_COORDINATES[normalized]) {
    return CITY_COORDINATES[normalized]
  }
  // Default Midwest regional baseline if unknown city
  return { lat: 43.0389, lng: -87.9065 }
}

export default function ParticipantOnboardingPage() {
  const router = useRouter()
  const { user } = useUserRole()

  const [step, setStep] = useState<0 | 1 | 2 | 3>(0)
  const [loading, setLoading] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Step 1 State: Craft & Instrument
  const [primaryRole, setPrimaryRole] = useState('String Player')
  const [specificInstrument, setSpecificInstrument] = useState('')
  const [pipelineSource, setPipelineSource] = useState<PipelineSourceTag>('BEAM Talent Pipeline')

  // Step 2 State: Logistics & Support
  const [cityState, setCityState] = useState('Milwaukee, WI')
  const [willingnessToTravel, setWillingnessToTravel] = useState(true)
  const [needsHousing, setNeedsHousing] = useState(true)
  const [needsFlights, setNeedsFlights] = useState(true)
  const [needsMeals, setNeedsMeals] = useState(true)
  const [equipmentDetails, setEquipmentDetails] = useState('')

  // Load existing profile if user is already authenticated
  useEffect(() => {
    if (user) {
      if (step === 0) {
        setStep(1)
      }
      loadExistingProfile(user.uid)
    }
  }, [user])

  const loadExistingProfile = async (uid: string) => {
    try {
      const existing = await getProfileById(uid)
      if (existing) {
        if (existing.instrument) setSpecificInstrument(existing.instrument)
        if (existing.section) setPrimaryRole(existing.section)
        if (existing.city_state || existing.location) setCityState(existing.city_state || existing.location)
        if (typeof existing.willingness_to_travel === 'boolean') setWillingnessToTravel(existing.willingness_to_travel)
        if (existing.pipeline_source) setPipelineSource(existing.pipeline_source)
        if (existing.infrastructure_needs) {
          setNeedsHousing(Boolean(existing.infrastructure_needs.housing))
          setNeedsFlights(Boolean(existing.infrastructure_needs.flights_transport || existing.infrastructure_needs.flightsTransport))
          setNeedsMeals(Boolean(existing.infrastructure_needs.meals_per_diem || existing.infrastructure_needs.mealsPerDiem))
          if (existing.infrastructure_needs.equipment_details || existing.infrastructure_needs.equipmentDetails) {
            setEquipmentDetails(existing.infrastructure_needs.equipment_details || existing.infrastructure_needs.equipmentDetails || '')
          }
        }
      }
    } catch (error) {
      console.error('Error loading existing profile:', error)
    }
  }

  const handleGoogleSignIn = async () => {
    if (!auth) {
      setErrorMessage('Firebase Auth is not initialized.')
      return
    }

    try {
      setLoading(true)
      setErrorMessage(null)
      const provider = new GoogleAuthProvider()
      await signInWithPopup(auth, provider)
      setStep(1)
    } catch (error: any) {
      console.error('Google Sign-In failed:', error)
      setErrorMessage(error?.message || 'Google Sign-In failed.')
    } finally {
      setLoading(false)
    }
  }

  const handleCompleteOnboarding = async () => {
    if (!user) {
      setErrorMessage('Please sign in to complete onboarding.')
      setStep(0)
      return
    }

    if (!specificInstrument.trim()) {
      setErrorMessage('Please enter your primary instrument or tool.')
      return
    }

    try {
      setSaveStatus('saving')
      setErrorMessage(null)

      const coords = parseCoordinates(cityState)

      const profilePayload: Profile = {
        id: user.uid,
        name: user.displayName || user.email?.split('@')[0] || 'Musician Candidate',
        email: user.email || '',
        contact: user.email || 'N/A',
        photoUrl: user.photoURL || undefined,
        location: cityState,
        city_state: cityState,
        cityState: cityState,
        location_coordinates: coords,
        locationCoordinates: coords,
        willingness_to_travel: willingnessToTravel,
        willingnessToTravel: willingnessToTravel,
        pipeline_source: pipelineSource,
        pipelineSource: pipelineSource,
        ensemble_affiliations: [pipelineSource],
        ensembleAffiliations: [pipelineSource],
        infrastructure_needs: {
          housing: needsHousing,
          flights_transport: needsFlights,
          flightsTransport: needsFlights,
          meals_per_diem: needsMeals,
          mealsPerDiem: needsMeals,
          equipment_details: equipmentDetails.trim(),
          equipmentDetails: equipmentDetails.trim(),
        },
        infrastructureNeeds: {
          housing: needsHousing,
          flightsTransport: needsFlights,
          mealsPerDiem: needsMeals,
          equipmentDetails: equipmentDetails.trim(),
        },
        types: ['musician'],
        instrument: specificInstrument.trim(),
        section: primaryRole,
      }

      await upsertProfile(profilePayload)

      setSaveStatus('success')
      setStep(3)

      // Redirect to destination dashboard after brief success animation
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)

    } catch (error: any) {
      console.error('Failed to save profile:', error)
      setSaveStatus('error')
      setErrorMessage('Failed to save your profile. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 text-white selection:bg-purple-500 selection:text-white flex flex-col justify-between">
      {/* Top Header */}
      <header className="border-b border-white/10 py-6 px-4 sm:px-6 lg:px-8 bg-slate-950/60 backdrop-blur-md">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/home" className="flex items-center space-x-3 text-xs uppercase tracking-[0.28em] font-semibold">
            <span className="text-white font-bold">BEAM</span>
            <span className="text-white/30">·</span>
            <span className="text-purple-400">Onboarding</span>
          </Link>

          {/* Progress Indicator */}
          <div className="flex items-center space-x-2 text-xs font-mono text-purple-300">
            <span className="px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/30">
              Step {step} of 3
            </span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-3xl mx-auto px-4 py-12 w-full my-auto">
        <AnimatePresence mode="wait">
          
          {/* STEP 0: Authentication */}
          {step === 0 && (
            <motion.div
              key="step0"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="bg-white/5 backdrop-blur-md rounded-3xl p-8 sm:p-12 border border-white/10 space-y-8 text-center shadow-2xl"
            >
              <div className="inline-flex p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-300 mx-auto">
                <Sparkles className="w-8 h-8" />
              </div>

              <div>
                <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-white mb-3">
                  Join the BEAM Talent Pipeline
                </h1>
                <p className="text-gray-300 text-base sm:text-lg max-w-xl mx-auto">
                  Frictionless onboarding for musicians, media editors, conductors, and arrangers across our symphonic network.
                </p>
              </div>

              {errorMessage && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
                  {errorMessage}
                </div>
              )}

              <div className="space-y-4 max-w-md mx-auto">
                <button
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-white text-slate-950 font-bold hover:bg-slate-100 transition-all shadow-xl text-base disabled:opacity-50"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                  <span>{loading ? 'Signing in...' : 'Fast Google Sign-In'}</span>
                </button>

                <div className="pt-2">
                  <AuthButtons 
                    onSignInSuccess={() => setStep(1)} 
                    onError={(err) => setErrorMessage(err)}
                    mobileFriendly={true} 
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 1: Craft & Instrument */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="bg-white/5 backdrop-blur-md rounded-3xl p-8 sm:p-12 border border-white/10 space-y-8 shadow-2xl"
            >
              <div>
                <span className="text-xs uppercase font-bold tracking-[0.2em] text-purple-400 block mb-1">Step 1 of 3</span>
                <h2 className="text-3xl font-bold text-white mb-2">Craft & Instrument</h2>
                <p className="text-gray-300 text-sm">Select your primary role and specific instrument or production tool.</p>
              </div>

              {/* Role Card Selection Grid */}
              <div className="space-y-3">
                <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 block">Primary Role</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {ROLE_OPTIONS.map((role) => (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => setPrimaryRole(role.label)}
                      className={`p-4 rounded-2xl border text-left transition-all ${
                        primaryRole === role.label
                          ? 'bg-purple-600/30 border-purple-400 text-white shadow-lg shadow-purple-500/20'
                          : 'bg-white/5 border-white/10 text-gray-300 hover:border-white/25 hover:bg-white/10'
                      }`}
                    >
                      <div className="font-bold text-sm text-white mb-1 flex items-center justify-between">
                        <span>{role.label}</span>
                        {primaryRole === role.label && <CheckCircle2 className="w-4 h-4 text-purple-400" />}
                      </div>
                      <div className="text-xs text-gray-400">{role.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Specific Instrument Input */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 block">
                  Specific Instrument / Production Tool <span className="text-purple-400">*</span>
                </label>
                <input
                  type="text"
                  value={specificInstrument}
                  onChange={(e) => setSpecificInstrument(e.target.value)}
                  placeholder="e.g. Violin I, Cello, Audio Mixing / Logic Pro, Conductor Baton"
                  className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-400 transition-all text-sm"
                />
              </div>

              {/* Pipeline Source Tag */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 block">
                  Pipeline Tag / Affiliation
                </label>
                <select
                  value={pipelineSource}
                  onChange={(e) => setPipelineSource(e.target.value as PipelineSourceTag)}
                  className="w-full bg-slate-900 border border-white/15 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-400 transition-all text-sm"
                >
                  {PIPELINE_SOURCES.map((source) => (
                    <option key={source} value={source} className="bg-slate-900 text-white">
                      {source}
                    </option>
                  ))}
                </select>
              </div>

              {errorMessage && (
                <p className="text-xs text-red-300 font-medium">{errorMessage}</p>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setStep(0)}
                  className="text-xs font-semibold text-gray-400 hover:text-white flex items-center gap-1 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!specificInstrument.trim()) {
                      setErrorMessage('Please specify your instrument or tool.')
                      return
                    }
                    setErrorMessage(null)
                    setStep(2)
                  }}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition-all shadow-lg text-sm"
                >
                  Next: Logistics & Support <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 2: Logistics & Support */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="bg-white/5 backdrop-blur-md rounded-3xl p-8 sm:p-12 border border-white/10 space-y-8 shadow-2xl"
            >
              <div>
                <span className="text-xs uppercase font-bold tracking-[0.2em] text-purple-400 block mb-1">Step 2 of 3</span>
                <h2 className="text-3xl font-bold text-white mb-2">Logistics & Support</h2>
                <p className="text-gray-300 text-sm">Configure your home base, travel availability, and wraparound support needs.</p>
              </div>

              {/* Home Base City/State */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 block">
                  Current Home Base (City, State)
                </label>
                <div className="relative">
                  <MapPin className="w-5 h-5 text-purple-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    value={cityState}
                    onChange={(e) => setCityState(e.target.value)}
                    placeholder="e.g. Milwaukee, WI or Chicago, IL"
                    className="w-full bg-white/5 border border-white/15 rounded-xl pl-11 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-400 transition-all text-sm"
                  />
                </div>
              </div>

              {/* Willingness to Travel Toggle */}
              <div className="bg-white/5 rounded-2xl p-5 border border-white/10 flex items-center justify-between">
                <div>
                  <div className="font-bold text-sm text-white flex items-center gap-2">
                    <Plane className="w-4 h-4 text-purple-400" /> Willingness to Travel for Projects
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">Available for multi-city performances (e.g. Concord, Orlando, Miami)</div>
                </div>
                <button
                  type="button"
                  onClick={() => setWillingnessToTravel(!willingnessToTravel)}
                  className={`w-14 h-8 rounded-full transition-colors p-1 flex items-center ${
                    willingnessToTravel ? 'bg-purple-600 justify-end' : 'bg-gray-700 justify-start'
                  }`}
                >
                  <motion.div layout className="w-6 h-6 rounded-full bg-white shadow-md" />
                </button>
              </div>

              {/* Infrastructure Support Needs Checkboxes */}
              <div className="space-y-3">
                <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 block">
                  Wraparound Support Requirements
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setNeedsHousing(!needsHousing)}
                    className={`p-4 rounded-2xl border text-left transition-all ${
                      needsHousing ? 'bg-purple-600/30 border-purple-400 text-white' : 'bg-white/5 border-white/10 text-gray-400'
                    }`}
                  >
                    <HomeIcon className="w-5 h-5 mb-2 text-purple-300" />
                    <div className="font-bold text-xs">Housing Support</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNeedsFlights(!needsFlights)}
                    className={`p-4 rounded-2xl border text-left transition-all ${
                      needsFlights ? 'bg-purple-600/30 border-purple-400 text-white' : 'bg-white/5 border-white/10 text-gray-400'
                    }`}
                  >
                    <Plane className="w-5 h-5 mb-2 text-purple-300" />
                    <div className="font-bold text-xs">Flights / Transit</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNeedsMeals(!needsMeals)}
                    className={`p-4 rounded-2xl border text-left transition-all ${
                      needsMeals ? 'bg-purple-600/30 border-purple-400 text-white' : 'bg-white/5 border-white/10 text-gray-400'
                    }`}
                  >
                    <Utensils className="w-5 h-5 mb-2 text-purple-300" />
                    <div className="font-bold text-xs">Meals / Per Diem</div>
                  </button>
                </div>
              </div>

              {/* Equipment Details */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 block">
                  Specific Instrument & Equipment Requirements (Optional)
                </label>
                <textarea
                  value={equipmentDetails}
                  onChange={(e) => setEquipmentDetails(e.target.value)}
                  placeholder="e.g. Carries own instrument & carbon bow; requires upright bass rental for concert..."
                  rows={3}
                  className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-400 transition-all text-sm resize-none"
                />
              </div>

              {errorMessage && (
                <p className="text-xs text-red-300 font-medium">{errorMessage}</p>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-xs font-semibold text-gray-400 hover:text-white flex items-center gap-1 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button
                  type="button"
                  onClick={handleCompleteOnboarding}
                  disabled={saveStatus === 'saving'}
                  className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-bold rounded-xl transition-all shadow-xl text-sm disabled:opacity-50"
                >
                  {saveStatus === 'saving' ? 'Syncing Profile...' : 'Complete & Open Dashboard'}
                  <CheckCircle2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 3: Destination Dashboard Redirection */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="bg-gradient-to-r from-purple-900/40 via-slate-900/80 to-blue-900/40 backdrop-blur-md rounded-3xl p-12 border border-purple-500/30 text-center space-y-6 shadow-2xl"
            >
              <div className="w-16 h-16 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center mx-auto border border-green-500/30">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <h2 className="text-3xl sm:text-4xl font-bold text-white">Profile Synced to Talent Pipeline!</h2>
              <p className="text-purple-200 text-base max-w-md mx-auto">
                Your craft, location, and wraparound support preferences are saved. Opening your personal workspace...
              </p>

              <div className="pt-4 flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-white/10 text-center text-xs text-gray-500">
        BEAM Orchestra Ecosystem • Building Excellence in Arts & Music
      </footer>
    </div>
  )
}
