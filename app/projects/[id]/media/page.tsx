'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { 
  Play, 
  Lock, 
  Globe, 
  Users, 
  CreditCard,
  Video,
  Calendar,
  Loader
} from 'lucide-react'
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy 
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useUserRole } from '@/lib/hooks/useUserRole'
import { getSignedMediaURL } from '@/lib/mediaUtils'
import SubscriptionCTA from '@/components/SubscriptionCTA'

interface MediaItem {
  id: string
  projectId: string
  title: string
  type: 'rehearsal' | 'performance' | 'document' | 'promotional' | 'interview'
  rehearsalId?: string
  storagePath?: string
  downloadURL: string
  access: ('musician' | 'subscriber' | 'public')[] | 'musician' | 'subscriber' | 'public' // Support both array and single for backward compatibility
  uploadedBy: string
  uploadedAt: any
  duration?: number
  thumbnailURL?: string
  description?: string
}

export default function MediaLibraryPage() {
  const params = useParams()
  const projectId = params.id as string || 'black-diaspora-symphony'
  
  const { user, role, loading: roleLoading } = useUserRole()
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [playingVideo, setPlayingVideo] = useState<string | null>(null)

  // Determine user's access level
  const hasMusicianAccess = role === 'beam_admin' || role === 'partner_admin' || role === 'board' || role === 'musician'
  const hasSubscriberAccess = role === 'subscriber' || hasMusicianAccess
  const isPublic = !user

  useEffect(() => {
    loadMedia()
  }, [projectId])

  const loadMedia = async () => {
    if (!db) return
    
    try {
      setLoading(true)
      const q = query(
        collection(db, 'projectMedia'),
        where('projectId', '==', projectId),
        orderBy('uploadedAt', 'desc')
      )
      const snapshot = await getDocs(q)
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as MediaItem[]
      setMediaItems(items)
    } catch (error) {
      console.error('Error loading media:', error)
    } finally {
      setLoading(false)
    }
  }

  // Filter media based on access (supports both array and single access format)
  const getAccessibleMedia = () => {
    return mediaItems.filter(item => {
      const accessLevels = Array.isArray(item.access) ? item.access : [item.access]
      
      // If public is in access levels, everyone can see it
      if (accessLevels.includes('public')) return true
      
      // If subscriber is in access levels and user has subscriber access
      if (accessLevels.includes('subscriber') && hasSubscriberAccess) return true
      
      // If musician is in access levels and user has musician access
      if (accessLevels.includes('musician') && hasMusicianAccess) return true
      
      return false
    })
  }

  const getLockedMedia = () => {
    return mediaItems.filter(item => {
      const accessLevels = Array.isArray(item.access) ? item.access : [item.access]
      
      // If public is the only access level, it's not locked
      if (accessLevels.length === 1 && accessLevels[0] === 'public') return false
      
      // Check if user has access to any of the levels
      const hasAccess = 
        accessLevels.includes('public') ||
        (accessLevels.includes('subscriber') && hasSubscriberAccess) ||
        (accessLevels.includes('musician') && hasMusicianAccess)
      
      return !hasAccess
    })
  }

  const accessibleMedia = getAccessibleMedia()
  const lockedMedia = getLockedMedia()

  const handlePlayVideo = async (item: MediaItem) => {
    try {
      // Get signed URL if needed
      let videoUrl = item.downloadURL
      if (!videoUrl && item.storagePath) {
        videoUrl = await getSignedMediaURL(item.storagePath)
      }
      setPlayingVideo(videoUrl || null)
    } catch (error) {
      console.error('Error loading video:', error)
      alert('Failed to load video. Please try again.')
    }
  }

  if (roleLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        <Loader className="w-8 h-8 animate-spin text-orchestra-gold" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Media Library</h1>
          <p className="text-gray-300">
            {projectId === 'black-diaspora-symphony' ? 'Black Diaspora Symphony Orchestra' : projectId} - Rehearsal Videos & Content
          </p>
        </div>

        {/* Subscription CTA for non-subscribers */}
        {!hasSubscriberAccess && lockedMedia.length > 0 && (
          <SubscriptionCTA className="mb-8" />
        )}

        {/* Accessible Media */}
        {accessibleMedia.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-6">Available Videos</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {accessibleMedia.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 overflow-hidden hover:bg-white/15 transition-colors"
                >
                  {item.downloadURL ? (
                    <div className="relative aspect-video bg-black/50">
                      <video
                        src={item.downloadURL}
                        controls
                        className="w-full h-full"
                        poster={item.thumbnailURL}
                      />
                    </div>
                  ) : (
                    <div 
                      className="relative aspect-video bg-black/50 cursor-pointer group"
                      onClick={() => handlePlayVideo(item)}
                    >
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Play className="w-16 h-16 text-white/80 group-hover:text-white group-hover:scale-110 transition-all" />
                      </div>
                      {item.thumbnailURL && (
                        <img 
                          src={item.thumbnailURL} 
                          alt={item.title}
                          className="w-full h-full object-cover opacity-50 group-hover:opacity-70 transition-opacity"
                        />
                      )}
                    </div>
                  )}
                  
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      {(() => {
                        const accessLevels = Array.isArray(item.access) ? item.access : [item.access]
                        return (
                          <>
                            {accessLevels.includes('public') && <Globe className="w-4 h-4 text-green-400" title="Public" />}
                            {accessLevels.includes('subscriber') && <CreditCard className="w-4 h-4 text-yellow-400" title="Subscriber" />}
                            {accessLevels.includes('musician') && <Users className="w-4 h-4 text-purple-400" title="Musician" />}
                          </>
                        )
                      })()}
                      <span className="text-xs text-gray-400">{item.type}</span>
                    </div>
                    <h3 className="text-white font-semibold mb-1">{item.title}</h3>
                    {item.description && (
                      <p className="text-gray-300 text-sm mb-2 line-clamp-2">{item.description}</p>
                    )}
                    {item.rehearsalId && (
                      <div className="flex items-center gap-1 text-xs text-gray-400">
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(item.rehearsalId).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Locked Media (Teasers) */}
        {lockedMedia.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-white mb-6">
              Subscriber-Only Content
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {lockedMedia.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 overflow-hidden relative"
                >
                  <div className="relative aspect-video bg-black/70">
                    {item.thumbnailURL ? (
                      <img 
                        src={item.thumbnailURL} 
                        alt={item.title}
                        className="w-full h-full object-cover opacity-30"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Video className="w-16 h-16 text-gray-600" />
                      </div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="bg-black/60 backdrop-blur-sm rounded-lg p-4 text-center">
                        <Lock className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                        <p className="text-white text-sm font-semibold">Subscriber-only content</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      {(() => {
                        const accessLevels = Array.isArray(item.access) ? item.access : [item.access]
                        return (
                          <>
                            {accessLevels.includes('subscriber') && <CreditCard className="w-4 h-4 text-yellow-400" title="Subscriber" />}
                            {accessLevels.includes('musician') && <Users className="w-4 h-4 text-purple-400" title="Musician" />}
                            {accessLevels.includes('public') && <Globe className="w-4 h-4 text-green-400" title="Public" />}
                          </>
                        )
                      })()}
                      <span className="text-xs text-gray-400">{item.type}</span>
                    </div>
                    <h3 className="text-white font-semibold mb-1">{item.title}</h3>
                    {item.description && (
                      <p className="text-gray-400 text-sm mb-2 line-clamp-2">{item.description}</p>
                    )}
                    {item.rehearsalId && (
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(item.rehearsalId).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {mediaItems.length === 0 && !loading && (
          <div className="text-center py-12 text-gray-300">
            <Video className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>No media available yet.</p>
          </div>
        )}

        {/* Video Player Modal */}
        {playingVideo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => setPlayingVideo(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              className="max-w-4xl w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <video
                src={playingVideo}
                controls
                autoPlay
                className="w-full rounded-lg"
              />
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  )
}

