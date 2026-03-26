import {
  Building2,
  FolderOpen,
  Globe,
  LayoutDashboard,
  MessageSquare,
  Music,
  Settings,
  Smartphone,
  Users,
  Video,
  Wallet,
  type LucideIcon,
} from 'lucide-react'

export type AdminNavRole = 'beam_admin' | 'partner_admin' | 'board'

export type AdminNavContext = {
  role: string | null
  partnerProjectId?: string | null
}

export type AdminNavItem = {
  key: string
  label: string
  href: string
  icon: LucideIcon
  enabled: boolean
  roles: AdminNavRole[]
  resolveHref?: (context: AdminNavContext) => string
}

export type AdminNavGroup = {
  key: string
  title?: string
  items: AdminNavItem[]
}

const adminNavGroups: AdminNavGroup[] = [
  {
    key: 'dashboard',
    items: [
      {
        key: 'dashboard',
        label: 'Dashboard',
        href: '/admin/dashboard',
        icon: LayoutDashboard,
        enabled: true,
        roles: ['beam_admin', 'partner_admin'],
        resolveHref: ({ role, partnerProjectId }) =>
          role === 'partner_admin' && partnerProjectId ? `/admin/projects/${partnerProjectId}` : '/admin/dashboard',
      },
      {
        key: 'board-dashboard',
        label: 'Board Dashboard',
        href: '/admin/board',
        icon: LayoutDashboard,
        enabled: true,
        roles: ['board'],
      },
    ],
  },
  {
    key: 'areas',
    title: 'AREAS',
    items: [
      {
        key: 'areas-professional',
        label: 'Professional',
        href: '/admin/areas/professional',
        icon: Music,
        enabled: true,
        roles: ['beam_admin'],
      },
      {
        key: 'areas-community',
        label: 'Community',
        href: '/admin/areas/community',
        icon: Music,
        enabled: true,
        roles: ['beam_admin'],
      },
      {
        key: 'areas-chamber',
        label: 'Chamber',
        href: '/admin/areas/chamber',
        icon: Music,
        enabled: true,
        roles: ['beam_admin'],
      },
      {
        key: 'areas-publishing',
        label: 'Publishing',
        href: '/admin/areas/publishing',
        icon: Music,
        enabled: true,
        roles: ['beam_admin'],
      },
      {
        key: 'areas-business',
        label: 'Business',
        href: '/admin/areas/business',
        icon: Music,
        enabled: true,
        roles: ['beam_admin'],
      },
    ],
  },
  {
    key: 'projects',
    items: [
      {
        key: 'projects',
        label: 'Projects',
        href: '/admin/projects',
        icon: FolderOpen,
        enabled: true,
        roles: ['beam_admin', 'partner_admin'],
      },
    ],
  },
  {
    key: 'people',
    items: [
      {
        key: 'people',
        label: 'People',
        href: '/admin/musicians',
        icon: Users,
        enabled: true,
        roles: ['beam_admin'],
      },
    ],
  },
  {
    key: 'infrastructure',
    items: [
      {
        key: 'infrastructure',
        label: 'Infrastructure',
        href: '/admin/infrastructure',
        icon: Building2,
        enabled: true,
        roles: ['beam_admin'],
      },
    ],
  },
  {
    key: 'finance',
    items: [
      {
        key: 'finance',
        label: 'Finance',
        href: '/admin/finance',
        icon: Wallet,
        enabled: true,
        roles: ['beam_admin'],
      },
    ],
  },
  {
    key: 'platform',
    items: [
      {
        key: 'public-platform',
        label: 'Public Platform',
        href: '/admin/viewer',
        icon: Globe,
        enabled: true,
        roles: ['beam_admin'],
      },
      {
        key: 'narrative-arcs',
        label: 'Narrative Arcs',
        href: '/admin/viewer-sections',
        icon: Video,
        enabled: true,
        roles: ['beam_admin'],
      },
      {
        key: 'role-overviews',
        label: 'Role Overviews',
        href: '/admin/viewer-role-overviews',
        icon: Video,
        enabled: true,
        roles: ['beam_admin'],
      },
      {
        key: 'home-slides',
        label: 'Home Slides',
        href: '/admin/home-slides',
        icon: Video,
        enabled: true,
        roles: ['beam_admin'],
      },
    ],
  },
  {
    key: 'applications',
    items: [
      {
        key: 'applications',
        label: 'Applications',
        href: '/admin/applications',
        icon: Smartphone,
        enabled: true,
        roles: ['beam_admin'],
      },
    ],
  },
  {
    key: 'system',
    items: [
      {
        key: 'system',
        label: 'System',
        href: '/admin/settings',
        icon: Settings,
        enabled: true,
        roles: ['beam_admin'],
      },
      {
        key: 'slack-notes',
        label: 'Slack Notes',
        href: '/admin/slack-notes',
        icon: MessageSquare,
        enabled: true,
        roles: ['beam_admin', 'partner_admin'],
      },
    ],
  },
]

export function getAdminNavGroups(context: AdminNavContext): AdminNavGroup[] {
  const activeRole = context.role as AdminNavRole | null
  if (!activeRole) return []

  return adminNavGroups
    .map((group) => ({
      ...group,
      items: group.items
        .filter((item) => item.roles.includes(activeRole))
        .map((item) => ({
          ...item,
          href: item.resolveHref ? item.resolveHref(context) : item.href,
        })),
    }))
    .filter((group) => group.items.length > 0)
}
