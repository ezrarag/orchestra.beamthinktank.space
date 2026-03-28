'use client'

import { memo, useEffect, useRef, type MutableRefObject, type SyntheticEvent } from 'react'
import { isAdaptiveViewerMediaUrl } from '@/lib/viewer/media'

type Props = {
  src: string
  fallbackSrc?: string
  loop: boolean
  muted: boolean
  volume: number
  videoRef: MutableRefObject<HTMLVideoElement | null>
  onPlaybackNotice: (message: string | null) => void
  onLoadedMetadata: (event: SyntheticEvent<HTMLVideoElement>) => void
  onTimeUpdate: (event: SyntheticEvent<HTMLVideoElement>) => void
  onPause: (event: SyntheticEvent<HTMLVideoElement>) => void
  onPlay: () => void
  onEnded: (event: SyntheticEvent<HTMLVideoElement>) => void
  onWaiting: () => void
  onStalled: () => void
  onCanPlay: () => void
}

function supportsNativeHls(element: HTMLVideoElement): boolean {
  return Boolean(element.canPlayType('application/vnd.apple.mpegurl'))
}

function resolvePlaybackSource(element: HTMLVideoElement, src: string, fallbackSrc?: string) {
  if (!src) {
    return {
      url: '',
      notice: null as string | null,
    }
  }

  if (!isAdaptiveViewerMediaUrl(src) || supportsNativeHls(element)) {
    return {
      url: src,
      notice: null as string | null,
    }
  }

  if (fallbackSrc) {
    return {
      url: fallbackSrc,
      notice: 'Using direct playback for smoother streaming.',
    }
  }

  return {
    url: src,
    notice: 'Adaptive playback may not be fully supported in this browser.',
  }
}

function ViewerStreamingCanvas({
  src,
  fallbackSrc,
  loop,
  muted,
  volume,
  videoRef,
  onPlaybackNotice,
  onLoadedMetadata,
  onTimeUpdate,
  onPause,
  onPlay,
  onEnded,
  onWaiting,
  onStalled,
  onCanPlay,
}: Props) {
  const elementRef = useRef<HTMLVideoElement | null>(null)
  const appliedSourceRef = useRef('')

  useEffect(() => {
    videoRef.current = elementRef.current
    return () => {
      if (videoRef.current === elementRef.current) {
        videoRef.current = null
      }
    }
  }, [videoRef])

  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    const { url, notice } = resolvePlaybackSource(element, src, fallbackSrc)
    onPlaybackNotice(notice)

    if (!url) {
      if (appliedSourceRef.current) {
        appliedSourceRef.current = ''
        element.removeAttribute('src')
        element.load()
      }
      return
    }

    element.loop = loop
    element.muted = muted
    element.volume = volume

    const sourceChanged = appliedSourceRef.current !== url

    if (sourceChanged) {
      appliedSourceRef.current = url
      element.src = url
      element.load()
      void element.play().catch((error) => {
        if (!muted) {
          console.warn('Autoplay with audio was blocked by the browser:', error)
        }
      })
    }
  }, [fallbackSrc, loop, muted, onPlaybackNotice, src, volume])

  useEffect(() => {
    const element = elementRef.current
    if (!element) return
    element.loop = loop
    element.muted = muted
    element.volume = volume
  }, [loop, muted, volume])

  useEffect(() => {
    return () => {
      const element = elementRef.current
      if (!element) return
      element.pause()
      element.removeAttribute('src')
      element.load()
    }
  }, [])

  return (
    <div className="absolute inset-0 overflow-hidden bg-black">
      <video
        ref={elementRef}
        className="absolute inset-0 h-full w-full object-cover"
        autoPlay
        muted={muted}
        playsInline
        preload="auto"
        onLoadedMetadata={onLoadedMetadata}
        onTimeUpdate={onTimeUpdate}
        onPause={onPause}
        onPlay={onPlay}
        onEnded={onEnded}
        onWaiting={onWaiting}
        onStalled={onStalled}
        onCanPlay={onCanPlay}
      />
    </div>
  )
}

export default memo(ViewerStreamingCanvas)
