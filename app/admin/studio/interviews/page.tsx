'use client'

import { useState, useEffect } from 'react'
import { useUserRole } from '@/lib/hooks/useUserRole'
import { db, storage } from '@/lib/firebase'
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, Timestamp } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { Users, Upload, AlertCircle, Plus, X } from 'lucide-react'
import Link from 'next/link'

interface Interview {
  id: string
  subject: string
  url: string
  transcript?: string
  tags?: string[]
  instrument?: string
  role?: string
  identityTags?: string[]
  createdAt?: any
  thumbnailUrl?: string
}

const INSTRUMENT_OPTIONS = [
  'Violin',
  'Viola',
  'Cello',
  'Bass',
  'Flute',
  'Oboe',
  'Clarinet',
  'Bassoon',
  'Trumpet',
  'Horn',
  'Trombone',
  'Tuba',
  'Percussion',
  'Piano',
  'Harp',
  'Other',
]

const ROLE_OPTIONS = [
  'Musician',
  'Composer',
  'Conductor',
  'Director',
  'Educator',
  'Administrator',
  'Other',
]

export default function AdminInterviewsPage() {
  const { user, role } = useUserRole()
  const [interviews, setInterviews] = useState<Interview[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [showForm, setShowForm] = useState(false)
  
  const [formData, setFormData] = useState({
    file: null as File | null,
    subject: '',
    url: '',
    useFile: true,
    instrument: '',
    role: '',
    transcript: '',
    tags: [] as string[],
    identityTags: [] as string[],
    tagInput: '',
    identityTagInput: '',
  })

  useEffect(() => {
    if (!db) return

    const q = query(collection(db, 'interviews'), orderBy('createdAt', 'desc'))

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items: Interview[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Interview[]
        setInterviews(items)
        setLoading(false)
      },
      (error) => {
        console.error('Error loading interviews:', error)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setFormData({ ...formData, file })
    }
  }

  const handleAddTag = (type: 'tag' | 'identity') => {
    const input = type === 'tag' ? formData.tagInput : formData.identityTagInput
    const tags = type === 'tag' ? formData.tags : formData.identityTags
    
    if (input.trim() && !tags.includes(input.trim())) {
      if (type === 'tag') {
        setFormData({
          ...formData,
          tags: [...formData.tags, input.trim()],
          tagInput: '',
        })
      } else {
        setFormData({
          ...formData,
          identityTags: [...formData.identityTags, input.trim()],
          identityTagInput: '',
        })
      }
    }
  }

  const handleRemoveTag = (tag: string, type: 'tag' | 'identity') => {
    if (type === 'tag') {
      setFormData({
        ...formData,
        tags: formData.tags.filter((t) => t !== tag),
      })
    } else {
      setFormData({
        ...formData,
        identityTags: formData.identityTags.filter((t) => t !== tag),
      })
    }
  }

  const handleSubmit = async () => {
    if (!user || !db) {
      alert('Please sign in')
      return
    }

    if (!formData.subject.trim()) {
      alert('Please enter a subject name')
      return
    }

    if (formData.useFile && !formData.file) {
      alert('Please select a video file or enter a URL')
      return
    }

    if (!formData.useFile && !formData.url.trim()) {
      alert('Please enter a video URL')
      return
    }

    setUploading(true)
    setUploadProgress(0)

    try {
      let downloadURL = formData.url
      let thumbnailUrl: string | null = null

      if (formData.useFile && formData.file && storage) {
        // Upload to Firebase Storage
        const timestamp = Date.now()
        const fileExtension = formData.file.name.split('.').pop()
        const sanitizedSubject = formData.subject.replace(/[^a-zA-Z0-9]/g, '_')
        const fileName = `interviews/${sanitizedSubject}_${timestamp}.${fileExtension}`
        const storageRef = ref(storage, fileName)

        const progressInterval = setInterval(() => {
          setUploadProgress((prev) => Math.min(prev + 10, 90))
        }, 200)

        await uploadBytes(storageRef, formData.file)
        clearInterval(progressInterval)
        setUploadProgress(90)

        downloadURL = await getDownloadURL(storageRef)
        setUploadProgress(95)
      }

      const interviewData = {
        subject: formData.subject.trim(),
        url: downloadURL,
        transcript: formData.transcript.trim() || null,
        tags: formData.tags.length > 0 ? formData.tags : null,
        identityTags: formData.identityTags.length > 0 ? formData.identityTags : null,
        instrument: formData.instrument || null,
        role: formData.role || null,
        thumbnailUrl,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: user.email || user.uid,
      }

      await addDoc(collection(db, 'interviews'), interviewData)

      setUploadProgress(100)

      // Reset form
      setFormData({
        file: null,
        subject: '',
        url: '',
        useFile: true,
        instrument: '',
        role: '',
        transcript: '',
        tags: [],
        identityTags: [],
        tagInput: '',
        identityTagInput: '',
      })
      setShowForm(false)

      const fileInput = document.getElementById('interview-file') as HTMLInputElement
      if (fileInput) fileInput.value = ''

      alert('Interview created successfully!')
    } catch (error: any) {
      console.error('Error creating interview:', error)
      alert(`Failed to create interview: ${error.message}`)
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
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
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="mb-8">
        <Link href="/admin/studio" className="text-orchestra-gold hover:text-orchestra-gold/80 mb-4 inline-block">
          ← Back to Studio Manager
        </Link>
        <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
          <Users className="h-10 w-10 text-orchestra-gold" />
          Interviews Manager
        </h1>
        <p className="text-white/70">
          Create and manage interviews for the /studio/interviews page.
        </p>
      </div>

      {/* Create New Interview */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Plus className="h-6 w-6 text-orchestra-gold" />
            Create New Interview
          </h2>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-orchestra-gold hover:bg-orchestra-gold/90 text-black font-bold rounded-lg transition-all"
          >
            {showForm ? 'Cancel' : 'New Interview'}
          </button>
        </div>

        {showForm && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                Subject Name *
              </label>
              <input
                type="text"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="Name of the person being interviewed"
                className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-orchestra-gold"
                disabled={uploading}
              />
            </div>

            <div>
              <label className="flex items-center gap-3 mb-2">
                <input
                  type="radio"
                  checked={formData.useFile}
                  onChange={() => setFormData({ ...formData, useFile: true })}
                  className="text-orchestra-gold"
                  disabled={uploading}
                />
                <span className="text-white/70">Upload File</span>
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="radio"
                  checked={!formData.useFile}
                  onChange={() => setFormData({ ...formData, useFile: false })}
                  className="text-orchestra-gold"
                  disabled={uploading}
                />
                <span className="text-white/70">Use URL</span>
              </label>
            </div>

            {formData.useFile ? (
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  Video File *
                </label>
                <input
                  id="interview-file"
                  type="file"
                  accept="video/*"
                  onChange={handleFileSelect}
                  className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-orchestra-gold file:text-black file:cursor-pointer"
                  disabled={uploading}
                />
                {formData.file && (
                  <p className="text-sm text-white/60 mt-2">
                    Selected: {formData.file.name} ({(formData.file.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  Video URL *
                </label>
                <input
                  type="url"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  placeholder="https://example.com/video.mp4"
                  className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-orchestra-gold"
                  disabled={uploading}
                />
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  Instrument
                </label>
                <select
                  value={formData.instrument}
                  onChange={(e) => setFormData({ ...formData, instrument: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-orchestra-gold"
                  disabled={uploading}
                >
                  <option value="" className="bg-black">Select instrument...</option>
                  {INSTRUMENT_OPTIONS.map((inst) => (
                    <option key={inst} value={inst} className="bg-black">
                      {inst}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  Role
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-orchestra-gold"
                  disabled={uploading}
                >
                  <option value="" className="bg-black">Select role...</option>
                  {ROLE_OPTIONS.map((role) => (
                    <option key={role} value={role} className="bg-black">
                      {role}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                Transcript
              </label>
              <textarea
                value={formData.transcript}
                onChange={(e) => setFormData({ ...formData, transcript: e.target.value })}
                placeholder="Interview transcript..."
                rows={6}
                className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-orchestra-gold"
                disabled={uploading}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  Tags
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={formData.tagInput}
                    onChange={(e) => setFormData({ ...formData, tagInput: e.target.value })}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag('tag'))}
                    placeholder="Add tag..."
                    className="flex-1 px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-orchestra-gold"
                    disabled={uploading}
                  />
                  <button
                    onClick={() => handleAddTag('tag')}
                    className="px-4 py-2 bg-orchestra-gold hover:bg-orchestra-gold/90 text-black font-bold rounded-lg"
                    disabled={uploading}
                  >
                    Add
                  </button>
                </div>
                {formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-3 py-1 bg-white/10 text-white rounded-full flex items-center gap-2"
                      >
                        {tag}
                        <button
                          onClick={() => handleRemoveTag(tag, 'tag')}
                          className="hover:text-red-400"
                          disabled={uploading}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  Identity Tags
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={formData.identityTagInput}
                    onChange={(e) => setFormData({ ...formData, identityTagInput: e.target.value })}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag('identity'))}
                    placeholder="Add identity tag..."
                    className="flex-1 px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-orchestra-gold"
                    disabled={uploading}
                  />
                  <button
                    onClick={() => handleAddTag('identity')}
                    className="px-4 py-2 bg-orchestra-gold hover:bg-orchestra-gold/90 text-black font-bold rounded-lg"
                    disabled={uploading}
                  >
                    Add
                  </button>
                </div>
                {formData.identityTags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.identityTags.map((tag) => (
                      <span
                        key={tag}
                        className="px-3 py-1 bg-[#D4AF37]/20 text-[#D4AF37] rounded-full flex items-center gap-2 border border-[#D4AF37]/30"
                      >
                        {tag}
                        <button
                          onClick={() => handleRemoveTag(tag, 'identity')}
                          className="hover:text-red-400"
                          disabled={uploading}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {uploading && (
              <div>
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

            <button
              onClick={handleSubmit}
              disabled={uploading || !formData.subject.trim() || (formData.useFile && !formData.file) || (!formData.useFile && !formData.url.trim())}
              className="w-full px-8 py-3 bg-orchestra-gold hover:bg-orchestra-gold/90 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold rounded-lg transition-all"
            >
              {uploading ? 'Creating...' : 'Create Interview'}
            </button>
          </div>
        )}
      </div>

      {/* Existing Interviews */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <h2 className="text-2xl font-bold text-white mb-6">Existing Interviews ({interviews.length})</h2>

        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orchestra-gold" />
          </div>
        ) : interviews.length === 0 ? (
          <div className="text-center py-8 text-white/60">
            No interviews created yet. Create your first interview above!
          </div>
        ) : (
          <div className="space-y-4">
            {interviews.map((interview) => (
              <div
                key={interview.id}
                className="bg-white/5 border border-white/10 rounded-lg p-4 hover:border-orchestra-gold/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-white mb-1">{interview.subject}</h3>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-white/60 mb-2">
                      {interview.instrument && <span>{interview.instrument}</span>}
                      {interview.role && <span>{interview.role}</span>}
                    </div>
                    {(interview.tags || interview.identityTags) && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {interview.tags?.map((tag, idx) => (
                          <span
                            key={`tag-${idx}`}
                            className="px-2 py-1 bg-white/10 text-white/60 text-xs rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                        {interview.identityTags?.map((tag, idx) => (
                          <span
                            key={`identity-${idx}`}
                            className="px-2 py-1 bg-[#D4AF37]/20 text-[#D4AF37] text-xs rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    <Link
                      href={`/studio/interviews/${interview.id}`}
                      className="text-orchestra-gold hover:text-orchestra-gold/80 text-sm inline-block"
                    >
                      View Interview →
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

