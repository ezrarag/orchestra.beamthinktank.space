'use client'

import { useState, useEffect } from 'react'
import InteractiveVideoPlayer, { Chapter } from '@/components/InteractiveVideoPlayer'
import Footer from '@/components/Footer'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function DayvinHallmonInterviewPage() {
  const [videoUrl, setVideoUrl] = useState<string>('')
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<'full' | 'guided' | 'highlight'>('full')

  const videoId = 'dayvin-hallmon-interview'

  useEffect(() => {
    const fetchVideoData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Fetch chapters from API
        const response = await fetch(`/api/video-chapters/${videoId}`)
        
        if (!response.ok) {
          if (response.status === 404) {
            // Video not found in Firestore, use fallback data
            console.warn('Video not found in Firestore, using fallback data')
            setVideoUrl('') // Will be set manually or from props
            setChapters([
              {
                title: 'Introduction',
                start: 0,
                end: 60,
                topics: ['introduction', 'background'],
              },
              {
                title: 'Musical Journey',
                start: 60,
                end: 180,
                topics: ['music', 'career'],
              },
              {
                title: 'BEAM Orchestra',
                start: 180,
                end: 300,
                topics: ['orchestra', 'community'],
              },
            ])
            setLoading(false)
            return
          }
          throw new Error(`Failed to fetch video data: ${response.statusText}`)
        }

        const data = await response.json()
        setVideoUrl(data.videoUrl || '')
        setChapters(data.chapters || [])
      } catch (err) {
        console.error('Error fetching video data:', err)
        setError(err instanceof Error ? err.message : 'Failed to load video')
      } finally {
        setLoading(false)
      }
    }

    fetchVideoData()
  }, [videoId])

  // Handle URL parameters on load
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      
      // Handle mode parameter
      const modeParam = params.get('mode') as 'full' | 'guided' | 'highlight' | null
      if (modeParam && ['full', 'guided', 'highlight'].includes(modeParam)) {
        setMode(modeParam)
      }
      
      // Handle topic parameter - if topic is present, switch to guided mode
      const topicParam = params.get('topic')
      if (topicParam && mode !== 'guided') {
        setMode('guided')
      }
    }
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#D4AF37] mb-4"></div>
          <p className="text-white/60">Loading video...</p>
        </div>
      </div>
    )
  }

  if (error && !videoUrl) {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="max-w-4xl mx-auto px-4 py-16">
          <Link
            href="/studio"
            className="inline-flex items-center gap-2 text-[#D4AF37] hover:text-[#B8941F] mb-8 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            Back to Watch & Explore
          </Link>
          <div className="bg-white/5 border border-white/10 rounded-lg p-8 text-center">
            <h1 className="text-2xl font-bold text-white mb-4">Error Loading Video</h1>
            <p className="text-white/60 mb-6">{error}</p>
            <p className="text-sm text-white/40">
              Please ensure the video URL is configured in Firestore or contact support.
            </p>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-white/10 px-4 sm:px-6 lg:px-8 py-6">
        <div className="max-w-7xl mx-auto">
          <Link
            href="/studio"
            className="inline-flex items-center gap-2 text-[#D4AF37] hover:text-[#B8941F] mb-4 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            Back to Watch & Explore
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            Interview with Dayvin Hallmon
          </h1>
          <p className="text-white/60">
            An in-depth conversation about music, community, and the BEAM Orchestra experience.
          </p>
        </div>
      </header>

      {/* Mode Selector */}
      <div className="px-4 sm:px-6 lg:px-8 py-4 border-b border-white/10">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-wrap gap-2">
            <span className="text-sm text-white/70 mr-2">View Mode:</span>
            {(['full', 'guided', 'highlight'] as const).map((m) => (
              <button
                key={m}
                onClick={() => {
                  setMode(m)
                  const url = new URL(window.location.href)
                  url.searchParams.set('mode', m)
                  window.history.pushState({}, '', url.toString())
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  mode === m
                    ? 'bg-[#D4AF37] text-black'
                    : 'bg-white/10 text-white/80 hover:bg-white/20'
                }`}
              >
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Video Player */}
      <main className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-7xl mx-auto">
          {videoUrl ? (
            <InteractiveVideoPlayer
              videoUrl={videoUrl}
              chapters={chapters}
              mode={mode}
            />
          ) : (
            <div className="bg-white/5 border border-white/10 rounded-lg p-12 text-center">
              <p className="text-white/60 mb-4">
                Video URL not configured. Please add the video URL to Firestore.
              </p>
              <p className="text-sm text-white/40">
                Collection: <code className="bg-black/50 px-2 py-1 rounded">videoChapters</code>
                <br />
                Document ID: <code className="bg-black/50 px-2 py-1 rounded">{videoId}</code>
                <br />
                Fields: <code className="bg-black/50 px-2 py-1 rounded">videoUrl</code>,{' '}
                <code className="bg-black/50 px-2 py-1 rounded">chapters</code>
              </p>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
