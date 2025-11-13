'use client'

import { motion } from 'framer-motion'
import { XCircle } from 'lucide-react'
import Link from 'next/link'

export default function SubscribeCanceledPage() {
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
          className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6"
        >
          <XCircle className="w-12 h-12 text-red-400" />
        </motion.div>
        
        <h1 className="text-3xl font-bold text-white mb-4">
          Subscription Canceled
        </h1>
        
        <p className="text-gray-300 mb-6">
          Your subscription was not completed. No charges were made to your account.
        </p>

        <div className="space-y-4">
          <Link
            href="/projects/black-diaspora-symphony/media"
            className="block w-full px-6 py-3 bg-orchestra-gold hover:bg-orchestra-gold/80 text-orchestra-dark font-semibold rounded-lg transition-colors"
          >
            Try Again
          </Link>
          
          <Link
            href="/"
            className="block w-full px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
          >
            Go to Homepage
          </Link>
        </div>
      </motion.div>
    </div>
  )
}

