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
  Loader,
  UserPlus,
  Mail,
  Phone,
  User
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
  orderBy,
  setDoc
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
  storagePath?: string // Optional if using external URL
  downloadURL: string // Required - can be Firebase Storage URL or external URL
  access: ('musician' | 'subscriber' | 'public')[] // Array of access levels
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
  const [showGrantAccessModal, setShowGrantAccessModal] = useState(false)
  const [editingItem, setEditingItem] = useState<MediaItem | null>(null)
  const [uploading, setUploading] = useState(false)
  const [grantingAccess, setGrantingAccess] = useState(false)
  const [grantAccessForm, setGrantAccessForm] = useState({
    identifier: '', // email, phone, or name
    identifierType: 'email' as 'email' | 'phone' | 'name',
    role: 'musician' as 'musician' | 'board' | 'public',
    projectId: projectId
  })
  
  const [formData, setFormData] = useState({
    title: '',
    type: 'rehearsal' as MediaItem['type'],
    rehearsalId: '',
    access: ['musician'] as MediaItem['access'],
    description: '',
    file: null as File | null,
    mediaUrl: '', // For external URLs
    uploadMethod: 'file' as 'file' | 'url', // Toggle between file upload and URL
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
    if (!user || !db) {
      alert('Please sign in')
      return
    }

    if (!formData.title.trim()) {
      alert('Please enter a title')
      return
    }

    if (formData.uploadMethod === 'file' && !formData.file) {
      alert('Please select a file or switch to URL mode')
      return
    }

    if (formData.uploadMethod === 'url' && !formData.mediaUrl.trim()) {
      alert('Please enter a media URL')
      return
    }

    if (formData.access.length === 0) {
      alert('Please select at least one access level')
      return
    }

    setUploading(true)

    try {
      let downloadURL = ''
      let storagePath: string | null = null

      if (formData.uploadMethod === 'file') {
        if (!formData.file) {
          throw new Error('Please select a file')
        }
        if (!storage) {
          throw new Error('Firebase Storage is not initialized')
        }
        // Upload to Firebase Storage
        const timestamp = Date.now()
        const fileName = `${formData.title.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}.${formData.file.name.split('.').pop()}`
        storagePath = `Black Diaspora Symphony/Music/rehearsal footage/${fileName}`
        const storageRef = ref(storage, storagePath)
        
        await uploadBytes(storageRef, formData.file)
        downloadURL = await getDownloadURL(storageRef)
      } else if (formData.uploadMethod === 'url') {
        // Use external URL
        const url = formData.mediaUrl.trim()
        if (!url) {
          throw new Error('Please enter a valid URL')
        }
        // Basic URL validation
        try {
          new URL(url)
        } catch {
          throw new Error('Please enter a valid URL (must start with http:// or https://)')
        }
        downloadURL = url
        storagePath = null
      } else {
        throw new Error('Please select an upload method')
      }

      // Create Firestore document
      const mediaData = {
        projectId,
        title: formData.title,
        type: formData.type,
        rehearsalId: formData.rehearsalId || null,
        storagePath: storagePath || null,
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
        access: ['musician'],
        description: '',
        file: null,
        mediaUrl: '',
        uploadMethod: 'file',
      })
      setShowUploadModal(false)
      
      // Reload media list
      await loadMedia()
      
      alert('Media added successfully!')
    } catch (error: any) {
      console.error('Error adding media:', error)
      const errorMessage = error?.message || 'Failed to add media. Please try again.'
      alert(errorMessage)
    } finally {
      setUploading(false)
    }
  }

  const handleBulkAddRehearsalFootage = async () => {
    if (!user || !db) {
      alert('Please sign in')
      return
    }

    if (!confirm('Add all 7 rehearsal footage videos from November 10, 2025?')) {
      return
    }

    setUploading(true)

    const rehearsalFootage = [
      {
        title: 'Bonds - 5:08 PM - 11/10/25',
        url: 'https://firebasestorage.googleapis.com/v0/b/beam-orchestra-platform.firebasestorage.app/o/Black%20Diaspora%20Symphony%2FMusic%2Frehearsal%20footage%2FBonds%20-%205%2008%20pm%20-%2011%2010%2025.mov?alt=media&token=68f26fd3-60ed-465a-841b-71073d683034',
        composer: 'Bonds',
        time: '5:08 PM'
      },
      {
        title: 'Bonds - 5:28 PM - 11/10/25',
        url: 'https://firebasestorage.googleapis.com/v0/b/beam-orchestra-platform.firebasestorage.app/o/Black%20Diaspora%20Symphony%2FMusic%2Frehearsal%20footage%2FBonds%20-%205%2028%20pm%20-%2011%2010%2025.mov?alt=media&token=cab69290-25d3-4c9b-9e06-f34ce1e67c9c',
        composer: 'Bonds',
        time: '5:28 PM'
      },
      {
        title: 'Bonds - 5:40 PM - 11/10/25',
        url: 'https://firebasestorage.googleapis.com/v0/b/beam-orchestra-platform.firebasestorage.app/o/Black%20Diaspora%20Symphony%2FMusic%2Frehearsal%20footage%2FBonds%20-%205%2040%20pm%20-%2011%2010%2025.mov?alt=media&token=35402118-7f27-4cfd-bb7b-39bf9b150414',
        composer: 'Bonds',
        time: '5:40 PM'
      },
      {
        title: 'Grieg - 5:08 PM - 11/10/25',
        url: 'https://firebasestorage.googleapis.com/v0/b/beam-orchestra-platform.firebasestorage.app/o/Black%20Diaspora%20Symphony%2FMusic%2Frehearsal%20footage%2FGrieg%20-%205%2008%20pm%20-%2011%2010%2025.mov?alt=media&token=7ae6ce2a-833f-4da4-849d-cc99c9aac768',
        composer: 'Grieg',
        time: '5:08 PM'
      },
      {
        title: 'Bonds - 6:05 PM - 11/10/25',
        url: 'https://firebasestorage.googleapis.com/v0/b/beam-orchestra-platform.firebasestorage.app/o/Black%20Diaspora%20Symphony%2FMusic%2Frehearsal%20footage%2FBonds%20-%206%2005%20pm%20-%2011%2010%2025.mov?alt=media&token=774347b4-5d30-4cf1-8007-cda0243e95a6',
        composer: 'Bonds',
        time: '6:05 PM'
      },
      {
        title: 'Grieg - 5:14 PM - 11/10/25',
        url: 'https://firebasestorage.googleapis.com/v0/b/beam-orchestra-platform.firebasestorage.app/o/Black%20Diaspora%20Symphony%2FMusic%2Frehearsal%20footage%2FGrieg%20-%205%2014%20pm%20-%2011%2010%2025.mov?alt=media&token=17486778-436a-4c68-b5fe-ecf3a1302401',
        composer: 'Grieg',
        time: '5:14 PM'
      },
      {
        title: 'Ravel - 6:49 PM - 11/10/25',
        url: 'https://firebasestorage.googleapis.com/v0/b/beam-orchestra-platform.firebasestorage.app/o/Black%20Diaspora%20Symphony%2FMusic%2Frehearsal%20footage%2FRavel%20-%206%2049%20pm%20-%2011%2010%2025.mov?alt=media&token=1a893711-d08c-45bd-8963-1036d162731c',
        composer: 'Ravel',
        time: '6:49 PM'
      }
    ]

    try {
      let addedCount = 0
      let skippedCount = 0

      for (const item of rehearsalFootage) {
        // Check if item already exists
        const existingQuery = query(
          collection(db, 'projectMedia'),
          where('projectId', '==', projectId),
          where('title', '==', item.title)
        )
        const existingSnapshot = await getDocs(existingQuery)

        if (!existingSnapshot.empty) {
          skippedCount++
          continue
        }

        const mediaData = {
          projectId,
          title: item.title,
          type: 'rehearsal' as MediaItem['type'],
          rehearsalId: '2025-11-10',
          storagePath: null,
          downloadURL: item.url,
          access: ['musician'] as MediaItem['access'],
          uploadedBy: user.email || user.uid,
          uploadedAt: serverTimestamp(),
          description: `Rehearsal footage - ${item.composer} at ${item.time} on November 10, 2025`
        }

        await addDoc(collection(db, 'projectMedia'), mediaData)
        addedCount++
      }

      await loadMedia()
      
      if (addedCount > 0) {
        alert(`Successfully added ${addedCount} video(s)${skippedCount > 0 ? ` (${skippedCount} already existed)` : ''}!`)
      } else {
        alert('All videos already exist in the media library.')
      }
    } catch (error: any) {
      console.error('Error adding rehearsal footage:', error)
      alert(`Failed to add media: ${error?.message || 'Unknown error'}`)
    } finally {
      setUploading(false)
    }
  }

  const handleGrantAccess = async () => {
    if (!user || !db) {
      alert('Please sign in')
      return
    }

    if (!grantAccessForm.identifier.trim()) {
      alert('Please enter an email, phone number, or name')
      return
    }

    setGrantingAccess(true)

    try {
      let userDocId: string | null = null
      let userData: any = null

      // Find user by identifier
      if (grantAccessForm.identifierType === 'email') {
        // Search users collection by email
        const usersQuery = query(
          collection(db, 'users'),
          where('email', '==', grantAccessForm.identifier.toLowerCase().trim())
        )
        const usersSnapshot = await getDocs(usersQuery)
        if (!usersSnapshot.empty) {
          userDocId = usersSnapshot.docs[0].id
          userData = usersSnapshot.docs[0].data()
        }
      } else if (grantAccessForm.identifierType === 'phone') {
        // Search projectMusicians by phone
        const cleanPhone = grantAccessForm.identifier.replace(/\D/g, '')
        const musiciansQuery = query(
          collection(db, 'projectMusicians'),
          where('projectId', '==', projectId),
          where('phone', '==', cleanPhone)
        )
        const musiciansSnapshot = await getDocs(musiciansQuery)
        if (!musiciansSnapshot.empty) {
          const musicianData = musiciansSnapshot.docs[0].data()
          // Try to find user by email from musician data
          if (musicianData.email) {
            const usersQuery = query(
              collection(db, 'users'),
              where('email', '==', musicianData.email.toLowerCase())
            )
            const usersSnapshot = await getDocs(usersQuery)
            if (!usersSnapshot.empty) {
              userDocId = usersSnapshot.docs[0].id
              userData = usersSnapshot.docs[0].data()
            }
          }
        }
      } else if (grantAccessForm.identifierType === 'name') {
        // Search projectMusicians by name
        const musiciansQuery = query(
          collection(db, 'projectMusicians'),
          where('projectId', '==', projectId),
          where('name', '==', grantAccessForm.identifier.trim())
        )
        const musiciansSnapshot = await getDocs(musiciansQuery)
        if (!musiciansSnapshot.empty) {
          const musicianData = musiciansSnapshot.docs[0].data()
          // Try to find user by email from musician data
          if (musicianData.email) {
            const usersQuery = query(
              collection(db, 'users'),
              where('email', '==', musicianData.email.toLowerCase())
            )
            const usersSnapshot = await getDocs(usersQuery)
            if (!usersSnapshot.empty) {
              userDocId = usersSnapshot.docs[0].id
              userData = usersSnapshot.docs[0].data()
            }
          }
        }
      }

      if (!userDocId) {
        // Create or update user document
        const identifierKey = grantAccessForm.identifierType === 'email' 
          ? 'email' 
          : grantAccessForm.identifierType === 'phone' 
          ? 'phone' 
          : 'name'
        
        // Create a user document with the role
        const newUserData = {
          [identifierKey]: grantAccessForm.identifier.trim(),
          role: grantAccessForm.role,
          projectId: projectId,
          grantedAccessAt: serverTimestamp(),
          grantedAccessBy: user.email || user.uid,
          updatedAt: serverTimestamp()
        }

        // Use email as document ID if available, otherwise generate
        const docId = grantAccessForm.identifierType === 'email' 
          ? grantAccessForm.identifier.toLowerCase().trim().replace(/[^a-zA-Z0-9]/g, '_')
          : `user_${Date.now()}`

        await setDoc(doc(db, 'users', docId), newUserData, { merge: true })
        userDocId = docId
        userData = newUserData
      } else {
        // Update existing user with role
        await updateDoc(doc(db, 'users', userDocId), {
          role: grantAccessForm.role,
          projectId: projectId,
          grantedAccessAt: serverTimestamp(),
          grantedAccessBy: user.email || user.uid,
          updatedAt: serverTimestamp()
        })
      }

      // Also ensure they're in projectMusicians if they're a musician
      if (grantAccessForm.role === 'musician' || grantAccessForm.role === 'board') {
        const musicianDocId = `${grantAccessForm.identifier.toLowerCase().replace(/[^a-zA-Z0-9]/g, '_')}_${projectId}`
        const musicianData: any = {
          projectId: projectId,
          role: grantAccessForm.role,
          updatedAt: serverTimestamp()
        }

        if (grantAccessForm.identifierType === 'email') {
          musicianData.email = grantAccessForm.identifier.toLowerCase().trim()
        } else if (grantAccessForm.identifierType === 'phone') {
          musicianData.phone = grantAccessForm.identifier.replace(/\D/g, '')
        } else {
          musicianData.name = grantAccessForm.identifier.trim()
        }

        await setDoc(doc(db, 'projectMusicians', musicianDocId), musicianData, { merge: true })
      }

      // Send notification
      try {
        const projectName = projectId === 'black-diaspora-symphony' 
          ? 'Black Diaspora Symphony Orchestra' 
          : projectId

        const notificationResponse = await fetch('/api/media/grant-access-notify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            identifier: grantAccessForm.identifier,
            identifierType: grantAccessForm.identifierType,
            role: grantAccessForm.role,
            projectId: projectId,
            projectName: projectName
          })
        })

        const notificationResult = await notificationResponse.json()
        
        if (notificationResult.success) {
          alert(`Successfully granted ${grantAccessForm.role} access to ${grantAccessForm.identifier}. Notification sent via ${notificationResult.method || 'email'}.`)
        } else {
          alert(`Successfully granted ${grantAccessForm.role} access to ${grantAccessForm.identifier}. Note: ${notificationResult.message || 'Could not send notification.'}`)
        }
      } catch (notifError) {
        console.error('Error sending notification:', notifError)
        alert(`Successfully granted ${grantAccessForm.role} access to ${grantAccessForm.identifier}. Note: Could not send notification email.`)
      }

      setGrantAccessForm({
        identifier: '',
        identifierType: 'email',
        role: 'musician',
        projectId: projectId
      })
      setShowGrantAccessModal(false)
    } catch (error: any) {
      console.error('Error granting access:', error)
      alert(`Failed to grant access: ${error?.message || 'Unknown error'}`)
    } finally {
      setGrantingAccess(false)
    }
  }

  const toggleAccessLevel = (level: 'musician' | 'subscriber' | 'public') => {
    setFormData(prev => {
      const currentAccess = prev.access
      if (currentAccess.includes(level)) {
        // Remove if already selected
        return { ...prev, access: currentAccess.filter(a => a !== level) }
      } else {
        // Add if not selected
        return { ...prev, access: [...currentAccess, level] }
      }
    })
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

  const toggleEditAccessLevel = (level: 'musician' | 'subscriber' | 'public') => {
    if (!editingItem) return
    
    const currentAccess = Array.isArray(editingItem.access) 
      ? editingItem.access 
      : [editingItem.access as 'musician' | 'subscriber' | 'public']
    
    if (currentAccess.includes(level)) {
      // Remove if already selected
      setEditingItem({ 
        ...editingItem, 
        access: currentAccess.filter(a => a !== level) as MediaItem['access']
      })
    } else {
      // Add if not selected
      setEditingItem({ 
        ...editingItem, 
        access: [...currentAccess, level] as MediaItem['access']
      })
    }
  }

  const handleEdit = async () => {
    if (!editingItem || !db) return
    
    // Ensure access is an array
    const accessArray = Array.isArray(editingItem.access) 
      ? editingItem.access 
      : [editingItem.access as 'musician' | 'subscriber' | 'public']
    
    if (accessArray.length === 0) {
      alert('Please select at least one access level')
      return
    }
    
    try {
      await updateDoc(doc(db, 'projectMedia', editingItem.id), {
        title: editingItem.title,
        type: editingItem.type,
        rehearsalId: editingItem.rehearsalId || null,
        access: accessArray,
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
            <div className="flex gap-3">
              {projectId === 'black-diaspora-symphony' && (
                <button
                  onClick={handleBulkAddRehearsalFootage}
                  disabled={uploading}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg flex items-center gap-2 transition-colors"
                >
                  {uploading ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Video className="w-5 h-5" />
                      Add Rehearsal Footage (11/10/25)
                    </>
                  )}
                </button>
              )}
              <button
                onClick={() => setShowGrantAccessModal(true)}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg flex items-center gap-2 transition-colors"
              >
                <UserPlus className="w-5 h-5" />
                Grant Access
              </button>
              <button
                onClick={() => setShowUploadModal(true)}
                className="px-6 py-3 bg-orchestra-gold hover:bg-orchestra-gold/80 text-orchestra-dark font-semibold rounded-lg flex items-center gap-2 transition-colors"
              >
                <Upload className="w-5 h-5" />
                Upload Media
              </button>
            </div>
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
                    {Array.isArray(item.access) ? (
                      <>
                        {item.access.includes('public') && (
                          <span title="Public">
                            <Globe className="w-4 h-4 text-green-400" aria-label="Public" />
                          </span>
                        )}
                        {item.access.includes('subscriber') && (
                          <span title="Subscriber">
                            <CreditCard className="w-4 h-4 text-yellow-400" aria-label="Subscriber" />
                          </span>
                        )}
                        {item.access.includes('musician') && (
                          <span title="Musician">
                            <Users className="w-4 h-4 text-purple-400" aria-label="Musician" />
                          </span>
                        )}
                      </>
                    ) : (
                      // Backward compatibility with old single access format
                      <>
                        {item.access === 'public' && <Globe className="w-4 h-4 text-green-400" aria-label="Public" />}
                        {item.access === 'subscriber' && <CreditCard className="w-4 h-4 text-yellow-400" aria-label="Subscriber" />}
                        {item.access === 'musician' && <Users className="w-4 h-4 text-purple-400" aria-label="Musician" />}
                      </>
                    )}
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
                        Access Levels (Select Multiple)
                      </label>
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.access.includes('musician')}
                            onChange={() => toggleAccessLevel('musician')}
                            className="w-4 h-4 rounded bg-white/10 border-white/20 text-purple-500 focus:ring-purple-500"
                            disabled={uploading}
                          />
                          <span className="text-white text-sm flex items-center gap-1">
                            <Users className="w-4 h-4 text-purple-400" />
                            Musician
                          </span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.access.includes('subscriber')}
                            onChange={() => toggleAccessLevel('subscriber')}
                            className="w-4 h-4 rounded bg-white/10 border-white/20 text-yellow-500 focus:ring-yellow-500"
                            disabled={uploading}
                          />
                          <span className="text-white text-sm flex items-center gap-1">
                            <CreditCard className="w-4 h-4 text-yellow-400" />
                            Subscriber ($5/month)
                          </span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.access.includes('public')}
                            onChange={() => toggleAccessLevel('public')}
                            className="w-4 h-4 rounded bg-white/10 border-white/20 text-green-500 focus:ring-green-500"
                            disabled={uploading}
                          />
                          <span className="text-white text-sm flex items-center gap-1">
                            <Globe className="w-4 h-4 text-green-400" />
                            Public
                          </span>
                        </label>
                      </div>
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

                  {/* Upload Method Toggle */}
                  <div>
                    <label className="block text-sm font-medium text-gray-200 mb-2">
                      Upload Method
                    </label>
                    <div className="flex gap-4 mb-4">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, uploadMethod: 'file', mediaUrl: '' })}
                        className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                          formData.uploadMethod === 'file'
                            ? 'bg-orchestra-gold text-orchestra-dark font-semibold'
                            : 'bg-white/10 text-white hover:bg-white/20'
                        }`}
                        disabled={uploading}
                      >
                        Upload File
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, uploadMethod: 'url', file: null })}
                        className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                          formData.uploadMethod === 'url'
                            ? 'bg-orchestra-gold text-orchestra-dark font-semibold'
                            : 'bg-white/10 text-white hover:bg-white/20'
                        }`}
                        disabled={uploading}
                      >
                        Use URL
                      </button>
                    </div>
                  </div>

                  {/* File Upload */}
                  {formData.uploadMethod === 'file' && (
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
                  )}

                  {/* URL Input */}
                  {formData.uploadMethod === 'url' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-200 mb-2">
                        Media URL *
                      </label>
                      <input
                        type="url"
                        value={formData.mediaUrl}
                        onChange={(e) => setFormData({ ...formData, mediaUrl: e.target.value })}
                        placeholder="https://example.com/video.mp4 or Firebase Storage URL"
                        className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        disabled={uploading}
                      />
                      <p className="text-xs text-gray-400 mt-1">
                        Paste a direct link to your video, image, or document
                      </p>
                    </div>
                  )}

                  <div className="flex gap-4 pt-4">
                    <button
                      onClick={handleUpload}
                      disabled={uploading || !formData.title.trim() || (formData.uploadMethod === 'file' && !formData.file) || (formData.uploadMethod === 'url' && !formData.mediaUrl.trim()) || formData.access.length === 0}
                      className="flex-1 px-6 py-3 bg-orchestra-gold hover:bg-orchestra-gold/80 disabled:opacity-50 disabled:cursor-not-allowed text-orchestra-dark font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      {uploading ? (
                        <>
                          <Loader className="w-5 h-5 animate-spin" />
                          {formData.uploadMethod === 'file' ? 'Uploading...' : 'Adding...'}
                        </>
                      ) : (
                        <>
                          <Upload className="w-5 h-5" />
                          {formData.uploadMethod === 'file' ? 'Upload' : 'Add Media'}
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
                        Access Levels (Select Multiple)
                      </label>
                      <div className="space-y-2">
                        {(() => {
                          const currentAccess = Array.isArray(editingItem.access) 
                            ? editingItem.access 
                            : [editingItem.access as 'musician' | 'subscriber' | 'public']
                          
                          return (
                            <>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={currentAccess.includes('musician')}
                                  onChange={() => toggleEditAccessLevel('musician')}
                                  className="w-4 h-4 rounded bg-white/10 border-white/20 text-purple-500 focus:ring-purple-500"
                                />
                                <span className="text-white text-sm flex items-center gap-1">
                                  <Users className="w-4 h-4 text-purple-400" />
                                  Musician
                                </span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={currentAccess.includes('subscriber')}
                                  onChange={() => toggleEditAccessLevel('subscriber')}
                                  className="w-4 h-4 rounded bg-white/10 border-white/20 text-yellow-500 focus:ring-yellow-500"
                                />
                                <span className="text-white text-sm flex items-center gap-1">
                                  <CreditCard className="w-4 h-4 text-yellow-400" />
                                  Subscriber ($5/month)
                                </span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={currentAccess.includes('public')}
                                  onChange={() => toggleEditAccessLevel('public')}
                                  className="w-4 h-4 rounded bg-white/10 border-white/20 text-green-500 focus:ring-green-500"
                                />
                                <span className="text-white text-sm flex items-center gap-1">
                                  <Globe className="w-4 h-4 text-green-400" />
                                  Public
                                </span>
                              </label>
                            </>
                          )
                        })()}
                      </div>
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

        {/* Grant Access Modal */}
        <AnimatePresence>
          {showGrantAccessModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
              onClick={() => !grantingAccess && setShowGrantAccessModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-gradient-to-br from-purple-900 to-blue-900 rounded-xl border border-white/20 p-6 max-w-2xl w-full"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-white">Grant Media Access</h2>
                  <button
                    onClick={() => setShowGrantAccessModal(false)}
                    disabled={grantingAccess}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-300" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-200 mb-2">
                      Search By
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setGrantAccessForm({ ...grantAccessForm, identifierType: 'email', identifier: '' })}
                        className={`flex-1 px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 ${
                          grantAccessForm.identifierType === 'email'
                            ? 'bg-orchestra-gold text-orchestra-dark font-semibold'
                            : 'bg-white/10 text-white hover:bg-white/20'
                        }`}
                        disabled={grantingAccess}
                      >
                        <Mail className="w-4 h-4" />
                        Email
                      </button>
                      <button
                        type="button"
                        onClick={() => setGrantAccessForm({ ...grantAccessForm, identifierType: 'phone', identifier: '' })}
                        className={`flex-1 px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 ${
                          grantAccessForm.identifierType === 'phone'
                            ? 'bg-orchestra-gold text-orchestra-dark font-semibold'
                            : 'bg-white/10 text-white hover:bg-white/20'
                        }`}
                        disabled={grantingAccess}
                      >
                        <Phone className="w-4 h-4" />
                        Phone
                      </button>
                      <button
                        type="button"
                        onClick={() => setGrantAccessForm({ ...grantAccessForm, identifierType: 'name', identifier: '' })}
                        className={`flex-1 px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 ${
                          grantAccessForm.identifierType === 'name'
                            ? 'bg-orchestra-gold text-orchestra-dark font-semibold'
                            : 'bg-white/10 text-white hover:bg-white/20'
                        }`}
                        disabled={grantingAccess}
                      >
                        <User className="w-4 h-4" />
                        Name
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-200 mb-2">
                      {grantAccessForm.identifierType === 'email' ? 'Email Address' : grantAccessForm.identifierType === 'phone' ? 'Phone Number' : 'Full Name'} *
                    </label>
                    <input
                      type={grantAccessForm.identifierType === 'email' ? 'email' : grantAccessForm.identifierType === 'phone' ? 'tel' : 'text'}
                      value={grantAccessForm.identifier}
                      onChange={(e) => setGrantAccessForm({ ...grantAccessForm, identifier: e.target.value })}
                      placeholder={grantAccessForm.identifierType === 'email' ? 'user@example.com' : grantAccessForm.identifierType === 'phone' ? '(414) 555-1234' : 'John Doe'}
                      className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      disabled={grantingAccess}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-200 mb-2">
                      Grant Role
                    </label>
                    <select
                      value={grantAccessForm.role}
                      onChange={(e) => setGrantAccessForm({ ...grantAccessForm, role: e.target.value as 'musician' | 'board' | 'public' })}
                      className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      disabled={grantingAccess}
                    >
                      <option value="musician">Musician (can access musician-level media)</option>
                      <option value="board">Board Member (can access all media + analytics)</option>
                      <option value="public">Public (can access public media only)</option>
                    </select>
                    <p className="text-xs text-gray-400 mt-1">
                      {grantAccessForm.role === 'musician' && 'Musicians can view rehearsal footage and project media'}
                      {grantAccessForm.role === 'board' && 'Board members can view all media and access analytics dashboards'}
                      {grantAccessForm.role === 'public' && 'Public users can only view publicly available media'}
                    </p>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button
                      onClick={handleGrantAccess}
                      disabled={grantingAccess || !grantAccessForm.identifier.trim()}
                      className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      {grantingAccess ? (
                        <>
                          <Loader className="w-5 h-5 animate-spin" />
                          Granting Access...
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-5 h-5" />
                          Grant Access
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => setShowGrantAccessModal(false)}
                      disabled={grantingAccess}
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

