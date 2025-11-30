'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Loader, AlertCircle } from 'lucide-react'
import { useUserRole } from '@/lib/hooks/useUserRole'
import Link from 'next/link'

export default function SubscribePage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user, loading: authLoading } = useUserRole()
  const tier = searchParams?.get('tier')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // If not authenticated, redirect to sign in
    if (!authLoading && !user) {
      router.push('/?signin=true&redirect=/subscribe' + (tier ? `?tier=${tier}` : ''))
      return
    }

    // If authenticated and tier is selected, start checkout
    if (!authLoading && user && tier && !loading && !error) {
      handleCheckout()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading, tier])

  const handleCheckout = async () => {
    if (!user || !tier) {
      setError('Missing user or tier information')
      return
    }

    // Validate tier
    if (tier !== 'basic' && tier !== 'premium') {
      setError('Invalid subscription tier')
      return
    }

    setLoading(true)
    setError(null)

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
        body: JSON.stringify({ tier }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create checkout session')
      }

      const { url } = await response.json()
      
      // Redirect to Stripe Checkout
      if (url) {
        window.location.href = url
      } else {
        throw new Error('No checkout URL received')
      }
    } catch (error) {
      console.error('Error initiating subscription:', error)
      setError(error instanceof Error ? error.message : 'Failed to start subscription. Please try again.')
      setLoading(false)
    }
  }

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-12 h-12 animate-spin text-[#D4AF37] mx-auto mb-4" />
          <p className="text-white">Loading...</p>
        </div>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-black/90 backdrop-blur-lg border-2 border-red-500/50 rounded-xl p-8 max-w-md w-full text-center"
        >
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-4">Subscription Error</h1>
          <p className="text-white/80 mb-6">{error}</p>
          <div className="space-y-3">
            <button
              onClick={() => {
                setError(null)
                if (tier) {
                  handleCheckout()
                } else {
                  router.push('/subscriber')
                }
              }}
              className="w-full px-6 py-3 bg-[#D4AF37] hover:bg-[#B8941F] text-black font-semibold rounded-lg transition-colors"
            >
              Try Again
            </button>
            <Link
              href="/subscriber"
              className="block w-full px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
            >
              Back to Subscription Page
            </Link>
          </div>
        </motion.div>
      </div>
    )
  }

  // Show loading state while creating checkout session
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-12 h-12 animate-spin text-[#D4AF37] mx-auto mb-4" />
          <p className="text-white">Redirecting to checkout...</p>
        </div>
      </div>
    )
  }

  // If no tier selected, redirect back
  if (!tier) {
    router.push('/subscriber')
    return null
  }

  // Default loading state
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center">
        <Loader className="w-12 h-12 animate-spin text-[#D4AF37] mx-auto mb-4" />
        <p className="text-white">Preparing checkout...</p>
      </div>
    </div>
  )
}

