'use client'

import { useEffect, useMemo, useState } from 'react'
import { doc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { Plus, Save, Trash2, UserPlus, X } from 'lucide-react'
import { db } from '@/lib/firebase'
import { DEFAULT_VIEWER_AREA_ROLE_TEMPLATES, type ViewerRoleTemplate } from '@/lib/config/viewerRoleTemplates'
import { upsertCanonicalParticipant } from '@/lib/participantIdentity'
import type { AreaSource, FillType, ProjectRoleSlot, ProjectSubscriptionTier } from '@/lib/types/projectStaffing'

type Props = { projectId: string; projectName: string; initialSlots?: ProjectRoleSlot[]; initialTier?: ProjectSubscriptionTier }
type RoleOption = ViewerRoleTemplate & { area: Exclude<AreaSource, 'custom'> }

const emptyTier: ProjectSubscriptionTier = { tierName: '', monthlyOrAnnualPrice: 0, includedSeats: {}, includedHours: {}, subscriberOrgId: '', status: 'draft' }
const makeId = () => `slot-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

export default function ProjectStaffingManager({ projectId, projectName, initialSlots = [], initialTier }: Props) {
  const [slots, setSlots] = useState<ProjectRoleSlot[]>(initialSlots)
  const [tier, setTier] = useState<ProjectSubscriptionTier>(initialTier || emptyTier)
  const [roles, setRoles] = useState<RoleOption[]>([])
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [showImport, setShowImport] = useState(false)
  const [participant, setParticipant] = useState({ name: '', email: '', roleSlotId: '', sourceSite: 'law' as 'law'|'forge'|'orchestra', sourceUrl: '', organizationId: '', organizationName: '' })

  useEffect(() => {
    void (async () => {
      const areas: RoleOption['area'][] = ['chamber', 'publishing', 'business']
      const loaded = await Promise.all(areas.map(async area => {
        if (!db) return DEFAULT_VIEWER_AREA_ROLE_TEMPLATES[area]
        const snap = await getDoc(doc(db, 'viewerAreaRoles', area))
        return snap.exists() && Array.isArray(snap.data().roles) ? snap.data().roles as ViewerRoleTemplate[] : DEFAULT_VIEWER_AREA_ROLE_TEMPLATES[area]
      }))
      setRoles(loaded.flatMap((areaRoles, index) => areaRoles.map(role => ({ ...role, area: areas[index] }))))
    })()
  }, [])

  const coveredSeats = useMemo(() => slots.reduce((sum, slot) => sum + (slot.fillType === 'subscription_covered' ? slot.slotsNeeded : 0), 0), [slots])
  const patchSlot = (id: string, patch: Partial<ProjectRoleSlot>) => setSlots(current => current.map(slot => slot.id === id ? { ...slot, ...patch } : slot))
  const selectRole = (slotId: string, value: string) => {
    if (value === 'custom') return patchSlot(slotId, { roleId: '', roleLabel: '', areaSource: 'custom' })
    const selected = roles.find(role => `${role.area}:${role.id}` === value)
    if (selected) patchSlot(slotId, { roleId: selected.id, roleLabel: selected.title, areaSource: selected.area })
  }
  const applyCoverage = () => setSlots(current => current.map(slot => ({ ...slot, fillType: (tier.includedSeats[slot.roleId] || 0) > 0 ? 'subscription_covered' : 'sponsor_participant' })))
  const save = async () => {
    if (!db) return
    setSaving(true); setMessage('')
    try {
      await updateDoc(doc(db, 'projects', projectId), { roleSlots: slots, subscriptionTier: tier, updatedAt: serverTimestamp() })
      setMessage('Staffing plan saved.')
    } catch { setMessage('Unable to save staffing plan. Check permissions and try again.') }
    finally { setSaving(false) }
  }
  const importParticipant = async () => {
    const slot = slots.find(item => item.id === participant.roleSlotId)
    if (!participant.name.trim() || !participant.email.trim() || !slot) return setMessage('Name, email, and role slot are required.')
    setSaving(true)
    try {
      const participantId = await upsertCanonicalParticipant({ ...participant, projectId, projectName, roles: [slot.roleId], organizationId: participant.organizationId || null, organizationName: participant.organizationName || null })
      const updated = slots.map(item => item.id === slot.id ? { ...item, filledBy: Array.from(new Set([...item.filledBy, participantId])) } : item)
      setSlots(updated)
      if (db) await updateDoc(doc(db, 'projects', projectId), { roleSlots: updated, updatedAt: serverTimestamp() })
      setShowImport(false); setParticipant({ name: '', email: '', roleSlotId: '', sourceSite: 'law', sourceUrl: '', organizationId: '', organizationName: '' }); setMessage('Participant added to the canonical roster.')
    } catch { setMessage('Unable to add participant.') } finally { setSaving(false) }
  }

  return <section className="rounded-xl border border-orchestra-gold/20 bg-orchestra-cream/5 p-6 space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-bold text-orchestra-gold">Role staffing</h2><p className="text-sm text-orchestra-cream/65">{slots.reduce((n,s)=>n+s.filledBy.length,0)} filled · {coveredSeats} subscription-covered seats</p></div><div className="flex gap-2"><button onClick={()=>setShowImport(true)} className="inline-flex items-center gap-2 rounded-lg border border-orchestra-gold/30 px-3 py-2 text-sm text-orchestra-gold"><UserPlus className="h-4 w-4"/>Add participant from another BEAM site</button><button onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-orchestra-gold px-3 py-2 text-sm font-semibold text-orchestra-dark"><Save className="h-4 w-4"/>{saving?'Saving…':'Save'}</button></div></div>
    <div className="grid gap-3 md:grid-cols-5">
      <input value={tier.tierName} onChange={e=>setTier({...tier,tierName:e.target.value})} placeholder="Tier name" className="rounded-lg border border-white/15 bg-black/30 px-3 py-2"/>
      <input type="number" value={tier.monthlyOrAnnualPrice} onChange={e=>setTier({...tier,monthlyOrAnnualPrice:Number(e.target.value)})} placeholder="Price" className="rounded-lg border border-white/15 bg-black/30 px-3 py-2"/>
      <input value={tier.subscriberOrgId} onChange={e=>setTier({...tier,subscriberOrgId:e.target.value})} placeholder="Subscriber org ID" className="rounded-lg border border-white/15 bg-black/30 px-3 py-2"/>
      <select value={tier.status} onChange={e=>setTier({...tier,status:e.target.value as ProjectSubscriptionTier['status']})} className="rounded-lg border border-white/15 bg-black/30 px-3 py-2"><option value="draft">Draft</option><option value="active">Active</option><option value="paused">Paused</option><option value="cancelled">Cancelled</option></select>
      <button onClick={applyCoverage} className="rounded-lg border border-orchestra-gold/30 px-3 py-2 text-sm text-orchestra-gold">Apply included seats</button>
    </div>
    <div className="space-y-3">{slots.map(slot=><div key={slot.id} className="grid gap-2 rounded-lg border border-white/10 bg-black/20 p-3 md:grid-cols-[2fr,90px,170px,110px,90px,40px]">
      <div><select value={slot.areaSource==='custom'?'custom':`${slot.areaSource}:${slot.roleId}`} onChange={e=>selectRole(slot.id,e.target.value)} className="w-full rounded border border-white/15 bg-black/40 px-2 py-2"><option value="">Choose area role…</option>{roles.map(r=><option key={`${r.area}:${r.id}`} value={`${r.area}:${r.id}`}>{r.area} · {r.title}</option>)}<option value="custom">Custom role</option></select>{slot.areaSource==='custom'&&<input value={slot.roleLabel} onChange={e=>patchSlot(slot.id,{roleLabel:e.target.value,roleId:e.target.value.toLowerCase().replace(/[^a-z0-9]+/g,'-')})} placeholder="Custom role" className="mt-2 w-full rounded border border-white/15 bg-black/40 px-2 py-2"/>}</div>
      <input type="number" min="1" value={slot.slotsNeeded} onChange={e=>patchSlot(slot.id,{slotsNeeded:Math.max(1,Number(e.target.value))})} className="rounded border border-white/15 bg-black/40 px-2" title="Seats needed"/>
      <select value={slot.fillType} onChange={e=>patchSlot(slot.id,{fillType:e.target.value as FillType})} className="rounded border border-white/15 bg-black/40 px-2"><option value="subscription_covered">Subscription covered</option><option value="sponsor_participant">Sponsor/participant</option><option value="sweat_equity">Sweat equity</option></select>
      <input type="number" min="0" value={tier.includedSeats[slot.roleId]||0} onChange={e=>setTier({...tier,includedSeats:{...tier.includedSeats,[slot.roleId]:Number(e.target.value)}})} className="rounded border border-white/15 bg-black/40 px-2" title="Included seats"/>
      <span className="self-center text-sm text-white/65">{slot.filledBy.length}/{slot.slotsNeeded} filled</span><button onClick={()=>setSlots(slots.filter(s=>s.id!==slot.id))}><Trash2 className="h-4 w-4 text-red-300"/></button>
    </div>)}</div>
    <button onClick={()=>setSlots([...slots,{id:makeId(),roleId:'',roleLabel:'',areaSource:'custom',slotsNeeded:1,fillType:'sponsor_participant',filledBy:[]}])} className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-3 py-2 text-sm"><Plus className="h-4 w-4"/>Add role slot</button>{message&&<p className="text-sm text-orchestra-gold">{message}</p>}
    {showImport&&<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"><div className="w-full max-w-lg space-y-3 rounded-xl border border-orchestra-gold/30 bg-orchestra-dark p-6"><div className="flex justify-between"><h3 className="text-xl font-bold text-orchestra-gold">Add cross-site participant</h3><button onClick={()=>setShowImport(false)}><X/></button></div>{(['name','email','sourceUrl','organizationId','organizationName'] as const).map(key=><input key={key} value={participant[key]} onChange={e=>setParticipant({...participant,[key]:e.target.value})} placeholder={key.replace(/([A-Z])/g,' $1')} className="w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2"/>)}<select value={participant.sourceSite} onChange={e=>setParticipant({...participant,sourceSite:e.target.value as typeof participant.sourceSite})} className="w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2"><option value="law">law.beamthinktank.space</option><option value="forge">forge.beamthinktank.space</option><option value="orchestra">orchestra.beamthinktank.space</option></select><select value={participant.roleSlotId} onChange={e=>setParticipant({...participant,roleSlotId:e.target.value})} className="w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2"><option value="">Choose role slot…</option>{slots.map(s=><option key={s.id} value={s.id}>{s.roleLabel}</option>)}</select><button onClick={importParticipant} disabled={saving} className="w-full rounded-lg bg-orchestra-gold px-4 py-2 font-semibold text-orchestra-dark">Add participant</button></div></div>}
  </section>
}
