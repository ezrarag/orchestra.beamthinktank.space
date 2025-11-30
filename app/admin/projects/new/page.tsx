'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useUserRole } from '@/lib/hooks/useUserRole'
import { ArrowLeft, Plus } from 'lucide-react'
import Link from 'next/link'

export default function NewProjectPage() {
  const router = useRouter()
  const { user, loading: authLoading, role } = useUserRole()
  const [loading, setLoading] = useState(false)
  
  const [formData, setFormData] = useState({
    name: '',
    city: '',
    status: 'planning' as 'planning' | 'active' | 'completed',
    description: '',
    budgetUsd: 0,
    neededMusicians: 0,
    startDate: '',
    endDate: '',
  })

  // Only beam admins can create projects
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orchestra-gold"></div>
      </div>
    )
  }

  if (role !== 'beam_admin') {
    return (
      <div className="min-h-screen bg-orchestra-dark flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-orchestra-gold mb-4">Access Denied</h1>
          <p className="text-orchestra-cream">Only beam admins can create projects.</p>
          <Link href="/admin/projects" className="text-orchestra-gold hover:underline mt-4 inline-block">
            Back to Projects
          </Link>
        </div>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user || !db) {
      alert('Please sign in to create projects')
      return
    }

    // Validation
    if (!formData.name || !formData.city) {
      alert('Please fill in all required fields')
      return
    }

    setLoading(true)

    try {
      // Generate project ID from name
      const projectId = formData.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')

      const projectData: any = {
        name: formData.name,
        city: formData.city,
        status: formData.status,
        description: formData.description || '',
        budgetUsd: formData.budgetUsd || 0,
        neededMusicians: formData.neededMusicians || 0,
        currentMusicians: 0,
        beamCoinsTotal: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: user.uid,
      }

      if (formData.startDate) {
        projectData.startDate = formData.startDate
      }
      if (formData.endDate) {
        projectData.endDate = formData.endDate
      }

      await addDoc(collection(db, 'projects'), projectData)
      
      router.push('/admin/projects')
    } catch (error) {
      console.error('Error creating project:', error)
      alert('Failed to create project. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link
        href="/admin/projects"
        className="inline-flex items-center gap-2 text-orchestra-gold hover:text-orchestra-gold/80 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Projects
      </Link>

      <h1 className="text-3xl font-bold text-orchestra-gold">Create New Project</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-orchestra-cream/5 backdrop-blur-sm rounded-xl border border-orchestra-gold/20 p-6 space-y-4">
          <h2 className="text-xl font-semibold text-orchestra-cream mb-4">Basic Information</h2>
          
          <div>
            <label className="block text-sm font-medium text-orchestra-cream mb-2">
              Project Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 bg-orchestra-dark/50 border border-orchestra-gold/30 rounded-lg text-orchestra-cream focus:outline-none focus:ring-2 focus:ring-orchestra-gold"
              placeholder="e.g., Black Diaspora Symphony Orchestra"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-orchestra-cream mb-2">
              City *
            </label>
            <input
              type="text"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              className="w-full px-4 py-2 bg-orchestra-dark/50 border border-orchestra-gold/30 rounded-lg text-orchestra-cream focus:outline-none focus:ring-2 focus:ring-orchestra-gold"
              placeholder="e.g., Milwaukee"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-orchestra-cream mb-2">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              className="w-full px-4 py-2 bg-orchestra-dark/50 border border-orchestra-gold/30 rounded-lg text-orchestra-cream focus:outline-none focus:ring-2 focus:ring-orchestra-gold"
            >
              <option value="planning">Planning</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-orchestra-cream mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 bg-orchestra-dark/50 border border-orchestra-gold/30 rounded-lg text-orchestra-cream focus:outline-none focus:ring-2 focus:ring-orchestra-gold"
              placeholder="Project description..."
            />
          </div>
        </div>

        {/* Project Details */}
        <div className="bg-orchestra-cream/5 backdrop-blur-sm rounded-xl border border-orchestra-gold/20 p-6 space-y-4">
          <h2 className="text-xl font-semibold text-orchestra-cream mb-4">Project Details</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-orchestra-cream mb-2">
                Budget (USD)
              </label>
              <input
                type="number"
                value={formData.budgetUsd}
                onChange={(e) => setFormData({ ...formData, budgetUsd: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-2 bg-orchestra-dark/50 border border-orchestra-gold/30 rounded-lg text-orchestra-cream focus:outline-none focus:ring-2 focus:ring-orchestra-gold"
                placeholder="0"
                min="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-orchestra-cream mb-2">
                Needed Musicians
              </label>
              <input
                type="number"
                value={formData.neededMusicians}
                onChange={(e) => setFormData({ ...formData, neededMusicians: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-2 bg-orchestra-dark/50 border border-orchestra-gold/30 rounded-lg text-orchestra-cream focus:outline-none focus:ring-2 focus:ring-orchestra-gold"
                placeholder="0"
                min="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-orchestra-cream mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-4 py-2 bg-orchestra-dark/50 border border-orchestra-gold/30 rounded-lg text-orchestra-cream focus:outline-none focus:ring-2 focus:ring-orchestra-gold"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-orchestra-cream mb-2">
                End Date
              </label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full px-4 py-2 bg-orchestra-dark/50 border border-orchestra-gold/30 rounded-lg text-orchestra-cream focus:outline-none focus:ring-2 focus:ring-orchestra-gold"
              />
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex items-center justify-end space-x-4">
          <Link
            href="/admin/projects"
            className="px-6 py-3 bg-orchestra-dark/50 hover:bg-orchestra-dark/70 text-orchestra-cream rounded-lg transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-orchestra-gold hover:bg-orchestra-gold/90 disabled:opacity-50 text-orchestra-dark font-bold rounded-lg transition-colors"
          >
            {loading ? 'Creating...' : 'Create Project'}
          </button>
        </div>
      </form>
    </div>
  )
}

