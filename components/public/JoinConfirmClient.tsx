'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { GoogleAuthProvider, signInWithPopup, type User } from 'firebase/auth'
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { AlertCircle, ArrowRight, CheckCircle2, Mail } from 'lucide-react'
import { auth, db } from '@/lib/firebase'
import { completeEmailSignIn, isSignInWithEmailLink, signInWithEmail } from '@/lib/authClient'
import { useUserRole } from '@/lib/hooks/useUserRole'
import {
  claimExistingContributions,
  getParticipantIntentLabel,
  isParticipantIntent,
  markContributionClaimed,
  resolveParticipantIntentDestination,
  writeCachedParticipantRole,
  writeCachedParticipantRoles,
  type ParticipantIntent,
} from '@/lib/participantOnboarding'
import { mergeParticipantRoles, resolvePrimaryParticipantRole } from '@/lib/participantIdentity'

type JoinConfirmClientProps = {
  initialIntent?: string | null
}

function getIntentFromEmailLink(urlString: string): string | null {
  try {
    const url = new URL(urlString)
    const directIntent = url.searchParams.get('intent')
    if (directIntent) return directIntent

    const continueUrl = url.searchParams.get('continueUrl')
    if (!continueUrl) return null

    return new URL(continueUrl).searchParams.get('intent')
  } catch {
    return null
  }
}

