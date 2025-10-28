'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { X, Heart, DollarSign } from 'lucide-react'
import { loadStripe } from '@stripe/stripe-js'

interface DonationModalProps {
  isOpen: boolean
  onClose: () => void
  musicianName: string
  musicianEmail: string
}

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

export default function DonationModal({ isOpen, onClose, musicianName, musicianEmail }: DonationModalProps) {
  const [donorName, setDonorName] = useState('')
  const [donorEmail, setDonorEmail] = useState('')
  const [amount, setAmount] = useState('')
  const [customAmount, setCustomAmount] = useState('')
  const [message, setMessage] = useState('')
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  const presetAmounts = ['10', '25', '50', '100', '250', '500']

  if (!isOpen) return null

  const handlePresetClick = (presetAmount: string) => {
    setAmount(presetAmount)
    setCustomAmount('')
  }

  const handleCustomAmount = (value: string) => {
    setCustomAmount(value)
    setAmount('')
  }

  const handleSubmit = async () => {
    const donationAmount = amount || customAmount

    if (!donationAmount || parseFloat(donationAmount) <= 0) {
      alert('Please enter a valid donation amount')
      return
    }

    if (!isAnonymous && !donorName.trim()) {
      alert('Please enter your name or check anonymous')
      return
    }

    setIsProcessing(true)

    try {
      // Create Stripe Checkout session
      const response = await fetch('/api/donations/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(donationAmount) * 100, // Convert to cents
          donorName: isAnonymous ? 'Anonymous' : donorName,
          donorEmail,
          musicianName,
          musicianEmail,
          message,
          isAnonymous,
        }),
      })

      const { sessionId } = await response.json()

      // Redirect to Stripe Checkout
      const stripe = await stripePromise
      if (stripe) {
        const result = await stripe.redirectToCheckout({ sessionId })
        if (result.error) {
          console.error('Stripe error:', result.error.message)
          alert('Payment processing error. Please try again.')
        }
      }
    } catch (error) {
      console.error('Error processing donation:', error)
      alert('Error processing donation. Please try again.')
      setIsProcessing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-black/80"
        onClick={onClose}
        aria-hidden="true"
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-md rounded-2xl bg-slate-900 border border-white/10 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center">
              <Heart className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Donate to {musicianName}</h2>
              <p className="text-sm text-gray-400">Support this musician's work</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="Close modal"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form Content */}
        <div className="p-6 space-y-6">
          {/* Preset Amounts */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">Select Amount</label>
            <div className="grid grid-cols-3 gap-2">
              {presetAmounts.map((preset) => (
                <button
                  key={preset}
                  onClick={() => handlePresetClick(preset)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    amount === preset
                      ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white'
                      : 'bg-white/10 text-gray-300 hover:bg-white/20'
                  }`}
                >
                  ${preset}
                </button>
              ))}
            </div>
            <div className="mt-2">
              <label className="block text-sm font-medium text-gray-300 mb-2">Or enter custom amount</label>
              <input
                type="number"
                value={customAmount}
                onChange={(e) => handleCustomAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          {/* Donor Information */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-300">Your Information (Optional)</label>
            
            <input
              type="text"
              value={donorName}
              onChange={(e) => setDonorName(e.target.value)}
              placeholder="Your name"
              className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              disabled={isAnonymous}
            />
            
            <input
              type="email"
              value={donorEmail}
              onChange={(e) => setDonorEmail(e.target.value)}
              placeholder="Your email (for receipt)"
              className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              disabled={isAnonymous}
            />

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isAnonymous"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                className="w-4 h-4 rounded border-white/20 bg-white/10 text-purple-500 focus:ring-purple-500"
              />
              <label htmlFor="isAnonymous" className="text-sm text-gray-300">
                Donate anonymously
              </label>
            </div>
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Message (Optional)
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Leave an encouraging message..."
              className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 h-24 resize-none"
            />
          </div>

          {/* Donate Button */}
          <button
            onClick={handleSubmit}
            disabled={isProcessing || (!amount && !customAmount)}
            className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 disabled:opacity-50 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200"
          >
            {isProcessing ? (
              <>⏳ Processing...</>
            ) : (
              <>
                <Heart className="w-5 h-5" />
                <span>Donate ${amount || customAmount || '0'}</span>
              </>
            )}
          </button>

          <p className="text-xs text-gray-400 text-center">
            Secure payment powered by Stripe
          </p>
        </div>
      </motion.div>
    </div>
  )
}

