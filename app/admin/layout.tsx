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
  ShieldCheck,
  LogIn
} from 'lucide-react'
import { getAdminNavGroups } from '@/lib/config/adminNav'
import { useUserRole } from '@/lib/hooks/useUserRole'
import { usePartnerProject } from '@/lib/hooks/useProjectAccess'
import { signOut, signInWithPopup, GoogleAuthProvider } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { ADMIN_GATEWAYS_DISABLED, isAdminEmailAllowed } from '@/lib/config/adminAccess'

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
    prefix: '/admin/institutions',
    title: 'Institutions',
    eyebrow: 'People',
    description: 'Institution accounts, project links, and partner dashboard access.',
  },
  {
    prefix: '/admin/people',
    title: 'People Audit',
    eyebrow: 'People',
    description: 'Cross-tab participant rosters, missing metadata audits, and profile state.',
  },
  {
    prefix: '/admin/projects/new',
    title: 'New Project',
    eyebrow: 'Projects',
    description: 'Provision a new orchestra production, venue node, or partner project.',
  },
  {
    prefix: '/admin/projects/',
    title: 'Project Admin',
    eyebrow: 'Projects',
    description: 'Project staffing, media library, board, invites, and roster management.',
  },
  {
    prefix: '/admin/projects',
    title: 'Projects',
    eyebrow: 'Projects',
    description: 'Production portfolio, roster fulfillment, and partner projects.',
  },
  {
    prefix: '/admin/pulse',
    title: 'Pulse Center',
    eyebrow: 'System',
    description: 'Operational health, task readiness, media gaps, and system alerts.',
  },
  {
    prefix: '/admin/finance',
    title: 'Finance & Stipends',
    eyebrow: 'System',
    description: 'Musician stipends, budget allocation, payout logs, and BEAM coin tracking.',
  },
  {
    prefix: '/admin/system',
    title: 'System Health',
    eyebrow: 'System',
    description: 'Operational monitoring, environment flags, and system telemetry.',
  },
  {
    prefix: '/admin/settings',
    title: 'Settings',
    eyebrow: 'System',
    description: 'Platform defaults, global toggles, and administrative configuration.',
  },
  {
    prefix: '/admin/dashboard',
    title: 'Executive Dashboard',
    eyebrow: 'Overview',
    description: 'High-level operational metrics, active project snapshot, and system pulse.',
  },
  {
    prefix: '/admin/orchestra-network',
    title: 'Orchestra Network Directory',
    eyebrow: 'Overview',
    description: 'Central directory managing Participants, Institutional Cohorts & Studio Vault Viewers.',
  },
]

