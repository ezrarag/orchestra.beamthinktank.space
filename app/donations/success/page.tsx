'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, Heart, Home } from 'lucide-react'
import { motion } from 'framer-motion'

function SuccessContent() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const [donationInfo, setDonationInfo] = useState<any>(null)

  useEffect(() => {
    if (sessionId) {
      // Fetch donation details from session
      fetch(`/api/donations/verify?session_id=${sessionId}`)
        .then((res) => res.json())
        .then((data) => setDonationInfo(data))
        .catch((error) => console.error('Error fetching donation details:', error))
    }
  }, [sessionId])

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-slate-900 to-blue-900 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring' }}
          className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4"
        >
          <CheckCircle className="w-8 h-8 text-green-400" />
        </motion.div>

        <h1 className="text-3xl font-bold text-white mb-2">Thank You!</h1>
        <p className="text-gray-300 mb-6">
          Your donation was successfully processed.
        </p>

        {donationInfo && (
          <div className="bg-white/5 rounded-lg p-4 mb-6 space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-400">Musician:</span>
              <span className="text-white font-medium">{donationInfo.musicianName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Amount:</span>
              <span className="text-green-400 font-semibold">${donationInfo.amount}</span>
            </div>
            {donationInfo.message && (
              <div className="mt-3 pt-3 border-t border-white/10">
                <p className="text-gray-400 italic">"{donationInfo.message}"</p>
              </div>
            )}
          </div>
        )}

        <div className="space-y-3">
          <Link
            href="/"
            className="flex items-center justify-center space-x-2 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200"
          >
            <Home className="w-5 h-5" />
            <span>Back to Home</span>
          </Link>
        </div>
      </motion.div>
    </div>
  )
}

export default function DonationSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-slate-900 to-blue-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    }>
      <SuccessContent />
    </Suspense>
  )
}

