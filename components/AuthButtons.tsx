'use client'

import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { signInWithEmail, signInWithPhone, createRecaptchaVerifier, verifyPhoneCode } from '@/lib/authClient'
import { Mail, Phone, AlertCircle, CheckCircle } from 'lucide-react'

interface AuthButtonsProps {
  onSignInSuccess?: () => void
  onError?: (error: string) => void
  mobileFriendly?: boolean
}

export default function AuthButtons({ 
  onSignInSuccess, 
  onError,
  mobileFriendly = true 
}: AuthButtonsProps) {
  const [authMethod, setAuthMethod] = useState<'select' | 'google' | 'email' | 'sms'>('select')
  const [email, setEmail] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [smsCode, setSmsCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [emailSent, setEmailSent] = useState(false)
  const [confirmationResult, setConfirmationResult] = useState<any>(null)
  const recaptchaVerifierRef = useRef<any>(null)
  const recaptchaContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Clean up reCAPTCHA on unmount or when auth method changes
    return () => {
      if (recaptchaVerifierRef.current) {
        try {
          recaptchaVerifierRef.current.clear()
        } catch (e) {
          // Ignore cleanup errors
        }
        recaptchaVerifierRef.current = null
      }
    }
  }, [authMethod])

  const handleGoogleSignIn = async () => {
    if (!auth) {
      const err = 'Firebase Auth is not available. Please configure Firebase.'
      setError(err)
      onError?.(err)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const provider = new GoogleAuthProvider()
      await signInWithPopup(auth, provider)
      onSignInSuccess?.()
    } catch (error: any) {
      console.error('Error signing in with Google:', error)
      if (error.code !== 'auth/popup-closed-by-user') {
        const err = `Google sign-in failed: ${error.message}`
        setError(err)
        onError?.(err)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleEmailSignIn = async () => {
    if (!email || !email.includes('@')) {
      const err = 'Please enter a valid email address'
      setError(err)
      onError?.(err)
      return
    }

    setLoading(true)
    setError(null)

    try {
      await signInWithEmail(email)
      setEmailSent(true)
    } catch (error: any) {
      console.error('Error sending email link:', error)
      const err = `Email sign-in failed: ${error.message}`
      setError(err)
      onError?.(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSMSInit = async () => {
    if (!phoneNumber) {
      const err = 'Please enter a phone number'
      setError(err)
      onError?.(err)
      return
    }

    // Format phone number (add + if not present)
    const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+1${phoneNumber.replace(/\D/g, '')}`

    setLoading(true)
    setError(null)

    try {
      // Wait for container to be in DOM
      let containerElement = document.getElementById('recaptcha-container')
      if (!containerElement) {
        // If container doesn't exist, wait a bit for React to render it
        await new Promise(resolve => setTimeout(resolve, 100))
        containerElement = document.getElementById('recaptcha-container')
      }

      if (!containerElement) {
        throw new Error('reCAPTCHA container not found. Please refresh the page and try again.')
      }

      // Clean up any existing verifier
      if (recaptchaVerifierRef.current) {
        try {
          recaptchaVerifierRef.current.clear()
        } catch (e) {
          // Ignore cleanup errors
        }
        recaptchaVerifierRef.current = null
      }

      // Create reCAPTCHA verifier
      recaptchaVerifierRef.current = createRecaptchaVerifier('recaptcha-container', 'invisible')

      const result = await signInWithPhone(formattedPhone, recaptchaVerifierRef.current)
      setConfirmationResult(result)
      setAuthMethod('sms')
    } catch (error: any) {
      console.error('Error sending SMS:', error)
      
      // Provide more helpful error messages
      let errMessage = error.message || 'Unknown error occurred'
      if (error.code === 'auth/invalid-app-credential') {
        errMessage = 'Phone authentication is not properly configured. Please contact support or try a different sign-in method.'
      } else if (error.code === 'auth/invalid-phone-number') {
        errMessage = 'Invalid phone number format. Please enter a valid phone number.'
      } else if (error.code === 'auth/too-many-requests') {
        errMessage = 'Too many requests. Please try again later.'
      }
      
      const err = `SMS sign-in failed: ${errMessage}`
      setError(err)
      onError?.(err)
      
      // Clean up reCAPTCHA on error
      if (recaptchaVerifierRef.current) {
        try {
          recaptchaVerifierRef.current.clear()
        } catch (e) {
          // Ignore cleanup errors
        }
        recaptchaVerifierRef.current = null
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSMSVerify = async () => {
    if (!smsCode || smsCode.length !== 6) {
      const err = 'Please enter the 6-digit code'
      setError(err)
      onError?.(err)
      return
    }

    if (!confirmationResult) {
      const err = 'No verification in progress'
      setError(err)
      onError?.(err)
      return
    }

    setLoading(true)
    setError(null)

    try {
      await verifyPhoneCode(confirmationResult, smsCode)
      onSignInSuccess?.()
    } catch (error: any) {
      console.error('Error verifying SMS code:', error)
      const err = `Code verification failed: ${error.message}`
      setError(err)
      onError?.(err)
    } finally {
      setLoading(false)
    }
  }

  const buttonClass = mobileFriendly
    ? "w-full py-4 px-6 rounded-lg font-semibold text-base transition-all duration-200 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
    : "w-full py-3 px-6 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"

  if (authMethod === 'select') {
    return (
      <div className="space-y-3">
        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className={`${buttonClass} bg-white hover:bg-gray-100 text-gray-900`}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          <span>Sign in with Google</span>
        </button>

        <button
          onClick={() => setAuthMethod('email')}
          disabled={loading}
          className={`${buttonClass} bg-blue-600 hover:bg-blue-700 text-white`}
        >
          <Mail className="w-5 h-5" />
          <span>Sign in with Email</span>
        </button>

        <button
          onClick={() => setAuthMethod('sms')}
          disabled={loading}
          className={`${buttonClass} bg-green-600 hover:bg-green-700 text-white`}
        >
          <Phone className="w-5 h-5" />
          <span>Sign in with SMS</span>
        </button>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-center gap-2"
          >
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <p className="text-red-200 text-sm">{error}</p>
          </motion.div>
        )}

        {/* Hidden reCAPTCHA container - always render for SMS auth */}
        <div id="recaptcha-container" ref={recaptchaContainerRef} style={{ display: 'none' }} />
      </div>
    )
  }

  if (authMethod === 'email') {
    return (
      <div className="space-y-4">
        {emailSent ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-green-500/10 border border-green-500/20 rounded-lg p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <h3 className="text-green-200 font-semibold">Check your email</h3>
            </div>
            <p className="text-green-200/80 text-sm">
              We sent a sign-in link to <strong>{email}</strong>. Click the link in the email to sign in.
            </p>
            <button
              onClick={() => {
                setEmailSent(false)
                setEmail('')
                setAuthMethod('select')
              }}
              className="mt-3 text-sm text-green-300 hover:text-green-200 underline"
            >
              Use a different email
            </button>
          </motion.div>
        ) : (
          <>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-200 mb-2">
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                disabled={loading}
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleEmailSignIn}
                disabled={loading || !email}
                className={`${buttonClass} flex-1 bg-blue-600 hover:bg-blue-700 text-white`}
              >
                {loading ? 'Sending...' : 'Send sign-in link'}
              </button>
              <button
                onClick={() => {
                  setAuthMethod('select')
                  setEmail('')
                  setError(null)
                }}
                disabled={loading}
                className="px-4 py-3 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                Back
              </button>
            </div>
          </>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-center gap-2"
          >
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <p className="text-red-200 text-sm">{error}</p>
          </motion.div>
        )}
      </div>
    )
  }

  if (authMethod === 'sms') {
    return (
      <div className="space-y-4">
        {confirmationResult ? (
          <>
            <div>
              <label htmlFor="sms-code" className="block text-sm font-medium text-gray-200 mb-2">
                Enter verification code
              </label>
              <p className="text-sm text-gray-300 mb-3">
                We sent a code to <strong>{phoneNumber}</strong>
              </p>
              <input
                id="sms-code"
                type="text"
                value={smsCode}
                onChange={(e) => setSmsCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 text-center text-2xl tracking-widest"
                disabled={loading}
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleSMSVerify}
                disabled={loading || smsCode.length !== 6}
                className={`${buttonClass} flex-1 bg-green-600 hover:bg-green-700 text-white`}
              >
                {loading ? 'Verifying...' : 'Verify code'}
              </button>
              <button
                onClick={() => {
                  setConfirmationResult(null)
                  setSmsCode('')
                  setError(null)
                }}
                disabled={loading}
                className="px-4 py-3 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                Back
              </button>
            </div>
          </>
        ) : (
          <>
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-200 mb-2">
                Phone number
              </label>
              <input
                id="phone"
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="(555) 123-4567"
                className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                disabled={loading}
              />
              <p className="text-xs text-gray-400 mt-1">
                Enter your phone number with area code
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleSMSInit}
                disabled={loading || !phoneNumber}
                className={`${buttonClass} flex-1 bg-green-600 hover:bg-green-700 text-white`}
              >
                {loading ? 'Sending code...' : 'Send verification code'}
              </button>
              <button
                onClick={() => {
                  setAuthMethod('select')
                  setPhoneNumber('')
                  setError(null)
                }}
                disabled={loading}
                className="px-4 py-3 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                Back
              </button>
            </div>
            {/* Hidden reCAPTCHA container */}
            <div id="recaptcha-container" ref={recaptchaContainerRef} />
          </>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-center gap-2"
          >
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <p className="text-red-200 text-sm">{error}</p>
          </motion.div>
        )}
      </div>
    )
  }

  return null
}

