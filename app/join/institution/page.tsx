'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, Building2, CheckCircle2, GraduationCap, Landmark, Users2 } from 'lucide-react'

type ServiceOption = {
  id: string
  title: string
  description: string
  bullets: string[]
  icon: 'community' | 'recruitment' | 'ensemble' | 'culture'
}

type PartnershipTier = {
  id: string
  title: string
  priceLabel: string
  details: string[]
}

const SERVICE_OPTIONS: ServiceOption[] = [
  {
    id: 'repertoire-outreach',
    title: 'Repertoire Orchestra Outreach',
    description: 'Deploy BEAM musicians into your community to build audience engagement through live orchestral programming.',
    bullets: ['School visits', 'Community concerts', 'Public engagement performances'],
    icon: 'community',
  },
  {
    id: 'recruitment-performance',
    title: 'Recruitment Performance Program',
    description: 'Support recruitment events with curated performances for prospective students and families.',
    bullets: ['High school recruitment events', 'Admissions showcases', 'Campus activation performances'],
    icon: 'recruitment',
  },
  {
    id: 'ensemble-activation',
    title: 'Ensemble Activation',
    description: 'Book small ensembles for organizational events and recurring institutional programming.',
    bullets: ['Chamber ensemble deployment', 'Branded institutional performances', 'Flexible venue formats'],
    icon: 'ensemble',
  },
  {
    id: 'cultural-programming',
    title: 'Cultural Programming',
    description: 'Create concert series aligned to institutional themes and community impact priorities.',
    bullets: ['Seasonal curation', 'Theme-aligned programs', 'Community narrative integration'],
    icon: 'culture',
  },
]

const PARTNERSHIP_TIERS: PartnershipTier[] = [
  {
    id: 'starter',
    title: 'Starter Partnership',
    priceLabel: '$2,500 / month',
    details: ['2 performances per month', 'Impact reporting snapshot'],
  },
  {
    id: 'community',
    title: 'Community Activation',
    priceLabel: '$5,000 / month',
    details: ['Weekly outreach activations', 'Concert documentation + summaries'],
  },
  {
    id: 'residency',
    title: 'Institutional Residency',
    priceLabel: '$10,000 / month',
    details: ['3 activations per week', 'Custom programming + executive reporting'],
  },
]

function ServiceIcon({ icon }: { icon: ServiceOption['icon'] }) {
  if (icon === 'community') return <Users2 className="h-5 w-5" />
  if (icon === 'recruitment') return <GraduationCap className="h-5 w-5" />
  if (icon === 'ensemble') return <Building2 className="h-5 w-5" />
  return <Landmark className="h-5 w-5" />
}

