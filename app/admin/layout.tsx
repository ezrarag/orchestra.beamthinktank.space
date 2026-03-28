'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Menu, 
  X,
  Music,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
  LogOut,
} from 'lucide-react'
import { getAdminNavGroups } from '@/lib/config/adminNav'
import { useUserRole } from '@/lib/hooks/useUserRole'
import { usePartnerProject } from '@/lib/hooks/useProjectAccess'
import { signOut } from 'firebase/auth'
import { auth } from '@/lib/firebase'

const ADMIN_PAGE_META: Array<{
  prefix: string
  title: string
  eyebrow: string
  description: string
}> = [
  {
    prefix: '/admin/orchestra/works/',
    title: 'Work Research',
    eyebrow: 'Orchestra Admin',
    description: 'Work-level metadata, research references, and chamber context management.',
  },
  {
    prefix: '/admin/viewer-role-overviews',
    title: 'Roles Overview Videos',
    eyebrow: 'Viewer Admin',
    description: 'Narrative-arc overview videos and related viewer onboarding content.',
  },
  {
    prefix: '/admin/viewer-sections',
    title: 'Narrative Arcs',
    eyebrow: 'Viewer Admin',
    description: 'Arc structure, roles overview copy, and viewer section publishing state.',
  },
  {
    prefix: '/admin/viewer',
    title: 'Viewer Library',
    eyebrow: 'Viewer Admin',
    description: 'Entries, chamber metadata, homepage overlays, and viewer-facing programming.',
  },
  {
    prefix: '/admin/home-slides',
    title: 'Home Hero',
    eyebrow: 'Viewer Admin',
    description: 'Homepage hero image, motion background, and call-to-action framing.',
  },
  {
    prefix: '/admin/events/new',
    title: 'Create Event',
    eyebrow: 'Events',
    description: 'Compose a new performance listing with ticketing, timing, and venue metadata.',
  },
  {
    prefix: '/admin/events/rsvps',
    title: 'RSVP Records',
    eyebrow: 'Events',
    description: 'Attendance intent, reservation exports, and audience operations.',
  },
  {
    prefix: '/admin/events/',
    title: 'Event Editor',
    eyebrow: 'Events',
    description: 'Detailed event editing, schedule updates, and performance logistics.',
  },
  {
    prefix: '/admin/events',
    title: 'Events',
    eyebrow: 'Events',
    description: 'Concert listings, ticketing, and public event publishing.',
  },
  {
    prefix: '/admin/attendance',
    title: 'Attendance',
    eyebrow: 'Operations',
    description: 'Rehearsal check-ins, filters, and exportable attendance records.',
  },
  {
    prefix: '/admin/musicians',
    title: 'Musicians',
    eyebrow: 'People',
    description: 'Participant roster, profile readiness, and orchestral personnel management.',
  },
  {
    prefix: '/admin/projects/new',
    title: 'New Project',
    eyebrow: 'Projects',
    description: 'Spin up a new project workspace with core budget and staffing metadata.',
  },
  {
    prefix: '/admin/projects/',
    title: 'Project Workspace',
    eyebrow: 'Projects',
    description: 'Project-level operations, analytics, board views, invites, and media.',
  },
  {
    prefix: '/admin/projects',
    title: 'Projects',
    eyebrow: 'Projects',
    description: 'Portfolio-wide project status, planning, and entry points into each workspace.',
  },
  {
    prefix: '/admin/studio/interviews',
    title: 'Interview Library',
    eyebrow: 'Studio',
    description: 'Interview uploads, metadata, and publishing for the studio interviews surface.',
  },
  {
    prefix: '/admin/studio/chamber',
    title: 'Chamber Studio',
    eyebrow: 'Studio',
    description: 'Chamber project metadata, uploads, and presentation on the studio surface.',
  },
  {
    prefix: '/admin/studio',
    title: 'Studio Content',
    eyebrow: 'Studio',
    description: 'Video ingest, categorization, and publishing across the studio experience.',
  },
  {
    prefix: '/admin/board',
    title: 'Board Dashboard',
    eyebrow: 'Board Access',
    description: 'Read-only oversight metrics for attendance, payouts, and orchestral readiness.',
  },
  {
    prefix: '/admin/settings',
    title: 'Settings',
    eyebrow: 'Platform',
    description: 'Global configuration, system controls, and operational defaults.',
  },
]

