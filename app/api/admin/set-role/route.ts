import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, verifyAdminRole } from '@/lib/firebase-admin'

/**
 * Set user role (admin only)
 * POST /api/admin/set-role
 * Body: { email: string, role: 'beam_admin' | 'partner_admin' | 'board' | 'musician' }
 */
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
    const { email, role } = body

    if (!email || !role) {
      return NextResponse.json(
        { error: 'Email and role are required' },
        { status: 400 }
      )
    }

    // Validate role
    const validRoles = ['beam_admin', 'partner_admin', 'board', 'musician', 'subscriber', 'audience']
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: `Invalid role. Must be one of: ${validRoles.join(', ')}` },
        { status: 400 }
      )
    }

    // Get user by email
    let user
    try {
      user = await adminAuth.getUserByEmail(email)
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        return NextResponse.json(
          { error: `User with email ${email} not found. They must sign in at least once first.` },
          { status: 404 }
        )
      }
      throw error
    }

    // Preserve existing claims and set new role
    const existing = (user.customClaims || {}) as Record<string, unknown>
    
    // Build new claims based on role
    const newClaims: Record<string, unknown> = {
      ...existing,
      role: role,
    }

    // Add role-specific flags
    if (role === 'beam_admin') {
      newClaims.beam_admin = true
    } else if (role === 'partner_admin') {
      newClaims.partner_admin = true
    } else if (role === 'board') {
      newClaims.board = true
    }

    await adminAuth.setCustomUserClaims(user.uid, newClaims)

    return NextResponse.json({
      success: true,
      message: `Set role "${role}" for ${email}`,
      uid: user.uid,
      email: user.email,
      role: role,
      note: 'User must sign out and sign back in to refresh their ID token claims.'
    })

  } catch (error) {
    console.error('Set role error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to set user role',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

