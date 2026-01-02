'use client'

import { useState, useEffect } from 'react'
import { useUserRole } from '@/lib/hooks/useUserRole'
import { db, storage } from '@/lib/firebase'
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { Music, Upload, AlertCircle, Plus, X } from 'lucide-react'
import Link from 'next/link'

interface ChamberProject {
  id: string
  title: string
  slug: string
  description: string
  createdAt?: any
  tags?: string[]
  videos?: any[]
  interviews?: any[]
  overlays?: any[]
}

export default function AdminChamberProjectsPage() {
  const { user, role } = useUserRole()
  const [projects, setProjects] = useState<ChamberProject[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    description: '',
    tags: [] as string[],
    tagInput: '',
  })

  useEffect(() => {
    if (!db) return

    const q = query(collection(db, 'chamberProjects'), orderBy('createdAt', 'desc'))

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items: ChamberProject[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as ChamberProject[]
        setProjects(items)
        setLoading(false)
      },
      (error) => {
        console.error('Error loading projects:', error)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [])

  const generateSlug = (title: string): string => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
  }

  const handleTitleChange = (title: string) => {
    setFormData({
      ...formData,
      title,
      slug: formData.slug || generateSlug(title),
    })
  }

  const handleAddTag = () => {
    if (formData.tagInput.trim() && !formData.tags.includes(formData.tagInput.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, formData.tagInput.trim()],
        tagInput: '',
      })
    }
  }

  const handleRemoveTag = (tag: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter((t) => t !== tag),
    })
  }

  const handleSubmit = async () => {
    if (!user || !db) {
      alert('Please sign in')
      return
    }

    if (!formData.title.trim() || !formData.slug.trim()) {
      alert('Please enter a title and slug')
      return
    }

    setUploading(true)

    try {
      const projectData = {
        title: formData.title.trim(),
        slug: formData.slug.trim(),
        description: formData.description.trim() || '',
        tags: formData.tags,
        videos: [],
        interviews: [],
        overlays: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: user.email || user.uid,
      }

      await addDoc(collection(db, 'chamberProjects'), projectData)

      // Reset form
      setFormData({
        title: '',
        slug: '',
        description: '',
        tags: [],
        tagInput: '',
      })
      setShowForm(false)

      alert('Chamber project created successfully!')
    } catch (error: any) {
      console.error('Error creating project:', error)
      alert(`Failed to create project: ${error.message}`)
    } finally {
      setUploading(false)
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
          <Music className="h-10 w-10 text-orchestra-gold" />
          Chamber Projects Manager
        </h1>
        <p className="text-white/70">
          Create and manage chamber music projects for the /studio page.
        </p>
      </div>

      {/* Create New Project */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Plus className="h-6 w-6 text-orchestra-gold" />
            Create New Project
          </h2>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-orchestra-gold hover:bg-orchestra-gold/90 text-black font-bold rounded-lg transition-all"
          >
            {showForm ? 'Cancel' : 'New Project'}
          </button>
        </div>

        {showForm && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Project title"
                className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-orchestra-gold"
                disabled={uploading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                Slug * (URL-friendly identifier)
              </label>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder="project-slug"
                className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-orchestra-gold"
                disabled={uploading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Project description..."
                rows={4}
                className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-orchestra-gold"
                disabled={uploading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                Tags
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={formData.tagInput}
                  onChange={(e) => setFormData({ ...formData, tagInput: e.target.value })}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                  placeholder="Add tag..."
                  className="flex-1 px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-orchestra-gold"
                  disabled={uploading}
                />
                <button
                  onClick={handleAddTag}
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
                        onClick={() => handleRemoveTag(tag)}
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

            <button
              onClick={handleSubmit}
              disabled={uploading || !formData.title.trim() || !formData.slug.trim()}
              className="w-full px-8 py-3 bg-orchestra-gold hover:bg-orchestra-gold/90 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold rounded-lg transition-all"
            >
              {uploading ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        )}
      </div>

      {/* Existing Projects */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <h2 className="text-2xl font-bold text-white mb-6">Existing Projects ({projects.length})</h2>

        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orchestra-gold" />
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-8 text-white/60">
            No projects created yet. Create your first project above!
          </div>
        ) : (
          <div className="space-y-4">
            {projects.map((project) => (
              <div
                key={project.id}
                className="bg-white/5 border border-white/10 rounded-lg p-4 hover:border-orchestra-gold/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-white mb-1">{project.title}</h3>
                    <p className="text-white/70 text-sm mb-2">{project.description}</p>
                    <div className="flex items-center gap-4 text-sm text-white/60">
                      <span>Slug: {project.slug}</span>
                      {project.videos && (
                        <span>{project.videos.length} video{project.videos.length !== 1 ? 's' : ''}</span>
                      )}
                      {project.interviews && (
                        <span>{project.interviews.length} interview{project.interviews.length !== 1 ? 's' : ''}</span>
                      )}
                    </div>
                    {project.tags && project.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {project.tags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 bg-white/10 text-white/60 text-xs rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    <Link
                      href={`/studio/chamber/${project.slug}`}
                      className="text-orchestra-gold hover:text-orchestra-gold/80 text-sm mt-2 inline-block"
                    >
                      View Project →
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

