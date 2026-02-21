'use client'

import { useEffect, useMemo, useState } from 'react'
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { Plus, Save, Trash2 } from 'lucide-react'
import { db } from '@/lib/firebase'
import {
  DEFAULT_VIEWER_AREA_ROLE_TEMPLATES,
  type ViewerAreaId,
  type ViewerRoleTemplate,
} from '@/lib/config/viewerRoleTemplates'

type ViewerAreaRolesDoc = {
  areaId?: ViewerAreaId
  roles?: ViewerRoleTemplate[]
  explainerVideoUrl?: string
}

function toRoleId(title: string, fallbackIndex: number): string {
  const normalized = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
  return normalized || `role-${fallbackIndex}`
}

export default function AreaRolesEditor({ areaId }: { areaId: ViewerAreaId }) {
  const [roles, setRoles] = useState<ViewerRoleTemplate[]>([])
  const [explainerVideoUrl, setExplainerVideoUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    const load = async () => {
      if (!db) {
        if (mounted) {
          setRoles([...DEFAULT_VIEWER_AREA_ROLE_TEMPLATES[areaId]])
          setLoading(false)
        }
        return
      }

      setLoading(true)
      setError(null)

      try {
        const snapshot = await getDoc(doc(db, 'viewerAreaRoles', areaId))
        if (!mounted) return

        if (snapshot.exists()) {
          const data = snapshot.data() as ViewerAreaRolesDoc
          const loadedRoles = Array.isArray(data.roles)
            ? data.roles
                .filter((role) => role && typeof role.title === 'string')
                .map((role, index) => ({
                  id: role.id || `role-${index + 1}`,
                  title: role.title,
                  description: role.description ?? '',
                  order: Number.isFinite(role.order) ? role.order : index + 1,
                }))
                .sort((a, b) => a.order - b.order)
            : []

          setRoles(loadedRoles.length > 0 ? loadedRoles : [...DEFAULT_VIEWER_AREA_ROLE_TEMPLATES[areaId]])
          setExplainerVideoUrl((data.explainerVideoUrl ?? '').trim())
        } else {
          setRoles([...DEFAULT_VIEWER_AREA_ROLE_TEMPLATES[areaId]])
          setExplainerVideoUrl('')
        }
      } catch (loadError) {
        console.error('Error loading area roles:', loadError)
        if (mounted) {
          setError('Unable to load role slots right now.')
          setRoles([...DEFAULT_VIEWER_AREA_ROLE_TEMPLATES[areaId]])
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    load()

    return () => {
      mounted = false
    }
  }, [areaId])

  const sortedRoles = useMemo(() => {
    return [...roles].sort((a, b) => a.order - b.order)
  }, [roles])

  const upsertRoleRow = (index: number, patch: Partial<ViewerRoleTemplate>) => {
    setRoles((current) =>
      current.map((role, rowIndex) =>
        rowIndex === index
          ? {
              ...role,
              ...patch,
            }
          : role,
      ),
    )
  }

  const addRoleRow = () => {
    const nextOrder = sortedRoles.length + 1
    setRoles((current) => [
      ...current,
      {
        id: `role-${nextOrder}`,
        title: '',
        description: '',
        order: nextOrder,
      },
    ])
  }

  const removeRoleRow = (index: number) => {
    setRoles((current) =>
      current
        .filter((_, rowIndex) => rowIndex !== index)
        .map((role, rowIndex) => ({ ...role, order: rowIndex + 1 })),
    )
  }

  const saveAreaRoles = async () => {
    if (!db) return
    setSaving(true)
    setError(null)

    try {
      const sanitized = sortedRoles
        .filter((role) => role.title.trim().length > 0)
        .map((role, index) => ({
          id: role.id?.trim() || toRoleId(role.title, index + 1),
          title: role.title.trim(),
          description: role.description?.trim() ?? '',
          order: Number.isFinite(role.order) ? role.order : index + 1,
        }))
        .sort((a, b) => a.order - b.order)

      await setDoc(
        doc(db, 'viewerAreaRoles', areaId),
        {
          areaId,
          roles: sanitized,
          explainerVideoUrl: explainerVideoUrl.trim(),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      )

      setRoles(sanitized)
    } catch (saveError) {
      console.error('Error saving area role templates:', saveError)
      setError('Save failed. Verify permissions and try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-2xl border border-white/15 bg-white/[0.03] p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Area Role Avatars</h2>
        <button
          type="button"
          onClick={() => void saveAreaRoles()}
          disabled={saving || loading}
          className="inline-flex items-center gap-2 rounded-lg bg-[#D4AF37] px-4 py-2 text-sm font-semibold text-black hover:bg-[#E6C86A] disabled:opacity-70"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Saving Roles...' : 'Save Roles'}
        </button>
      </div>

      <div className="mb-4 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs text-white/70">
        These roles appear in the popup avatar rail. No participants are shown here yet; participants self-assign their role from their dashboard flow.
      </div>

      <div className="mb-4">
        <label className="text-xs uppercase tracking-[0.12em] text-white/70">
          Roles Explainer Video URL
          <input
            value={explainerVideoUrl}
            onChange={(event) => setExplainerVideoUrl(event.target.value)}
            placeholder="https://... (plays when viewer taps Play Roles Overview)"
            className="mt-1 w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm"
          />
        </label>
      </div>

      {loading ? <p className="text-sm text-white/70">Loading role slots...</p> : null}

      <div className="space-y-2">
        {sortedRoles.map((role, index) => (
          <div
            key={`${role.id}-${index}`}
            className="grid gap-2 rounded-lg border border-white/10 bg-black/25 p-3 md:grid-cols-[180px,1fr,110px,42px]"
          >
            <input
              value={role.title}
              onChange={(event) => upsertRoleRow(index, { title: event.target.value })}
              placeholder="Role title"
              className="rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm"
            />
            <input
              value={role.description}
              onChange={(event) => upsertRoleRow(index, { description: event.target.value })}
              placeholder="Role description"
              className="rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm"
            />
            <input
              type="number"
              value={role.order}
              onChange={(event) => upsertRoleRow(index, { order: Number(event.target.value) || index + 1 })}
              placeholder="Order"
              className="rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={() => removeRoleRow(index)}
              className="inline-flex items-center justify-center rounded-lg border border-red-300/35 bg-red-500/10 px-2 py-2 text-xs text-red-200 hover:bg-red-500/20"
              aria-label="Remove role"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addRoleRow}
        className="mt-3 inline-flex items-center gap-2 rounded-lg border border-white/20 px-3 py-2 text-sm hover:border-[#D4AF37] hover:text-[#F5D37A]"
      >
        <Plus className="h-4 w-4" />
        Add Role
      </button>

      {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
    </div>
  )
}
