'use client'

import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import type { PortalType } from './PortalCards'

type ModalContent = {
  title: string
  subtitle: string
  description: string
  detailsHeading: string
  details: string[]
  ctaText: string
  ctaHref: string
  accentColor: string
  visualGradient: string
}

const modalData: Record<PortalType, ModalContent> = {
  watch: {
    title: 'WATCH PORTAL',
    subtitle: 'Stream High-Fidelity Content',
    description: 'Experience classical masterworks performed by our premier community orchestra. Stream high-fidelity multi-camera video sets and high-resolution spatial audio mixes directly to your workstation.',
    detailsHeading: 'INCLUDED WITH PPV & PASSES:',
    details: [
      'Concert hall archives (1080p / 4K)',
      'Multi-track spatial audio mixes',
      'Behind-the-scenes rehearsals',
      'Exclusive digital programme booklets'
    ],
    ctaText: 'Access Stream & Archive',
    ctaHref: '/viewer',
    accentColor: 'from-amber-400 to-yellow-500',
    visualGradient: 'from-amber-500/20 via-yellow-600/5 to-transparent'
  },
  participate: {
    title: 'PARTICIPATE PORTAL',
    subtitle: 'Musician & Engineer Pathways',
    description: 'We are expanding the orchestra. We are seeking committed violinists, violists, audio recording engineers, and composers or arrangers to participate in rehearsals, recording sessions, and public performances.',
    detailsHeading: 'CURRENT INTAKE ROLES:',
    details: [
      'Violinists & Violists (All sections)',
      'Recording & Audio Engineers',
      'Arrangers & Composers',
      'Production Assistant Cohorts'
    ],
    ctaText: 'Apply to Participate',
    ctaHref: '/join/participant',
    accentColor: 'from-violet-400 to-purple-500',
    visualGradient: 'from-violet-500/20 via-purple-600/5 to-transparent'
  },
  cohorts: {
    title: 'COHORTS PORTAL',
    subtitle: 'Institutional Subscriptions',
    description: 'Provide group memberships, student training integrations, or coordinate university rehearsal access. Build custom orchestral sponsorships, concert programming packages, and educational pipelines.',
    detailsHeading: 'COHORT STRUCTURES AVAILABLE:',
    details: [
      'University student group passes',
      'Community partner ticket block allocations',
      'Custom sponsored rehearsal programs',
      'High-school musical mentorship pipelines'
    ],
    ctaText: 'Establish Cohort Subscription',
    ctaHref: '/join/institution',
    accentColor: 'from-blue-400 to-cyan-500',
    visualGradient: 'from-blue-500/20 via-cyan-600/5 to-transparent'
  }
}

type Props = {
  isOpen: boolean
  type: PortalType | null
  onClose: () => void
}

export default function FullScreenModal({ isOpen, type, onClose }: Props) {
  if (!type) return null
  const content = modalData[type]

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#090a0f]/80 backdrop-blur-xl p-4 md:p-10 overflow-hidden"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.35, ease: 'easeInOut' }}
        >
          {/* Subtle Ambient Background Gradients */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(255,255,255,0.03),transparent_60%)]" />
          <div className={`absolute inset-0 bg-gradient-to-tr ${content.visualGradient} opacity-60`} />

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-black/40 text-white/70 backdrop-blur-xl transition-all duration-300 hover:border-white/30 hover:text-white hover:scale-105 active:scale-95 focus:outline-none"
            aria-label="Close modal"
          >
            <span className="text-xl">✕</span>
          </button>

          {/* 2-Column Responsive Layout */}
          <div className="relative z-10 grid h-full w-full max-w-6xl grid-cols-1 md:grid-cols-2 gap-10 items-center overflow-y-auto md:overflow-hidden py-10 md:py-0">
            
            {/* Left Column: Visual Animations Placeholder */}
            <div className="relative h-64 md:h-[480px] w-full rounded-3xl border border-white/10 bg-black/40 backdrop-blur-xl overflow-hidden flex items-center justify-center">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.01),transparent_70%)]" />
              
              {/* Rotating Wireframe/Circle Graphic representing Orchestra grid */}
              <motion.div
                className="relative flex items-center justify-center w-48 h-48 md:w-64 md:h-64 rounded-full border border-white/5"
                animate={{ rotate: 360 }}
                transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
              >
                {/* Orbiting nodes */}
                <span className="absolute top-0 w-2.5 h-2.5 rounded-full bg-white/20" />
                <span className="absolute bottom-0 w-2.5 h-2.5 rounded-full bg-white/20" />
                <span className="absolute left-0 w-2.5 h-2.5 rounded-full bg-white/20" />
                <span className="absolute right-0 w-2.5 h-2.5 rounded-full bg-white/20" />
                
                <motion.div
                  className="w-32 h-32 md:w-44 md:h-44 rounded-full border border-white/10 flex items-center justify-center"
                  animate={{ rotate: -360 }}
                  transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
                >
                  <span className="absolute top-4 w-2 h-2 rounded-full bg-white/30" />
                  <span className="absolute bottom-4 w-2 h-2 rounded-full bg-white/30" />
                  
                  <div className="w-16 h-16 md:w-24 md:h-24 rounded-full border border-white/20 bg-white/5 flex items-center justify-center">
                    <motion.div
                      className={`w-4 h-4 md:w-6 md:h-6 rounded-full bg-gradient-to-br ${content.accentColor} blur-sm`}
                      animate={{ scale: [1, 1.25, 1] }}
                      transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                    />
                  </div>
                </motion.div>
              </motion.div>

              {/* Decorative moving lines */}
              <div className="absolute inset-x-0 bottom-6 px-8 text-center">
                <p className="text-[10px] font-semibold tracking-[0.25em] text-white/30 uppercase animate-pulse">
                  System Visualizer Active
                </p>
              </div>
            </div>

            {/* Right Column: Copy & Actions */}
            <div className="flex flex-col justify-center items-start text-left max-w-lg">
              <span className={`bg-gradient-to-r ${content.accentColor} bg-clip-text text-transparent text-xs font-bold tracking-[0.25em] uppercase`}>
                {content.title}
              </span>
              <h1 className="mt-4 text-4xl font-bold tracking-tight text-white md:text-5xl">
                {content.subtitle}
              </h1>
              <p className="mt-6 text-sm md:text-base leading-7 text-white/60">
                {content.description}
              </p>

              <div className="mt-8 w-full border-t border-white/10 pt-6">
                <h3 className="text-xs font-bold tracking-[0.15em] text-white/40 uppercase">
                  {content.detailsHeading}
                </h3>
                <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {content.details.map((detail, index) => (
                    <li key={index} className="flex items-center gap-2.5 text-xs text-white/70">
                      <span className={`h-1.5 w-1.5 rounded-full bg-gradient-to-br ${content.accentColor}`} />
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-10 flex w-full">
                <Link
                  href={content.ctaHref}
                  className={`inline-flex w-full items-center justify-center rounded-full bg-gradient-to-r ${content.accentColor} py-4 text-sm font-bold uppercase tracking-wider text-black transition-all duration-300 hover:brightness-110 hover:shadow-lg hover:shadow-black/20 focus:outline-none`}
                >
                  {content.ctaText}
                </Link>
              </div>
            </div>

          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
