'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Calendar,
  Music,
  Users,
  Building2,
  Scale,
  Mic2,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react'
import Footer from '@/components/Footer'

const participationTracks = [
  {
    title: 'Play In Recording Sessions',
    description:
      'Musicians can join weekly recording calls and collaborative rehearsals.',
    ctaLabel: 'Sign Up As Player',
    href: '/musician/select-project',
    icon: Music,
  },
  {
    title: 'Submit Music For Sessions',
    description:
      'Composers can submit works from new and established catalogs for session review.',
    ctaLabel: 'Submit Music',
    href:
      'mailto:info@beamorchestra.org?subject=Studio%20Recording%20Series%20-%20Music%20Submission',
    icon: Mic2,
  },
  {
    title: 'Connect Your Org / Nonprofit',
    description:
      'Partner organizations can request auto-submission workflows for recurring works and artists.',
    ctaLabel: 'Request Org Integration',
    href:
      'mailto:info@beamorchestra.org?subject=Studio%20Recording%20Series%20-%20Org%20Auto%20Submission',
    icon: Building2,
  },
  {
    title: 'Join Administrative / Legal Support',
    description:
      'Professionals can participate in session operations, legal support, and compliance guidance.',
    ctaLabel: 'Join Admin / Legal',
    href:
      'mailto:info@beamorchestra.org?subject=Studio%20Recording%20Series%20-%20Admin%20or%20Legal%20Participation',
    icon: Scale,
  },
]

export default function StudioRecordingsPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <section className="border-b border-white/10 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.22em] text-[#D4AF37]">
            Studio Recordings Series
          </p>
          <h1 className="mb-6 text-4xl font-bold leading-tight md:text-5xl">
            Weekly Recording Sessions For New And Canonical Works
          </h1>
          <p className="max-w-4xl text-lg text-white/80">
            This series is a weekly recording session focused on works by new and old composers.
            The objective is to create exciting content driven by research and collaborative
            endeavors among participants and members of the community.
          </p>
          <p className="mt-5 max-w-4xl text-lg text-white/80">
            Each cycle culminates in a live performance presented semi-monthly, paired with curated
            meals and multidisciplinary content including dance, visual art, and music.
          </p>
        </div>
      </section>

      <section className="px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <div className="mb-3 flex items-center gap-3 text-[#D4AF37]">
              <Calendar className="h-5 w-5" />
              <h2 className="text-lg font-semibold text-white">Cadence</h2>
            </div>
            <ul className="space-y-2 text-sm text-white/80">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-[#D4AF37]" />
                Weekly studio recording sessions
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-[#D4AF37]" />
                Research-led repertoire development
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-[#D4AF37]" />
                Semi-monthly live performance outcomes
              </li>
            </ul>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <div className="mb-3 flex items-center gap-3 text-[#D4AF37]">
              <Users className="h-5 w-5" />
              <h2 className="text-lg font-semibold text-white">Community Outcomes</h2>
            </div>
            <ul className="space-y-2 text-sm text-white/80">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-[#D4AF37]" />
                Cross-disciplinary curation with dance, visual, and music
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-[#D4AF37]" />
                Shared creation between artists, producers, and community members
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-[#D4AF37]" />
                Public-facing content pipeline for recurring releases
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section className="px-4 pb-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-6 text-3xl font-bold">Join The Sessions</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {participationTracks.map((track, index) => {
              const Icon = track.icon
              const isExternal = track.href.startsWith('mailto:')
              return (
                <motion.div
                  key={track.title}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.06 }}
                  className="rounded-2xl border border-white/10 bg-white/5 p-6"
                >
                  <Icon className="mb-3 h-6 w-6 text-[#D4AF37]" />
                  <h3 className="mb-2 text-xl font-semibold">{track.title}</h3>
                  <p className="mb-4 text-sm text-white/75">{track.description}</p>
                  {isExternal ? (
                    <a
                      href={track.href}
                      className="inline-flex items-center gap-2 font-semibold text-[#D4AF37] hover:text-[#EBCB6D]"
                    >
                      {track.ctaLabel} <ArrowRight className="h-4 w-4" />
                    </a>
                  ) : (
                    <Link
                      href={track.href}
                      className="inline-flex items-center gap-2 font-semibold text-[#D4AF37] hover:text-[#EBCB6D]"
                    >
                      {track.ctaLabel} <ArrowRight className="h-4 w-4" />
                    </Link>
                  )}
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      <section className="px-4 pb-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl rounded-2xl border border-[#D4AF37]/40 bg-[#D4AF37]/10 p-6 md:p-8">
          <h2 className="mb-3 text-2xl font-bold text-[#F1D98B]">Watch As A Monthly Subscriber</h2>
          <p className="mb-6 max-w-3xl text-white/85">
            Session content access is available as a monthly subscription at $5/month. Access is
            free for BEAM participants.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/subscriber"
              className="inline-flex items-center justify-center rounded-lg bg-[#D4AF37] px-6 py-3 font-bold text-black transition-colors hover:bg-[#E5C86A]"
            >
              Subscribe For $5/Month
            </Link>
            <a
              href="mailto:info@beamorchestra.org?subject=BEAM%20Participant%20Free%20Subscriber%20Access"
              className="inline-flex items-center justify-center rounded-lg border border-[#D4AF37] px-6 py-3 font-bold text-[#D4AF37] transition-colors hover:bg-[#D4AF37]/10"
            >
              BEAM Participant Access (Free)
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
