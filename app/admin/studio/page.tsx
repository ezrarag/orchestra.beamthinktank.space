'use client'

import { useState, useEffect } from 'react'
import { useUserRole } from '@/lib/hooks/useUserRole'
import { db, storage } from '@/lib/firebase'
import { collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp, Timestamp } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { Video, Upload, Calendar, Music, X, CheckCircle, AlertCircle } from 'lucide-react'

interface StudioVideo {
  id: string
  projectId: string
  title: string
  url: string
  date?: any
  instrumentGroup?: string
  private: boolean
  createdAt?: any
}

const PROJECT_OPTIONS = [
  { value: 'black-diaspora-symphony', label: 'Black Diaspora Symphony Orchestra' },
  { value: 'uwm-afro-caribbean-jazz', label: 'UWM Afro-Caribbean Jazz Orchestra' },
]

const INSTRUMENT_GROUP_OPTIONS = [
  'Strings',
  'Winds',
  'Brass',
  'Percussion',
  'Full Orchestra',
  'Choir',
  'Rhythm Section',
  'Other',
]

export default function AdminStudioPage() {
  const { user, role } = useUserRole()
  const [videos, setVideos] = useState<StudioVideo[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  
  const [formData, setFormData] = useState({
    file: null as File | null,
    projectId: 'black-diaspora-symphony',
    title: '',
    date: new Date().toISOString().split('T')[0], // Today's date as default
    time: new Date().toTimeString().slice(0, 5), // Current time HH:MM
    instrumentGroup: 'Full Orchestra',
    description: '',
    isPrivate: false,
  })

  // Load existing videos
  useEffect(() => {
    if (!db) return

    const q = query(
      collection(db, 'projectRehearsalMedia'),
      where('private', '==', false),
      orderBy('date', 'desc')
    )

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items: StudioVideo[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as StudioVideo[]
        setVideos(items)
        setLoading(false)
      },
      (error) => {
        console.error('Error loading videos:', error)
        // Fallback: try without orderBy
        const simpleQ = query(
          collection(db, 'projectRehearsalMedia'),
          where('private', '==', false)
        )
        onSnapshot(simpleQ, (snapshot) => {
          const items: StudioVideo[] = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as StudioVideo[]
          items.sort((a, b) => {
            const aDate = a.date?.toDate?.() || new Date(0)
            const bDate = b.date?.toDate?.() || new Date(0)
            return bDate.getTime() - aDate.getTime()
          })
          setVideos(items)
          setLoading(false)
        })
      }
    )

    return () => unsubscribe()
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setFormData({ ...formData, file })
      // Auto-populate title from filename (remove extension)
      if (!formData.title) {
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '')
        setFormData({ ...formData, file, title: nameWithoutExt })
      }
    }
  }

  const handleUpload = async () => {
    if (!user || !db || !storage) {
      alert('Please sign in and ensure Firebase is initialized')
      return
    }

    if (!formData.file) {
      alert('Please select a video file')
      return
    }

    if (!formData.title.trim()) {
      alert('Please enter a title')
      return
    }

    setUploading(true)
    setUploadProgress(0)

    try {
      // Upload to Firebase Storage
      const timestamp = Date.now()
      const fileExtension = formData.file.name.split('.').pop()
      const sanitizedTitle = formData.title.replace(/[^a-zA-Z0-9]/g, '_')
      const fileName = `${sanitizedTitle}_${timestamp}.${fileExtension}`
      
      // Determine storage path based on project
      const projectPath = formData.projectId === 'black-diaspora-symphony'
        ? 'Black Diaspora Symphony/Music/rehearsal footage'
        : 'UWM Afro-Caribbean Jazz Orchestra/Music/rehearsal footage'
      
      const storagePath = `${projectPath}/${fileName}`
      const storageRef = ref(storage, storagePath)

      // Simulate progress (Firebase doesn't provide upload progress for uploadBytes)
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90))
      }, 200)

      await uploadBytes(storageRef, formData.file)
      clearInterval(progressInterval)
      setUploadProgress(90)

      // Get download URL
      const downloadURL = await getDownloadURL(storageRef)
      setUploadProgress(95)

      // Parse date and time
      const [year, month, day] = formData.date.split('-').map(Number)
      const [hour, minute] = formData.time.split(':').map(Number)
      const videoDate = new Date(year, month - 1, day, hour, minute)

      // Create Firestore document
      const mediaData = {
        projectId: formData.projectId,
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        date: Timestamp.fromDate(videoDate), // Convert Date to Firestore Timestamp
        url: downloadURL,
        thumbnailUrl: null,
        private: formData.isPrivate,
        instrumentGroup: formData.instrumentGroup || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        uploadedBy: user.email || user.uid,
      }

      // Add document
      await addDoc(collection(db, 'projectRehearsalMedia'), mediaData)

      setUploadProgress(100)

      // Reset form
      setFormData({
        file: null,
        projectId: 'black-diaspora-symphony',
        title: '',
        date: new Date().toISOString().split('T')[0],
        time: new Date().toTimeString().slice(0, 5),
        instrumentGroup: 'Full Orchestra',
        description: '',
        isPrivate: false,
      })

      // Reset file input
      const fileInput = document.getElementById('video-file') as HTMLInputElement
      if (fileInput) fileInput.value = ''

      alert('Video uploaded successfully! It will appear on the /studio page.')
    } catch (error: any) {
      console.error('Error uploading video:', error)
      alert(`Failed to upload video: ${error.message}`)
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  const formatDate = (date?: any): string => {
    if (!date) return 'Date TBD'
    const d = date?.toDate?.() || date
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(d)
  }

  if (!user || (role !== 'beam_admin' && role !== 'partner_admin')) {
    return (
      <div className="max-w-4xl mx-auto py-8">
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 text-center">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
          <p className="text-white/70">You need admin privileges to access this page.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
          <Video className="h-10 w-10 text-orchestra-gold" />
          Studio Video Manager
        </h1>
        <p className="text-white/70">
          Upload videos to Firebase Storage and automatically create entries for the /studio page.
        </p>
      </div>

      {/* Upload Form */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-8">
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
          <Upload className="h-6 w-6 text-orchestra-gold" />
          Upload New Video
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* File Upload */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-white/70 mb-2">
              Video File *
            </label>
            <input
              id="video-file"
              type="file"
              accept="video/*"
              onChange={handleFileSelect}
              className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-orchestra-gold file:text-black file:cursor-pointer file:font-medium"
              disabled={uploading}
            />
            {formData.file && (
              <p className="text-sm text-white/60 mt-2">
                Selected: {formData.file.name} ({(formData.file.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">
              Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Video title (auto-filled from filename)"
              className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-orchestra-gold"
              disabled={uploading}
            />
          </div>

          {/* Project */}
          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">
              Project *
            </label>
            <select
              value={formData.projectId}
              onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
              className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-orchestra-gold"
              disabled={uploading}
            >
              {PROJECT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value} className="bg-black">
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">
              Date *
            </label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-orchestra-gold"
              disabled={uploading}
            />
          </div>

          {/* Time */}
          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">
              Time *
            </label>
            <input
              type="time"
              value={formData.time}
              onChange={(e) => setFormData({ ...formData, time: e.target.value })}
              className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-orchestra-gold"
              disabled={uploading}
            />
          </div>

          {/* Instrument Group */}
          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">
              Instrument Group
            </label>
            <select
              value={formData.instrumentGroup}
              onChange={(e) => setFormData({ ...formData, instrumentGroup: e.target.value })}
              className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-orchestra-gold"
              disabled={uploading}
            >
              {INSTRUMENT_GROUP_OPTIONS.map((group) => (
                <option key={group} value={group} className="bg-black">
                  {group}
                </option>
              ))}
            </select>
          </div>

          {/* Private Toggle */}
          <div className="md:col-span-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isPrivate}
                onChange={(e) => setFormData({ ...formData, isPrivate: e.target.checked })}
                className="w-5 h-5 rounded bg-white/10 border-white/20 text-orchestra-gold focus:ring-2 focus:ring-orchestra-gold"
                disabled={uploading}
              />
              <span className="text-white/70">
                Private (subscription-only content)
              </span>
            </label>
          </div>

          {/* Description */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-white/70 mb-2">
              Description (optional)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Additional description or notes..."
              rows={3}
              className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-orchestra-gold"
              disabled={uploading}
            />
          </div>
        </div>

        {/* Upload Progress */}
        {uploading && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-white/70">Uploading...</span>
              <span className="text-sm text-white/70">{uploadProgress}%</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2">
              <div
                className="bg-orchestra-gold h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Upload Button */}
        <button
          onClick={handleUpload}
          disabled={uploading || !formData.file || !formData.title.trim()}
          className="mt-6 w-full md:w-auto px-8 py-3 bg-orchestra-gold hover:bg-orchestra-gold/90 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold rounded-lg transition-all duration-300 flex items-center justify-center gap-2"
        >
          {uploading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="h-5 w-5" />
              Upload Video
            </>
          )}
        </button>
      </div>

      {/* Existing Videos List */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
          <Video className="h-6 w-6 text-orchestra-gold" />
          Existing Videos ({videos.length})
        </h2>

        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orchestra-gold" />
          </div>
        ) : videos.length === 0 ? (
          <div className="text-center py-8 text-white/60">
            No videos uploaded yet. Upload your first video above!
          </div>
        ) : (
          <div className="space-y-4">
            {videos.map((video) => (
              <div
                key={video.id}
                className="bg-white/5 border border-white/10 rounded-lg p-4 hover:border-orchestra-gold/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-white mb-1">{video.title}</h3>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-white/60">
                      <span className="flex items-center gap-1">
                        <Music className="h-4 w-4" />
                        {PROJECT_OPTIONS.find((p) => p.value === video.projectId)?.label || video.projectId}
                      </span>
                      {video.instrumentGroup && (
                        <span className="px-2 py-1 bg-white/10 rounded-full">
                          {video.instrumentGroup}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {formatDate(video.date)}
                      </span>
                    </div>
                    {video.url && (
                      <a
                        href={video.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-orchestra-gold hover:text-orchestra-gold/80 text-sm mt-2 inline-block"
                      >
                        View Video →
                      </a>
                    )}
                  </div>
                  {!video.private && (
                    <div title="Public">
                      <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

