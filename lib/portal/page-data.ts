import { notFound } from 'next/navigation'
import { getLocaleCopy } from '@/lib/locales'
import { getNgoConfig, DEFAULT_NGO } from '@/lib/config/ngoConfigs'
import { resolvePortalPath } from '@/lib/portal/routes'

export function getPortalContext(ngo?: string) {
  const locale = getLocaleCopy('en')
  const config = getNgoConfig(ngo ?? DEFAULT_NGO)

  if (!config) {
    notFound()
  }

  return { config, locale }
}

export function getPortalNav(ngo: string, scopedRoutes = false) {
  const locale = getLocaleCopy('en')
  return [
    { label: locale.nav.home, href: resolvePortalPath('/home', ngo, scopedRoutes) },
    { label: locale.nav.recordings, href: resolvePortalPath('/studio/recordings', ngo, scopedRoutes) },
    { label: locale.nav.projects, href: resolvePortalPath('/projects', ngo, scopedRoutes) },
    { label: locale.nav.dashboard, href: resolvePortalPath('/dashboard', ngo, scopedRoutes) },
    { label: locale.nav.admin, href: resolvePortalPath('/admin', ngo, scopedRoutes) },
  ]
}
