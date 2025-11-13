'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { CheckCircle, Loader } from 'lucide-react'
import Link from 'next/link'

export default function SubscribeSuccessPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const sessionId = searchParams?.get('session_id')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Wait a moment for webhook to process
    const timer = setTimeout(() => {
      setLoading(false)
    }, 2000)

    return () => clearTimeout(timer)
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-12 h-12 animate-spin text-orchestra-gold mx-auto mb-4" />
          <p className="text-white">Processing your subscription...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-8 max-w-md w-full text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6"
        >
          <CheckCircle className="w-12 h-12 text-green-400" />
        </motion.div>
        
        <h1 className="text-3xl font-bold text-white mb-4">
          Welcome to BDSO Community!
        </h1>
        
        <p className="text-gray-300 mb-6">
          Your subscription is now active. You now have access to all subscriber-only content including rehearsal videos, behind-the-scenes footage, and exclusive interviews.
        </p>

        <div className="space-y-4">
          <Link
            href="/projects/black-diaspora-symphony/media"
            className="block w-full px-6 py-3 bg-orchestra-gold hover:bg-orchestra-gold/80 text-orchestra-dark font-semibold rounded-lg transition-colors"
          >
            View Media Library
          </Link>
          
          <Link
            href="/"
            className="block w-full px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
          >
            Go to Homepage
          </Link>
        </div>

        {sessionId && (
          <p className="text-xs text-gray-400 mt-6">
            Session ID: {sessionId.substring(0, 20)}...
          </p>
        )}
      </motion.div>
    </div>
  )
}

