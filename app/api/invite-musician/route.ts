import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb, verifyAdminRole } from '@/lib/firebase-admin'
import { Timestamp } from 'firebase-admin/firestore'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  let body: any = null
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
    const decodedToken = await adminAuth.verifyIdToken(token)
    
    // Verify admin role
    const isAdmin = await verifyAdminRole(decodedToken.uid)
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Insufficient permissions. Admin role required.' },
        { status: 403 }
      )
    }

    body = await request.json()
    const { name, email, phone, instrument, projectId = 'bdso-2025-annual' } = body

    // Validate required fields
    if (!name || (!email && !phone)) {
      return NextResponse.json(
        { error: 'Name and either email or phone are required' },
        { status: 400 }
      )
    }

    // Generate unique confirmation token
    const confirmationToken = crypto.randomBytes(32).toString('hex')
    
    // Create prospect document
    const prospectData = {
      name,
      email: email || null,
      phone: phone || null,
      instrument: instrument || null,
      projectId,
      status: 'pending', // pending, confirmed, declined
      confirmationToken,
      invitedBy: decodedToken.uid,
      invitedAt: Timestamp.now(),
      expiresAt: Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)), // 30 days
      confirmedAt: null,
      declinedAt: null,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    }

    // Save to Firestore prospects collection
    const prospectRef = await adminDb.collection('prospects').add(prospectData)

    // Generate confirmation URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://orchestra.beamthinktank.space'
    const confirmationUrl = `${baseUrl}/confirm-invite?token=${confirmationToken}&prospectId=${prospectRef.id}`

    // Return the confirmation URL for sending via email/SMS
    return NextResponse.json({
      success: true,
      prospectId: prospectRef.id,
      confirmationUrl,
      message: 'Invite created successfully. Send the confirmation URL to the musician.'
    })

  } catch (error) {
    console.error('Error creating invite:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorStack = error instanceof Error ? error.stack : undefined
    
    // Log detailed error information
    console.error('Error details:', {
      message: errorMessage,
      stack: errorStack,
      projectId: body?.projectId,
      name: body?.name,
      hasEmail: !!body?.email,
      hasPhone: !!body?.phone,
    })
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' 
          ? errorMessage 
          : 'An error occurred while creating the invite. Please check the server logs for details.',
        ...(process.env.NODE_ENV === 'development' && errorStack ? { stack: errorStack } : {})
      },
      { status: 500 }
    )
  }
}

