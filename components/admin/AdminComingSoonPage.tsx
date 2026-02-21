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
    <div className="space-y-6">
      <header className="rounded-xl border border-orchestra-gold/20 bg-orchestra-cream/5 p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-orchestra-gold/80">Coming Soon</p>
        <h1 className="mt-2 text-3xl font-bold text-orchestra-gold">{title}</h1>
        <p className="mt-2 text-orchestra-cream/80">{description}</p>
      </header>

      <section className="rounded-xl border border-orchestra-gold/20 bg-orchestra-cream/5 p-6">
        <h2 className="text-lg font-semibold text-orchestra-gold">Planned Features</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-orchestra-cream/85">
          {plannedFeatures.map((feature) => (
            <li key={feature}>{feature}</li>
          ))}
        </ul>
      </section>

      <Link href="/admin/dashboard" className="inline-flex text-sm font-semibold text-orchestra-gold hover:text-orchestra-gold/80">
        Back to Dashboard
      </Link>
    </div>
  )
}
