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

function inferSourceType(url: string): string | undefined {
  const normalized = url.toLowerCase()
  if (normalized.includes('.m3u8') || normalized.includes('format=m3u8')) {
    return 'application/x-mpegURL'
  }
  if (normalized.endsWith('.mp4')) return 'video/mp4'
  if (normalized.endsWith('.webm')) return 'video/webm'
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
}

function ViewerStreamingCanvas({
  src,
  fallbackSrc,
  loop,
  muted,
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

    const setSourceDirectly = (nextUrl: string, notice?: string) => {
      if (!elementRef.current) return
      fallbackInUseRef.current = nextUrl === fallbackSrc && Boolean(fallbackSrc)
      applyDirectSource(elementRef.current, nextUrl)
      onPlaybackNotice(notice ?? null)
    }

    const setup = async () => {
      try {
        const videojs = await ensureVideoJsFactory()
        if (cancelled || !elementRef.current) return

        if (!videojs) {
          setSourceDirectly(fallbackSrc || src, 'Streaming player unavailable. Using direct playback.')
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
            if (!fallbackSrc || fallbackInUseRef.current || !playerRef.current) {
              const message = playerRef.current?.error()?.message ?? 'Stream playback failed.'
              onPlaybackNotice(message)
              return
            }

            fallbackInUseRef.current = true
            playerRef.current.src({
              src: fallbackSrc,
              type: inferSourceType(fallbackSrc),
            })
            onPlaybackNotice('Stream fallback activated.')
          }

          errorHandlerRef.current = handlePlayerError
          player.on('error', handlePlayerError)
          playerRef.current = player
        }

        player.autoplay(true)
        player.loop(loop)
        player.muted(muted)
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
  }, [fallbackSrc, loop, muted, onPlaybackNotice, src])

  useEffect(() => {
    const player = playerRef.current
    if (player) {
      player.loop(loop)
      player.muted(muted)
      return
    }

    if (elementRef.current) {
      elementRef.current.loop = loop
      elementRef.current.muted = muted
    }
  }, [loop, muted])

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
