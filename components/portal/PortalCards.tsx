'use client'

import { motion } from 'framer-motion'

export type PortalType = 'watch' | 'participate' | 'cohorts'

type PortalCardItem = {
  id: PortalType
  title: string
  subtitle: string
  description: string
  gradient: string
  glowColor: string
}

const portalItems: PortalCardItem[] = [
  {
    id: 'watch',
    title: 'WATCH',
    subtitle: 'PPV / Content Stream',
    description: 'Experience our premier classical orchestra. Stream concert recordings, live performances, and high-fidelity video sets.',
    gradient: 'from-amber-500/20 via-yellow-600/10 to-transparent',
    glowColor: 'group-hover:shadow-amber-500/10',
  },
  {
    id: 'participate',
    title: 'PARTICIPATE',
    subtitle: 'Musicians & Engineers',
    description: 'Join us as a violinist, violist, composer, arranger, or audio engineer. Apply to perform, rehearse, and build together.',
    gradient: 'from-violet-500/20 via-purple-600/10 to-transparent',
    glowColor: 'group-hover:shadow-violet-500/10',
  },
  {
    id: 'cohorts',
    title: 'COHORTS',
    subtitle: 'Institutional Partners',
    description: 'Unlock group access, university subscriptions, or coordinate collaborative rehearsals and customized performance programs.',
    gradient: 'from-blue-500/20 via-cyan-600/10 to-transparent',
    glowColor: 'group-hover:shadow-blue-500/10',
  },
]

type Props = {
  onSelect: (type: PortalType) => void
  onHover: (type: PortalType | null) => void
}

export default function PortalCards({ onSelect, onHover }: Props) {
  return (
    <div className="grid gap-6 md:grid-cols-3 max-w-5xl w-full px-4">
      {portalItems.map((item) => (
        <motion.button
          key={item.id}
          onClick={() => onSelect(item.id)}
          onMouseEnter={() => onHover(item.id)}
          onMouseLeave={() => onHover(null)}
          className="group relative flex flex-col items-start text-left rounded-3xl border border-white/10 bg-black/30 p-6 backdrop-blur-xl transition-all duration-300 hover:border-white/20 hover:bg-black/45 focus:outline-none"
          whileHover={{ y: -8, scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {/* Subtle Glow overlay */}
          <div className={`absolute inset-0 rounded-3xl opacity-0 transition-opacity duration-500 group-hover:opacity-100 bg-gradient-to-br ${item.gradient}`} />
          
          <div className="relative z-10 w-full">
            <span className="text-[10px] font-semibold tracking-[0.2em] text-white/45">PORTAL</span>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-white group-hover:text-amber-400 transition-colors duration-300">
              {item.title}
            </h2>
            <p className="mt-1 text-xs font-medium text-white/60">
              {item.subtitle}
            </p>
            <p className="mt-4 text-sm leading-6 text-white/50 group-hover:text-white/70 transition-colors duration-300">
              {item.description}
            </p>
            
            <div className="mt-6 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-white/80 group-hover:text-white transition-colors duration-300">
              <span>Open Portal</span>
              <span className="inline-block transition-transform duration-200 group-hover:translate-x-1">→</span>
            </div>
          </div>
        </motion.button>
      ))}
    </div>
  )
}
