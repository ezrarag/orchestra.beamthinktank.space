'use client'

import { ReactNode, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'
import { PARTICIPANT_UI } from '@/components/participant/ui'

type ParticipantShellProps = {
  title?: string
  subtitle?: string
  children: ReactNode
}

export default function ParticipantShell({ title, subtitle, children }: ParticipantShellProps) {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)

  const toolGroups = useMemo(
    () => [
      {
        id: 'workspace',
        title: 'Workspace',
        items: [
          { href: '/dashboard', label: 'Dashboard' },
          { href: '/viewer', label: 'Browse Viewer' },
        ],
      },
      {
        id: 'submissions',
        title: 'Submissions',
        items: [
          { href: '/studio/viewer-submissions', label: 'New Submission' },
          { href: '/studio/viewer-submissions/mine', label: 'My Submissions' },
          { href: '/publishing/signup', label: 'Publishing Sign-Up' },
        ],
      },
      {
        id: 'pathways',
        title: 'Pathways',
        items: [
          { href: '/join/participant', label: 'Participant Paths' },
          { href: '/join/admin-staff', label: 'Join Admin/Staff Cart' },
        ],
      },
    ],
    [],
  )

  const breadcrumb = useMemo(() => {
    const map: Array<{ prefix: string; label: string }> = [
      { prefix: '/dashboard', label: 'Dashboard' },
      { prefix: '/studio/viewer-submissions/mine', label: 'My Submissions' },
      { prefix: '/studio/viewer-submissions', label: 'New Submission' },
      { prefix: '/join/admin-staff', label: 'Join Admin/Staff' },
      { prefix: '/join/participant', label: 'Participant Paths' },
      { prefix: '/publishing/signup', label: 'Publishing Sign-Up' },
      { prefix: '/viewer', label: 'Viewer' },
    ]
    const found = map.find((item) => pathname.startsWith(item.prefix))
    return found?.label ?? 'Participant'
  }, [pathname])

  return (
    <div className="min-h-screen bg-black text-white">
      <button
        type="button"
        onClick={() => setMenuOpen(true)}
        className={`fixed left-4 top-4 z-40 inline-flex items-center gap-2 bg-black/85 font-semibold ${PARTICIPANT_UI.buttonGhost}`}
      >
        <Menu className="h-4 w-4" />
        Tools
      </button>

      {menuOpen ? (
        <>
          <button
            type="button"
            aria-label="Close participant tools"
            onClick={() => setMenuOpen(false)}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[1px]"
          />
          <aside className="fixed left-0 top-0 z-50 h-full w-[320px] max-w-[85vw] border-r border-white/15 bg-[#0B0B0B] p-4 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-white">Participant Tools</h2>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="rounded-lg border border-white/20 p-1.5 text-white/80 hover:border-[#D4AF37] hover:text-[#F5D37A]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mb-4 text-xs text-white/60">Menu starts closed and opens from the Tools button.</p>
            <nav className="space-y-4">
              {toolGroups.map((group) => (
                <div key={group.id}>
                  <p className="mb-2 text-xs uppercase tracking-[0.12em] text-white/55">{group.title}</p>
                  <div className="space-y-2">
                    {group.items.map((tool) => {
                      const active = pathname === tool.href
                      return (
                        <Link
                          key={tool.href}
                          href={tool.href}
                          onClick={() => setMenuOpen(false)}
                          className={`${PARTICIPANT_UI.drawerLink} ${
                            active
                              ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-white'
                              : 'border-white/10 bg-white/[0.02] text-white/85 hover:border-[#D4AF37] hover:bg-[#D4AF37]/10 hover:text-white'
                          }`}
                        >
                          {tool.label}
                        </Link>
                      )
                    })}
                  </div>
                </div>
              ))}
            </nav>
          </aside>
        </>
      ) : null}

      <main className="px-4 pb-6 pt-20 md:px-6">
        {(title || subtitle) && (
          <div className="mx-auto mb-4 max-w-6xl">
            <p className="text-xs uppercase tracking-[0.12em] text-white/55">Participant / {breadcrumb}</p>
            {title ? <h1 className="text-2xl font-bold text-white">{title}</h1> : null}
            {subtitle ? <p className="mt-1 text-sm text-white/70">{subtitle}</p> : null}
          </div>
        )}
        {children}
      </main>
    </div>
  )
}