export default function JoinConfirmClient({ initialIntent }: JoinConfirmClientProps) {
  const router = useRouter()
  const { user, loading } = useUserRole({ allowAdminBypass: false })
  const [working, setWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [emailLinkSent, setEmailLinkSent] = useState(false)
  const [isEmailLinkCompleting, setIsEmailLinkCompleting] = useState(false)

  const intent = useMemo<ParticipantIntent | null>(() => {
    if (!isParticipantIntent(initialIntent)) return null
    return initialIntent
  }, [initialIntent])

  const label = intent ? getParticipantIntentLabel(intent) : null

  useEffect(() => {
    if (!auth || typeof window === 'undefined') return

    const emailLink = window.location.href
    const storedEmail = window.localStorage.getItem('emailForSignIn')

    if (!storedEmail || !isSignInWithEmailLink(auth, emailLink)) {
      return
    }

    const cleanUrl = new URL(window.location.href)
    const nextIntent = getIntentFromEmailLink(window.location.href)
    cleanUrl.search = nextIntent ? `?intent=${encodeURIComponent(nextIntent)}` : ''
    cleanUrl.hash = ''

    setIsEmailLinkCompleting(true)
    setError(null)

    completeEmailSignIn(storedEmail, emailLink)
      .then(() => {
        window.localStorage.removeItem('emailForSignIn')
        window.location.replace(cleanUrl.toString())
      })
      .catch((error) => {
        console.error('Email link sign-in error:', error)
        setError(error instanceof Error ? `Email sign-in failed: ${error.message}` : 'Email sign-in failed.')
        setIsEmailLinkCompleting(false)
      })
  }, [])

  const completeMembership = async (signedInUser: User) => {
    if (!intent) {
      throw new Error('Invalid participant role.')
    }

    if (!db) {
      throw new Error('Firestore is not initialized.')
    }

    const membershipRef = doc(db, 'ngoMemberships', signedInUser.uid)
    const membershipSnap = await getDoc(membershipRef)
    const membershipData = membershipSnap.exists() ? (membershipSnap.data() as { ngo?: unknown; role?: unknown; roles?: unknown }) : null
    const resolvedRoles = mergeParticipantRoles(membershipData, [intent])
    const resolvedRole = resolvePrimaryParticipantRole(resolvedRoles) ?? intent

    await setDoc(
      membershipRef,
      {
        ngo: 'orchestra',
        role: resolvedRole,
        roles: resolvedRoles,
        updatedAt: serverTimestamp(),
        ...(membershipData?.ngo === 'orchestra' ? {} : { joinedAt: serverTimestamp() }),
      },
      { merge: true },
    )

    const resolvedEmail = signedInUser.email?.trim() || email.trim()
    await claimExistingContributions(signedInUser.uid, [resolvedEmail])
    markContributionClaimed(signedInUser.uid)
    writeCachedParticipantRole(signedInUser.uid, resolvedRole)
    writeCachedParticipantRoles(signedInUser.uid, resolvedRoles)

    router.replace(resolveParticipantIntentDestination('orchestra', intent))
  }

  const handleGoogleContinue = async () => {
    if (!auth) {
      setError('Firebase Auth is not initialized.')
      return
    }

    setWorking(true)
    setError(null)

    try {
      const provider = new GoogleAuthProvider()
      const result = await signInWithPopup(auth, provider)
      await completeMembership(result.user)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to complete sign-in.')
      setWorking(false)
    }
  }

  const handleEmailContinue = async () => {
    if (!email.trim() || !email.includes('@')) {
      setError('Enter a valid email address.')
      return
    }

    setWorking(true)
    setError(null)

    try {
      await signInWithEmail(email.trim())
      setEmailLinkSent(true)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to send sign-in link.')
    } finally {
      setWorking(false)
    }
  }

  const handleSignedInContinue = async () => {
    const currentUser = auth?.currentUser ?? user
    if (!currentUser) {
      setError('Please sign in to continue.')
      return
    }

    setWorking(true)
    setError(null)

    try {
      await completeMembership(currentUser)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to create your orchestra membership.'
      if (message.includes('Missing or insufficient permissions')) {
        setError('Membership write was rejected. Make sure you are signed in with a real Firebase account, not the local admin bypass user.')
      } else {
        setError(message)
      }
      setWorking(false)
    }
  }

  if (!intent || !label) {
    return (
      <div className="rounded-[28px] border border-red-400/20 bg-red-500/10 p-6 text-red-100">
        <p className="flex items-center gap-2 text-sm font-medium">
          <AlertCircle className="h-4 w-4" />
          Missing or invalid role. Go back and choose a path first.
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl rounded-[28px] border border-white/12 bg-white/[0.03] p-6 sm:p-8">
      <p className="text-sm text-white/56">You&apos;re joining as a {label}.</p>
      <h2 className="mt-3 text-2xl font-semibold tracking-[-0.02em] text-white">Sign in to finish your BEAM Orchestra entry.</h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-white/70">
        We&apos;ll create your orchestra membership in the shared BEAM Firebase project and send you to the right destination next.
      </p>

      {error ? (
        <div className="mt-5 rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {error}
        </div>
      ) : null}

      <div className="mt-8 space-y-4">
        {loading || isEmailLinkCompleting ? (
          <div className="rounded-2xl border border-white/12 bg-black/20 px-4 py-5 text-sm text-white/65">
            {isEmailLinkCompleting ? 'Completing email sign-in...' : 'Checking sign-in state...'}
          </div>
        ) : user ? (
          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4">
            <p className="flex items-center gap-2 text-sm font-medium text-emerald-100">
              <CheckCircle2 className="h-4 w-4" />
              Signed in as {user.email ?? user.displayName ?? 'current user'}
            </p>
            <button
              type="button"
              onClick={handleSignedInContinue}
              disabled={working}
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100 disabled:opacity-70"
            >
              {working ? 'Saving membership...' : 'Continue'}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleGoogleContinue}
                disabled={working}
                className="inline-flex items-center gap-3 rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100 disabled:opacity-70"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                {working ? 'Signing in...' : 'Continue with Google'}
              </button>
            </div>

            <div className="max-w-xl rounded-2xl border border-white/12 bg-black/20 p-4">
              <p className="text-sm font-medium text-white">Or send a sign-in link by email</p>
              <p className="mt-1 text-sm leading-6 text-white/62">
                This uses the existing BEAM passwordless email-link auth flow and avoids forcing a Google account.
              </p>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="name@example.com"
                  className="min-w-0 flex-1 rounded-full border border-white/12 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none focus:border-white/30"
                />
                <button
                  type="button"
                  onClick={handleEmailContinue}
                  disabled={working}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/18 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/35 disabled:opacity-70"
                >
                  <Mail className="h-4 w-4" />
                  {working ? 'Sending...' : 'Email me a link'}
                </button>
              </div>
              {emailLinkSent ? (
                <p className="mt-3 text-sm text-emerald-200">
                  Check your inbox. Open the link on this same device and we&apos;ll bring you back here to finish joining.
                </p>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
