'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { Play, X, Check, ArrowUpRight } from 'lucide-react'
import { useRouter } from 'next/navigation'

const subscriptionTiers = [
  {
    id: 'basic',
    name: 'Basic',
    price: 5,
    period: 'month',
    features: [
      'Access to public media library',
      'View rehearsal footage',
      'Community updates',
      'Basic project information'
    ]
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 15,
    period: 'month',
    features: [
      'Everything in Basic',
      'Exclusive subscriber-only content',
      'Early access to new projects',
      'Priority support',
      'Behind-the-scenes content',
      'Download media files'
    ]
  }
]

export default function SubscriberPage() {
  const router = useRouter()
  const [showVideoModal, setShowVideoModal] = useState(false)
  const [showTiersMenu, setShowTiersMenu] = useState(false)
  const [selectedTier, setSelectedTier] = useState<string | null>(null)
  const tiersMenuRef = useRef<HTMLDivElement>(null)

  const handleSubscribe = (tierId: string) => {
    setSelectedTier(tierId)
    setShowTiersMenu(false)
    // Redirect to subscribe flow with tier parameter
    router.push(`/subscribe?tier=${tierId}`)
  }

  // Scroll tiers menu into view when it opens
  useEffect(() => {
    if (showTiersMenu && tiersMenuRef.current) {
      // Small delay to ensure animation starts
      setTimeout(() => {
        tiersMenuRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center',
          inline: 'nearest'
        })
      }, 100)
    }
  }, [showTiersMenu])

  return (
    <div className="h-screen bg-black relative overflow-hidden flex flex-col">
      {/* Background Image - Right Side */}
      <div className="absolute right-0 top-0 w-full lg:w-1/2 h-full overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="https://firebasestorage.googleapis.com/v0/b/beam-orchestra-platform.firebasestorage.app/o/pexels-afroromanzo-4028878.jpg?alt=media&token=b95bbe32-cc29-4ff7-815a-3dd558efa561"
            alt="Orchestra Background"
            fill
            className="object-cover"
            priority
          />
        </div>
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-l from-black/90 via-black/70 to-black/50 lg:to-transparent" />
        {/* Color filter overlay matching BEAM palette */}
        <div className="absolute inset-0 bg-gradient-to-l from-transparent via-transparent to-[#D4AF37]/5" />
      </div>

      {/* Content Container */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex-1 flex items-center">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 w-full items-center">
          
          {/* Left Column - Video and Subscribe */}
          <motion.div
            className="text-white space-y-8"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            {/* Top Tagline */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <h2 className="text-[#D4AF37] font-bold text-sm tracking-[0.2em] uppercase mb-2">
                BEAM ORCHESTRA
              </h2>
              <p className="text-white/90 text-sm font-medium tracking-wide">
                Community. Creation. Collaboration.
              </p>
            </motion.div>

            {/* Video Explainer Window */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="relative"
            >
              <div
                onClick={() => setShowVideoModal(true)}
                className="relative aspect-video bg-black/50 rounded-xl border-2 border-[#D4AF37]/30 overflow-hidden cursor-pointer group hover:border-[#D4AF37]/60 transition-all duration-300"
              >
                <Image
                  src="https://firebasestorage.googleapis.com/v0/b/beam-orchestra-platform.firebasestorage.app/o/pexels-afroromanzo-4028878.jpg?alt=media&token=b95bbe32-cc29-4ff7-815a-3dd558efa561"
                  alt="Video Thumbnail"
                  fill
                  className="object-cover opacity-60 group-hover:opacity-80 transition-opacity"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                
                {/* Play Button */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-20 h-20 rounded-full bg-[#D4AF37]/90 backdrop-blur-sm flex items-center justify-center group-hover:bg-[#D4AF37] group-hover:scale-110 transition-all duration-300 shadow-2xl">
                    <Play className="w-10 h-10 text-black ml-1" fill="black" />
                  </div>
                </div>

                {/* Video Title Overlay */}
                <div className="absolute bottom-4 left-4 right-4">
                  <p className="text-white font-semibold text-sm">Learn About BEAM Orchestra</p>
                  <p className="text-white/70 text-xs mt-1">Click to watch</p>
                </div>
              </div>
            </motion.div>

            {/* Subscribe Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="relative"
            >
              <motion.button
                onClick={() => setShowTiersMenu(!showTiersMenu)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-full px-8 py-4 bg-[#D4AF37] hover:bg-[#B8941F] text-black font-bold rounded-xl transition-all duration-300 shadow-lg hover:shadow-[#D4AF37]/50 hover:shadow-2xl text-center"
              >
                Subscribe
              </motion.button>
            </motion.div>

            {/* Subtext */}
            <motion.p
              className="text-sm text-white/60 italic"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.8 }}
            >
              Support our mission and get exclusive access to content.
            </motion.p>
          </motion.div>

          {/* Right Column - Visual Layer (handled by background) */}
          <div className="hidden lg:block" />
        </div>
      </div>

      {/* Bottom Left - Back Link */}
      <motion.div
        className="absolute bottom-4 left-4 md:bottom-8 md:left-8 z-20 text-white/70 text-xs"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 1.2 }}
      >
        <Link
          href="/"
          className="hover:text-[#D4AF37] transition-colors"
        >
          ← Back to Home
        </Link>
      </motion.div>

      {/* Subscription Tiers Modal - Fixed centered modal that scrolls into view */}
      <AnimatePresence>
        {showTiersMenu && (
          <>
            {/* Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100]"
              onClick={() => setShowTiersMenu(false)}
            />
            
            {/* Modal Content */}
            <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none">
              <motion.div
                ref={tiersMenuRef}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.95 }}
                transition={{ 
                  type: "spring",
                  stiffness: 400,
                  damping: 25,
                  duration: 0.6
                }}
                className="bg-black/95 backdrop-blur-lg border-2 border-[#D4AF37]/50 rounded-xl p-6 shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto pointer-events-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[#D4AF37] font-bold text-lg">Choose Your Tier</h3>
                  <button
                    onClick={() => setShowTiersMenu(false)}
                    className="text-white/60 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  {subscriptionTiers.map((tier, index) => (
                    <motion.div
                      key={tier.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="border border-white/20 rounded-lg p-4 hover:border-[#D4AF37]/50 transition-colors cursor-pointer group"
                      onClick={() => handleSubscribe(tier.id)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="text-white font-bold text-lg mb-1">{tier.name}</h4>
                          <div className="flex items-baseline gap-1">
                            <span className="text-[#D4AF37] font-bold text-2xl">${tier.price}</span>
                            <span className="text-white/60 text-sm">/{tier.period}</span>
                          </div>
                        </div>
                        <ArrowUpRight className="w-5 h-5 text-white/40 group-hover:text-[#D4AF37] transition-colors" />
                      </div>
                      
                      <ul className="space-y-2">
                        {tier.features.map((feature, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-white/80 text-sm">
                            <Check className="w-4 h-4 text-[#D4AF37] mt-0.5 flex-shrink-0" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* Video Modal */}
      <AnimatePresence>
        {showVideoModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => setShowVideoModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative max-w-4xl w-full aspect-video bg-black rounded-xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowVideoModal(false)}
                className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-black/50 hover:bg-black/80 flex items-center justify-center text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              
              {/* Video Player Placeholder - Replace with actual video embed */}
              <div className="w-full h-full flex items-center justify-center bg-black">
                <div className="text-center">
                  <Play className="w-16 h-16 text-[#D4AF37] mx-auto mb-4" />
                  <p className="text-white">Video player would be embedded here</p>
                  <p className="text-white/60 text-sm mt-2">Replace with YouTube/Vimeo embed or video element</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

