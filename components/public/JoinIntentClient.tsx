'use client'

import { useRouter } from 'next/navigation'
import { BriefcaseBusiness, Music4, UsersRound } from 'lucide-react'
import type { ParticipantIntent } from '@/lib/portal/onboarding'

type IntentCard = {
  id: ParticipantIntent
  label: string
  description: string
  icon: typeof Music4
}

const INTENT_CARDS: IntentCard[] = [
  {
    id: 'perform',
    label: 'Perform',
    description: 'Join an ensemble, chamber group, or publishing track',
    icon: Music4,
  },
  {
    id: 'recruit_mentor',
    label: 'Recruit & Mentor',
    description: 'Join the cohort: weekly school visits, auditions, mentorship',
    icon: UsersRound,
  },
  {
    id: 'admin_staff',
    label: 'Admin / Staff',
    description: 'Operations, partnerships, development',
    icon: BriefcaseBusiness,
  },
]

export default function JoinIntentClient() {
  const router = useRouter()

  const handleSelect = (intent: ParticipantIntent) => {
    if (intent === 'recruit_mentor') {
      router.push('/join/cohort')
      return
    }

    router.push(`/join/confirm?intent=${intent}`)
  }

  return (
    <div className="grid h-full gap-4 lg:grid-cols-3">
      {INTENT_CARDS.map((card) => {
        const Icon = card.icon

        return (
          <button
            key={card.id}
            type="button"
            onClick={() => handleSelect(card.id)}
            className="group flex min-h-[260px] flex-col justify-between rounded-[28px] border border-white/12 bg-white/[0.03] p-6 text-left transition hover:border-white/25 hover:bg-white/[0.05]"
          >
            <div>
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-black/30 text-white/85">
                <Icon className="h-5 w-5" />
              </span>
              <h2 className="mt-8 text-2xl font-semibold tracking-[-0.02em] text-white">{card.label}</h2>
              <p className="mt-3 max-w-xs text-sm leading-6 text-white/68">{card.description}</p>
            </div>
            <span className="mt-8 text-sm font-medium text-white/82 transition group-hover:text-white">Continue</span>
          </button>
        )
      })}
    </div>
  )
}
