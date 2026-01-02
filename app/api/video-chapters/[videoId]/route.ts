import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

export async function GET(
  request: NextRequest,
  { params }: { params: { videoId: string } }
) {
  try {
    const { videoId } = params

    if (!videoId) {
      return NextResponse.json(
        { error: 'Video ID is required' },
        { status: 400 }
      )
    }

    if (!adminDb) {
      return NextResponse.json(
        { error: 'Firebase Admin not initialized' },
        { status: 500 }
      )
    }

    // Fetch video chapters from Firestore
    // Expected collection: 'videoChapters'
    // Document structure: { videoId: string, chapters: Chapter[], videoUrl: string }
    const videoDocRef = adminDb.collection('videoChapters').doc(videoId)
    const videoDoc = await videoDocRef.get()

    if (!videoDoc.exists) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      )
    }

    const data = videoDoc.data()
    
    // Return chapters array
    return NextResponse.json({
      videoId,
      chapters: data?.chapters || [],
      videoUrl: data?.videoUrl || null,
    })
  } catch (error) {
    console.error('Error fetching video chapters:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch video chapters',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
