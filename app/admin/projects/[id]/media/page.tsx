'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { 
  ArrowLeft,
  Upload,
  Video,
  Image as ImageIcon,
  FileText,
  X,
  Edit,
  Trash2,
  Play,
  Lock,
  Globe,
  Users,
  CreditCard,
  Save,
  Loader
} from 'lucide-react'
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  orderBy 
} from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from '@/lib/firebase'
import { useRequireRole, useUserRole } from '@/lib/hooks/useUserRole'
import { useProjectAccess } from '@/lib/hooks/useProjectAccess'
import { getSignedMediaURL } from '@/lib/mediaUtils'

interface MediaItem {
  id: string
  projectId: string
  title: string
  type: 'rehearsal' | 'performance' | 'document' | 'promotional' | 'interview'
  rehearsalId?: string
  storagePath: string
  downloadURL?: string
  access: 'musician' | 'subscriber' | 'public'
  uploadedBy: string
  uploadedAt: any
  duration?: number
  thumbnailURL?: string
  description?: string
}

export default function AdminMediaPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string || 'black-diaspora-symphony'
  
  const { user, role, loading: roleLoading } = useUserRole()
  const projectAccess = useProjectAccess(projectId)
  const hasAccess = role === 'beam_admin' || role === 'partner_admin' || projectAccess.hasAccess
  
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [editingItem, setEditingItem] = useState<MediaItem | null>(null)
  const [uploading, setUploading] = useState(false)
  
  const [formData, setFormData] = useState({
    title: '',
    type: 'rehearsal' as MediaItem['type'],
    rehearsalId: '',
    access: 'musician' as MediaItem['access'],
    description: '',
    file: null as File | null,
  })

  useEffect(() => {
    if (roleLoading || !hasAccess) return
    
    loadMedia()
  }, [projectId, hasAccess, roleLoading])

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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setFormData({ ...formData, file })
    }
  }

  const handleUpload = async () => {
    if (!formData.file || !user || !storage || !db) {
      alert('Please select a file and ensure you are signed in')
      return
    }

    if (!formData.title.trim()) {
      alert('Please enter a title')
      return
    }

    setUploading(true)

    try {
      // Upload to Firebase Storage
      const timestamp = Date.now()
      const fileName = `${formData.title.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}.${formData.file.name.split('.').pop()}`
      const storagePath = `Black Diaspora Symphony/Music/rehearsal footage/${fileName}`
      const storageRef = ref(storage, storagePath)
      
      await uploadBytes(storageRef, formData.file)
      const downloadURL = await getDownloadURL(storageRef)

      // Create Firestore document
      const mediaData = {
        projectId,
        title: formData.title,
        type: formData.type,
        rehearsalId: formData.rehearsalId || null,
        storagePath,
        downloadURL,
        access: formData.access,
        uploadedBy: user.email || user.uid,
        uploadedAt: serverTimestamp(),
        description: formData.description || null,
      }

      await addDoc(collection(db, 'projectMedia'), mediaData)

      // Reset form
      setFormData({
        title: '',
        type: 'rehearsal',
        rehearsalId: '',
        access: 'musician',
        description: '',
        file: null,
      })
      setShowUploadModal(false)
      
      // Reload media list
      await loadMedia()
      
      alert('Media uploaded successfully!')
    } catch (error) {
      console.error('Error uploading media:', error)
      alert('Failed to upload media. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this media item?')) return
    
    try {
      await deleteDoc(doc(db, 'projectMedia', itemId))
      await loadMedia()
      alert('Media deleted successfully')
    } catch (error) {
      console.error('Error deleting media:', error)
      alert('Failed to delete media')
    }
  }

  const handleEdit = async () => {
    if (!editingItem || !db) return
    
    try {
      await updateDoc(doc(db, 'projectMedia', editingItem.id), {
        title: editingItem.title,
        type: editingItem.type,
        rehearsalId: editingItem.rehearsalId || null,
        access: editingItem.access,
        description: editingItem.description || null,
      })
      setEditingItem(null)
      await loadMedia()
      alert('Media updated successfully')
    } catch (error) {
      console.error('Error updating media:', error)
      alert('Failed to update media')
    }
  }

  if (roleLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="w-8 h-8 animate-spin text-orchestra-gold" />
      </div>
    )
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-6">
        <div className="text-white text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p>You don't have permission to access this page.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <Link 
            href={`/admin/projects/${projectId}`}
            className="inline-flex items-center gap-2 text-gray-300 hover:text-white mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Project
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">Media Library</h1>
              <p className="text-gray-300">
                Manage rehearsal videos and media for {projectId === 'black-diaspora-symphony' ? 'Black Diaspora Symphony Orchestra' : projectId}
              </p>
            </div>
            <button
              onClick={() => setShowUploadModal(true)}
              className="px-6 py-3 bg-orchestra-gold hover:bg-orchestra-gold/80 text-orchestra-dark font-semibold rounded-lg flex items-center gap-2 transition-colors"
            >
              <Upload className="w-5 h-5" />
              Upload Media
            </button>
          </div>
        </div>

        {/* Media Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mediaItems.map((item) => (
            <div
              key={item.id}
              className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6 hover:bg-white/15 transition-colors"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                  {item.type === 'rehearsal' || item.type === 'performance' || item.type === 'interview' ? (
                    <Video className="w-5 h-5 text-purple-400" />
                  ) : item.type === 'document' ? (
                    <FileText className="w-5 h-5 text-blue-400" />
                  ) : (
                    <ImageIcon className="w-5 h-5 text-green-400" />
                  )}
                  <div className="flex items-center gap-1">
                    {item.access === 'public' && <Globe className="w-4 h-4 text-green-400" />}
                    {item.access === 'subscriber' && <CreditCard className="w-4 h-4 text-yellow-400" />}
                    {item.access === 'musician' && <Users className="w-4 h-4 text-purple-400" />}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingItem(item)}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <Edit className="w-4 h-4 text-gray-300" />
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              </div>
              
              <h3 className="text-white font-semibold mb-2">{item.title}</h3>
              {item.description && (
                <p className="text-gray-300 text-sm mb-3 line-clamp-2">{item.description}</p>
              )}
              
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>{item.type}</span>
                {item.rehearsalId && (
                  <span>{new Date(item.rehearsalId).toLocaleDateString()}</span>
                )}
              </div>
              
              {item.downloadURL && (
                <a
                  href={item.downloadURL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-2 text-orchestra-gold hover:text-orchestra-gold/80 text-sm"
                >
                  <Play className="w-4 h-4" />
                  View/Download
                </a>
              )}
            </div>
          ))}
        </div>

        {mediaItems.length === 0 && !loading && (
          <div className="text-center py-12 text-gray-300">
            <Video className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>No media items yet. Upload your first video!</p>
          </div>
        )}

        {/* Upload Modal */}
        <AnimatePresence>
          {showUploadModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
              onClick={() => !uploading && setShowUploadModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-gradient-to-br from-purple-900 to-blue-900 rounded-xl border border-white/20 p-6 max-w-2xl w-full"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-white">Upload Media</h2>
                  <button
                    onClick={() => setShowUploadModal(false)}
                    disabled={uploading}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-300" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-200 mb-2">
                      Title *
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g., Bonds – 5:08 PM – 11/10/25"
                      className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      disabled={uploading}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-200 mb-2">
                        Type
                      </label>
                      <select
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value as MediaItem['type'] })}
                        className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        disabled={uploading}
                      >
                        <option value="rehearsal">Rehearsal</option>
                        <option value="performance">Performance</option>
                        <option value="interview">Interview</option>
                        <option value="promotional">Promotional</option>
                        <option value="document">Document</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-200 mb-2">
                        Access Level
                      </label>
                      <select
                        value={formData.access}
                        onChange={(e) => setFormData({ ...formData, access: e.target.value as MediaItem['access'] })}
                        className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        disabled={uploading}
                      >
                        <option value="musician">Musician Only</option>
                        <option value="subscriber">Subscriber ($5/month)</option>
                        <option value="public">Public</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-200 mb-2">
                      Rehearsal Date (YYYY-MM-DD)
                    </label>
                    <input
                      type="text"
                      value={formData.rehearsalId}
                      onChange={(e) => setFormData({ ...formData, rehearsalId: e.target.value })}
                      placeholder="2025-11-10"
                      className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      disabled={uploading}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-200 mb-2">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Optional description..."
                      rows={3}
                      className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      disabled={uploading}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-200 mb-2">
                      File *
                    </label>
                    <input
                      type="file"
                      accept="video/*,image/*,.pdf"
                      onChange={handleFileSelect}
                      className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-orchestra-gold file:text-orchestra-dark file:cursor-pointer"
                      disabled={uploading}
                    />
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button
                      onClick={handleUpload}
                      disabled={uploading || !formData.file || !formData.title.trim()}
                      className="flex-1 px-6 py-3 bg-orchestra-gold hover:bg-orchestra-gold/80 disabled:opacity-50 disabled:cursor-not-allowed text-orchestra-dark font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      {uploading ? (
                        <>
                          <Loader className="w-5 h-5 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="w-5 h-5" />
                          Upload
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => setShowUploadModal(false)}
                      disabled={uploading}
                      className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Edit Modal */}
        <AnimatePresence>
          {editingItem && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
              onClick={() => setEditingItem(null)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-gradient-to-br from-purple-900 to-blue-900 rounded-xl border border-white/20 p-6 max-w-2xl w-full"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-white">Edit Media</h2>
                  <button
                    onClick={() => setEditingItem(null)}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-300" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-200 mb-2">
                      Title
                    </label>
                    <input
                      type="text"
                      value={editingItem.title}
                      onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-200 mb-2">
                        Type
                      </label>
                      <select
                        value={editingItem.type}
                        onChange={(e) => setEditingItem({ ...editingItem, type: e.target.value as MediaItem['type'] })}
                        className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="rehearsal">Rehearsal</option>
                        <option value="performance">Performance</option>
                        <option value="interview">Interview</option>
                        <option value="promotional">Promotional</option>
                        <option value="document">Document</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-200 mb-2">
                        Access Level
                      </label>
                      <select
                        value={editingItem.access}
                        onChange={(e) => setEditingItem({ ...editingItem, access: e.target.value as MediaItem['access'] })}
                        className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="musician">Musician Only</option>
                        <option value="subscriber">Subscriber ($5/month)</option>
                        <option value="public">Public</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-200 mb-2">
                      Rehearsal Date (YYYY-MM-DD)
                    </label>
                    <input
                      type="text"
                      value={editingItem.rehearsalId || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, rehearsalId: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-200 mb-2">
                      Description
                    </label>
                    <textarea
                      value={editingItem.description || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button
                      onClick={handleEdit}
                      className="flex-1 px-6 py-3 bg-orchestra-gold hover:bg-orchestra-gold/80 text-orchestra-dark font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <Save className="w-5 h-5" />
                      Save Changes
                    </button>
                    <button
                      onClick={() => setEditingItem(null)}
                      className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

