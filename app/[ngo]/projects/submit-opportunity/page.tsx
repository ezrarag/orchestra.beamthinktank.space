import Link from 'next/link'

export default async function NgoSubmitOpportunityPlaceholder({ params }: { params: Promise<{ ngo: string }> }) {
  const { ngo } = await params

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-semibold text-slate-900">Submit Opportunity</h1>
      <p className="mt-3 text-slate-600">This placeholder is scoped to <span className="font-mono">{ngo}</span> and will become the intake form.</p>
      <Link href={`/${ngo}/projects`} className="mt-6 inline-flex text-sm font-semibold text-slate-900 underline">Back to projects</Link>
    </main>
  )
}
