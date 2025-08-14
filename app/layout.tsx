import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from 'react-hot-toast'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'BEAM Orchestra - Orlando',
  description: 'Building Excellence in Arts and Music - Join the BEAM Orchestra community for performances, rehearsals, and musical excellence.',
  keywords: 'orchestra, music, BEAM, Orlando, classical music, performances, rehearsals',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gradient-to-br from-orchestra-cream to-orchestra-dark min-h-screen`}>
        <Toaster position="top-right" />
        {children}
      </body>
    </html>
  )
}
