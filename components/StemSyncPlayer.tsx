'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChamberAudioTrack } from '@/lib/chamberProjects'

type TrackKind = 'full' | 'piano' | 'viola'

interface StemSyncPlayerProps {
  masterUrl?: string
  audioTracks: ChamberAudioTrack[]
  className?: string
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

  useEffect(() => {
    setSelectedKind(firstAvailableKind)
  }, [firstAvailableKind])

  const selectedTrack = selectedKind ? tracksByKind[selectedKind] : null

  useEffect(() => {
    const video = videoRef.current
    const audio = audioRef.current

    if (!video || !audio || !selectedTrack) return

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
  }, [selectedTrack])

  useEffect(() => {
    const video = videoRef.current
    const audio = audioRef.current

    if (!video || !audio) return

    if (!selectedTrack) {
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
  }, [selectedTrack])

  const handleTrackSwitch = (kind: TrackKind) => {
    const track = tracksByKind[kind]
    if (!track) return

    const video = videoRef.current
    pendingSeekRef.current = video?.currentTime ?? 0
    setSelectedKind(kind)
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
  )
}