function humanizeAdminSegment(segment: string): string {
  return segment
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function AdminAuthScreen() {
  const router = useRouter()
  const { user } = useUserRole()
  const [signingOut, setSigningOut] = useState(false)
  const [signingIn, setSigningIn] = useState(false)

  const handleGoogleSignIn = async () => {
    if (!auth) return
    setSigningIn(true)
    try {
      const provider = new GoogleAuthProvider()
      provider.setCustomParameters({ prompt: 'select_account' })
      const res = await signInWithPopup(auth, provider)
      if (res.user) {
        router.refresh()
      }
    } catch (error) {
      console.error('Google Sign-In error:', error)
    } finally {
      setSigningIn(false)
    }
  }

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

  return (
    <div className="min-h-screen bg-[#07080A] text-white flex items-center justify-center p-6 font-sans">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md text-center space-y-6 bg-[#0F1015] p-8 rounded-3xl border border-amber-400/40 shadow-2xl"
      >
        <div className="w-16 h-16 rounded-full bg-amber-400/20 text-amber-400 border border-amber-400/40 flex items-center justify-center mx-auto shadow-lg">
          <ShieldCheck className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-wide">
            Orchestra Admin Portal
          </h1>
          <p className="text-xs text-white/60 leading-relaxed max-w-xs mx-auto">
            {user ? (
              <>Signed in as <strong className="text-amber-300">{user.email}</strong>. To access the admin area, please sign in with an authorized admin Google account (<strong className="text-white">ezra@readyaimgo.biz</strong>).</>
            ) : (
              <>Sign in with your admin Google account (<strong className="text-amber-300">ezra@readyaimgo.biz</strong>) to access the BEAM Orchestra Admin Area.</>
            )}
          </p>
        </div>

        <button
          onClick={handleGoogleSignIn}
          disabled={signingIn}
          className="w-full py-3.5 px-6 rounded-full bg-amber-400 text-black font-bold text-sm hover:bg-amber-300 transition shadow-xl flex items-center justify-center space-x-2 disabled:opacity-50"
        >
          <LogIn className="w-4 h-4 text-black" />
          <span>{signingIn ? 'Signing in...' : 'Sign In with Admin Google Account'}</span>
        </button>

        {user && (
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="w-full py-2.5 px-4 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-semibold border border-red-500/30 transition"
          >
            {signingOut ? 'Signing out...' : `Sign Out (${user.email})`}
          </button>
        )}

        <div className="pt-4 border-t border-white/10 flex flex-col space-y-2">
          <Link
            href="/"
            className="text-xs text-white/60 hover:text-white transition font-medium"
          >
            ← Return to Orchestra Homepage
          </Link>
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
  const isAllowedAdmin = isAdminEmailAllowed(user?.email)
  const effectiveRole = ADMIN_GATEWAYS_DISABLED || isAllowedAdmin ? 'beam_admin' : role
  const hasAdminShellAccess = ADMIN_GATEWAYS_DISABLED || isAllowedAdmin || role === 'beam_admin' || role === 'partner_admin' || role === 'board'
  const navGroups = useMemo(
    () => getAdminNavGroups({ role: effectiveRole, partnerProjectId }),
    [effectiveRole, partnerProjectId],
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
    if (effectiveRole === 'partner_admin' && partnerProjectId) return `/admin/projects/${partnerProjectId}`
    if (effectiveRole === 'board') return '/admin/board'
    return '/admin/dashboard'
  }, [effectiveRole, partnerProjectId])
  const roleLabel = useMemo(() => {
    if (!effectiveRole) return 'Admin'
    return effectiveRole.replace(/_/g, ' ')
  }, [effectiveRole])
  
  // Redirect partner admins to their project page
  useEffect(() => {
    if (effectiveRole === 'partner_admin' && partnerProjectId && pathname === '/admin/dashboard') {
      router.push(`/admin/projects/${partnerProjectId}`)
    }
  }, [effectiveRole, partnerProjectId, pathname, router])

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

  if ((!user && !ADMIN_GATEWAYS_DISABLED) || !hasAdminShellAccess) {
    return <AdminAuthScreen />
  }

  return (
    <div className={`min-h-screen bg-orchestra-dark flex overflow-hidden ${isStaging ? 'border-t-4 border-purple-500' : ''} relative`}>
      {/* Staging Watermark */}
      {isStaging && (
        <div className="fixed inset-0 pointer-events-none z-[9999] opacity-5">
          <div className="absolute inset-0 bg-[radial-gradient(#a855f7_1px,transparent_1px)] [background-size:16px_16px]" />
        </div>
      )}

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 bg-[#0E0F14] border-r border-white/10 flex flex-col transition-all duration-300 lg:static ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${desktopSidebarCollapsed ? 'lg:w-20' : 'w-72'}`}
      >
        {/* Sidebar Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <Link href={adminHomeHref} className="flex items-center space-x-3 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-amber-400/20 border border-amber-400/40 text-amber-400 flex items-center justify-center shrink-0">
              <Music className="w-5 h-5" />
            </div>
            {!desktopSidebarCollapsed && (
              <div className="truncate">
                <p className="text-sm font-serif font-bold text-white truncate">BEAM Orchestra</p>
                <p className="text-[10px] font-mono text-amber-300 uppercase tracking-wider">Admin Portal</p>
              </div>
            )}
          </Link>

          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-white/60 hover:text-white p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sidebar Nav Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 no-scrollbar">
          {navGroups.map((group) => (
            <div key={group.key} className="space-y-1">
              {!desktopSidebarCollapsed && group.title && (
                <p className="px-3 text-[10px] font-mono text-white/40 uppercase tracking-wider mb-2">
                  {group.title}
                </p>
              )}

              {group.items.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
                const Icon = item.icon

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                      isActive
                        ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                        : 'text-white/60 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    {!desktopSidebarCollapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                )
              })}
            </div>
          ))}
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-white/10 space-y-2">
          {user && !desktopSidebarCollapsed && (
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs font-mono">
              <p className="text-white/50 text-[10px] uppercase">Signed In</p>
              <p className="text-white font-bold truncate">{user.email}</p>
              <p className="text-amber-300 text-[10px] capitalize mt-0.5">{roleLabel}</p>
            </div>
          )}

          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="w-full flex items-center justify-center space-x-2 px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-300 text-xs font-semibold border border-red-500/20 transition"
          >
            <LogOut className="w-4 h-4" />
            {!desktopSidebarCollapsed && <span>{signingOut ? 'Signing out...' : 'Sign Out'}</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Bar */}
        <header className="bg-[#0E0F14] border-b border-white/10 px-6 py-4 flex items-center justify-between z-30">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-white/60 hover:text-white p-1"
            >
              <Menu className="w-6 h-6" />
            </button>

            <div>
              <p className="text-[10px] font-mono text-amber-400 uppercase tracking-wider">
                {activePageMeta.eyebrow}
              </p>
              <h1 className="text-lg font-serif font-bold text-white">
                {activePageMeta.title}
              </h1>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Link
              href="/admin/orchestra-network"
              className="px-3.5 py-1.5 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 text-xs font-mono font-bold hover:bg-amber-400/30 transition flex items-center space-x-1"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Network Directory</span>
            </Link>

            <Link
              href="/profile"
              className="px-3.5 py-1.5 rounded-full bg-white/10 border border-white/20 text-white text-xs font-semibold hover:bg-white/20 transition"
            >
              My Profile
            </Link>
          </div>
        </header>

        {/* Page Body */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
