import type { Metadata } from 'next'
import { Albert_Sans } from 'next/font/google'
import './globals.css'

const albertSans = Albert_Sans({ 
  subsets: ['latin'],
  weight: ['400', '700'],
  style: ['normal', 'italic'],
  variable: '--font-albert-sans'
})

export const metadata: Metadata = {
  title: 'BEAM Orchestra - Building Excellence in Arts and Music',
  description: 'Experience the transformative power of classical music with Orlando\'s premier community orchestra. Join us for performances, rehearsals, and musical excellence.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={albertSans.variable}>
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}
