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
  Calendar
} from 'lucide-react'
import { useRequireRole } from '@/lib/hooks/useUserRole'

const navLinks = [
  { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Pulse', href: '/admin/pulse', icon: Zap },
  { label: 'Projects', href: '/admin/projects', icon: FolderOpen },
  { label: 'Musicians', href: '/admin/musicians', icon: Users },
  { label: 'Attendance', href: '/admin/attendance', icon: Calendar },
  { label: 'Settings', href: '/admin/settings', icon: Settings },
]

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
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
    <div className="min-h-screen bg-orchestra-dark">
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
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-orchestra-dark/95 backdrop-blur-md border-r border-orchestra-gold/20 transform transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
        initial={{ x: -256 }}
        animate={{ x: sidebarOpen ? 0 : -256 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-orchestra-gold/20">
            <Link href="/admin/dashboard" className="flex items-center space-x-2">
              <Music className="h-8 w-8 text-orchestra-gold" />
              <span className="text-xl font-bold text-orchestra-gold">BEAM Admin</span>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-orchestra-cream hover:text-orchestra-gold"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {navLinks.map((link) => {
              const Icon = link.icon
              const isActive = pathname === link.href
              
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-orchestra-gold/20 text-orchestra-gold border border-orchestra-gold/30'
                      : 'text-orchestra-cream hover:bg-orchestra-gold/10 hover:text-orchestra-gold'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon className="h-5 w-5" />
                  <span className="font-medium">{link.label}</span>
                </Link>
              )
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-orchestra-gold/20">
            <div className="text-sm text-orchestra-cream/70">
              BEAM Orchestra Admin Portal
            </div>
          </div>
        </div>
      </motion.aside>

      {/* Main content */}
      <div className="lg:ml-64">
        {/* Mobile header */}
        <header className="lg:hidden bg-orchestra-dark/95 backdrop-blur-md border-b border-orchestra-gold/20 p-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-orchestra-cream hover:text-orchestra-gold"
          >
            <Menu className="h-6 w-6" />
          </button>
        </header>

        {/* Page content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
