'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { CreditCard, Lock, Check } from 'lucide-react'
import { useUserRole } from '@/lib/hooks/useUserRole'
import { useRouter } from 'next/navigation'

interface SubscriptionCTAProps {
  className?: string
}

export default function SubscriptionCTA({ className = '' }: SubscriptionCTAProps) {
  const { user, role } = useUserRole()
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleSubscribe = async () => {
    if (!user) {
      // Redirect to sign in
      router.push('/?signin=true')
      return
    }

    setLoading(true)

    try {
      // Get auth token
      const token = await user.getIdToken()
      
      // Create checkout session
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to create checkout session')
      }

      const { url } = await response.json()
      
      // Redirect to Stripe Checkout
      if (url) {
        window.location.href = url
      }
    } catch (error) {
      console.error('Error initiating subscription:', error)
      alert('Failed to start subscription. Please try again.')
      setLoading(false)
    }
  }

  // Don't show if already subscribed
  if (role === 'subscriber' || role === 'beam_admin' || role === 'partner_admin' || role === 'board' || role === 'musician') {
    return null
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-xl p-6 ${className}`}
    >
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center">
            <Lock className="w-6 h-6 text-yellow-400" />
          </div>
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-bold text-white mb-2">
            Unlock Exclusive Content
          </h3>
          <p className="text-gray-300 mb-4">
            Subscribe for $5/month to access rehearsal videos, behind-the-scenes footage, interviews, and more exclusive content from the Black Diaspora Symphony Orchestra.
          </p>
          <div className="flex flex-wrap gap-2 mb-4">
            {[
              'Full rehearsal videos',
              'Behind-the-scenes content',
              'Exclusive interviews',
              'Early access to new content'
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-1 text-sm text-gray-300">
                <Check className="w-4 h-4 text-yellow-400" />
                <span>{feature}</span>
              </div>
            ))}
          </div>
          <button
            onClick={handleSubscribe}
            disabled={loading}
            className="px-6 py-3 bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
          >
            <CreditCard className="w-5 h-5" />
            {loading ? 'Loading...' : 'Subscribe for $5/month'}
          </button>
        </div>
      </div>
    </motion.div>
  )
}

