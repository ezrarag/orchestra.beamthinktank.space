import type { Metadata } from 'next'
import { Albert_Sans, Inter } from 'next/font/google'
import './globals.css'

const albertSans = Albert_Sans({ 
  subsets: ['latin'],
  weight: ['400', '700'],
  style: ['normal', 'italic'],
  variable: '--font-albert-sans'
})

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter'
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
    <html lang="en" className={`${albertSans.variable} ${inter.variable}`}>
      <body className="antialiased font-sans">
        {children}
      </body>
    </html>
  )
}
