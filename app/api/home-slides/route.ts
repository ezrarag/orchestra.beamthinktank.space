import { NextRequest, NextResponse } from 'next/server'
import { adminDb, isAdminSDKAvailable } from '@/lib/firebase-admin'
import { HOME_SLIDES_COLLECTION, sanitizeHomeSlides } from '@/lib/homeSlides'

function isDebugEnabled(request: NextRequest) {
  return process.env.NODE_ENV !== 'production' || request.nextUrl.searchParams.get('debug') === '1'
}

function getAdminProjectId() {
  return (
    process.env.FIREBASE_ADMIN_PROJECT_ID ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    'beam-orchestra-platform'
  )
}

function getMissingAdminEnvVars() {
  const missing: string[] = []

  if (!process.env.FIREBASE_ADMIN_PROJECT_ID && !process.env.GOOGLE_CLOUD_PROJECT && !process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
    missing.push('FIREBASE_ADMIN_PROJECT_ID')
  }

  if (!(process.env.FIREBASE_ADMIN_CLIENT_EMAIL || process.env.NEXT_PUBLIC_FIREBASE_ADMIN_CLIENT_EMAIL)) {
    missing.push('FIREBASE_ADMIN_CLIENT_EMAIL')
  }

  if (!((process.env.FIREBASE_ADMIN_PRIVATE_KEY || process.env.NEXT_PUBLIC_FIREBASE_ADMIN_PRIVATE_KEY || '').replace(/\\n/g, '\n'))) {
    missing.push('FIREBASE_ADMIN_PRIVATE_KEY')
  }

  return missing
}

function buildDebug(ngo: string, reason: string, extra?: Record<string, unknown>) {
  return {
    ngo,
    reason,
    collection: HOME_SLIDES_COLLECTION,
    docPath: `${HOME_SLIDES_COLLECTION}/${ngo}`,
    adminSdkAvailable: isAdminSDKAvailable(),
    adminDbReady: Boolean(adminDb),
    adminProjectId: getAdminProjectId(),
    vercelEnv: process.env.VERCEL_ENV || null,
    missingAdminEnvVars: getMissingAdminEnvVars(),
    ...extra,
  }
}

export async function GET(request: NextRequest) {
  const ngo = (request.nextUrl.searchParams.get('ngo') || 'orchestra').trim() || 'orchestra'
  const debugEnabled = isDebugEnabled(request)

  if (!adminDb) {
    return NextResponse.json({
      slides: [],
      ...(debugEnabled ? { debug: buildDebug(ngo, 'admin_db_unavailable') } : {}),
    })
  }

  try {
    const docSnap = await adminDb.collection(HOME_SLIDES_COLLECTION).doc(ngo).get()
    if (!docSnap.exists) {
      return NextResponse.json({
        slides: [],
        ...(debugEnabled ? { debug: buildDebug(ngo, 'doc_missing') } : {}),
      })
    }

    const data = docSnap.data() as { slides?: unknown }
    const slides = sanitizeHomeSlides(data?.slides)
    return NextResponse.json({
      slides,
      ...(debugEnabled
        ? {
            debug: buildDebug(ngo, slides.length > 0 ? 'ok' : 'empty_slides', {
              slideCount: slides.length,
            }),
          }
        : {}),
    })
  } catch (error) {
    console.error(`Failed to load home slides for "${ngo}"`, error)
    return NextResponse.json({
      slides: [],
      ...(debugEnabled
        ? {
            debug: buildDebug(ngo, 'query_error', {
              error: error instanceof Error ? error.message : 'Unknown error',
            }),
          }
        : {}),
    })
  }
}
