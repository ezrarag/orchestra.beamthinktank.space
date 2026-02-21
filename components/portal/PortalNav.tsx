import Link from 'next/link'

interface PortalNavProps {
  links: Array<{ label: string; href: string }>
}

export default function PortalNav({ links }: PortalNavProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/20 bg-black/35 backdrop-blur-md">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 text-sm text-white sm:px-6">
        <Link href={links[0]?.href ?? '/home'} className="font-semibold tracking-wide">
          BEAM Portal
        </Link>
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          {links.slice(1).map((link) => (
            <Link key={link.href} href={link.href} className="text-white/80 transition hover:text-white">
              {link.label}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  )
}
