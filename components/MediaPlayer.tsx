'use client'

import { useState, useRef } from 'react'
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react'

interface MediaPlayerProps {
  audioUrl?: string
  title?: string
  composer?: string
  className?: string
}

export default function MediaPlayer({ audioUrl, title, composer, className = '' }: MediaPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(0.7)
  const [isMuted, setIsMuted] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
      } else {
        audioRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime)
    }
  }

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration)
    }
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value)
    if (audioRef.current) {
      audioRef.current.currentTime = time
      setCurrentTime(time)
    }
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value)
    setVolume(newVolume)
    if (audioRef.current) {
      audioRef.current.volume = newVolume
    }
  }

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted
      setIsMuted(!isMuted)
    }
  }

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  return (
    <div className={`card ${className}`}>
      <div className="text-center mb-6">
        <h3 className="text-xl font-serif text-orchestra-dark mb-2">
          {title || 'Classical Selection'}
        </h3>
        {composer && (
          <p className="text-orchestra-brown font-medium">
            by {composer}
          </p>
        )}
      </div>

      {audioUrl ? (
        <>
          <audio
            ref={audioRef}
            src={audioUrl}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={() => setIsPlaying(false)}
          />
          
          {/* Progress Bar */}
          <div className="mb-4">
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-2 bg-orchestra-gold/30 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-sm text-orchestra-brown mt-1">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex justify-center items-center space-x-4 mb-4">
            <button
              onClick={() => {
                if (audioRef.current) {
                  audioRef.current.currentTime = Math.max(0, currentTime - 10)
                }
              }}
              className="text-orchestra-gold hover:text-orchestra-brown transition-colors"
            >
              <SkipBack className="h-6 w-6" />
            </button>
            
            <button
              onClick={togglePlay}
              className="bg-orchestra-gold hover:bg-orchestra-brown text-orchestra-dark p-3 rounded-full transition-all duration-300 transform hover:scale-110"
            >
              {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
            </button>
            
            <button
              onClick={() => {
                if (audioRef.current) {
                  audioRef.current.currentTime = Math.min(duration, currentTime + 10)
                }
              }}
              className="text-orchestra-gold hover:text-orchestra-brown transition-colors"
            >
              <SkipForward className="h-6 w-6" />
            </button>
          </div>

          {/* Volume Control */}
          <div className="flex items-center justify-center space-x-3">
            <button
              onClick={toggleMute}
              className="text-orchestra-gold hover:text-orchestra-brown transition-colors"
            >
              {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              onChange={handleVolumeChange}
              className="w-24 h-2 bg-orchestra-gold/30 rounded-lg appearance-none cursor-pointer slider"
            />
          </div>
        </>
      ) : (
        <div className="text-center py-8">
          <p className="text-orchestra-brown mb-4">
            No audio file available
          </p>
          <p className="text-sm text-orchestra-brown/70">
            Audio content will appear here when available
          </p>
        </div>
      )}

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: #D4AF37;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        
        .slider::-moz-range-thumb {
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: #D4AF37;
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
      `}</style>
    </div>
  )
}
