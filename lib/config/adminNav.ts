import {
  Building2,
  FolderOpen,
  Globe,
  LayoutDashboard,
  Music,
  Settings,
  Smartphone,
  Users,
  Video,
  Wallet,
  type LucideIcon,
} from 'lucide-react'

export type AdminNavItem = {
  key: string
  label: string
  href: string
  icon: LucideIcon
  enabled: boolean
}

export type AdminNavGroup = {
  key: string
  title?: string
  items: AdminNavItem[]
}

export const adminNavGroups: AdminNavGroup[] = [
  {
    key: 'dashboard',
    items: [
      {
        key: 'dashboard',
        label: 'Dashboard',
        href: '/admin/dashboard',
        icon: LayoutDashboard,
        enabled: true,
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
      },
      {
        key: 'areas-community',
        label: 'Community',
        href: '/admin/areas/community',
        icon: Music,
        enabled: true,
      },
      {
        key: 'areas-chamber',
        label: 'Chamber',
        href: '/admin/areas/chamber',
        icon: Music,
        enabled: true,
      },
      {
        key: 'areas-publishing',
        label: 'Publishing',
        href: '/admin/areas/publishing',
        icon: Music,
        enabled: true,
      },
      {
        key: 'areas-business',
        label: 'Business',
        href: '/admin/areas/business',
        icon: Music,
        enabled: true,
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
      },
    ],
  },
  {
    key: 'people',
    items: [
      {
        key: 'people',
        label: 'People',
        href: '/admin/people',
        icon: Users,
        enabled: true,
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
      },
      {
        key: 'narrative-arcs',
        label: 'Narrative Arcs',
        href: '/admin/viewer-sections',
        icon: Video,
        enabled: true,
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
      },
    ],
  },
]
