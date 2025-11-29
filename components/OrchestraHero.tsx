'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'

export default function OrchestraHero() {

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
              className="flex flex-col sm:flex-row gap-4 pt-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8 }}
            >
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Link
                  href="/tickets"
                  className="inline-block px-8 py-4 bg-[#D4AF37] hover:bg-[#B8941F] text-black font-bold rounded-xl transition-all duration-300 shadow-lg hover:shadow-[#D4AF37]/50 hover:shadow-2xl text-center"
                >
                  Buy Tickets
                </Link>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Link
                  href="/studio"
                  className="inline-block px-8 py-4 bg-transparent border-2 border-[#D4AF37] hover:bg-[#D4AF37]/10 text-[#D4AF37] font-bold rounded-xl transition-all duration-300 shadow-lg hover:shadow-[#D4AF37]/30 hover:shadow-xl text-center"
                >
                  Watch & Explore
                </Link>
              </motion.div>
            </motion.div>

            {/* Subtext under buttons */}
            <motion.p
              className="text-sm text-white/60 italic"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 1 }}
            >
              For audiences, musicians, and partner organizations.
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
          <Link
            href="/admin/dashboard"
            className="hover:text-[#D4AF37] transition-colors"
          >
            Admin Login
          </Link>
        </div>
        <div>
          <Link
            href="/musician"
            className="hover:text-[#D4AF37] transition-colors"
          >
            Musician
          </Link>
        </div>
        <div>
          <Link
            href="/subscriber"
            className="hover:text-[#D4AF37] transition-colors"
          >
            Subscriber
          </Link>
        </div>
      </motion.div>
    </section>
  )
}

