'use client'

import { memo, useEffect, useRef, type MutableRefObject, type SyntheticEvent } from 'react'

type VideoJsSource = {
  src: string
  type?: string
}

type VideoJsPlayer = {
  autoplay: (value?: boolean) => unknown
  dispose: () => void
  error: () => { code?: number; message?: string } | null
  loop: (value?: boolean) => unknown
  muted: (value?: boolean) => unknown
  on: (event: string, handler: () => void) => void
  off: (event: string, handler?: () => void) => void
  src: (source: VideoJsSource) => unknown
  volume: (value?: number) => number
}

type VideoJsFactory = (element: HTMLVideoElement, options: Record<string, unknown>) => VideoJsPlayer

type Props = {
  src: string
  fallbackSrc?: string
  loop: boolean
  muted: boolean
  volume: number
  isPreviewLoopFading: boolean
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

declare global {
  interface Window {
    videojs?: VideoJsFactory
  }
}

let videoJsPromise: Promise<VideoJsFactory | null> | null = null

function getNormalizedMediaPath(url: string): string {
  try {
    return decodeURIComponent(new URL(url, typeof window !== 'undefined' ? window.location.href : 'http://localhost').pathname).toLowerCase()
  } catch {
    return url.split('?')[0]?.toLowerCase() ?? ''
  }
}

function isAdaptiveStreamUrl(url: string): boolean {
  const normalizedUrl = url.toLowerCase()
  const path = getNormalizedMediaPath(url)
  return path.endsWith('.m3u8') || normalizedUrl.includes('format=m3u8')
}

function inferSourceType(url: string): string | undefined {
  const path = getNormalizedMediaPath(url)
  if (path.endsWith('.m3u8')) return 'application/vnd.apple.mpegurl'
  if (path.endsWith('.mp4')) return 'video/mp4'
  if (path.endsWith('.webm')) return 'video/webm'
  return undefined
}

async function ensureVideoJsFactory(): Promise<VideoJsFactory | null> {
  if (typeof window === 'undefined') return null

  if (!videoJsPromise) {
    videoJsPromise = new Promise<VideoJsFactory | null>((resolve, reject) => {
      if (window.videojs) {
        resolve(window.videojs)
        return
      }

      const existingStylesheet = document.querySelector('link[data-videojs-styles="1"]') as HTMLLinkElement | null
      if (!existingStylesheet) {
        const stylesheet = document.createElement('link')
        stylesheet.rel = 'stylesheet'
        stylesheet.href = 'https://vjs.zencdn.net/8.23.3/video-js.css'
        stylesheet.dataset.videojsStyles = '1'
        document.head.appendChild(stylesheet)
      }

      const existingScript = document.querySelector('script[data-videojs-cdn="1"]') as HTMLScriptElement | null
      if (existingScript) {
        existingScript.addEventListener('load', () => resolve(window.videojs ?? null), { once: true })
        existingScript.addEventListener('error', () => reject(new Error('Video.js CDN failed to load')), {
          once: true,
        })
        return
      }

      const script = document.createElement('script')
      script.src = 'https://vjs.zencdn.net/8.23.3/video.min.js'
      script.async = true
      script.dataset.videojsCdn = '1'
      script.onload = () => resolve(window.videojs ?? null)
      script.onerror = () => reject(new Error('Video.js CDN failed to load'))
      document.head.appendChild(script)
    })
  }

  return videoJsPromise
}

function supportsNativeHls(element: HTMLVideoElement): boolean {
  return Boolean(element.canPlayType('application/vnd.apple.mpegurl'))
}

function applyDirectSource(element: HTMLVideoElement, url: string) {
  if (element.src !== url) {
    element.src = url
  }
  element.load()
  void element.play().catch(() => {})
}

function ViewerStreamingCanvas({
  src,
  fallbackSrc,
  loop,
  muted,
  volume,
  isPreviewLoopFading,
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
  const playerRef = useRef<VideoJsPlayer | null>(null)
  const fallbackInUseRef = useRef(false)
  const errorHandlerRef = useRef<(() => void) | null>(null)

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
    if (!element || !src) return

    let cancelled = false
    fallbackInUseRef.current = false
    onPlaybackNotice(null)

    const teardownPlayer = () => {
      if (playerRef.current && errorHandlerRef.current) {
        playerRef.current.off('error', errorHandlerRef.current)
      }
      playerRef.current?.dispose()
      playerRef.current = null
      errorHandlerRef.current = null
    }

    const setSourceDirectly = (nextUrl: string, notice?: string) => {
      if (!elementRef.current) return
      teardownPlayer()
      fallbackInUseRef.current = nextUrl === fallbackSrc && Boolean(fallbackSrc)
      elementRef.current.volume = volume
      elementRef.current.muted = muted
      applyDirectSource(elementRef.current, nextUrl)
      onPlaybackNotice(notice ?? null)
    }

    const setup = async () => {
      try {
        const videojs = await ensureVideoJsFactory()
        if (cancelled || !elementRef.current) return

        const shouldUseDirectPlayback = !isAdaptiveStreamUrl(src) || supportsNativeHls(elementRef.current)
        if (shouldUseDirectPlayback || !videojs) {
          setSourceDirectly(
            src,
            !videojs && isAdaptiveStreamUrl(src) ? 'Streaming player unavailable. Using direct playback.' : undefined,
          )
          return
        }

        let player = playerRef.current

        if (!player) {
          player = videojs(elementRef.current, {
            autoplay: true,
            controls: false,
            fluid: false,
            fill: true,
            inactivityTimeout: 0,
            liveui: false,
            muted,
            preload: 'auto',
            responsive: false,
            userActions: {
              click: false,
              doubleClick: false,
              hotkeys: false,
            },
            html5: {
              nativeAudioTracks: false,
              nativeTextTracks: false,
              nativeVideoTracks: false,
              vhs: {
                enableLowInitialPlaylist: true,
                limitRenditionByPlayerDimensions: true,
                overrideNative: !supportsNativeHls(elementRef.current),
                smoothQualityChange: true,
                useBandwidthFromLocalStorage: true,
              },
            },
          })

          const handlePlayerError = () => {
            if (!playerRef.current) return

            if (fallbackSrc && !fallbackInUseRef.current) {
              if (isAdaptiveStreamUrl(fallbackSrc)) {
                fallbackInUseRef.current = true
                playerRef.current.src({
                  src: fallbackSrc,
                  type: inferSourceType(fallbackSrc),
                })
                onPlaybackNotice('Stream fallback activated.')
                return
              }

              setSourceDirectly(fallbackSrc, 'Stream fallback activated.')
              return
            }

            setSourceDirectly(src, playerRef.current.error()?.message ?? 'Stream playback failed. Using direct playback.')
          }

          errorHandlerRef.current = handlePlayerError
          player.on('error', handlePlayerError)
          playerRef.current = player
        }

        player.autoplay(true)
        player.loop(loop)
        player.muted(muted)
        player.volume(volume)
        player.src({
          src,
          type: inferSourceType(src),
        })
      } catch (error) {
        console.error('Unable to initialize Video.js playback:', error)
        setSourceDirectly(fallbackSrc || src, fallbackSrc ? 'Stream fallback activated.' : 'Direct playback activated.')
      }
    }

    void setup()

    return () => {
      cancelled = true
    }
  }, [fallbackSrc, onPlaybackNotice, src])

  useEffect(() => {
    const player = playerRef.current
    if (player) {
      player.loop(loop)
      player.muted(muted)
      player.volume(volume)
      return
    }

    if (elementRef.current) {
      elementRef.current.loop = loop
      elementRef.current.muted = muted
      elementRef.current.volume = volume
    }
  }, [loop, muted, volume])

  useEffect(() => {
    return () => {
      if (playerRef.current && errorHandlerRef.current) {
        playerRef.current.off('error', errorHandlerRef.current)
      }
      playerRef.current?.dispose()
      playerRef.current = null
      errorHandlerRef.current = null
    }
  }, [])

  return (
    <>
      <div className="viewer-streaming-canvas absolute inset-0 overflow-hidden bg-black">
        <video
          ref={elementRef}
          className={`video-js absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
            isPreviewLoopFading ? 'opacity-0' : 'opacity-100'
          }`}
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
      <style jsx global>{`
        .viewer-streaming-canvas,
        .viewer-streaming-canvas .video-js,
        .viewer-streaming-canvas .vjs-tech {
          height: 100%;
          width: 100%;
        }

        .viewer-streaming-canvas .video-js {
          background: transparent;
        }

        .viewer-streaming-canvas .vjs-tech {
          object-fit: cover;
        }

        .viewer-streaming-canvas .vjs-control-bar,
        .viewer-streaming-canvas .vjs-big-play-button,
        .viewer-streaming-canvas .vjs-loading-spinner,
        .viewer-streaming-canvas .vjs-text-track-display {
          display: none !important;
        }
      `}</style>
    </>
  )
}

export default memo(ViewerStreamingCanvas)
