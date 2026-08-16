'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  DollarSign, 
  Coins, 
  ArrowRight, 
  BookOpen, 
  Wrench, 
  Ticket, 
  Award, 
  Home, 
  Utensils, 
  Truck, 
  CheckCircle2, 
  Clock,
  Sparkles,
  ArrowUpRight
} from 'lucide-react'
import Link from 'next/link'
import { PARTICIPATE_BENEFITS_CONFIG } from '@/lib/config/participateBenefits'

export default function ParticipantBenefitsPage() {
  const config = PARTICIPATE_BENEFITS_CONFIG
  const [selectedPhase, setSelectedPhase] = useState<'all' | 1 | 2>('all')

  const liveItems = config.redemptions.filter(r => r.phase === 1)
  const comingSoonItems = config.redemptions.filter(r => r.phase === 2)

  const getIcon = (name: string) => {
    switch (name) {
      case 'BookOpen': return <BookOpen className="w-6 h-6" />
      case 'Tool': return <Wrench className="w-6 h-6" />
      case 'Ticket': return <Ticket className="w-6 h-6" />
      case 'Award': return <Award className="w-6 h-6" />
      case 'Home': return <Home className="w-6 h-6" />
      case 'Utensils': return <Utensils className="w-6 h-6" />
      case 'Truck': return <Truck className="w-6 h-6" />
      default: return <Sparkles className="w-6 h-6" />
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 text-white selection:bg-purple-500 selection:text-white">
      {/* Hero Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8 overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/30 via-transparent to-transparent pointer-events-none" />
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4 text-purple-400" />
              Artist Compensation & Benefits Model
            </span>
            <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-white mb-6 leading-tight">
              {config.heroTitle}
            </h1>
            <p className="text-lg sm:text-xl text-purple-200/80 max-w-3xl mx-auto leading-relaxed mb-10">
              {config.heroSubtitle}
            </p>
          </motion.div>

          {/* Key Stat Highlights */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto"
          >
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 text-left">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400 font-medium">Direct USD Stipend</span>
                <DollarSign className="w-5 h-5 text-green-400" />
              </div>
              <div className="text-3xl font-bold text-green-400">Up to ${config.maxUsdPerProject}</div>
              <span className="text-xs text-gray-400 mt-1 block">Paid directly per contract project</span>
            </div>

            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 text-left">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400 font-medium">BEAM Coin Rewards</span>
                <Coins className="w-5 h-5 text-amber-400" />
              </div>
              <div className="text-3xl font-bold text-amber-400">Up to {config.maxBeamCoinsPerProject} Coins</div>
              <span className="text-xs text-gray-400 mt-1 block">Earned alongside cash compensation</span>
            </div>
          </motion.div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-24">
        {/* Section 1: How You Earn */}
        <section className="space-y-8">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">How You Earn</h2>
            <p className="text-gray-300">
              Clear, transparent rates for every rehearsal, sectional, and performance.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* USD Column */}
            <div className="bg-gradient-to-br from-green-950/30 to-slate-900/60 backdrop-blur-md rounded-2xl p-8 border border-green-500/20 shadow-xl">
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-3 bg-green-500/10 rounded-xl text-green-400">
                  <DollarSign className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">USD Cash Compensation</h3>
                  <p className="text-xs text-green-300/70">Direct bank deposit / contract payout</p>
                </div>
              </div>

              <div className="space-y-4">
                {config.rates.map((rate) => (
                  <div key={rate.activity} className="flex justify-between items-center p-4 rounded-xl bg-white/5 border border-white/5">
                    <div>
                      <div className="font-semibold text-white">{rate.activity}</div>
                      <div className="text-xs text-gray-400">{rate.duration}</div>
                    </div>
                    <div className="text-xl font-bold text-green-400">${rate.usdRate}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* BEAM Coin Column */}
            <div className="bg-gradient-to-br from-amber-950/30 to-slate-900/60 backdrop-blur-md rounded-2xl p-8 border border-amber-500/20 shadow-xl">
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400">
                  <Coins className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">BEAM Coin Rewards</h3>
                  <p className="text-xs text-amber-300/70">Digital credit for artistic & living expenses</p>
                </div>
              </div>

              <div className="space-y-4">
                {config.rates.map((rate) => (
                  <div key={rate.activity} className="flex justify-between items-center p-4 rounded-xl bg-white/5 border border-white/5">
                    <div>
                      <div className="font-semibold text-white">{rate.activity}</div>
                      <div className="text-xs text-gray-400">{rate.duration}</div>
                    </div>
                    <div className="text-xl font-bold text-amber-400">+{rate.beamCoinRate} Coins</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: What BEAM Coin Redeems Toward */}
        <section className="space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/10 pb-6">
            <div>
              <span className="text-xs uppercase font-bold tracking-wider text-purple-400 block mb-1">Ecosystem Catalog</span>
              <h2 className="text-3xl sm:text-4xl font-bold text-white">What BEAM Coin Redeems Toward</h2>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setSelectedPhase('all')}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                  selectedPhase === 'all' ? 'bg-purple-600 text-white' : 'bg-white/5 text-gray-400 hover:text-white'
                }`}
              >
                All Rewards
              </button>
              <button
                onClick={() => setSelectedPhase(1)}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                  selectedPhase === 1 ? 'bg-green-600 text-white' : 'bg-white/5 text-gray-400 hover:text-white'
                }`}
              >
                Phase 1 (Live)
              </button>
              <button
                onClick={() => setSelectedPhase(2)}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                  selectedPhase === 2 ? 'bg-amber-600 text-white' : 'bg-white/5 text-gray-400 hover:text-white'
                }`}
              >
                Phase 2 (Coming)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Live Phase 1 Items */}
            {(selectedPhase === 'all' || selectedPhase === 1) &&
              liveItems.map((item) => (
                <div
                  key={item.id}
                  className="group bg-gradient-to-b from-white/10 to-white/5 rounded-2xl p-6 border border-white/10 hover:border-purple-500/50 transition-all duration-300 shadow-lg flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-3 bg-purple-500/20 text-purple-300 rounded-xl">
                        {getIcon(item.iconName)}
                      </div>
                      <span className="px-3 py-1 bg-green-500/20 text-green-300 text-xs font-bold rounded-full border border-green-500/30 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Live
                      </span>
                    </div>
                    <span className="text-xs text-purple-300 font-semibold uppercase tracking-wider block mb-1">{item.category}</span>
                    <h3 className="text-xl font-bold text-white mb-2 group-hover:text-purple-300 transition-colors">{item.title}</h3>
                    <p className="text-gray-300 text-sm leading-relaxed mb-6">{item.description}</p>
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-white/10">
                    <span className="text-sm font-semibold text-amber-400 flex items-center gap-1">
                      <Coins className="w-4 h-4" /> {item.cost}
                    </span>
                    <Link
                      href="/members"
                      className="text-xs font-bold text-purple-300 hover:text-white flex items-center gap-1 group-hover:translate-x-1 transition-transform"
                    >
                      Redeem in App <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))}

            {/* Coming Soon Phase 2 Items */}
            {(selectedPhase === 'all' || selectedPhase === 2) &&
              comingSoonItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-white/5 rounded-2xl p-6 border border-white/5 opacity-75 hover:opacity-100 transition-opacity flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-3 bg-white/5 text-gray-400 rounded-xl">
                        {getIcon(item.iconName)}
                      </div>
                      <span className="px-3 py-1 bg-amber-500/10 text-amber-400 text-xs font-bold rounded-full border border-amber-500/20 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Coming Soon
                      </span>
                    </div>
                    <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider block mb-1">{item.category}</span>
                    <h3 className="text-xl font-bold text-gray-200 mb-2">{item.title}</h3>
                    <p className="text-gray-400 text-sm leading-relaxed mb-6">{item.description}</p>
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-white/5">
                    <span className="text-xs font-medium text-gray-400">Expansion Roadmap</span>
                    <span className="text-xs font-semibold px-2.5 py-1 bg-white/5 text-gray-300 rounded">Phase 2</span>
                  </div>
                </div>
              ))}
          </div>
        </section>

        {/* Section 3: The Progression */}
        <section className="bg-gradient-to-r from-purple-900/30 via-slate-900/60 to-purple-900/30 backdrop-blur-md rounded-3xl p-8 sm:p-12 border border-white/10 space-y-10 text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">The Progression</h2>
            <p className="text-lg text-purple-200 font-serif italic">
              &ldquo;The more you contribute, the more you earn. The more you earn, the more of your life as an artist is covered.&rdquo;
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {config.progressionSteps.map((step) => (
              <div key={step.step} className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 relative">
                <div className="w-10 h-10 rounded-full bg-purple-600 text-white font-bold flex items-center justify-center mx-auto mb-4 text-lg">
                  {step.step}
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{step.title}</h3>
                <p className="text-gray-300 text-sm leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="text-center py-8">
          <div className="bg-gradient-to-r from-purple-600/30 to-blue-600/30 backdrop-blur-md rounded-3xl p-12 border border-purple-500/30">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Ready to Perform & Earn?</h2>
            <p className="text-gray-300 max-w-xl mx-auto mb-8">
              Join the BEAM ecosystem today to audition for active contract projects, participate in rehearsals, and access our full benefit network.
            </p>
            <Link
              href="/join"
              className="inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-purple-500/25 text-lg"
            >
              Join as a participant
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}
