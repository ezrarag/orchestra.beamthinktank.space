'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  LayoutDashboard, 
  Zap, 
  FolderOpen, 
  Users, 
  Settings, 
  Menu, 
  X,
  Music,
  Calendar,
  QrCode,
  ChevronDown,
  MoreVertical,
  LogOut
} from 'lucide-react'
import { useRequireRole, useUserRole } from '@/lib/hooks/useUserRole'
import { usePartnerProject } from '@/lib/hooks/useProjectAccess'
import { signOut } from 'firebase/auth'
import { auth } from '@/lib/firebase'

const navLinks = [
  { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Pulse', href: '/admin/pulse', icon: Zap },
  { label: 'Projects', href: '/admin/projects', icon: FolderOpen },
  { label: 'Musicians', href: '/admin/musicians', icon: Users },
  { label: 'Events', href: '/admin/events', icon: Calendar },
  { label: 'Attendance', href: '/admin/attendance', icon: Calendar },
  { label: 'Studio Videos', href: '/admin/studio', icon: Music },
  { label: 'QR Codes', href: '/admin/qr-codes', icon: QrCode },
  { label: 'Settings', href: '/admin/settings', icon: Settings },
]

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
  const { user, role } = useUserRole()
  const partnerProjectId = usePartnerProject()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const pathname = usePathname()
  const { hasAccess, loading, redirect } = useRequireRole('beam_admin')
  
  // Redirect partner admins to their project page
  useEffect(() => {
    if (role === 'partner_admin' && partnerProjectId && pathname === '/admin/dashboard') {
      router.push(`/admin/projects/${partnerProjectId}`)
    }
  }, [role, partnerProjectId, pathname, router])

  const handleSignOut = async () => {
    if (!auth) return
    
    setSigningOut(true)
    setDropdownOpen(false)
    try {
      await signOut(auth)
      router.push('/')
    } catch (error) {
      console.error('Error signing out:', error)
      setSigningOut(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-orchestra-dark flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orchestra-gold"></div>
      </div>
    )
  }

  // Allow partner admins to access admin area (they'll be redirected to their project)
  if (redirect && role !== 'partner_admin') {
    return <AccessDeniedPage />
  }

  return (
    <div className="min-h-screen bg-orchestra-dark flex overflow-hidden">
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
      <motion.aside
        className={`fixed inset-y-0 left-0 z-50 w-56 bg-orchestra-dark/95 backdrop-blur-md border-r border-orchestra-gold/20 transform transition-transform duration-300 flex-shrink-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
        initial={{ x: -224 }}
        animate={{ x: sidebarOpen ? 0 : -224 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-orchestra-gold/20">
            <Link href="/admin/dashboard" className="flex items-center space-x-2">
              <Music className="h-6 w-6 text-orchestra-gold" />
              <span className="text-lg font-bold text-orchestra-gold">BEAM Admin</span>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-orchestra-cream hover:text-orchestra-gold"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-3 space-y-1">
            {navLinks.map((link) => {
              const Icon = link.icon
              const isActive = pathname === link.href
              
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200 text-sm ${
                    isActive
                      ? 'bg-orchestra-gold/20 text-orchestra-gold border border-orchestra-gold/30'
                      : 'text-orchestra-cream hover:bg-orchestra-gold/10 hover:text-orchestra-gold'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <span className="font-medium truncate">{link.label}</span>
                </Link>
              )
            })}
          </nav>

          {/* Footer */}
          <div className="p-3 border-t border-orchestra-gold/20 space-y-2">
            {user && (
              <div className="text-xs text-orchestra-cream/70 truncate px-2">
                {user.email}
              </div>
            )}
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors text-sm text-orchestra-cream hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
            >
              <LogOut className="h-4 w-4 flex-shrink-0" />
              <span className="font-medium">{signingOut ? 'Signing out...' : 'Sign Out'}</span>
            </button>
            <div className="text-xs text-orchestra-cream/50 pt-2 border-t border-orchestra-gold/10">
              BEAM Orchestra Admin Portal
            </div>
          </div>
        </div>
      </motion.aside>

      {/* Main content */}
      <div className="lg:ml-56 flex-1 min-w-0 flex flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="lg:hidden bg-orchestra-dark/95 backdrop-blur-md border-b border-orchestra-gold/20 p-4 flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-orchestra-cream hover:text-orchestra-gold"
          >
            <Menu className="h-6 w-6" />
          </button>
        </header>

        {/* Desktop header with Navigation Dropdown */}
        <header className="hidden lg:flex items-center justify-between bg-orchestra-dark/95 backdrop-blur-md border-b border-orchestra-gold/20 px-6 py-4 flex-shrink-0 relative z-[60]">
          <div className="flex-1"></div>
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center space-x-2 px-4 py-2 bg-orchestra-gold/10 hover:bg-orchestra-gold/20 text-orchestra-gold rounded-lg transition-colors border border-orchestra-gold/30 relative z-[70]"
            >
              <MoreVertical className="h-5 w-5" />
              <span className="font-medium">Menu</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            <AnimatePresence>
              {dropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-[9998]"
                    onClick={() => setDropdownOpen(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="fixed right-6 top-20 w-56 bg-orchestra-dark border border-orchestra-gold/30 rounded-lg shadow-2xl z-[9999] overflow-hidden backdrop-blur-md"
                    style={{ pointerEvents: 'auto' }}
                  >
                    <div className="py-2">
                      {navLinks.map((link) => {
                        const Icon = link.icon
                        const isActive = pathname === link.href
                        
                        return (
                          <Link
                            key={link.href}
                            href={link.href}
                            onClick={() => setDropdownOpen(false)}
                            className={`flex items-center space-x-3 px-4 py-3 transition-colors relative z-[10000] ${
                              isActive
                                ? 'bg-orchestra-gold/20 text-orchestra-gold border-l-2 border-orchestra-gold'
                                : 'text-orchestra-cream hover:bg-orchestra-gold/10 hover:text-orchestra-gold'
                            }`}
                            style={{ pointerEvents: 'auto' }}
                          >
                            <Icon className="h-5 w-5 flex-shrink-0" />
                            <span className="font-medium">{link.label}</span>
                          </Link>
                        )
                      })}
                      
                      {/* Divider */}
                      <div className="border-t border-orchestra-gold/20 my-2" />
                      
                      {/* User Info */}
                      {user && (
                        <div className="px-4 py-2 text-xs text-orchestra-cream/70 border-b border-orchestra-gold/10">
                          <p className="truncate">{user.email}</p>
                        </div>
                      )}
                      
                      {/* Sign Out */}
                      <button
                        onClick={handleSignOut}
                        disabled={signingOut}
                        className="w-full flex items-center space-x-3 px-4 py-3 transition-colors relative z-[10000] text-orchestra-cream hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
                        style={{ pointerEvents: 'auto' }}
                      >
                        <LogOut className="h-5 w-5 flex-shrink-0" />
                        <span className="font-medium">{signingOut ? 'Signing out...' : 'Sign Out'}</span>
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-6 flex-1 overflow-y-auto overflow-x-auto">
          <div className="w-full max-w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
