'use client'

import { useState, useEffect, Suspense } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { CheckCircle, AlertCircle, Music } from 'lucide-react'
import { useUserRole } from '@/lib/hooks/useUserRole'
import { auth } from '@/lib/firebase'
import { completeEmailSignIn, isSignInWithEmailLink } from '@/lib/authClient'
import AuthButtons from '@/components/AuthButtons'

const projectInfo: Record<string, { title: string; route: string }> = {
  'black-diaspora-symphony': {
    title: 'Black Diaspora Symphony Orchestra',
    route: '/training/contract-projects/black-diaspora-symphony'
  }
}

function ProjectLoginContent() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.projectId as string
  const { user, loading } = useUserRole()
  const [error, setError] = useState<string | null>(null)
  const [isAuthenticating, setIsAuthenticating] = useState(false)

  const project = projectInfo[projectId]

  // Handle email link sign-in
  useEffect(() => {
    if (auth && typeof window !== 'undefined') {
      const emailLink = window.location.href
      const email = window.localStorage.getItem('emailForSignIn')
      
      if (email && auth && isSignInWithEmailLink(auth, emailLink)) {
        setIsAuthenticating(true)
        completeEmailSignIn(email, emailLink)
          .then(() => {
            window.localStorage.removeItem('emailForSignIn')
            // Reload to refresh auth state
            window.location.href = window.location.pathname
          })
          .catch((err) => {
            console.error('Email link sign-in error:', err)
            setError(`Email sign-in failed: ${err.message}`)
            setIsAuthenticating(false)
          })
      }
    }
  }, [])

  // Redirect to project page if already logged in
  useEffect(() => {
    if (!loading && user && project) {
      router.push(project.route)
    }
  }, [user, loading, project, router])

  if (loading || isAuthenticating) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-lg">Loading...</div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-8 max-w-md w-full shadow-2xl"
        >
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">
              Project Not Found
            </h2>
            <p className="text-gray-300 text-sm mb-6">
              The project you're looking for doesn't exist.
            </p>
            <button
              onClick={() => router.push('/musician/select-project')}
              className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
            >
              Back to Projects
            </button>
          </div>
        </motion.div>
      </div>
    )
  }

  // If user is logged in, show success message briefly before redirect
  if (user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-8 max-w-md w-full shadow-2xl"
        >
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
              ✅ Signed In Successfully!
            </h2>
            <p className="text-gray-300 text-sm mb-6">
              Redirecting to {project.title}...
            </p>
          </div>
        </motion.div>
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
        <div className="text-center mb-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
            className="w-16 h-16 bg-[#D4AF37]/20 rounded-full flex items-center justify-center mx-auto mb-4"
          >
            <Music className="w-8 h-8 text-[#D4AF37]" />
          </motion.div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Musician Login
          </h1>
          <p className="text-gray-300 text-sm mb-1">
            {project.title}
          </p>
          <p className="text-gray-400 text-xs">
            Sign in to access your project portal
          </p>
        </div>

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

        <div className="space-y-4">
          <AuthButtons 
            onSignInSuccess={() => {
              setError(null)
              // Auth state will update automatically via useUserRole
              // Then useEffect will redirect to project page
            }}
            onError={(err) => setError(err)}
            mobileFriendly={true}
          />
        </div>

        <div className="mt-6 pt-6 border-t border-white/10">
          <button
            onClick={() => router.push('/musician/select-project')}
            className="w-full text-center text-gray-400 hover:text-white text-sm transition-colors"
          >
            ← Back to Projects
          </button>
        </div>
      </motion.div>
    </div>
  )
}

export default function ProjectLoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-lg">Loading...</div>
      </div>
    }>
      <ProjectLoginContent />
    </Suspense>
  )
}

