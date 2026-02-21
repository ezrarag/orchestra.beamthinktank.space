import Link from 'next/link'
import type { ProjectSummary } from '@/lib/types/portal'

export default function ProjectGrid({ projects }: { projects: ProjectSummary[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {projects.map((project) => (
        <article key={project.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{project.status}</p>
          <h3 className="mt-2 text-xl font-semibold text-slate-900">{project.name}</h3>
          <p className="mt-2 text-sm text-slate-600">{project.summary}</p>
          <Link href={project.href} className="mt-4 inline-flex text-sm font-semibold text-slate-900 underline">
            View project
          </Link>
        </article>
      ))}
    </div>
  )
}
