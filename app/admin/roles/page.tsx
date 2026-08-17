'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Settings, 
  Plus, 
  Edit3, 
  Trash2, 
  Check, 
  X, 
  MapPin, 
  Building2, 
  Music, 
  Wrench, 
  Video, 
  ShieldCheck, 
  Loader2,
  Sparkles,
  ToggleLeft,
  ToggleRight
} from 'lucide-react'
import { 
  getSystemRoles, 
  upsertSystemRole, 
  toggleSystemRoleActive, 
  deleteSystemRole, 
  SystemRoleDoc, 
  RoleCategory,
  DEFAULT_SYSTEM_ROLES 
} from '@/lib/systemRoles'
import { 
  getRegionalNodes, 
  upsertRegionalNode, 
  deleteRegionalNode, 
  RegionalNodeDoc, 
  DEFAULT_REGIONAL_NODES 
} from '@/lib/systemNodes'

export default function AdminRolesAndNodesPage() {
  const [activeTab, setActiveTab] = useState<'disciplines' | 'nodes'>('disciplines')
  const [roles, setRoles] = useState<SystemRoleDoc[]>(DEFAULT_SYSTEM_ROLES)
  const [nodes, setNodes] = useState<RegionalNodeDoc[]>(DEFAULT_REGIONAL_NODES)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [filterCategory, setFilterCategory] = useState<string>('all')

  // New Role Form State
  const [showRoleModal, setShowRoleModal] = useState(false)
  const [editingRole, setEditingRole] = useState<SystemRoleDoc | null>(null)
  const [roleTitle, setRoleTitle] = useState('')
  const [roleCategory, setRoleCategory] = useState<RoleCategory>('performance')
  const [roleDescription, setRoleDescription] = useState('')

  // New Node Form State
  const [showNodeModal, setShowNodeModal] = useState(false)
  const [editingNode, setEditingNode] = useState<RegionalNodeDoc | null>(null)
  const [nodeName, setNodeName] = useState('')
  const [nodeCityState, setNodeCityState] = useState('')
  const [nodeFacilityPartner, setNodeFacilityPartner] = useState('')
  const [nodeProjectAnchor, setNodeProjectAnchor] = useState('')
  const [nodeStatus, setNodeStatus] = useState<'Active' | 'Upcoming' | 'Planning'>('Active')
  const [nodeNotes, setNodeNotes] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [fetchedRoles, fetchedNodes] = await Promise.all([
        getSystemRoles(),
        getRegionalNodes()
      ])
      setRoles(fetchedRoles)
      setNodes(fetchedNodes)
    } catch (err) {
      console.error('Failed to load system config data:', err)
    } finally {
      setLoading(false)
    }
  }

  // Handle Save System Role
  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!roleTitle.trim()) return

    setSaving(true)
    try {
      const roleDoc: SystemRoleDoc = {
        id: editingRole ? editingRole.id : roleTitle.toLowerCase().replace(/[^a-z0-9]/g, '_'),
        title: roleTitle.trim(),
        category: roleCategory,
        description: roleDescription.trim() || undefined,
        active: editingRole ? editingRole.active : true,
      }
      await upsertSystemRole(roleDoc)
      setShowRoleModal(false)
      setEditingRole(null)
      setRoleTitle('')
      setRoleDescription('')
      await loadData()
    } catch (err) {
      console.error('Error saving role:', err)
      alert('Failed to save discipline role.')
    } finally {
      setSaving(false)
    }
  }

  // Handle Toggle Active Role
  const handleToggleRoleActive = async (role: SystemRoleDoc) => {
    try {
      await toggleSystemRoleActive(role.id, !role.active)
      setRoles(prev => prev.map(r => r.id === role.id ? { ...r, active: !r.active } : r))
    } catch (err) {
      console.error('Error toggling role:', err)
    }
  }

  // Handle Delete Role
  const handleDeleteRole = async (id: string) => {
    if (!confirm('Are you sure you want to delete this discipline role?')) return
    try {
      await deleteSystemRole(id)
      setRoles(prev => prev.filter(r => r.id !== id))
    } catch (err) {
      console.error('Error deleting role:', err)
    }
  }

  // Handle Save Regional Node
  const handleSaveNode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nodeName.trim() || !nodeCityState.trim()) return

    setSaving(true)
    try {
      const nodeDoc: RegionalNodeDoc = {
        id: editingNode ? editingNode.id : `node_${nodeName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
        name: nodeName.trim(),
        cityState: nodeCityState.trim(),
        coordinates: editingNode ? editingNode.coordinates : { lat: 43.0389, lng: -87.9065 },
        facilityPartner: nodeFacilityPartner.trim() || 'Partner Venue',
        projectAnchor: nodeProjectAnchor.trim() || 'BEAM Contract Project',
        status: nodeStatus,
        notes: nodeNotes.trim() || undefined
      }
      await upsertRegionalNode(nodeDoc)
      setShowNodeModal(false)
      setEditingNode(null)
      setNodeName('')
      setNodeCityState('')
      setNodeFacilityPartner('')
      setNodeProjectAnchor('')
      setNodeNotes('')
      await loadData()
    } catch (err) {
      console.error('Error saving node:', err)
      alert('Failed to save regional node.')
    } finally {
      setSaving(false)
    }
  }

  // Handle Delete Node
  const handleDeleteNode = async (id: string) => {
    if (!confirm('Are you sure you want to delete this regional node?')) return
    try {
      await deleteRegionalNode(id)
      setNodes(prev => prev.filter(n => n.id !== id))
    } catch (err) {
      console.error('Error deleting node:', err)
    }
  }

  const filteredRoles = roles.filter(r => {
    if (filterCategory === 'all') return true
    return r.category === filterCategory
  })

  return (
    <div className="space-y-8 text-white max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-purple-900/40 via-slate-900 to-blue-900/40 p-6 sm:p-8 rounded-3xl border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center space-x-2 text-xs uppercase tracking-[0.25em] text-purple-400 font-bold mb-2">
            <Settings className="w-4 h-4 text-purple-400" />
            <span>[SYSTEM] Global Admin Configuration</span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Role, Discipline & Regional Node Manager</h1>
          <p className="text-gray-300 text-sm mt-1 max-w-2xl">
            Configure dynamic participant disciplines, trade roles (luthier, piano tech, conductor), and regional active nodes.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-white/5 rounded-2xl p-1.5 border border-white/10">
          <button
            onClick={() => setActiveTab('disciplines')}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'disciplines'
                ? 'bg-purple-600 text-white shadow-lg'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Disciplines & Roles ({roles.length})
          </button>
          <button
            onClick={() => setActiveTab('nodes')}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'nodes'
                ? 'bg-purple-600 text-white shadow-lg'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Regional Active Nodes ({nodes.length})
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex justify-center items-center text-gray-400 gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
          <span>Loading system configuration...</span>
        </div>
      ) : activeTab === 'disciplines' ? (
        /* TAB 1: Disciplines & Roles Manager */
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/[0.02] p-4 rounded-2xl border border-white/10">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Category Filter:</span>
              <button
                onClick={() => setFilterCategory('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${filterCategory === 'all' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'text-gray-400 hover:text-white'}`}
              >
                All
              </button>
              <button
                onClick={() => setFilterCategory('performance')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${filterCategory === 'performance' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'text-gray-400 hover:text-white'}`}
              >
                Performance
              </button>
              <button
                onClick={() => setFilterCategory('production')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${filterCategory === 'production' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'text-gray-400 hover:text-white'}`}
              >
                Production
              </button>
              <button
                onClick={() => setFilterCategory('craft_and_technical')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${filterCategory === 'craft_and_technical' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'text-gray-400 hover:text-white'}`}
              >
                Craft & Technical
              </button>
            </div>

            <button
              onClick={() => {
                setEditingRole(null)
                setRoleTitle('')
                setRoleCategory('performance')
                setRoleDescription('')
                setShowRoleModal(true)
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg transition-all"
            >
              <Plus className="w-4 h-4" /> Add Discipline / Trade Role
            </button>
          </div>

          {/* Roles Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRoles.map((role) => (
              <div
                key={role.id}
                className={`p-5 rounded-2xl border transition-all ${
                  role.active
                    ? 'bg-white/5 border-white/10 hover:border-purple-500/30'
                    : 'bg-white/[0.02] border-white/5 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-base text-white">{role.title}</h3>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded capitalize ${
                        role.category === 'performance'
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                          : role.category === 'production'
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}>
                        {role.category.replace(/_/g, ' ')}
                      </span>
                    </div>
                    {role.description && (
                      <p className="text-xs text-gray-300 mt-2 leading-relaxed">{role.description}</p>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs">
                  <button
                    onClick={() => handleToggleRoleActive(role)}
                    className={`font-semibold flex items-center gap-1.5 ${
                      role.active ? 'text-green-400 hover:text-green-300' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {role.active ? <ToggleRight className="w-4 h-4 text-green-400" /> : <ToggleLeft className="w-4 h-4 text-gray-500" />}
                    <span>{role.active ? 'Active' : 'Deactivated'}</span>
                  </button>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        setEditingRole(role)
                        setRoleTitle(role.title)
                        setRoleCategory(role.category)
                        setRoleDescription(role.description || '')
                        setShowRoleModal(true)
                      }}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 transition-colors"
                      title="Edit"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteRole(role.id)}
                      className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-300 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* TAB 2: Regional Active Nodes Manager */
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-white/[0.02] p-4 rounded-2xl border border-white/10">
            <div>
              <h2 className="text-lg font-bold text-white">Regional Active Nodes & Project Anchors</h2>
              <p className="text-xs text-gray-400">Configure facility partners (Steinway Gallery, Symphony Centers) and project hubs.</p>
            </div>
            <button
              onClick={() => {
                setEditingNode(null)
                setNodeName('')
                setNodeCityState('')
                setNodeFacilityPartner('')
                setNodeProjectAnchor('')
                setNodeStatus('Active')
                setNodeNotes('')
                setShowNodeModal(true)
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg transition-all"
            >
              <Plus className="w-4 h-4" /> Add Regional Node
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {nodes.map((node) => (
              <div key={node.id} className="bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">{node.cityState}</span>
                    <h3 className="text-xl font-bold text-white mt-0.5">{node.name}</h3>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                    node.status === 'Active' ? 'bg-green-500/20 text-green-300 border border-green-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}>
                    {node.status}
                  </span>
                </div>

                <div className="space-y-2 text-xs text-gray-300 bg-black/30 rounded-xl p-4 border border-white/10">
                  <div>
                    <span className="text-gray-400 font-semibold block">Facility Partner:</span>
                    <span className="text-white font-medium">{node.facilityPartner}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 font-semibold block">Project Anchor:</span>
                    <span className="text-purple-300 font-medium">{node.projectAnchor}</span>
                  </div>
                  {node.notes && (
                    <div>
                      <span className="text-gray-400 font-semibold block">Notes:</span>
                      <span className="text-gray-300">{node.notes}</span>
                    </div>
                  )}
                </div>

                <div className="flex justify-end space-x-2 pt-2 border-t border-white/10 text-xs">
                  <button
                    onClick={() => {
                      setEditingNode(node)
                      setNodeName(node.name)
                      setNodeCityState(node.cityState)
                      setNodeFacilityPartner(node.facilityPartner)
                      setNodeProjectAnchor(node.projectAnchor)
                      setNodeStatus(node.status)
                      setNodeNotes(node.notes || '')
                      setShowNodeModal(true)
                    }}
                    className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 transition-colors"
                  >
                    Edit Node
                  </button>
                  <button
                    onClick={() => handleDeleteNode(node.id)}
                    className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-300 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Role Modal */}
      {showRoleModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-slate-900 border border-white/15 rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold text-white">{editingRole ? 'Edit Discipline Role' : 'Add Discipline / Trade Role'}</h3>
              <button onClick={() => setShowRoleModal(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleSaveRole} className="space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 block mb-1">Title / Discipline Name *</label>
                <input
                  type="text"
                  value={roleTitle}
                  onChange={(e) => setRoleTitle(e.target.value)}
                  placeholder="e.g. Piano Technician / Tuner, Luthier, Acoustic Engineer"
                  required
                  className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-400"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 block mb-1">Category *</label>
                <select
                  value={roleCategory}
                  onChange={(e) => setRoleCategory(e.target.value as RoleCategory)}
                  className="w-full bg-slate-800 border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-400"
                >
                  <option value="performance">Performance (Violin, Cello, Conductor)</option>
                  <option value="production">Production (Audio Mixer, Video Editor, Stage Mgr)</option>
                  <option value="craft_and_technical">Craft & Technical (Piano Tech, Luthier, Acoustic Eng)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 block mb-1">Description (Optional)</label>
                <textarea
                  value={roleDescription}
                  onChange={(e) => setRoleDescription(e.target.value)}
                  placeholder="Responsibilities, trade skills, and equipment context..."
                  rows={3}
                  className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-400 resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                <button type="button" onClick={() => setShowRoleModal(false)} className="px-4 py-2 text-xs text-gray-400 hover:text-white font-semibold">Cancel</button>
                <button type="submit" disabled={saving} className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all disabled:opacity-50">
                  {saving ? 'Saving...' : 'Save Role'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Node Modal */}
      {showNodeModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-slate-900 border border-white/15 rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold text-white">{editingNode ? 'Edit Regional Node' : 'Add Regional Active Node'}</h3>
              <button onClick={() => setShowNodeModal(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleSaveNode} className="space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 block mb-1">Node Name *</label>
                <input
                  type="text"
                  value={nodeName}
                  onChange={(e) => setNodeName(e.target.value)}
                  placeholder="e.g. Atlanta Regional Node or Steinway Orlando Node"
                  required
                  className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-400"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 block mb-1">City, State *</label>
                <input
                  type="text"
                  value={nodeCityState}
                  onChange={(e) => setNodeCityState(e.target.value)}
                  placeholder="e.g. Atlanta, GA or Tampa, FL"
                  required
                  className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-400"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 block mb-1">Facility Partner</label>
                <input
                  type="text"
                  value={nodeFacilityPartner}
                  onChange={(e) => setNodeFacilityPartner(e.target.value)}
                  placeholder="e.g. Steinway Gallery Node — Orlando or Atlanta Symphony Center"
                  className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-400"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 block mb-1">Project Anchor</label>
                <input
                  type="text"
                  value={nodeProjectAnchor}
                  onChange={(e) => setNodeProjectAnchor(e.target.value)}
                  placeholder="e.g. Black Diaspora Symphony Orchestra or Concord Symphony"
                  className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-400"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 block mb-1">Status</label>
                <select
                  value={nodeStatus}
                  onChange={(e) => setNodeStatus(e.target.value as any)}
                  className="w-full bg-slate-800 border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-400"
                >
                  <option value="Active">Active</option>
                  <option value="Upcoming">Upcoming</option>
                  <option value="Planning">Planning</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                <button type="button" onClick={() => setShowNodeModal(false)} className="px-4 py-2 text-xs text-gray-400 hover:text-white font-semibold">Cancel</button>
                <button type="submit" disabled={saving} className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all disabled:opacity-50">
                  {saving ? 'Saving...' : 'Save Node'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  )
}
