import Link from 'next/link'

interface AdminComingSoonPageProps {
  title: string
  description: string
  plannedFeatures: string[]
}

export default function AdminComingSoonPage({
  title,
  description,
  plannedFeatures,
}: AdminComingSoonPageProps) {
  return (
    <div className="space-y-6 text-white">
      <header className="overflow-hidden rounded-[28px] border border-orchestra-gold/20 bg-[radial-gradient(circle_at_top_left,_rgba(212,175,55,0.18),_transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] px-6 py-6 shadow-[0_20px_60px_rgba(0,0,0,0.28)]">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orchestra-gold/80">Coming Soon</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">{title}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-orchestra-cream/80">{description}</p>
      </header>

      <section className="rounded-[24px] border border-white/10 bg-white/[0.035] p-6 shadow-[0_16px_48px_rgba(0,0,0,0.22)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-white">Planned Features</h2>
          <span className="rounded-full border border-orchestra-gold/20 bg-orchestra-gold/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-orchestra-gold">
            {plannedFeatures.length} queued
          </span>
        </div>
        <ul className="mt-4 space-y-3 text-sm text-orchestra-cream/85">
          {plannedFeatures.map((feature) => (
            <li
              key={feature}
              className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3"
            >
              {feature}
            </li>
          ))}
        </ul>
      </section>

      <Link
        href="/admin/dashboard"
        className="inline-flex text-sm font-semibold text-orchestra-gold hover:text-orchestra-gold/80"
      >
        Back to Dashboard
      </Link>
    </div>
  )
}
