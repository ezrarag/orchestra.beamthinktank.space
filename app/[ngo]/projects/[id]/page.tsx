import Link from 'next/link'

export default function NgoProjectDetailPlaceholder({
  params,
}: {
  params: { ngo: string; id: string }
}) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-semibold text-slate-900">Project Detail Placeholder</h1>
      <p className="mt-3 text-slate-600">NGO: <span className="font-mono">{params.ngo}</span></p>
      <p className="mt-1 text-slate-600">Project ID: <span className="font-mono">{params.id}</span></p>
      <Link href={`/${params.ngo}/projects`} className="mt-6 inline-flex text-sm font-semibold text-slate-900 underline">Back to projects</Link>
    </main>
  )
}
