'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
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
  MoreVertical
} from 'lucide-react'
import { useRequireRole } from '@/lib/hooks/useUserRole'

const navLinks = [
  { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Pulse', href: '/admin/pulse', icon: Zap },
  { label: 'Projects', href: '/admin/projects', icon: FolderOpen },
  { label: 'Musicians', href: '/admin/musicians', icon: Users },
  { label: 'Attendance', href: '/admin/attendance', icon: Calendar },
  { label: 'QR Codes', href: '/admin/qr-codes', icon: QrCode },
  { label: 'Settings', href: '/admin/settings', icon: Settings },
]

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const pathname = usePathname()
  const { hasAccess, loading, redirect } = useRequireRole('beam_admin')

  if (loading) {
    return (
      <div className="min-h-screen bg-orchestra-dark flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orchestra-gold"></div>
      </div>
    )
  }

  if (redirect) {
    return (
      <div className="min-h-screen bg-orchestra-dark flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-orchestra-gold mb-4">Access Denied</h1>
          <p className="text-orchestra-cream">You need admin privileges to access this area.</p>
        </div>
      </div>
    )
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
          <div className="p-3 border-t border-orchestra-gold/20">
            <div className="text-xs text-orchestra-cream/70">
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