export default function JoinInstitutionPage() {
  const [selectedServices, setSelectedServices] = useState<string[]>([])
  const [selectedTier, setSelectedTier] = useState<string>('community')
  const [customBudget, setCustomBudget] = useState<number>(5000)
  const [institutionEmail, setInstitutionEmail] = useState('')

  const selectedServiceLabels = useMemo(() => {
    return SERVICE_OPTIONS.filter((service) => selectedServices.includes(service.id)).map((service) => service.title)
  }, [selectedServices])

  const toggleService = (serviceId: string) => {
    setSelectedServices((current) =>
      current.includes(serviceId) ? current.filter((id) => id !== serviceId) : [...current, serviceId]
    )
  }

  return (
    <div className="min-h-screen bg-[#07080B] px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-2xl border border-white/15 bg-white/[0.04] p-5 backdrop-blur-xl">
          <Link
            href="/home"
            className="inline-flex items-center gap-2 text-sm text-white/75 transition hover:text-[#F5D37A]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
          <p className="mt-3 text-xs uppercase tracking-[0.16em] text-[#F5D37A]">Institutional Partner Flow</p>
          <h1 className="mt-1 text-3xl font-semibold sm:text-4xl">Partner With BEAM Orchestra</h1>
          <p className="mt-3 max-w-3xl text-sm text-white/85 sm:text-base">
            Activate live orchestral music in your community. Universities, schools, nonprofits, and organizations can deploy BEAM ensembles
            to support recruitment, engagement, and cultural programming.
          </p>
        </header>

        <section className="rounded-2xl border border-white/15 bg-white/[0.04] p-5 backdrop-blur-xl">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">Select Services</h2>
            <p className="text-xs uppercase tracking-[0.12em] text-white/60">Choose one or more</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {SERVICE_OPTIONS.map((service) => {
              const selected = selectedServices.includes(service.id)
              return (
                <button
                  key={service.id}
                  type="button"
                  onClick={() => toggleService(service.id)}
                  className={`rounded-2xl border p-4 text-left transition ${
                    selected ? 'border-[#D4AF37] bg-[#D4AF37]/10' : 'border-white/12 bg-black/20 hover:border-white/30'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/25 text-[#F5D37A]">
                      <ServiceIcon icon={service.icon} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-base font-semibold">{service.title}</h3>
                        {selected ? <CheckCircle2 className="h-4 w-4 text-[#F5D37A]" /> : null}
                      </div>
                      <p className="mt-1 text-sm text-white/80">{service.description}</p>
                      <ul className="mt-3 list-disc space-y-1 pl-4 text-xs text-white/75">
                        {service.bullets.map((bullet) => (
                          <li key={bullet}>{bullet}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </section>

        <section className="rounded-2xl border border-white/15 bg-white/[0.04] p-5 backdrop-blur-xl">
          <h2 className="text-xl font-semibold">Budget Commitment</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {PARTNERSHIP_TIERS.map((tier) => {
              const selected = selectedTier === tier.id
              return (
                <button
                  key={tier.id}
                  type="button"
                  onClick={() => setSelectedTier(tier.id)}
                  className={`rounded-xl border p-4 text-left transition ${
                    selected ? 'border-[#D4AF37] bg-[#D4AF37]/10' : 'border-white/12 bg-black/20 hover:border-white/30'
                  }`}
                >
                  <p className="text-sm font-semibold">{tier.title}</p>
                  <p className="mt-1 text-sm text-[#F5D37A]">{tier.priceLabel}</p>
                  <ul className="mt-2 space-y-1 text-xs text-white/75">
                    {tier.details.map((detail) => (
                      <li key={detail}>• {detail}</li>
                    ))}
                  </ul>
                </button>
              )
            })}
          </div>
          <div className="mt-4 rounded-xl border border-white/12 bg-black/20 p-4">
            <div className="flex items-center justify-between gap-3 text-sm">
              <p>Custom Monthly Budget</p>
              <p className="font-semibold text-[#F5D37A]">${customBudget.toLocaleString()} / month</p>
            </div>
            <input
              type="range"
              min={1000}
              max={50000}
              step={500}
              value={customBudget}
              onChange={(event) => setCustomBudget(Number(event.target.value))}
              className="mt-3 w-full accent-[#D4AF37]"
            />
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <article className="rounded-2xl border border-white/15 bg-white/[0.04] p-5 backdrop-blur-xl">
            <h2 className="text-xl font-semibold">Delivery + Impact Snapshot</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-white/12 bg-black/20 px-3 py-2 text-sm">Audience reached: 4,230</div>
              <div className="rounded-xl border border-white/12 bg-black/20 px-3 py-2 text-sm">Schools visited: 11</div>
              <div className="rounded-xl border border-white/12 bg-black/20 px-3 py-2 text-sm">Concerts delivered: 17</div>
              <div className="rounded-xl border border-white/12 bg-black/20 px-3 py-2 text-sm">Recruitment leads: 42</div>
            </div>

            <div className="mt-4 rounded-xl border border-white/12 bg-black/20 p-4">
              <p className="text-[11px] uppercase tracking-[0.12em] text-[#F5D37A]">Case Study</p>
              <p className="mt-1 text-sm font-semibold">University of Wisconsin Milwaukee</p>
              <p className="mt-1 text-sm text-white/80">Director: Dr. Jun Kim • Program: University Community Orchestra</p>
            </div>
          </article>

          <aside className="rounded-2xl border border-white/15 bg-white/[0.04] p-5 backdrop-blur-xl">
            <h2 className="text-xl font-semibold">Institution Verification</h2>
            <p className="mt-2 text-sm text-white/80">
              Use an institutional email (for example: <span className="font-semibold">@uwm.edu</span>, <span className="font-semibold">@school.edu</span>, or your verified nonprofit domain).
            </p>
            <input
              type="email"
              value={institutionEmail}
              onChange={(event) => setInstitutionEmail(event.target.value)}
              placeholder="name@institution.edu"
              className="mt-4 w-full rounded-xl border border-white/20 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-[#D4AF37]"
            />

            <div className="mt-4 rounded-xl border border-white/12 bg-black/20 p-3">
              <p className="text-xs uppercase tracking-[0.12em] text-white/60">Selected Services</p>
              {selectedServiceLabels.length > 0 ? (
                <ul className="mt-2 space-y-1 text-sm text-white/85">
                  {selectedServiceLabels.map((label) => (
                    <li key={label}>• {label}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-white/70">No services selected yet.</p>
              )}
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                href="/join"
                className="inline-flex items-center rounded-full border border-white/30 bg-black/20 px-4 py-2 text-sm font-semibold text-white transition hover:border-[#D4AF37] hover:text-[#F5D37A]"
              >
                Independent Flow
              </Link>
              <Link
                href="/join"
                className="inline-flex items-center gap-2 rounded-full bg-[#D4AF37] px-4 py-2 text-sm font-semibold text-black transition hover:bg-[#E6C86A]"
              >
                Continue Institutional Onboarding
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </aside>
        </section>
      </div>
    </div>
  )
}
