'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { MessageSquare, Send } from 'lucide-react'
import type { ChamberAudioTrack } from '@/lib/chamberProjects'

type TrackKind = 'full' | 'piano' | 'viola'

interface StemSyncPlayerProps {
  masterUrl?: string
  audioTracks: ChamberAudioTrack[]
  className?: string
}

interface TimedComment {
  id: string
  author: string
  message: string
  videoTime: number
  createdAt: number
}

const TRACK_BUTTONS: Array<{ kind: TrackKind; label: string }> = [
  { kind: 'full', label: 'Full' },
  { kind: 'piano', label: 'Piano' },
  { kind: 'viola', label: 'Viola' },
]

const inferTrackKind = (track: ChamberAudioTrack): TrackKind | null => {
  const id = track.id.toLowerCase()
  const label = track.label.toLowerCase()

  if (id.includes('full') || label.includes('full')) return 'full'
  if (id.includes('piano') || label.includes('piano')) return 'piano'
  if (id.includes('viola') || label.includes('viola')) return 'viola'

  return null
}

export default function StemSyncPlayer({ masterUrl, audioTracks, className = '' }: StemSyncPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const pendingSeekRef = useRef<number>(0)
  const commentListRef = useRef<HTMLDivElement>(null)

  const tracksByKind = useMemo(() => {
    const map: Record<TrackKind, ChamberAudioTrack | null> = {
      full: null,
      piano: null,
      viola: null,
    }

    for (const track of audioTracks) {
      const kind = inferTrackKind(track)
      if (kind && !map[kind]) {
        map[kind] = track
      }
    }

    return map
  }, [audioTracks])

  const firstAvailableKind = useMemo<TrackKind | null>(() => {
    return TRACK_BUTTONS.find(({ kind }) => tracksByKind[kind])?.kind ?? null
  }, [tracksByKind])

  const [selectedKind, setSelectedKind] = useState<TrackKind | null>(firstAvailableKind)
  const [commentAuthor, setCommentAuthor] = useState('Guest')
  const [commentMessage, setCommentMessage] = useState('')
  const [comments, setComments] = useState<TimedComment[]>([])
  const [currentVideoTime, setCurrentVideoTime] = useState(0)

  const commentsStorageKey = useMemo(() => {
    return `chamber-video-comments:${masterUrl ?? 'unknown'}`
  }, [masterUrl])

  useEffect(() => {
    setSelectedKind(firstAvailableKind)
  }, [firstAvailableKind])

  const selectedTrack = selectedKind ? tracksByKind[selectedKind] : null
  const useExternalAudio = selectedKind !== 'full' && Boolean(selectedTrack)

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const stored = window.localStorage.getItem(commentsStorageKey)
      if (!stored) {
        setComments([])
        return
      }
      const parsed = JSON.parse(stored) as TimedComment[]
      setComments(Array.isArray(parsed) ? parsed : [])
    } catch {
      setComments([])
    }
  }, [commentsStorageKey])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(commentsStorageKey, JSON.stringify(comments))
  }, [comments, commentsStorageKey])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const onTimeUpdate = () => {
      setCurrentVideoTime(video.currentTime)
    }

    video.addEventListener('timeupdate', onTimeUpdate)
    return () => {
      video.removeEventListener('timeupdate', onTimeUpdate)
    }
  }, [])

  useEffect(() => {
    const video = videoRef.current
    const audio = audioRef.current

    if (!video || !audio || !selectedTrack || !useExternalAudio) return

    const syncOnPlay = () => {
      audio.currentTime = video.currentTime
      void audio.play().catch((error) => {
        console.warn('Audio play blocked:', error)
      })
    }

    const syncOnPause = () => {
      audio.currentTime = video.currentTime
      audio.pause()
    }

    const syncOnSeek = () => {
      audio.currentTime = video.currentTime
      if (!video.paused) {
        void audio.play().catch(() => {
          // no-op for browser autoplay restrictions
        })
      }
    }

    const applyDriftCorrection = () => {
      const drift = Math.abs(video.currentTime - audio.currentTime)
      if (drift > 0.12) {
        audio.currentTime = video.currentTime
      }
    }

    video.addEventListener('play', syncOnPlay)
    video.addEventListener('pause', syncOnPause)
    video.addEventListener('seeking', syncOnSeek)
    video.addEventListener('seeked', syncOnSeek)
    video.addEventListener('timeupdate', applyDriftCorrection)

    return () => {
      video.removeEventListener('play', syncOnPlay)
      video.removeEventListener('pause', syncOnPause)
      video.removeEventListener('seeking', syncOnSeek)
      video.removeEventListener('seeked', syncOnSeek)
      video.removeEventListener('timeupdate', applyDriftCorrection)
    }
  }, [selectedTrack, useExternalAudio])

  useEffect(() => {
    const video = videoRef.current
    const audio = audioRef.current

    if (!video || !audio) return

    if (!selectedTrack || !useExternalAudio) {
      audio.pause()
      audio.removeAttribute('src')
      audio.load()
      video.muted = false
      return
    }

    video.muted = true
    audio.pause()
    audio.src = selectedTrack.url
    audio.preload = 'auto'

    const onLoadedMetadata = () => {
      const targetTime = pendingSeekRef.current || video.currentTime
      const safeTime = Number.isFinite(audio.duration)
        ? Math.min(targetTime, Math.max(0, audio.duration - 0.05))
        : targetTime

      audio.currentTime = safeTime

      if (!video.paused) {
        void audio.play().catch((error) => {
          console.warn('Audio play blocked after track switch:', error)
        })
      }
    }

    audio.addEventListener('loadedmetadata', onLoadedMetadata)
    audio.load()

    return () => {
      audio.removeEventListener('loadedmetadata', onLoadedMetadata)
    }
  }, [selectedTrack, useExternalAudio])

  const handleTrackSwitch = (kind: TrackKind) => {
    const track = tracksByKind[kind]
    if (!track) return

    const video = videoRef.current
    pendingSeekRef.current = video?.currentTime ?? 0
    setSelectedKind(kind)
  }

  const formatVideoTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleCommentSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const message = commentMessage.trim()
    if (!message) return

    const author = commentAuthor.trim() || 'Guest'
    const videoTime = videoRef.current?.currentTime ?? currentVideoTime

    setComments((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        author,
        message,
        videoTime,
        createdAt: Date.now(),
      },
    ])
    setCommentMessage('')

    requestAnimationFrame(() => {
      const list = commentListRef.current
      if (!list) return
      list.scrollTop = list.scrollHeight
    })
  }

  const jumpToCommentTime = (timestamp: number) => {
    const video = videoRef.current
    if (!video) return
    video.currentTime = timestamp
  }

  if (!masterUrl) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/70">
        No video source is available for this version.
      </div>
    )
  }

  return (
    <div className={`rounded-2xl border border-white/10 bg-white/5 p-5 sm:p-6 ${className}`}>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div>
          <video
            ref={videoRef}
            src={masterUrl}
            controls
            playsInline
            preload="metadata"
            className="max-h-[70vh] w-full rounded-lg border border-white/10 bg-black"
          >
            Your browser does not support the video tag.
          </video>

          <audio ref={audioRef} />

          <div className="mt-5">
            <p className="mb-2 text-sm font-semibold text-white">Audio Stems</p>
            <div className="flex flex-wrap gap-2">
              {TRACK_BUTTONS.map(({ kind, label }) => {
                const exists = Boolean(tracksByKind[kind])
                const selected = selectedKind === kind

                return (
                  <button
                    key={kind}
                    type="button"
                    disabled={!exists}
                    onClick={() => handleTrackSwitch(kind)}
                    className={`rounded-md border px-3 py-2 text-sm transition ${
                      selected
                        ? 'border-[#D4AF37] bg-[#D4AF37]/20 text-[#F0D27B]'
                        : exists
                          ? 'border-white/20 bg-white/5 text-white/80 hover:border-white/40'
                          : 'cursor-not-allowed border-white/10 bg-white/5 text-white/35'
                    }`}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <aside className="rounded-lg border border-white/10 bg-black/40 p-4">
          <div className="mb-3 flex items-center gap-2 text-[#D4AF37]">
            <MessageSquare className="h-5 w-5" />
            <p className="text-sm font-semibold uppercase tracking-wide">Session Chat</p>
          </div>

          <div
            ref={commentListRef}
            className="h-72 space-y-3 overflow-y-auto rounded-md border border-white/10 bg-black/30 p-3 lg:h-[28rem]"
          >
            {comments.length === 0 ? (
              <p className="text-sm text-white/50">
                No chat yet. Add a timestamped comment to start the conversation.
              </p>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="rounded-md border border-white/10 bg-white/5 px-3 py-2">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-white/90">{comment.author}</p>
                    <button
                      type="button"
                      onClick={() => jumpToCommentTime(comment.videoTime)}
                      className="text-xs font-medium text-[#D4AF37] hover:text-[#F0D27B]"
                      title="Jump to this timestamp"
                    >
                      {formatVideoTime(comment.videoTime)}
                    </button>
                  </div>
                  <p className="text-sm text-white/80">{comment.message}</p>
                </div>
              ))
            )}
          </div>

          <form onSubmit={handleCommentSubmit} className="mt-3 space-y-2">
            <div className="flex items-center gap-2">
              <input
                value={commentAuthor}
                onChange={(event) => setCommentAuthor(event.target.value)}
                maxLength={24}
                placeholder="Name"
                className="w-1/3 rounded-md border border-white/20 bg-black/50 px-2 py-2 text-sm text-white placeholder:text-white/45 focus:border-[#D4AF37] focus:outline-none"
              />
              <p className="text-xs text-white/55">Posting at {formatVideoTime(currentVideoTime)}</p>
            </div>

            <div className="flex gap-2">
              <input
                value={commentMessage}
                onChange={(event) => setCommentMessage(event.target.value)}
                maxLength={240}
                placeholder="Comment on this moment..."
                className="flex-1 rounded-md border border-white/20 bg-black/50 px-3 py-2 text-sm text-white placeholder:text-white/45 focus:border-[#D4AF37] focus:outline-none"
              />
              <button
                type="submit"
                className="inline-flex items-center gap-1 rounded-md border border-[#D4AF37]/70 bg-[#D4AF37]/15 px-3 py-2 text-sm font-medium text-[#F0D27B] transition hover:bg-[#D4AF37]/25"
              >
                <Send className="h-4 w-4" />
                Send
              </button>
            </div>
          </form>
        </aside>
      </div>
    </div>
  )
}