function humanizeAdminSegment(segment: string): string {
  return segment
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function AccessDeniedPage() {
  const router = useRouter()
  const { user } = useUserRole()
  const [signingOut, setSigningOut] = useState(false)

  const handleSignOut = async () => {
    if (!auth) return
    
    setSigningOut(true)
    try {
      await signOut(auth)
      // Redirect to home page after sign out
      router.push('/')
    } catch (error) {
      console.error('Error signing out:', error)
      setSigningOut(false)
    }
  }

  return (
    <div className="min-h-screen bg-orchestra-dark flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-md w-full"
      >
        <h1 className="text-3xl font-bold text-orchestra-gold mb-4">Access Denied</h1>
        <p className="text-orchestra-cream/80 mb-6">
          You need admin privileges to access this area.
        </p>
        
        {user && (
          <div className="bg-orchestra-cream/5 backdrop-blur-sm rounded-xl border border-orchestra-gold/20 p-6 mb-6">
            <p className="text-sm text-orchestra-cream/70 mb-2">Currently signed in as:</p>
            <p className="text-orchestra-cream font-medium mb-4">{user.email}</p>
            <p className="text-xs text-orchestra-cream/60 mb-4">
              If you were just granted admin access, please sign out and sign back in to refresh your permissions.
            </p>
            <motion.button
              onClick={handleSignOut}
              disabled={signingOut}
              className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-red-500/20 hover:bg-red-500/30 disabled:opacity-50 text-red-400 font-medium rounded-lg transition-colors border border-red-500/30"
              whileHover={!signingOut ? { scale: 1.02 } : {}}
              whileTap={!signingOut ? { scale: 0.98 } : {}}
            >
              <LogOut className="h-5 w-5" />
              <span>{signingOut ? 'Signing out...' : 'Sign Out'}</span>
            </motion.button>
          </div>
        )}

        <div className="space-y-3">
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-orchestra-gold/20 hover:bg-orchestra-gold/30 text-orchestra-gold font-medium rounded-lg transition-colors border border-orchestra-gold/30"
          >
            Go to Home Page
          </Link>
          <p className="text-xs text-orchestra-cream/50 mt-4">
            Need admin access? Contact an existing admin or check the documentation.
          </p>
        </div>
      </motion.div>
    </div>
  )
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { user, role, loading: roleLoading } = useUserRole()
  const partnerProjectId = usePartnerProject()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(false)
  const [openNavGroups, setOpenNavGroups] = useState<Record<string, boolean>>({})
  const [signingOut, setSigningOut] = useState(false)
  const pathname = usePathname()
  const isStaging = process.env.NEXT_PUBLIC_ENV === 'staging'
  const hasAdminShellAccess = role === 'beam_admin' || role === 'partner_admin' || role === 'board'
  const navGroups = useMemo(
    () => getAdminNavGroups({ role, partnerProjectId }),
    [partnerProjectId, role],
  )
  const activePageMeta = useMemo(() => {
    const directMeta = [...ADMIN_PAGE_META]
      .sort((a, b) => b.prefix.length - a.prefix.length)
      .find((entry) => pathname === entry.prefix || pathname.startsWith(`${entry.prefix}/`) || pathname.startsWith(entry.prefix))
    if (directMeta) return directMeta

    const matchingItem = navGroups
      .flatMap((group) => group.items.map((item) => ({ item, groupTitle: group.title ?? 'Admin' })))
      .filter(({ item }) => pathname === item.href || pathname.startsWith(`${item.href}/`))
      .sort((a, b) => b.item.href.length - a.item.href.length)[0]

    if (matchingItem) {
      return {
        prefix: matchingItem.item.href,
        title: matchingItem.item.label,
        eyebrow: matchingItem.groupTitle,
        description: 'Administrative workspace for this section.',
      }
    }

    const segments = pathname.split('/').filter(Boolean)
    const lastSegment = segments[segments.length - 1] ?? 'admin'
    return {
      prefix: pathname,
      title: humanizeAdminSegment(lastSegment),
      eyebrow: 'Admin',
      description: 'Administrative workspace.',
    }
  }, [navGroups, pathname])
  const adminHomeHref = useMemo(() => {
    if (role === 'partner_admin' && partnerProjectId) return `/admin/projects/${partnerProjectId}`
    if (role === 'board') return '/admin/board'
    return '/admin/dashboard'
  }, [partnerProjectId, role])
  const roleLabel = useMemo(() => {
    if (!role) return 'Admin'
    return role.replace(/_/g, ' ')
  }, [role])
  
  // Redirect partner admins to their project page
  useEffect(() => {
    if (role === 'partner_admin' && partnerProjectId && pathname === '/admin/dashboard') {
      router.push(`/admin/projects/${partnerProjectId}`)
    }
  }, [role, partnerProjectId, pathname, router])

  useEffect(() => {
    setOpenNavGroups((current) => {
      const next = { ...current }
      let changed = false

      navGroups.forEach((group) => {
        const isCollapsibleGroup = group.items.length > 1 || Boolean(group.title)
        if (!isCollapsibleGroup) return
        const hasActiveItem = group.items.some((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
        if (!(group.key in next)) {
          next[group.key] = hasActiveItem
          changed = true
          return
        }
        if (hasActiveItem && !next[group.key]) {
          next[group.key] = true
          changed = true
        }
      })

      return changed ? next : current
    })
  }, [navGroups, pathname])

  const handleSignOut = async () => {
    if (!auth) return
    
    setSigningOut(true)
    try {
      await signOut(auth)
      router.push('/')
    } catch (error) {
      console.error('Error signing out:', error)
      setSigningOut(false)
    }
  }

  if (roleLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-orchestra-dark">
        <Loader2 className="h-12 w-12 animate-spin text-orchestra-gold" />
      </div>
    )
  }

  if (!user || !hasAdminShellAccess) {
    return <AccessDeniedPage />
  }

  return (
    <div className={`min-h-screen bg-orchestra-dark flex overflow-hidden ${isStaging ? 'border-t-4 border-purple-500' : ''} relative`}>
      {/* Staging Watermark */}
      {isStaging && (
        <div className="fixed inset-0 pointer-events-none z-[9999] opacity-5">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-purple-400 text-9xl font-bold transform -rotate-45">STAGING</div>
          </div>
        </div>
      )}
      {/* Mobile sidebar backdrop */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-52 bg-orchestra-dark/95 backdrop-blur-md border-r border-orchestra-gold/20 transform transition-[transform,width] duration-300 flex-shrink-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } ${desktopSidebarCollapsed ? 'lg:w-[4.5rem]' : 'lg:w-52'} lg:translate-x-0`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-orchestra-gold/20">
            <Link href={adminHomeHref} className={`flex items-center ${desktopSidebarCollapsed ? 'justify-center' : 'space-x-2'}`}>
              <Music className="h-6 w-6 text-orchestra-gold" />
              {!desktopSidebarCollapsed ? (
                <span className="text-lg font-bold text-orchestra-gold">BEAM Admin</span>
              ) : null}
            </Link>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDesktopSidebarCollapsed((current) => !current)}
                className="hidden rounded-lg border border-orchestra-gold/20 bg-orchestra-gold/5 p-1.5 text-orchestra-cream transition hover:border-orchestra-gold/35 hover:text-orchestra-gold lg:inline-flex"
                aria-label={desktopSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {desktopSidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              </button>
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden text-orchestra-cream hover:text-orchestra-gold"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Navigation */}
          <nav className={`flex-1 overflow-y-auto p-3 ${desktopSidebarCollapsed ? 'space-y-2' : 'space-y-3'}`}>
            {navGroups.map((group) => {
              const isCollapsibleGroup = group.items.length > 1 || Boolean(group.title)
              const groupHasActiveItem = group.items.some(
                (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
              )
              const isGroupOpen =
                desktopSidebarCollapsed || !isCollapsibleGroup || groupHasActiveItem || openNavGroups[group.key]
              const groupLabel = group.title ?? 'Navigation'

              return (
                <div key={group.key} className="space-y-1.5">
                  {!desktopSidebarCollapsed && isCollapsibleGroup ? (
                    <button
                      type="button"
                      onClick={() =>
                        setOpenNavGroups((current) => ({
                          ...current,
                          [group.key]: !current[group.key],
                        }))
                      }
                      className={`flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-[10px] font-semibold tracking-[0.16em] transition ${
                        groupHasActiveItem
                          ? 'bg-orchestra-gold/10 text-orchestra-gold'
                          : 'text-orchestra-gold/70 hover:bg-orchestra-gold/5 hover:text-orchestra-gold'
                      }`}
                    >
                      <span>{groupLabel}</span>
                      <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isGroupOpen ? 'rotate-180' : ''}`} />
                    </button>
                  ) : null}

                  {isGroupOpen ? (
                    group.items.map((link) => {
                      const Icon = link.icon
                      const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`)

                      if (!link.enabled) {
                        return (
                          <div
                            key={link.key}
                            className={`rounded-lg border border-orchestra-gold/10 bg-orchestra-gold/5 text-sm text-orchestra-cream/55 ${
                              desktopSidebarCollapsed
                                ? 'flex items-center justify-center px-2 py-2.5'
                                : 'flex items-center justify-between px-3 py-2'
                            }`}
                            title={link.label}
                          >
                            <div className={`flex items-center ${desktopSidebarCollapsed ? '' : 'space-x-2'}`}>
                              <Icon className="h-4 w-4 flex-shrink-0" />
                              {!desktopSidebarCollapsed ? (
                                <span className="font-medium truncate">{link.label}</span>
                              ) : null}
                            </div>
                            {!desktopSidebarCollapsed ? (
                              <span className="text-[10px] uppercase tracking-wide text-orchestra-gold/70">Soon</span>
                            ) : null}
                          </div>
                        )
                      }

                      return (
                        <Link
                          key={link.key}
                          href={link.href}
                          className={`rounded-lg transition-all duration-200 text-sm ${
                            isActive
                              ? 'bg-orchestra-gold/20 text-orchestra-gold border border-orchestra-gold/30'
                              : 'text-orchestra-cream hover:bg-orchestra-gold/10 hover:text-orchestra-gold'
                          } ${
                            desktopSidebarCollapsed
                              ? 'flex items-center justify-center px-2 py-2.5'
                              : 'flex items-center space-x-2 px-3 py-2'
                          }`}
                          onClick={() => setSidebarOpen(false)}
                          title={link.label}
                        >
                          <Icon className="h-4 w-4 flex-shrink-0" />
                          {!desktopSidebarCollapsed ? (
                            <span className="font-medium truncate">{link.label}</span>
                          ) : null}
                        </Link>
                      )
                    })
                  ) : null}
                </div>
              )
            })}
          </nav>

          {/* Footer */}
          <div className="p-3 border-t border-orchestra-gold/20 space-y-2">
            {user && !desktopSidebarCollapsed ? (
              <div className="text-xs text-orchestra-cream/70 truncate px-2">
                {user.email}
              </div>
            ) : null}
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className={`rounded-lg transition-colors text-sm text-orchestra-cream hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50 ${
                desktopSidebarCollapsed
                  ? 'flex w-full items-center justify-center px-2 py-2.5'
                  : 'flex w-full items-center space-x-2 px-3 py-2'
              }`}
              title={signingOut ? 'Signing out...' : 'Sign Out'}
            >
              <LogOut className="h-4 w-4 flex-shrink-0" />
              {!desktopSidebarCollapsed ? (
                <span className="font-medium">{signingOut ? 'Signing out...' : 'Sign Out'}</span>
              ) : null}
            </button>
            <div className={`text-xs text-orchestra-cream/50 pt-2 border-t border-orchestra-gold/10 ${desktopSidebarCollapsed ? 'text-center' : ''}`}>
              BEAM Orchestra Admin Portal
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className={`flex-1 min-w-0 flex flex-col overflow-hidden transition-[margin] duration-300 ${desktopSidebarCollapsed ? 'lg:ml-[4.5rem]' : 'lg:ml-52'}`}>
        {/* Mobile header */}
        <header className="lg:hidden bg-orchestra-dark/95 backdrop-blur-md border-b border-orchestra-gold/20 px-4 py-3 flex-shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-orchestra-gold/75">
                {activePageMeta.eyebrow}
              </p>
              <p className="truncate text-sm font-semibold text-orchestra-cream">{activePageMeta.title}</p>
            </div>
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-orchestra-cream hover:text-orchestra-gold"
            >
              <Menu className="h-6 w-6" />
            </button>
          </div>
        </header>

        {/* Desktop header */}
        <header className="hidden lg:flex items-center justify-between gap-5 bg-orchestra-dark/95 backdrop-blur-md border-b border-orchestra-gold/20 px-5 py-4 flex-shrink-0 relative z-[60]">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-orchestra-gold/75">
              {activePageMeta.eyebrow}
            </p>
            <div className="mt-1 flex items-center gap-3">
              <h1 className="truncate text-lg font-semibold text-orchestra-cream">{activePageMeta.title}</h1>
              <span className="rounded-full border border-orchestra-gold/20 bg-orchestra-gold/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-orchestra-gold/85">
                {roleLabel}
              </span>
            </div>
            <p className="mt-1 truncate text-sm text-orchestra-cream/60">{activePageMeta.description}</p>
          </div>

          <div className="relative flex items-center gap-2.5">
            {user && (
              <div className="max-w-[260px] truncate rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-orchestra-cream/70">
                {user.email}
              </div>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="relative flex-1 overflow-y-auto overflow-x-hidden bg-[radial-gradient(circle_at_top,_rgba(212,175,55,0.12),_transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.02),rgba(0,0,0,0))]">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),transparent_30%)]" />
          <div className="relative mr-auto w-full max-w-[1560px] px-4 py-4 sm:px-5 lg:px-6 xl:px-8 lg:py-5">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
