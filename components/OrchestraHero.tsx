'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { X, ChevronRight } from 'lucide-react'
import AuthButtons from '@/components/AuthButtons'
import { useUserRole } from '@/lib/hooks/useUserRole'

export default function OrchestraHero() {
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showMoreActions, setShowMoreActions] = useState(false)
  const router = useRouter()
  const { user, role } = useUserRole()

  const isPerformerOrAdmin =
    role === 'musician' ||
    role === 'beam_admin' ||
    role === 'partner_admin' ||
    role === 'board'

  const primaryAction = isPerformerOrAdmin
    ? { label: 'Join as Participant', href: '/join/participant' }
    : { label: 'Watch & Support', href: '/viewer' }

  const secondaryActions = isPerformerOrAdmin
    ? [
        { label: 'Recording Sessions', href: '/studio/recordings' },
        { label: 'Mix Review', href: '/studio' },
        { label: 'Admin Dashboard', href: '/admin/dashboard', adminOnly: true },
      ]
    : [
        { label: 'Explore Performances', href: '/viewer' },
        { label: 'Book BEAM Talent', href: '/viewer/book' },
        { label: user ? 'Open Subscriber Area' : 'Subscribe / Log In', href: user ? '/viewer' : '/subscriber' },
      ]

  const handleSignInSuccess = () => {
    setShowAuthModal(false)
    // Redirect to admin dashboard after successful sign-in
    router.push('/admin/dashboard')
  }

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-black">
      {/* Background Image/Video - Right Side */}
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
        {/* Gradient Overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-l from-black/90 via-black/70 to-black/50 lg:to-transparent" />
        {/* Color filter overlay matching BEAM palette */}
        <div className="absolute inset-0 bg-gradient-to-l from-transparent via-transparent to-[#D4AF37]/5" />
      </div>

      {/* Content Container */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center min-h-screen py-20">
          
          {/* Left Column - Text Content */}
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

            {/* Main Title */}
            <motion.div
              className="min-h-[120px] md:min-h-[160px] flex items-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold text-white leading-tight">
                Orchestra.
              </h1>
            </motion.div>

            {/* Subtext */}
            <motion.p
              className="text-lg md:text-xl text-white/80 max-w-lg leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
            >
              A professional orchestra and training ecosystem connecting concerts, education, and community.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              className="pt-4 space-y-3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8 }}
            >
              <div className="flex w-full sm:w-auto items-stretch gap-2">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Link
                    href={primaryAction.href}
                    className="inline-flex h-full items-center justify-center px-8 py-4 bg-[#D4AF37] hover:bg-[#B8941F] text-black font-bold rounded-xl transition-all duration-300 shadow-lg hover:shadow-[#D4AF37]/50 hover:shadow-2xl text-center"
                  >
                    {primaryAction.label}
                  </Link>
                </motion.div>
                <motion.button
                  type="button"
                  onClick={() => setShowMoreActions((prev) => !prev)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  aria-expanded={showMoreActions}
                  aria-label="Show more actions"
                  className="inline-flex items-center justify-center rounded-xl border-2 border-[#D4AF37] px-4 text-[#D4AF37] hover:bg-[#D4AF37]/10 transition-all duration-300"
                >
                  <motion.span
                    animate={{ rotate: showMoreActions ? 90 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronRight className="h-5 w-5" />
                  </motion.span>
                </motion.button>
              </div>

              <AnimatePresence initial={false}>
                {showMoreActions && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                    exit={{ opacity: 0, y: -8, height: 0 }}
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                    className="overflow-hidden"
                  >
                    <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3">
                      {secondaryActions
                        .filter((action) => {
                          if (!('adminOnly' in action)) return true
                          return role === 'beam_admin' || role === 'partner_admin'
                        })
                        .map((action) => (
                          <motion.div key={action.label} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                            <Link
                              href={action.href}
                              className="inline-block w-full sm:w-auto px-8 py-4 bg-transparent border-2 border-[#D4AF37] hover:bg-[#D4AF37]/10 text-[#D4AF37] font-bold rounded-xl transition-all duration-300 shadow-lg hover:shadow-[#D4AF37]/30 hover:shadow-xl text-center"
                            >
                              {action.label}
                            </Link>
                          </motion.div>
                        ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Subtext under buttons */}
            <motion.p
              className="text-sm text-white/60 italic"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 1 }}
            >
              {isPerformerOrAdmin
                ? 'Participant and admin controls are grouped here.'
                : 'Explore performances, subscribe, and book talent from one place.'}
            </motion.p>
          </motion.div>

          {/* Right Column - Visual Layer (handled by background) */}
          <div className="hidden lg:block" />
        </div>
      </div>

      {/* Bottom Left - Login Links */}
      <motion.div
        className="absolute bottom-4 left-4 md:bottom-8 md:left-8 z-20 text-white/70 text-xs space-y-1"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 1.2 }}
      >
        <div>
          {user ? (
            <Link
              href="/admin/dashboard"
              className="hover:text-[#D4AF37] transition-colors"
            >
              Admin Dashboard
            </Link>
          ) : (
            <button
              onClick={() => setShowAuthModal(true)}
              className="hover:text-[#D4AF37] transition-colors text-left"
            >
              Admin Login
            </button>
          )}
        </div>
        <div>
          <Link
            href="/signup"
            className="hover:text-[#D4AF37] transition-colors"
          >
            Signup
          </Link>
        </div>
        <div>
          <Link
            href="/sign-in"
            className="hover:text-[#D4AF37] transition-colors"
          >
            Sign In
          </Link>
        </div>
      </motion.div>

      {/* Auth Modal */}
      <AnimatePresence>
        {showAuthModal && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAuthModal(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="bg-black border-2 border-[#D4AF37]/30 rounded-2xl p-8 max-w-md w-full relative shadow-2xl">
                {/* Close Button */}
                <button
                  onClick={() => setShowAuthModal(false)}
                  className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>

                {/* Modal Content */}
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-white mb-2">Admin Login</h2>
                  <p className="text-white/70 text-sm">
                    Sign in to access the admin dashboard
                  </p>
                </div>

                <AuthButtons
                  onSignInSuccess={handleSignInSuccess}
                  mobileFriendly={true}
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </section>
  )
}
