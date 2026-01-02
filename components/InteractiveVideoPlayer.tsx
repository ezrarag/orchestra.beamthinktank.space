'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Pause, Volume2, VolumeX, Maximize2, Share2, Check } from 'lucide-react'

export interface Chapter {
  title: string
  start: number // seconds
  end: number // seconds
  topics: string[] // array of topic strings
}

interface InteractiveVideoPlayerProps {
  videoUrl: string
  chapters: Chapter[]
  mode?: 'full' | 'guided' | 'highlight'
}

interface Toast {
  id: string
  message: string
}

export default function InteractiveVideoPlayer({
  videoUrl,
  chapters,
  mode = 'full',
}: InteractiveVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [selectedTopics, setSelectedTopics] = useState<string[]>([])
  const [hoveredChapter, setHoveredChapter] = useState<number | null>(null)
  const [activeChapterIndex, setActiveChapterIndex] = useState<number | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [hasInitialized, setHasInitialized] = useState(false)

  // Get all unique topics from chapters
  const allTopics = useMemo(() => {
    const topicsSet = new Set<string>()
    chapters.forEach((chapter) => {
      chapter.topics.forEach((topic) => topicsSet.add(topic))
    })
    return Array.from(topicsSet).sort()
  }, [chapters])

  // Filter chapters based on selected topics (for guided mode)
  const filteredChapters = useMemo(() => {
    if (mode !== 'guided' || selectedTopics.length === 0) {
      return chapters
    }
    return chapters.filter((chapter) =>
      chapter.topics.some((topic) => selectedTopics.includes(topic))
    )
  }, [chapters, selectedTopics, mode])

  // Find active chapter based on current time
  useEffect(() => {
    if (!videoRef.current) return

    const updateActiveChapter = () => {
      const time = videoRef.current?.currentTime || 0
      const index = chapters.findIndex(
        (chapter) => time >= chapter.start && time < chapter.end
      )
      setActiveChapterIndex(index >= 0 ? index : null)
    }

    const interval = setInterval(updateActiveChapter, 100)
    return () => clearInterval(interval)
  }, [chapters])

  // Handle URL parameters on load
  useEffect(() => {
    if (typeof window === 'undefined' || hasInitialized) return

    const params = new URLSearchParams(window.location.search)
    const topicParam = params.get('topic')
    const timeParam = params.get('t')

    // Set topic filter if provided
    if (topicParam && allTopics.includes(topicParam)) {
      setSelectedTopics([topicParam])
      // If in guided mode, ensure mode is set
      if (mode !== 'guided') {
        // Update URL to include mode=guided
        const url = new URL(window.location.href)
        url.searchParams.set('mode', 'guided')
        window.history.replaceState({}, '', url.toString())
      }
    }

    // Seek to timestamp if provided (wait for video to be ready)
    if (timeParam && videoRef.current) {
      const timestamp = parseFloat(timeParam)
      if (!isNaN(timestamp) && timestamp >= 0) {
        const seekToTimestamp = () => {
          if (videoRef.current && videoRef.current.readyState >= 2) {
            videoRef.current.currentTime = timestamp
            setHasInitialized(true)
          } else {
            // Wait for video to load
            setTimeout(seekToTimestamp, 100)
          }
        }
        seekToTimestamp()
      }
    } else {
      setHasInitialized(true)
    }
  }, [allTopics, mode, hasInitialized])

  // Auto-jump to next filtered chapter in guided mode
  useEffect(() => {
    if (mode !== 'guided' || filteredChapters.length === 0 || !videoRef.current || !hasInitialized) return

    let isJumping = false

    const handleTimeUpdate = () => {
      if (isJumping) return
      
      const time = videoRef.current?.currentTime || 0
      const currentChapter = chapters.find(
        (ch) => time >= ch.start && time < ch.end
      )

      // If we're past the end of current chapter, jump to next filtered chapter
      if (currentChapter && time >= currentChapter.end - 0.3) {
        const currentIndex = chapters.indexOf(currentChapter)
        const nextFilteredChapter = filteredChapters.find(
          (ch) => chapters.indexOf(ch) > currentIndex
        )
        if (nextFilteredChapter && videoRef.current) {
          isJumping = true
          videoRef.current.currentTime = nextFilteredChapter.start
          setTimeout(() => {
            isJumping = false
          }, 500)
        } else if (!nextFilteredChapter && videoRef.current) {
          // If no more filtered chapters, pause at end of current chapter
          videoRef.current.pause()
          setIsPlaying(false)
        }
      }

      // If we're in a gap between filtered chapters, jump to next filtered chapter
      if (!currentChapter && filteredChapters.length > 0 && time > 0) {
        const nextFilteredChapter = filteredChapters.find((ch) => ch.start > time)
        if (nextFilteredChapter && videoRef.current) {
          isJumping = true
          videoRef.current.currentTime = nextFilteredChapter.start
          setTimeout(() => {
            isJumping = false
          }, 500)
        }
      }
    }

    const video = videoRef.current
    video.addEventListener('timeupdate', handleTimeUpdate)
    return () => video.removeEventListener('timeupdate', handleTimeUpdate)
  }, [mode, filteredChapters, chapters, hasInitialized])

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime)
    }
  }

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration)
      // Handle initial timestamp from URL after metadata is loaded
      if (!hasInitialized && typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search)
        const timeParam = params.get('t')
        if (timeParam) {
          const timestamp = parseFloat(timeParam)
          if (!isNaN(timestamp) && timestamp >= 0 && timestamp <= videoRef.current.duration) {
            videoRef.current.currentTime = timestamp
            setHasInitialized(true)
          }
        } else {
          setHasInitialized(true)
        }
      }
    }
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value)
    if (videoRef.current) {
      videoRef.current.currentTime = time
      setCurrentTime(time)
    }
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value)
    setVolume(newVolume)
    if (videoRef.current) {
      videoRef.current.volume = newVolume
    }
  }

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted
      setIsMuted(!isMuted)
    }
  }

  const seekToChapter = (chapterIndex: number) => {
    const chapter = chapters[chapterIndex]
    if (videoRef.current && chapter) {
      videoRef.current.currentTime = chapter.start
      setCurrentTime(chapter.start)
    }
  }

  const toggleTopic = (topic: string) => {
    setSelectedTopics((prev) =>
      prev.includes(topic)
        ? prev.filter((t) => t !== topic)
        : [...prev, topic]
    )
  }

  const generateShareLink = (topic?: string, timestamp?: number) => {
    const url = new URL(window.location.href)
    url.searchParams.delete('topic')
    url.searchParams.delete('t')
    
    if (topic) {
      url.searchParams.set('topic', topic)
    }
    if (timestamp !== undefined) {
      url.searchParams.set('t', Math.floor(timestamp).toString())
    }
    
    return url.toString()
  }

  const showToast = (message: string) => {
    const id = Math.random().toString(36).substring(7)
    setToasts((prev) => [...prev, { id, message }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3000)
  }

  const copyShareLink = async (topic?: string, timestamp?: number) => {
    const link = generateShareLink(topic, timestamp)
    try {
      await navigator.clipboard.writeText(link)
      showToast('Link copied to clipboard!')
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = link
      textArea.style.position = 'fixed'
      textArea.style.opacity = '0'
      document.body.appendChild(textArea)
      textArea.select()
      try {
        document.execCommand('copy')
        showToast('Link copied to clipboard!')
      } catch (e) {
        showToast('Failed to copy link')
      }
      document.body.removeChild(textArea)
    }
  }

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const getChapterPosition = (chapter: Chapter) => {
    return (chapter.start / duration) * 100
  }

  const getChapterWidth = (chapter: Chapter) => {
    return ((chapter.end - chapter.start) / duration) * 100
  }

  return (
    <div className="w-full bg-black text-white relative">
      {/* Toast Notifications */}
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 100 }}
              className="px-4 py-3 bg-[#D4AF37]/90 text-black rounded-lg shadow-lg backdrop-blur-sm border border-[#D4AF37] flex items-center space-x-2"
            >
              <Check className="h-5 w-5" />
              <span className="font-medium text-sm">{toast.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 p-6">
        {/* Left Sidebar - Chapter List */}
        <aside className="w-full lg:w-80 flex-shrink-0">
          <div className="bg-white/5 border border-white/10 rounded-lg p-4">
            <h2 className="text-xl font-bold text-[#D4AF37] mb-4">Chapters</h2>
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {(mode === 'guided' ? filteredChapters : chapters).map((chapter, index) => {
                const originalIndex = chapters.indexOf(chapter)
                const isActive = activeChapterIndex === originalIndex
                const isVisible = mode !== 'guided' || filteredChapters.includes(chapter)

                if (!isVisible && mode === 'guided') return null

                return (
                  <button
                    key={originalIndex}
                    onClick={() => seekToChapter(originalIndex)}
                    className={`w-full text-left p-3 rounded-lg transition-all ${
                      isActive
                        ? 'bg-[#D4AF37]/30 border border-[#D4AF37] text-white'
                        : 'bg-white/5 border border-white/10 hover:bg-white/10 text-white/80'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{chapter.title}</p>
                        <p className="text-xs text-white/60 mt-1">
                          {formatTime(chapter.start)} - {formatTime(chapter.end)}
                        </p>
                        {chapter.topics.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {chapter.topics.map((topic) => (
                              <span
                                key={topic}
                                className="text-xs px-2 py-0.5 bg-[#D4AF37]/20 text-[#D4AF37] rounded"
                              >
                                {topic}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          copyShareLink(undefined, chapter.start)
                        }}
                        className="ml-2 p-1 hover:bg-white/10 rounded transition-colors"
                        title="Copy share link for this chapter"
                      >
                        <Share2 className="h-4 w-4 text-white/60 hover:text-[#D4AF37]" />
                      </button>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </aside>

        {/* Main Video Area */}
        <div className="flex-1 flex flex-col">
          {/* Topic Filter Bar */}
          {mode === 'guided' && allTopics.length > 0 && (
            <div className="mb-4 bg-white/5 border border-white/10 rounded-lg p-4">
              <h3 className="text-sm font-medium text-white/70 mb-3">Filter by Topics</h3>
              <div className="flex flex-wrap gap-2">
                {allTopics.map((topic) => {
                  const isSelected = selectedTopics.includes(topic)
                  return (
                    <button
                      key={topic}
                      onClick={() => toggleTopic(topic)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        isSelected
                          ? 'bg-[#D4AF37] text-black'
                          : 'bg-white/10 text-white/80 hover:bg-white/20'
                      }`}
                    >
                      {topic}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Video Player */}
          <div className="relative bg-black rounded-lg overflow-hidden border border-white/10">
            <video
              ref={videoRef}
              src={videoUrl}
              className="w-full"
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => setIsPlaying(false)}
            />

            {/* Chapter Timeline */}
            <div className="absolute bottom-16 left-0 right-0 px-4">
              <div className="relative h-2 bg-white/20 rounded-full">
                {chapters.map((chapter, index) => {
                  const isActive = activeChapterIndex === index
                  const isFiltered = filteredChapters.includes(chapter)
                  const position = getChapterPosition(chapter)
                  const width = getChapterWidth(chapter)

                  return (
                    <div
                      key={index}
                      className="absolute h-full rounded-full cursor-pointer transition-all"
                      style={{
                        left: `${position}%`,
                        width: `${width}%`,
                        backgroundColor: isActive
                          ? '#D4AF37'
                          : mode === 'guided' && !isFiltered
                          ? 'rgba(255, 255, 255, 0.1)'
                          : 'rgba(255, 255, 255, 0.4)',
                      }}
                      onClick={() => seekToChapter(index)}
                      onMouseEnter={() => setHoveredChapter(index)}
                      onMouseLeave={() => setHoveredChapter(null)}
                      title={chapter.title}
                    >
                      {hoveredChapter === index && (
                        <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-black/90 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                          {chapter.title}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Video Controls */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
              {/* Progress Bar */}
              <div className="mb-4">
                <input
                  type="range"
                  min="0"
                  max={duration || 0}
                  value={currentTime}
                  onChange={handleSeek}
                  className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #D4AF37 0%, #D4AF37 ${
                      (currentTime / duration) * 100
                    }%, rgba(255, 255, 255, 0.2) ${
                      (currentTime / duration) * 100
                    }%, rgba(255, 255, 255, 0.2) 100%)`,
                  }}
                />
                <div className="flex justify-between text-xs text-white/60 mt-1">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Control Buttons */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button
                    onClick={togglePlay}
                    className="text-[#D4AF37] hover:text-[#B8941F] transition-colors"
                  >
                    {isPlaying ? (
                      <Pause className="h-6 w-6" />
                    ) : (
                      <Play className="h-6 w-6" />
                    )}
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={toggleMute}
                      className="text-white/80 hover:text-white transition-colors"
                    >
                      {isMuted ? (
                        <VolumeX className="h-5 w-5" />
                      ) : (
                        <Volume2 className="h-5 w-5" />
                      )}
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={volume}
                      onChange={handleVolumeChange}
                      className="w-24 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyShareLink(undefined, currentTime)}
                    className="text-white/80 hover:text-[#D4AF37] transition-colors"
                    title="Copy share link with current timestamp"
                  >
                    <Share2 className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => {
                      if (videoRef.current) {
                        if (videoRef.current.requestFullscreen) {
                          videoRef.current.requestFullscreen()
                        } else if ((videoRef.current as any).webkitRequestFullscreen) {
                          ;(videoRef.current as any).webkitRequestFullscreen()
                        } else if ((videoRef.current as any).mozRequestFullScreen) {
                          ;(videoRef.current as any).mozRequestFullScreen()
                        }
                      }
                    }}
                    className="text-white/80 hover:text-[#D4AF37] transition-colors"
                    title="Enter fullscreen"
                  >
                    <Maximize2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
