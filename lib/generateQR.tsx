'use client'

import { useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'

// Dynamically import QRCode component to avoid SSR issues
const QRCodeSVG = dynamic(() => import('qrcode.react').then(mod => mod.QRCodeSVG), {
  ssr: false,
})

interface QRCodeProps {
  value: string
  size?: number
  level?: 'L' | 'M' | 'Q' | 'H'
  bgColor?: string
  fgColor?: string
}

export function QRCode({ 
  value, 
  size = 180, 
  level = 'M',
  bgColor = '#ffffff',
  fgColor = '#000000'
}: QRCodeProps) {
  return (
    <div className="flex items-center justify-center p-4 bg-white rounded-lg">
      <QRCodeSVG
        value={value}
        size={size}
        level={level}
        bgColor={bgColor}
        fgColor={fgColor}
      />
    </div>
  )
}

// Utility function to generate QR code URL for a rehearsal
export function generateCheckInURL(rehearsalId: string, baseUrl?: string): string {
  // Prefer provided baseUrl, then env variable, then production URL
  // Never use localhost in production
  const url = baseUrl || 
    process.env.NEXT_PUBLIC_BASE_URL || 
    process.env.NEXT_PUBLIC_APP_URL || 
    (typeof window !== 'undefined' && !window.location.hostname.includes('localhost') 
      ? window.location.origin 
      : 'https://orchestra.beamthinktank.space')
  return `${url}/checkin?id=${rehearsalId}`
}

