'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  X, 
  User, 
  FileText, 
  DollarSign, 
  Heart,
  Camera,
  Upload,
  Edit3,
  Save,
  Coins
} from 'lucide-react'
import { signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth'
import { auth, db } from '@/lib/firebase'
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore'
import DocumentSigner from './DocumentSigner'
import DonationModal from './DonationModal'

type MusicianProfile = {
  name: string
  email: string
  status: string
  source: string
  notes?: string
  bio?: string
  headshotUrl?: string
  mediaEmbedUrl?: string
  supportLink?: string
  instrument: string
}

interface MusicianProfileModalProps {
  isOpen: boolean
  onClose: () => void
  musician: MusicianProfile | null
}

type TabType = 'profile' | 'documents' | 'payments' | 'donations'

export default function MusicianProfileModal({ isOpen, onClose, musician }: MusicianProfileModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('profile')
  const [user, setUser] = useState<any>(null)
  const [authError, setAuthError] = useState<string | null>(null)
  const [isEditingBio, setIsEditingBio] = useState(false)
  const [bioText, setBioText] = useState(musician?.bio || '')
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLVideoElement>(null)
  const [showCamera, setShowCamera] = useState(false)
  const [showDocumentSigner, setShowDocumentSigner] = useState(false)
  const [documentType, setDocumentType] = useState<'w4' | 'contract' | 'mediaRelease'>('w4')
  const [donations, setDonations] = useState<typeof mockDonations>([])
  const [loadingDonations, setLoadingDonations] = useState(false)
  const [showDonationModal, setShowDonationModal] = useState(false)

  // Mock data for payments and donations
  const mockPayments = {
    usdBalance: 150,
    beamCoins: 25,
    recentTransactions: [
      { date: '2025-01-15', description: 'Sectional Rehearsal', amount: 50, type: 'USD' },
      { date: '2025-01-10', description: 'Full Orchestra', amount: 5, type: 'BEAM' },
      { date: '2025-01-05', description: 'Dress Rehearsal', amount: 5, type: 'BEAM' }
    ]
  }

  const mockDonations = [
    { donor: 'Sarah Johnson', amount: 25, date: '2025-01-14', message: 'Amazing performance!' },
    { donor: 'Michael Chen', amount: 50, date: '2025-01-12', message: 'Keep up the great work!' },
    { donor: 'Anonymous', amount: 15, date: '2025-01-10', message: 'Thank you for sharing your talent.' }
  ]

  // Fetch donations from Firebase
  useEffect(() => {
    if (activeTab === 'donations' && musician) {
      fetchDonations()
    }
  }, [activeTab, musician])

  const fetchDonations = async () => {
    if (!db) {
      setDonations(mockDonations)
      return
    }
    
    setLoadingDonations(true)
    try {
      // Try to fetch from Firebase
      const donationsRef = collection(db, 'donations')
      const q = query(
        donationsRef,
        where('recipientName', '==', musician.name),
        orderBy('created_at', 'desc'),
        limit(5)
      )
      
      const querySnapshot = await getDocs(q)
      
      if (querySnapshot.empty) {
        // Fall back to mock data if no donations found
        setDonations(mockDonations)
      } else {
        const fetchedDonations = querySnapshot.docs.map(doc => ({
          donor: doc.data().donor_name || 'Anonymous',
          amount: doc.data().amount || 0,
          date: doc.data().created_at?.toDate()?.toLocaleDateString() || new Date().toLocaleDateString(),
          message: doc.data().message || ''
        }))
        setDonations(fetchedDonations)
      }
    } catch (error) {
      console.error('Error fetching donations:', error)
      setDonations(mockDonations)
    } finally {
      setLoadingDonations(false)
    }
  }

  const handleDocumentClick = (type: 'w4' | 'contract' | 'mediaRelease') => {
    setDocumentType(type)
    setShowDocumentSigner(true)
  }

  const handleGoogleSignIn = async () => {
    if (!auth) {
      console.warn('Firebase Auth is not available. Please configure Firebase.')
      setAuthError('Firebase Auth is not available. Please configure Firebase.')
      return
    }
    
    setAuthError(null)
    
    try {
      const provider = new GoogleAuthProvider()
      const result = await signInWithPopup(auth, provider)
      setUser(result.user)
    } catch (error: any) {
      console.error('Error signing in:', error)
      
      // Handle specific Firebase errors
      if (error.code === 'auth/configuration-not-found') {
        setAuthError('Firebase Authentication is not enabled. Enable it in Firebase Console > Authentication.')
      } else if (error.code === 'auth/unauthorized-domain') {
        setAuthError('This domain is not authorized. Add it to Firebase Console > Authentication > Settings > Authorized domains.')
      } else if (error.code === 'auth/popup-closed-by-user') {
        // Don't show error if user closes popup
      } else {
        setAuthError(`Authentication failed: ${error.message}`)
      }
    }
  }

  const handleSignOut = async () => {
    if (!auth) {
      console.warn('Firebase Auth is not available. Please configure Firebase.')
      return
    }
    
    try {
      await signOut(auth)
      setUser(null)
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const handleTakePhoto = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      if (cameraRef.current) {
        cameraRef.current.srcObject = stream
        setShowCamera(true)
      }
    } catch (error) {
      console.error('Error accessing camera:', error)
    }
  }

  const capturePhoto = () => {
    if (cameraRef.current) {
      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d')
      canvas.width = cameraRef.current.videoWidth
      canvas.height = cameraRef.current.videoHeight
      
      if (context) {
        context.drawImage(cameraRef.current, 0, 0)
        const imageData = canvas.toDataURL('image/png')
        // Here you would typically upload the image to Firebase Storage
        console.log('Photo captured:', imageData)
        setShowCamera(false)
        // Stop the camera stream
        const stream = cameraRef.current.srcObject as MediaStream
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setIsUploadingImage(true)
      // Here you would typically upload to Firebase Storage
      console.log('Uploading image:', file)
      setTimeout(() => setIsUploadingImage(false), 2000) // Simulate upload
    }
  }

  const saveBio = () => {
    setIsEditingBio(false)
    // Here you would typically save to Firebase
    console.log('Saving bio:', bioText)
  }

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'payments', label: 'Payments', icon: DollarSign },
    { id: 'donations', label: 'Donations', icon: Heart }
  ]

  if (!isOpen || !musician) return null

  return (
    <div className="fixed inset-0 z-[105] flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-black/80"
        onClick={onClose}
        aria-hidden="true"
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="relative w-full max-w-4xl max-h-[90vh] rounded-2xl bg-slate-900 border border-white/10 overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center space-x-4">
            {musician.headshotUrl ? (
              <img
                src={musician.headshotUrl}
                alt={`${musician.name} headshot`}
                className="h-12 w-12 rounded-full object-cover border border-white/10"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 border border-white/10 text-lg font-semibold text-white">
                {musician.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </div>
            )}
            <div>
              <h2 className="text-xl font-semibold text-white">{musician.name}</h2>
              <p className="text-sm text-purple-200">{musician.instrument}</p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="Close modal"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Auth Section */}
        <div className="p-6 border-b border-white/10">
          {!auth ? (
            <div className="text-center py-4">
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                <p className="text-yellow-200 text-sm">
                  <strong>Firebase not configured:</strong> Please set up your Firebase environment variables to enable authentication features.
                </p>
                <p className="text-yellow-300 text-xs mt-2">
                  Check your .env.local file for Firebase configuration.
                </p>
              </div>
            </div>
          ) : !user ? (
            <div className="space-y-3">
              <div className="flex items-center justify-center">
                <button
                  onClick={handleGoogleSignIn}
                  className="flex items-center space-x-3 bg-white text-black px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span>Sign in with Google</span>
                </button>
              </div>
              {authError && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                  <p className="text-red-300 text-sm">{authError}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <img
                  src={user.photoURL || ''}
                  alt={user.displayName || 'User'}
                  className="h-10 w-10 rounded-full"
                />
                <div>
                  <p className="text-white font-medium">{user.displayName}</p>
                  <p className="text-sm text-gray-400">{user.email}</p>
                </div>
              </div>
              <button
                onClick={handleSignOut}
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                Sign out
              </button>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex items-center space-x-2 px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-purple-400 border-b-2 border-purple-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-6 max-h-96 overflow-y-auto">
          <AnimatePresence mode="wait">
            {activeTab === 'profile' && (
              <motion.div
                key="profile"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    {musician.headshotUrl ? (
                      <img
                        src={musician.headshotUrl}
                        alt={`${musician.name} headshot`}
                        className="h-24 w-24 rounded-2xl object-cover border border-white/10"
                      />
                    ) : (
                      <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-white/10 border border-white/10 text-2xl font-semibold text-white">
                        {musician.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                    )}
                    {user && (
                      <div className="absolute -bottom-2 -right-2 flex space-x-1">
                        <button
                          onClick={handleTakePhoto}
                          className="bg-purple-500 hover:bg-purple-600 text-white p-2 rounded-full transition-colors"
                          title="Take a photo"
                        >
                          <Camera className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-full transition-colors"
                          title="Upload image"
                        >
                          <Upload className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">{musician.name}</h3>
                    <p className="text-purple-200">{musician.instrument}</p>
                    <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-medium ${
                      musician.status === 'Confirmed' 
                        ? 'bg-green-500/20 text-green-300'
                        : musician.status === 'Interested'
                        ? 'bg-blue-500/20 text-blue-300'
                        : musician.status === 'Pending'
                        ? 'bg-yellow-500/20 text-yellow-300'
                        : 'bg-gray-500/20 text-gray-300'
                    }`}>
                      {musician.status}
                    </span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-md font-semibold text-white">Biography</h4>
                    {user && (
                      <button
                        onClick={() => setIsEditingBio(!isEditingBio)}
                        className="text-purple-400 hover:text-purple-300 transition-colors"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  
                  {isEditingBio ? (
                    <div className="space-y-3">
                      <textarea
                        value={bioText}
                        onChange={(e) => setBioText(e.target.value)}
                        className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 h-32 resize-none"
                        placeholder="Tell us about yourself..."
                      />
                      <div className="flex space-x-2">
                        <button
                          onClick={saveBio}
                          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
                        >
                          <Save className="w-4 h-4" />
                          <span>Save</span>
                        </button>
                        <button
                          onClick={() => {
                            setIsEditingBio(false)
                            setBioText(musician?.bio || '')
                          }}
                          className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-300 leading-relaxed">
                      {bioText || 'No biography available yet.'}
                    </p>
                  )}
                </div>

                {/* Camera Modal */}
                {showCamera && (
                  <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90">
                    <div className="relative w-full max-w-md">
                      <video
                        ref={cameraRef}
                        autoPlay
                        playsInline
                        className="w-full rounded-lg"
                      />
                      <div className="flex justify-center space-x-4 mt-4">
                        <button
                          onClick={capturePhoto}
                          className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                        >
                          Capture
                        </button>
                        <button
                          onClick={() => {
                            setShowCamera(false)
                            const stream = cameraRef.current?.srcObject as MediaStream
                            stream?.getTracks().forEach(track => track.stop())
                          }}
                          className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </motion.div>
            )}

            {activeTab === 'documents' && (
              <motion.div
                key="documents"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <h4 className="text-md font-semibold text-white mb-4">Required Documents</h4>
                
                <div className="space-y-4">
                  <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                    <h5 className="text-white font-medium mb-2">W-4 Form</h5>
                    <p className="text-sm text-gray-400 mb-3">Tax withholding form for payment processing</p>
                    <div className="flex space-x-2">
                      <button 
                        onClick={() => handleDocumentClick('w4')}
                        className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
                      >
                        <FileText className="w-4 h-4" />
                        <span>Fill Out & Sign</span>
                      </button>
                    </div>
                  </div>
                  
                  <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                    <h5 className="text-white font-medium mb-2">Performance Contract</h5>
                    <p className="text-sm text-gray-400 mb-3">Agreement for participation in the concert</p>
                    <div className="flex space-x-2">
                      <button 
                        onClick={() => handleDocumentClick('contract')}
                        className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
                      >
                        <FileText className="w-4 h-4" />
                        <span>Fill Out & Sign</span>
                      </button>
                    </div>
                  </div>
                  
                  <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                    <h5 className="text-white font-medium mb-2">Media Release</h5>
                    <p className="text-sm text-gray-400 mb-3">Permission for photography and recording</p>
                    <div className="flex space-x-2">
                      <button 
                        onClick={() => handleDocumentClick('mediaRelease')}
                        className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
                      >
                        <FileText className="w-4 h-4" />
                        <span>Fill Out & Sign</span>
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'payments' && (
              <motion.div
                key="payments"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                    <div className="flex items-center space-x-2 mb-2">
                      <DollarSign className="w-5 h-5 text-green-400" />
                      <h4 className="text-white font-semibold">USD Balance</h4>
                    </div>
                    <p className="text-2xl font-bold text-green-400">${mockPayments.usdBalance}</p>
                    <p className="text-sm text-gray-400">Available for withdrawal</p>
                  </div>
                  
                  <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                    <div className="flex items-center space-x-2 mb-2">
                      <Coins className="w-5 h-5 text-yellow-400" />
                      <h4 className="text-white font-semibold">BEAM Coins</h4>
                    </div>
                    <p className="text-2xl font-bold text-yellow-400">{mockPayments.beamCoins} BEAM</p>
                    <p className="text-sm text-gray-400">Digital work credits</p>
                  </div>
                </div>

                <div>
                  <h4 className="text-md font-semibold text-white mb-4">Recent Transactions</h4>
                  <div className="space-y-3">
                    {mockPayments.recentTransactions.map((transaction, index) => (
                      <div key={index} className="bg-white/5 rounded-lg p-3 border border-white/10">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-white font-medium">{transaction.description}</p>
                            <p className="text-sm text-gray-400">{transaction.date}</p>
                          </div>
                          <span className={`font-semibold ${
                            transaction.type === 'USD' ? 'text-green-400' : 'text-yellow-400'
                          }`}>
                            {transaction.type === 'USD' ? '$' : ''}{transaction.amount}
                            {transaction.type === 'BEAM' ? ' BEAM' : ''}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'donations' && (
              <motion.div
                key="donations"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-md font-semibold text-white">Recent Donations</h4>
                  <button
                    onClick={() => setShowDonationModal(true)}
                    className="flex items-center space-x-2 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
                  >
                    <Heart className="w-4 h-4" />
                    <span>Donate</span>
                  </button>
                </div>
                
                {loadingDonations ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
                  </div>
                ) : donations.length === 0 ? (
                  <div className="text-center py-8">
                    <Heart className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-400">No donations yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {donations.map((donation, index) => (
                      <div key={index} className="bg-white/5 rounded-lg p-4 border border-white/10">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="text-white font-medium">{donation.donor}</p>
                            <p className="text-sm text-gray-400">{donation.date}</p>
                          </div>
                          <span className="text-green-400 font-semibold">${donation.amount}</span>
                        </div>
                        {donation.message && (
                          <p className="text-sm text-gray-300 italic">"{donation.message}"</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                
                {donations.length > 0 && (
                  <div className="bg-purple-500/10 rounded-lg p-4 border border-purple-500/20">
                    <p className="text-purple-200 text-sm">
                      <strong>Total Donations:</strong> ${donations.reduce((sum, d) => sum + d.amount, 0)}
                    </p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Document Signer Modal */}
      <DocumentSigner
        isOpen={showDocumentSigner}
        onClose={() => setShowDocumentSigner(false)}
        documentType={documentType}
        musicianName={musician?.name || ''}
        musicianEmail={musician?.email || ''}
      />

      {/* Donation Modal */}
      <DonationModal
        isOpen={showDonationModal}
        onClose={() => setShowDonationModal(false)}
        musicianName={musician?.name || ''}
        musicianEmail={musician?.email || ''}
      />
    </div>
  )
}
