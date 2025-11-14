import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { adminAuth, verifyAdminRole } from '@/lib/firebase-admin'

// Carrier email gateways for SMS
const CARRIER_GATEWAYS: Record<string, string> = {
  att: '@txt.att.net',
  tmobile: '@tmomail.net',
  verizon: '@vtext.com',
  sprint: '@messaging.sprintpcs.com',
  googlefi: '@msg.fi.google.com',
  uscellular: '@email.uscc.net',
  cricket: '@sms.cricketwireless.net',
  boost: '@smsmyboostmobile.com',
  metropcs: '@mymetropcs.com'
}

// Email transporter (same config as document emails)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
})

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'No authorization token provided' },
        { status: 401 }
      )
    }

    const token = authHeader.split('Bearer ')[1]
    
    // Check if adminAuth is initialized
    if (!adminAuth) {
      return NextResponse.json(
        { error: 'Authentication service not initialized' },
        { status: 500 }
      )
    }
    
    const decodedToken = await adminAuth.verifyIdToken(token)
    
    // Verify admin role
    const isAdmin = await verifyAdminRole(decodedToken.uid)
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Insufficient permissions. Admin role required.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { phone, carrier, link, projectName, musicianName } = body

    // Validate required fields
    if (!phone || !carrier || !link) {
      return NextResponse.json(
        { error: 'Phone, carrier, and link are required' },
        { status: 400 }
      )
    }

    // Validate phone number (digits only, 10 digits)
    const cleanPhone = phone.replace(/\D/g, '')
    if (cleanPhone.length !== 10) {
      return NextResponse.json(
        { error: 'Phone number must be 10 digits' },
        { status: 400 }
      )
    }

    // Get carrier gateway
    const gateway = CARRIER_GATEWAYS[carrier.toLowerCase()]
    if (!gateway) {
      return NextResponse.json(
        { 
          error: `Unknown carrier: ${carrier}. Supported: ${Object.keys(CARRIER_GATEWAYS).join(', ')}` 
        },
        { status: 400 }
      )
    }

    // Construct email address
    const recipient = `${cleanPhone}${gateway}`

    // Create message (SMS-friendly, short)
    const message = `${musicianName ? `Hi ${musicianName}, ` : ''}You're invited to perform with ${projectName || 'BEAM Orchestra'}! Confirm here: ${link}`

    // Send email
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@beamthinktank.space',
      to: recipient,
      subject: `${projectName || 'BEAM Orchestra'} Invitation`,
      text: message,
      html: `<p>${message}</p>`,
    })

    return NextResponse.json({
      success: true,
      message: `SMS invite sent to ${cleanPhone} via ${carrier}`,
      recipient
    })

  } catch (error) {
    console.error('Send text invite error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to send SMS invite',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

