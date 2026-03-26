import type { ReactNode } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

type PublicFlowShellProps = {
  eyebrow?: string
  title: string
  subtitle: string
  backHref?: string
  backLabel?: string
  children: ReactNode
}

export default function PublicFlowShell({
  eyebrow = 'orchestra.BEAM',
  title,
  subtitle,
  backHref = '/home',
  backLabel = 'Back to Home',
  children,
}: PublicFlowShellProps) {
  return (
    <main className="min-h-screen bg-[#0b0d10] px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl flex-col">
        <div className="mb-10">
          <Link
            href={backHref}
            className="inline-flex items-center gap-2 text-sm text-white/65 transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            {backLabel}
          </Link>
          <p className="mt-8 text-[11px] uppercase tracking-[0.22em] text-white/45">{eyebrow}</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">{title}</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-white/70">{subtitle}</p>
        </div>
        <div className="flex-1">{children}</div>
      </div>
    </main>
  )
}
