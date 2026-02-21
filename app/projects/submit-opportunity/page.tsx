import Link from 'next/link'

export default function SubmitOpportunityPlaceholder() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-semibold text-slate-900">Submit Opportunity</h1>
      <p className="mt-3 text-slate-600">This placeholder will become the public/partner performer request intake form.</p>
      <Link href="/projects" className="mt-6 inline-flex text-sm font-semibold text-slate-900 underline">Back to projects</Link>
    </main>
  )
}
