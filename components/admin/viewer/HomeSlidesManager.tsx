'use client'

import { useEffect, useMemo, useState } from 'react'
import { Plus, RefreshCw, Save, Trash2 } from 'lucide-react'
import type { HeroSlide } from '@/lib/types/portal'

const EMPTY_SLIDE: HeroSlide = {
  id: '',
  title: '',
  subtitle: '',
  ctaLabel: '',
  ctaPath: '/home',
  imageSrc: '',
  imageAlt: '',
  audience: 'all',
  videoUrl: '',
}

export default function HomeSlidesManager() {
  const [slides, setSlides] = useState<HeroSlide[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/admin/home-slides?ngo=orchestra', { cache: 'no-store' })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        const details = typeof data?.details === 'string' ? data.details : ''
        throw new Error([data?.error || 'Failed to load home slides', details].filter(Boolean).join(': '))
      }
      const nextSlides = Array.isArray(data?.slides) ? (data.slides as HeroSlide[]) : []
      setSlides(nextSlides.slice(0, 5))
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'Unknown error'
      setError(message)
      setSlides([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const canAddSlide = slides.length < 5
  const orderedSlides = useMemo(() => slides.slice(0, 5), [slides])

  const setSlide = (index: number, patch: Partial<HeroSlide>) => {
    setSlides((current) =>
      current.map((slide, rowIndex) =>
        rowIndex === index
          ? {
              ...slide,
              ...patch,
            }
          : slide,
      ),
    )
  }

  const addSlide = () => {
    if (!canAddSlide) return
    setSlides((current) => [...current, { ...EMPTY_SLIDE, id: `slide-${current.length + 1}` }])
  }

  const removeSlide = (index: number) => {
    setSlides((current) => current.filter((_, rowIndex) => rowIndex !== index))
  }

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      const response = await fetch('/api/admin/home-slides', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ngo: 'orchestra', slides: orderedSlides }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        const details = typeof data?.details === 'string' ? data.details : ''
        throw new Error([data?.error || 'Failed to save home slides', details].filter(Boolean).join(': '))
      }
      const nextSlides = Array.isArray(data?.slides) ? (data.slides as HeroSlide[]) : orderedSlides
      setSlides(nextSlides.slice(0, 5))
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unknown error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4 text-white">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Home Slides Admin</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-2 rounded-lg border border-white/25 bg-white/5 px-3 py-2 text-sm hover:border-[#D4AF37] hover:text-[#F5D37A]"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-[#D4AF37] px-4 py-2 text-sm font-semibold text-black hover:bg-[#E6C86A] disabled:opacity-70"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save Slides'}
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-white/15 bg-white/[0.03] p-3 text-xs text-white/70">
        Manage up to 5 slides shown on <span className="font-semibold text-white">/home</span>. Order in this list is the display order.
      </div>

      {error ? <p className="rounded-lg border border-red-400/35 bg-red-500/10 p-3 text-sm text-red-200">{error}</p> : null}
      {loading ? <p className="text-sm text-white/70">Loading slides...</p> : null}

      <div className="space-y-3">
        {orderedSlides.map((slide, index) => (
          <div key={`${slide.id || 'slide'}-${index}`} className="rounded-xl border border-white/15 bg-white/[0.03] p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">Slide {index + 1}</p>
              <button
                type="button"
                onClick={() => removeSlide(index)}
                className="inline-flex items-center gap-1 rounded-lg border border-red-300/35 bg-red-500/10 px-2.5 py-1 text-xs text-red-200 hover:bg-red-500/20"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove
              </button>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <input value={slide.id} onChange={(e) => setSlide(index, { id: e.target.value })} placeholder="id" className="rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm" />
              <select value={slide.audience ?? 'all'} onChange={(e) => setSlide(index, { audience: e.target.value as HeroSlide['audience'] })} className="rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm">
                <option value="all">audience: all</option>
                <option value="viewer">audience: viewer</option>
                <option value="participant_admin">audience: participant_admin</option>
              </select>
              <input value={slide.title} onChange={(e) => setSlide(index, { title: e.target.value })} placeholder="title" className="rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm md:col-span-2" />
              <input value={slide.subtitle} onChange={(e) => setSlide(index, { subtitle: e.target.value })} placeholder="subtitle" className="rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm md:col-span-2" />
              <input value={slide.ctaLabel} onChange={(e) => setSlide(index, { ctaLabel: e.target.value })} placeholder="ctaLabel" className="rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm" />
              <input value={slide.ctaPath} onChange={(e) => setSlide(index, { ctaPath: e.target.value as HeroSlide['ctaPath'] })} placeholder="ctaPath (e.g. /viewer)" className="rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm" />
              <input value={slide.imageSrc} onChange={(e) => setSlide(index, { imageSrc: e.target.value })} placeholder="imageSrc" className="rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm md:col-span-2" />
              <input value={slide.imageAlt} onChange={(e) => setSlide(index, { imageAlt: e.target.value })} placeholder="imageAlt" className="rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm md:col-span-2" />
              <input value={slide.videoUrl ?? ''} onChange={(e) => setSlide(index, { videoUrl: e.target.value })} placeholder="videoUrl (optional)" className="rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm md:col-span-2" />
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addSlide}
        disabled={!canAddSlide}
        className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-3 py-2 text-sm hover:border-[#D4AF37] hover:text-[#F5D37A] disabled:opacity-50"
      >
        <Plus className="h-4 w-4" />
        Add Slide
      </button>
    </div>
  )
}
