'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { doc, getDoc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from '@/lib/firebase'
import { useUserRole } from '@/lib/hooks/useUserRole'
import { Event, PriceTier, TicketProvider } from '@/lib/types/events'
import { ArrowLeft, Upload, X, Plus, ExternalLink } from 'lucide-react'
import Link from 'next/link'

export default function EditEventPage() {
  const params = useParams()
  const router = useRouter()
  const eventId = params.id as string
  const { user, loading: authLoading } = useUserRole()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  
  const [formData, setFormData] = useState<Partial<Event>>({
    title: '',
    series: '',
    projectId: '',
    city: '',
    venueName: '',
    venueAddress: '',
    date: new Date(),
    time: '',
    description: '',
    imageUrl: '',
    isFree: false,
    ticketProvider: 'stripe',
    externalTicketUrl: '',
    onSale: false,
    priceTiers: [],
  })

  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>('')

  useEffect(() => {
    if (!authLoading && db && eventId) {
      loadEvent()
    }
  }, [authLoading, eventId])

  const loadEvent = async () => {
    if (!db || !eventId) return
    
    try {
      setLoading(true)
      const eventDoc = await getDoc(doc(db, 'events', eventId))
      
      if (!eventDoc.exists()) {
        alert('Event not found')
        router.push('/admin/events')
        return
      }

      const data = eventDoc.data()
      const eventData: Partial<Event> = {
        ...data,
        date: data.date?.toDate ? data.date.toDate() : data.date,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt,
      }

      setFormData(eventData)
      if (eventData.imageUrl) {
        setImagePreview(eventData.imageUrl)
      }
    } catch (error) {
      console.error('Error loading event:', error)
      alert('Failed to load event')
    } finally {
      setLoading(false)
    }
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleAddTier = () => {
    const newTier: PriceTier = {
      tierId: `tier_${Date.now()}`,
      label: '',
      price: 0,
      quantity: 0,
    }
    setFormData({
      ...formData,
      priceTiers: [...(formData.priceTiers || []), newTier],
    })
  }

  const handleRemoveTier = (tierId: string) => {
    setFormData({
      ...formData,
      priceTiers: formData.priceTiers?.filter(t => t.tierId !== tierId) || [],
    })
  }

  const handleTierChange = (tierId: string, field: keyof PriceTier, value: string | number) => {
    setFormData({
      ...formData,
      priceTiers: formData.priceTiers?.map(tier =>
        tier.tierId === tierId ? { ...tier, [field]: value } : tier
      ) || [],
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user || !db || !eventId) {
      alert('Please sign in to edit events')
      return
    }

    // Validation
    if (!formData.title || !formData.series || !formData.city || !formData.venueName) {
      alert('Please fill in all required fields')
      return
    }

    if (formData.ticketProvider === 'stripe' && (!formData.priceTiers || formData.priceTiers.length === 0)) {
      alert('Please add at least one price tier for Stripe events')
      return
    }

    if (formData.ticketProvider === 'external' && !formData.externalTicketUrl) {
      alert('Please provide an external ticket URL')
      return
    }

    setSaving(true)

    try {
      let imageUrl = formData.imageUrl

      // Upload image if new file provided
      if (imageFile && storage) {
        setUploadingImage(true)
        const timestamp = Date.now()
        const fileName = `event_${timestamp}_${imageFile.name}`
        const storageRef = ref(storage, `event-posters/${fileName}`)
        await uploadBytes(storageRef, imageFile)
        imageUrl = await getDownloadURL(storageRef)
        setUploadingImage(false)
      }

      // Convert date to Timestamp
      const eventDate = formData.date instanceof Date 
        ? Timestamp.fromDate(formData.date)
        : formData.date

      // Build update data, only including fields that have values (Firestore doesn't allow undefined)
      const updateData: any = {
        title: formData.title!,
        series: formData.series!,
        city: formData.city!,
        venueName: formData.venueName!,
        venueAddress: formData.venueAddress || '',
        date: eventDate as Timestamp,
        time: formData.time || '',
        description: formData.description || '',
        isFree: formData.isFree || false,
        ticketProvider: formData.ticketProvider || 'stripe',
        onSale: formData.onSale || false,
        priceTiers: formData.priceTiers || [],
        updatedAt: serverTimestamp() as Timestamp,
      }

      // Only include optional fields if they have values
      if (formData.projectId && formData.projectId.trim()) {
        updateData.projectId = formData.projectId.trim()
      } else {
        // If projectId was removed, delete it from Firestore
        updateData.projectId = null
      }
      
      if (imageUrl) {
        updateData.imageUrl = imageUrl
      } else if (imageUrl === null) {
        // Explicitly set to null if image was removed
        updateData.imageUrl = null
      }
      
      if (formData.externalTicketUrl && formData.externalTicketUrl.trim()) {
        updateData.externalTicketUrl = formData.externalTicketUrl.trim()
      } else if (formData.ticketProvider !== 'external') {
        // Remove externalTicketUrl if not using external provider
        updateData.externalTicketUrl = null
      }

      await updateDoc(doc(db, 'events', eventId), updateData)
      
      router.push('/admin/events')
    } catch (error) {
      console.error('Error updating event:', error)
      alert('Failed to update event. Please try again.')
    } finally {
      setSaving(false)
      setUploadingImage(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orchestra-gold"></div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link
        href="/admin/events"
        className="inline-flex items-center gap-2 text-orchestra-gold hover:text-orchestra-gold/80 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Events
      </Link>

      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-orchestra-gold">Edit Event</h1>
        <Link
          href={`/tickets/${eventId}`}
          target="_blank"
          className="inline-flex items-center gap-2 px-4 py-2 bg-orchestra-gold/10 hover:bg-orchestra-gold/20 text-orchestra-gold rounded-lg transition-colors"
        >
          <ExternalLink className="h-4 w-4" />
          Preview Public Page
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-orchestra-dark/50 border border-orchestra-gold/20 rounded-lg p-6 space-y-4">
          <h2 className="text-xl font-semibold text-orchestra-cream mb-4">Basic Information</h2>
          
          <div>
            <label className="block text-sm font-medium text-orchestra-cream mb-2">
              Event Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2 bg-black/50 border border-orchestra-gold/30 rounded-lg text-orchestra-cream focus:outline-none focus:border-orchestra-gold"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-orchestra-cream mb-2">
              Series *
            </label>
            <input
              type="text"
              value={formData.series}
              onChange={(e) => setFormData({ ...formData, series: e.target.value })}
              className="w-full px-4 py-2 bg-black/50 border border-orchestra-gold/30 rounded-lg text-orchestra-cream focus:outline-none focus:border-orchestra-gold"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-orchestra-cream mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 bg-black/50 border border-orchestra-gold/30 rounded-lg text-orchestra-cream focus:outline-none focus:border-orchestra-gold"
            />
          </div>
        </div>

        {/* Date & Location */}
        <div className="bg-orchestra-dark/50 border border-orchestra-gold/20 rounded-lg p-6 space-y-4">
          <h2 className="text-xl font-semibold text-orchestra-cream mb-4">Date & Location</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-orchestra-cream mb-2">
                Date *
              </label>
              <input
                type="date"
                value={formData.date instanceof Date ? formData.date.toISOString().split('T')[0] : ''}
                onChange={(e) => setFormData({ ...formData, date: new Date(e.target.value) })}
                className="w-full px-4 py-2 bg-black/50 border border-orchestra-gold/30 rounded-lg text-orchestra-cream focus:outline-none focus:border-orchestra-gold"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-orchestra-cream mb-2">
                Time *
              </label>
              <input
                type="text"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                className="w-full px-4 py-2 bg-black/50 border border-orchestra-gold/30 rounded-lg text-orchestra-cream focus:outline-none focus:border-orchestra-gold"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-orchestra-cream mb-2">
              City *
            </label>
            <input
              type="text"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              className="w-full px-4 py-2 bg-black/50 border border-orchestra-gold/30 rounded-lg text-orchestra-cream focus:outline-none focus:border-orchestra-gold"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-orchestra-cream mb-2">
              Venue Name *
            </label>
            <input
              type="text"
              value={formData.venueName}
              onChange={(e) => setFormData({ ...formData, venueName: e.target.value })}
              className="w-full px-4 py-2 bg-black/50 border border-orchestra-gold/30 rounded-lg text-orchestra-cream focus:outline-none focus:border-orchestra-gold"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-orchestra-cream mb-2">
              Venue Address
            </label>
            <input
              type="text"
              value={formData.venueAddress}
              onChange={(e) => setFormData({ ...formData, venueAddress: e.target.value })}
              className="w-full px-4 py-2 bg-black/50 border border-orchestra-gold/30 rounded-lg text-orchestra-cream focus:outline-none focus:border-orchestra-gold"
            />
          </div>
        </div>

        {/* Event Poster */}
        <div className="bg-orchestra-dark/50 border border-orchestra-gold/20 rounded-lg p-6 space-y-4">
          <h2 className="text-xl font-semibold text-orchestra-cream mb-4">Event Poster</h2>
          
          {imagePreview ? (
            <div className="relative">
              <img src={imagePreview} alt="Preview" className="w-full max-w-md h-64 object-cover rounded-lg" />
              <button
                type="button"
                onClick={() => {
                  setImagePreview('')
                  setImageFile(null)
                }}
                className="absolute top-2 right-2 p-2 bg-red-500 hover:bg-red-600 rounded-full text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : null}
          
          <div>
            <label className="block text-sm font-medium text-orchestra-cream mb-2">
              {imagePreview ? 'Replace Poster Image' : 'Upload Poster Image'}
            </label>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 px-4 py-2 bg-orchestra-gold/10 hover:bg-orchestra-gold/20 text-orchestra-gold rounded-lg cursor-pointer transition-colors">
                <Upload className="h-5 w-5" />
                Choose File
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
              <span className="text-sm text-orchestra-cream/70">
                Or enter image URL:
              </span>
              <input
                type="url"
                value={formData.imageUrl}
                onChange={(e) => {
                  setFormData({ ...formData, imageUrl: e.target.value })
                  if (e.target.value) setImagePreview(e.target.value)
                }}
                className="flex-1 px-4 py-2 bg-black/50 border border-orchestra-gold/30 rounded-lg text-orchestra-cream focus:outline-none focus:border-orchestra-gold"
                placeholder="https://..."
              />
            </div>
          </div>
        </div>

        {/* Ticketing */}
        <div className="bg-orchestra-dark/50 border border-orchestra-gold/20 rounded-lg p-6 space-y-4">
          <h2 className="text-xl font-semibold text-orchestra-cream mb-4">Ticketing</h2>
          
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-orchestra-cream mb-2">
              <input
                type="checkbox"
                checked={formData.isFree}
                onChange={(e) => {
                  const isFree = e.target.checked
                  setFormData({
                    ...formData,
                    isFree,
                    ticketProvider: isFree ? 'free' : formData.ticketProvider,
                  })
                }}
                className="rounded"
              />
              Free Event
            </label>
          </div>

          {!formData.isFree && (
            <>
              <div>
                <label className="block text-sm font-medium text-orchestra-cream mb-2">
                  Ticket Provider *
                </label>
                <select
                  value={formData.ticketProvider}
                  onChange={(e) => setFormData({ ...formData, ticketProvider: e.target.value as TicketProvider })}
                  className="w-full px-4 py-2 bg-black/50 border border-orchestra-gold/30 rounded-lg text-orchestra-cream focus:outline-none focus:border-orchestra-gold"
                >
                  <option value="stripe">Stripe Checkout</option>
                  <option value="external">External Link (University, Eventbrite, etc.)</option>
                </select>
              </div>

              {formData.ticketProvider === 'external' && (
                <div>
                  <label className="block text-sm font-medium text-orchestra-cream mb-2">
                    External Ticket URL *
                  </label>
                  <input
                    type="url"
                    value={formData.externalTicketUrl}
                    onChange={(e) => setFormData({ ...formData, externalTicketUrl: e.target.value })}
                    className="w-full px-4 py-2 bg-black/50 border border-orchestra-gold/30 rounded-lg text-orchestra-cream focus:outline-none focus:border-orchestra-gold"
                    placeholder="https://..."
                  />
                </div>
              )}

              {formData.ticketProvider === 'stripe' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-orchestra-cream">
                      Price Tiers *
                    </label>
                    <button
                      type="button"
                      onClick={handleAddTier}
                      className="flex items-center gap-2 px-3 py-1 bg-orchestra-gold/10 hover:bg-orchestra-gold/20 text-orchestra-gold rounded-lg text-sm transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                      Add Tier
                    </button>
                  </div>

                  {formData.priceTiers?.map((tier) => (
                    <div key={tier.tierId} className="grid grid-cols-3 gap-4 p-4 bg-black/30 rounded-lg">
                      <div>
                        <label className="block text-xs text-orchestra-cream/70 mb-1">Label</label>
                        <input
                          type="text"
                          value={tier.label}
                          onChange={(e) => handleTierChange(tier.tierId, 'label', e.target.value)}
                          className="w-full px-3 py-2 bg-black/50 border border-orchestra-gold/30 rounded text-orchestra-cream text-sm focus:outline-none focus:border-orchestra-gold"
                          placeholder="General Admission"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-orchestra-cream/70 mb-1">Price ($)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={tier.price / 100}
                          onChange={(e) => handleTierChange(tier.tierId, 'price', Math.round(parseFloat(e.target.value) * 100))}
                          className="w-full px-3 py-2 bg-black/50 border border-orchestra-gold/30 rounded text-orchestra-cream text-sm focus:outline-none focus:border-orchestra-gold"
                          placeholder="25.00"
                        />
                      </div>
                      <div className="flex items-end gap-2">
                        <div className="flex-1">
                          <label className="block text-xs text-orchestra-cream/70 mb-1">Quantity</label>
                          <input
                            type="number"
                            value={tier.quantity}
                            onChange={(e) => handleTierChange(tier.tierId, 'quantity', parseInt(e.target.value))}
                            className="w-full px-3 py-2 bg-black/50 border border-orchestra-gold/30 rounded text-orchestra-cream text-sm focus:outline-none focus:border-orchestra-gold"
                            placeholder="100"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveTier(tier.tierId)}
                          className="p-2 text-red-400 hover:text-red-300"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-orchestra-cream mb-2">
              <input
                type="checkbox"
                checked={formData.onSale}
                onChange={(e) => setFormData({ ...formData, onSale: e.target.checked })}
                className="rounded"
              />
              On Sale (make tickets available)
            </label>
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={saving || uploadingImage}
            className="px-6 py-3 bg-orchestra-gold hover:bg-orchestra-gold/90 text-black font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving || uploadingImage ? 'Saving...' : 'Save Changes'}
          </button>
          <Link
            href="/admin/events"
            className="px-6 py-3 bg-transparent border border-orchestra-gold/30 hover:bg-orchestra-gold/10 text-orchestra-gold rounded-lg transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}


