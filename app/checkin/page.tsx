'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { CheckCircle, AlertCircle, Clock, MapPin, Calendar } from 'lucide-react'
import { useUserRole } from '@/lib/hooks/useUserRole'
import { auth } from '@/lib/firebase'
import { checkIn } from '@/lib/attendance'
import { completeEmailSignIn, isSignInWithEmailLink } from '@/lib/authClient'
import { rehearsalSchedule } from '@/app/training/contract-projects/black-diaspora-symphony/data'
import AuthButtons from '@/components/AuthButtons'

function CheckInContent() {
  const searchParams = useSearchParams()
  const { user, loading } = useUserRole()
  const [checkingIn, setCheckingIn] = useState(false)
  const [checkedIn, setCheckedIn] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rehearsal, setRehearsal] = useState<any>(null)

  const sessionId = searchParams?.get('id') || null

  // Validate rehearsal ID and handle email link completion
  useEffect(() => {
    // Handle email link sign-in
    if (auth && typeof window !== 'undefined') {
      const emailLink = window.location.href
      const email = window.localStorage.getItem('emailForSignIn')
      
      if (email && auth && isSignInWithEmailLink(auth, emailLink)) {
        completeEmailSignIn(email, emailLink)
          .then(() => {
            window.localStorage.removeItem('emailForSignIn')
            // Reload to refresh auth state
            window.location.href = window.location.pathname + (sessionId ? `?id=${sessionId}` : '')
          })
          .catch((err) => {
            console.error('Email link sign-in error:', err)
            setError(`Email sign-in failed: ${err.message}`)
          })
      }
    }

    // Validate rehearsal ID
    if (!sessionId) {
      setError('This check-in link is not active. Please see a coordinator.')
      return
    }

    // Validate sessionId format (should be YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(sessionId)) {
      setError('Invalid check-in link format. Please see a coordinator.')
      return
    }

    // Find rehearsal by date
    const found = rehearsalSchedule.find(r => r.date === sessionId)
    if (found) {
      setRehearsal(found)
      setError(null)
    } else {
      setError('This check-in link is not active. Please see a coordinator.')
    }
  }, [sessionId])

  const handleCheckIn = async () => {
    if (!user || !rehearsal || !sessionId) {
      setError('Missing required information. Please sign in first.')
      return
    }

    // Double-check rehearsal is valid
    if (!rehearsalSchedule.find(r => r.date === sessionId)) {
      setError('This check-in link is not active. Please see a coordinator.')
      return
    }

    setCheckingIn(true)
    setError(null)

    try {
      await checkIn(
        user.uid,
        user.displayName || 'Unknown',
        user.email,
        sessionId,
        rehearsal.location
      )
      setCheckedIn(true)
    } catch (err: any) {
      console.error('Check-in error:', err)
      // Provide user-friendly error messages
      if (err.message?.includes('Firestore')) {
        setError('Unable to save check-in. Please see a coordinator or try again.')
      } else {
        setError(err.message || 'Failed to check in. Please try again.')
      }
    } finally {
      setCheckingIn(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-lg">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-8 max-w-md w-full shadow-2xl"
      >
        {checkedIn ? (
          <div className="text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6"
            >
              <CheckCircle className="w-12 h-12 text-green-400" />
            </motion.div>
            <h2 className="text-2xl font-bold text-white mb-4">
              ✅ You&apos;re checked in!
            </h2>
            {rehearsal && (
              <div className="space-y-2 text-gray-200">
                <p className="flex items-center justify-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>{new Date(rehearsal.date).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}</span>
                </p>
                <p className="flex items-center justify-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>{rehearsal.time}</span>
                </p>
                <p className="flex items-center justify-center gap-2">
                  <MapPin className="w-4 h-4" />
                  <span className="text-sm">{rehearsal.location}</span>
                </p>
              </div>
            )}
            <p className="text-gray-300 mt-6 text-sm">
              Your attendance has been recorded. See you at rehearsal!
            </p>
          </div>
        ) : (
          <>
            <div className="text-center mb-6">
              <h1 className="text-3xl font-bold text-white mb-2">
                Rehearsal Check-In
              </h1>
              <p className="text-gray-300 text-sm">
                Black Diaspora Symphony Orchestra
              </p>
            </div>

            {rehearsal && (
              <div className="bg-white/5 rounded-lg p-4 mb-6 border border-white/10">
                <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-purple-400" />
                  Rehearsal Details
                </h3>
                <div className="space-y-2 text-gray-200 text-sm">
                  <p className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {new Date(rehearsal.date).toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </span>
                  </p>
                  <p className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>{rehearsal.time}</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    <span>{rehearsal.location}</span>
                  </p>
                  {rehearsal.type && (
                    <p className="text-purple-300 text-xs mt-2">
                      Type: {rehearsal.type}
                    </p>
                  )}
                </div>
              </div>
            )}

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-6 flex items-center gap-2"
              >
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                <p className="text-red-200 text-sm">{error}</p>
              </motion.div>
            )}

            {!user ? (
              <div className="space-y-4">
                <p className="text-gray-300 text-center text-sm mb-2">
                  Please sign in to check in for this rehearsal.
                </p>
                <AuthButtons 
                  onSignInSuccess={() => {
                    setError(null)
                    // Auth state will update automatically via useUserRole
                  }}
                  onError={(err) => setError(err)}
                  mobileFriendly={true}
                />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                  <p className="text-gray-300 text-sm mb-1">Signed in as:</p>
                  <p className="text-white font-medium">{user.displayName || user.email}</p>
                </div>
                <button
                  onClick={handleCheckIn}
                  disabled={checkingIn || !rehearsal}
                  className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
                >
                  {checkingIn ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Checking in...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      <span>Check In</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </motion.div>
    </div>
  )
}

export default function CheckInPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-lg">Loading...</div>
      </div>
    }>
      <CheckInContent />
    </Suspense>
  )
}

