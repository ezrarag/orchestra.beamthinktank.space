'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth'
import { auth, db } from '@/lib/firebase'
import { doc, getDoc, updateDoc, setDoc, serverTimestamp, query, collection, where, getDocs } from 'firebase/firestore'
import { motion } from 'framer-motion'
import { CheckCircle, XCircle, Loader2, Music, Calendar, DollarSign, Coins } from 'lucide-react'

export default function ConfirmInvitePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const prospectId = searchParams.get('prospectId')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [prospect, setProspect] = useState<any>(null)
  const [user, setUser] = useState<any>(null)
  const [processing, setProcessing] = useState(false)
  const [decision, setDecision] = useState<'confirmed' | 'declined' | null>(null)

  useEffect(() => {
    if (!token || !prospectId) {
      setError('Invalid invitation link. Please check the link and try again.')
      setLoading(false)
      return
    }

    loadProspect()
  }, [token, prospectId])

  const loadProspect = async () => {
    try {
      // For now, we'll fetch from an API endpoint that uses admin SDK
      // since prospects collection may require admin access
      const response = await fetch(`/api/prospect?prospectId=${prospectId}&token=${token}`)
      const data = await response.json()
      
      if (!response.ok) {
        setError(data.error || 'Failed to load invitation')
        setLoading(false)
        return
      }

      setProspect(data.prospect)
      setLoading(false)
    } catch (err) {
      console.error('Error loading prospect:', err)
      setError('Failed to load invitation. Please try again.')
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    if (!auth) {
      setError('Firebase Auth is not available. Please configure Firebase.')
      return
    }

    try {
      const provider = new GoogleAuthProvider()
      provider.addScope('profile')
      provider.addScope('email')
      
      const result = await signInWithPopup(auth, provider)
      setUser(result.user)
    } catch (error: any) {
      console.error('Error signing in:', error)
      if (error.code !== 'auth/popup-closed-by-user') {
        setError(`Authentication failed: ${error.message}`)
      }
    }
  }

  const handleConfirm = async () => {
    if (!user || !prospect) return

    setProcessing(true)
    try {
      // Update prospect status
      await fetch('/api/confirm-invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prospectId,
          token,
          decision: 'confirmed',
          userId: user.uid,
          userEmail: user.email,
          userName: user.displayName || prospect.name
        })
      })

      // Create/update musician profile
      const musicianData = {
        userId: user.uid,
        name: prospect.name || user.displayName,
        email: prospect.email || user.email,
        phone: prospect.phone || null,
        instrument: prospect.instrument || null,
        status: 'Confirmed',
        source: `Invite (${new Date().toLocaleDateString()})`,
        projectId: prospect.projectId || 'bdso-2025-annual',
        confirmedAt: serverTimestamp(),
        joinedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }

      await setDoc(doc(db, 'musicians', user.uid), musicianData, { merge: true })

      // Create/update projectMusicians document for the roster
      const projectId = prospect.projectId || 'black-diaspora-symphony'
      const projectMusicianData = {
        projectId,
        musicianId: user.uid,
        instrument: prospect.instrument || '',
        role: 'musician',
        status: 'confirmed',
        source: 'Invite Link',
        name: prospect.name || user.displayName,
        email: prospect.email || user.email,
        phone: prospect.phone || null,
        notes: prospect.notes || null,
        joinedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }

      await setDoc(doc(db, 'projectMusicians', `${user.uid}_${projectId}`), projectMusicianData, { merge: true })

      // Also update users collection
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        name: prospect.name || user.displayName,
        email: prospect.email || user.email,
        photoURL: user.photoURL || null,
        updatedAt: serverTimestamp()
      }, { merge: true })

      setDecision('confirmed')
      
      // Redirect to project page after a delay
      setTimeout(() => {
        router.push('/training/contract-projects/black-diaspora-symphony')
      }, 3000)
    } catch (error) {
      console.error('Error confirming:', error)
      setError('Failed to confirm. Please try again.')
      setProcessing(false)
    }
  }

  const handleDecline = async () => {
    if (!user || !prospect) return

    setProcessing(true)
    try {
      await fetch('/api/confirm-invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prospectId,
          token,
          decision: 'declined'
        })
      })

      setDecision('declined')
    } catch (error) {
      console.error('Error declining:', error)
      setError('Failed to decline. Please try again.')
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-slate-900 to-blue-900">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-purple-400 mx-auto mb-4" />
          <p className="text-white">Loading invitation...</p>
        </div>
      </div>
    )
  }

  if (error && !prospect) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-slate-900 to-blue-900 px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20"
        >
          <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-4">Invalid Invitation</h1>
          <p className="text-gray-300">{error}</p>
        </motion.div>
      </div>
    )
  }

  if (decision === 'confirmed') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-slate-900 to-blue-900 px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20 text-center"
        >
          <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-4">Confirmed!</h1>
          <p className="text-gray-300 mb-4">
            You've confirmed your participation in the Black Diaspora Symphony Orchestra.
          </p>
          <p className="text-sm text-gray-400">
            Redirecting you to the project page...
          </p>
        </motion.div>
      </div>
    )
  }

  if (decision === 'declined') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-slate-900 to-blue-900 px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20 text-center"
        >
          <XCircle className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-4">Thank You</h1>
          <p className="text-gray-300">
            We've noted that you're unable to participate at this time.
          </p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-slate-900 to-blue-900 px-4 py-12">
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20"
        >
          <div className="text-center mb-8">
            <Music className="w-16 h-16 text-purple-400 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-white mb-2">
              You're Invited!
            </h1>
            <p className="text-gray-300">
              Black Diaspora Symphony Orchestra • 2025 Annual Memorial Concert
            </p>
          </div>

          {prospect && (
            <div className="bg-white/5 rounded-xl p-6 mb-6">
              <h2 className="text-xl font-semibold text-white mb-4">
                Hi {prospect.name}!
              </h2>
              <p className="text-gray-300 mb-4">
                You've been invited to participate in the <strong>Black Diaspora Symphony Orchestra</strong> 
                for our <strong>2025 Annual Memorial Concert</strong> on <strong>Sunday, December 14 at 5 PM</strong> 
                at <strong>Central United Methodist Church, Milwaukee.</strong>
              </p>

              {prospect.instrument && (
                <p className="text-gray-300 mb-4">
                  <strong>Instrument:</strong> {prospect.instrument}
                </p>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <DollarSign className="w-5 h-5 text-green-400" />
                    <span className="text-white font-semibold">Payment</span>
                  </div>
                  <p className="text-gray-300 text-sm">
                    $25 per rehearsal (4 rehearsals)<br />
                    $50 for concert performance
                  </p>
                </div>

                <div className="bg-white/5 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Coins className="w-5 h-5 text-yellow-400" />
                    <span className="text-white font-semibold">BEAM Coin Option</span>
                  </div>
                  <p className="text-gray-300 text-sm">
                    Option to receive payment as BEAM Coin (digital credits)
                  </p>
                </div>
              </div>

              <div className="bg-purple-500/20 rounded-lg p-4 mb-6">
                <div className="flex items-center space-x-2 mb-2">
                  <Calendar className="w-5 h-5 text-purple-300" />
                  <span className="text-white font-semibold">Rehearsal Schedule</span>
                </div>
                <ul className="text-gray-300 text-sm space-y-1">
                  <li>• Nov 9, 16, 22: Full Orchestra Rehearsals (7 PM)</li>
                  <li>• Dec 7: Dress Rehearsal (7 PM)</li>
                  <li>• Dec 14: Concert Performance (5 PM)</li>
                </ul>
              </div>
            </div>
          )}

          {!user ? (
            <div className="text-center">
              <p className="text-gray-300 mb-6">
                Sign in with Google to confirm or decline your participation:
              </p>
              <button
                onClick={handleGoogleSignIn}
                className="flex items-center space-x-3 bg-white text-black px-8 py-4 rounded-lg font-semibold hover:bg-gray-100 transition-colors mx-auto"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span>Sign in with Google</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-green-500/20 rounded-lg p-4 flex items-center space-x-3">
                <CheckCircle className="w-6 h-6 text-green-400" />
                <div>
                  <p className="text-white font-semibold">Signed in as {user.displayName || user.email}</p>
                  <p className="text-gray-400 text-sm">{user.email}</p>
                </div>
              </div>

              <div className="flex space-x-4">
                <button
                  onClick={handleConfirm}
                  disabled={processing}
                  className="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-gray-500 disabled:cursor-not-allowed text-white px-6 py-4 rounded-lg font-semibold transition-colors flex items-center justify-center space-x-2"
                >
                  {processing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      <span>Confirm Participation</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleDecline}
                  disabled={processing}
                  className="flex-1 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-6 py-4 rounded-lg font-semibold transition-colors flex items-center justify-center space-x-2"
                >
                  <XCircle className="w-5 h-5" />
                  <span>Decline</span>
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 bg-red-500/20 border border-red-500/50 rounded-lg p-4">
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}

