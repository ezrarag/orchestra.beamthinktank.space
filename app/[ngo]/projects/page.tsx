import Link from 'next/link'
import PortalNav from '@/components/portal/PortalNav'
import ProjectGrid from '@/components/portal/ProjectGrid'
import { fetchProjects } from '@/lib/api'
import { getPortalContext, getPortalNav } from '@/lib/portal/page-data'

export default async function NgoProjectsPage({ params }: { params: { ngo: string } }) {
  const { config, locale } = getPortalContext(params.ngo)
  const projects = (await fetchProjects(config.id)).map((project) => ({
    ...project,
    href: `/${config.id}${project.href}`,
  }))

  return (
    <div className="min-h-screen bg-slate-100">
      <PortalNav links={getPortalNav(config.id, true)} />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <h1 className="text-3xl font-semibold text-slate-900">{locale.projects.title}</h1>
        <p className="mt-2 text-slate-600">{locale.projects.subtitle}</p>

        <div className="mt-6">
          <ProjectGrid projects={projects} />
        </div>

        <Link
          href={`/${config.id}/projects/submit-opportunity`}
          className="mt-8 inline-flex rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white"
        >
          {locale.projects.submitCta}
        </Link>
      </main>
    </div>
  )
}
