'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Building2, 
  FolderOpen, 
  Users, 
  Coins, 
  Plus,
  TrendingUp,
  Calendar,
  MapPin
} from 'lucide-react'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'

// Mock data for initial development
const mockData = {
  organizations: [
    { id: '1', name: 'Black Diaspora Symphony Orchestra', city: 'Milwaukee', status: 'active' },
    { id: '2', name: 'Atlanta Community Orchestra', city: 'Atlanta', status: 'active' },
    { id: '3', name: 'Orlando Youth Symphony', city: 'Orlando', status: 'planning' },
  ],
  projects: [
    { 
      id: '1', 
      organizationId: '1', 
      name: '2025 Annual Memorial Concert', 
      city: 'Milwaukee', 
      status: 'active',
      currentMusicians: 8,
      neededMusicians: 60,
      budgetUsd: 25000,
      beamCoinsTotal: 1260
    },
    { 
      id: '2', 
      organizationId: '2', 
      name: 'Spring Community Concert', 
      city: 'Atlanta', 
      status: 'planning',
      currentMusicians: 0,
      neededMusicians: 45,
      budgetUsd: 15000,
      beamCoinsTotal: 900
    },
  ],
  musicians: [
    { id: '1', name: 'Yolanda Odufuwa', city: 'Milwaukee', status: 'active', beamCoinsBalance: 45 },
    { id: '2', name: 'Nicole Gabriel', city: 'Milwaukee', status: 'active', beamCoinsBalance: 32 },
    { id: '3', name: 'Maya Schiek', city: 'Milwaukee', status: 'active', beamCoinsBalance: 28 },
  ]
}

interface DashboardStats {
  totalOrganizations: number
  activeProjects: number
  totalMusicians: number
  totalBeamCoins: number
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalOrganizations: 0,
    activeProjects: 0,
    totalMusicians: 0,
    totalBeamCoins: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // In production, this would fetch from Firestore
    // For now, using mock data
    const fetchStats = async () => {
      try {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        const totalBeamCoins = mockData.musicians.reduce((sum, musician) => sum + musician.beamCoinsBalance, 0)
        
        setStats({
          totalOrganizations: mockData.organizations.length,
          activeProjects: mockData.projects.filter(p => p.status === 'active').length,
          totalMusicians: mockData.musicians.length,
          totalBeamCoins
        })
      } catch (error) {
        console.error('Error fetching dashboard stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  const StatCard = ({ 
    title, 
    value, 
    icon: Icon, 
    color = 'orchestra-gold',
    trend 
  }: {
    title: string
    value: number | string
    icon: any
    color?: string
    trend?: { value: number; label: string }
  }) => (
    <motion.div
      className="bg-orchestra-cream/5 backdrop-blur-sm rounded-xl border border-orchestra-gold/20 p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      whileHover={{ scale: 1.02 }}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-orchestra-cream/70 text-sm font-medium">{title}</p>
          <p className={`text-3xl font-bold text-${color} mt-2`}>{value}</p>
          {trend && (
            <div className="flex items-center mt-2 text-sm text-green-400">
              <TrendingUp className="h-4 w-4 mr-1" />
              <span>{trend.value}% {trend.label}</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg bg-${color}/20`}>
          <Icon className={`h-6 w-6 text-${color}`} />
        </div>
      </div>
    </motion.div>
  )

  const ProjectRow = ({ project }: { project: any }) => (
    <motion.tr
      className="border-b border-orchestra-gold/10 hover:bg-orchestra-gold/5"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <td className="px-6 py-4">
        <div className="flex items-center">
          <Building2 className="h-5 w-5 text-orchestra-gold mr-3" />
          <div>
            <div className="font-medium text-orchestra-cream">{project.name}</div>
            <div className="text-sm text-orchestra-cream/70">{mockData.organizations.find(org => org.id === project.organizationId)?.name}</div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center text-orchestra-cream/70">
          <MapPin className="h-4 w-4 mr-2" />
          {project.city}
        </div>
      </td>
      <td className="px-6 py-4">
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
          project.status === 'active' 
            ? 'bg-green-500/20 text-green-400' 
            : 'bg-yellow-500/20 text-yellow-400'
        }`}>
          {project.status}
        </span>
      </td>
      <td className="px-6 py-4 text-orchestra-cream">
        <div className="flex items-center">
          <Users className="h-4 w-4 mr-2 text-orchestra-gold" />
          <span className="font-medium">{project.currentMusicians}</span>
          <span className="text-orchestra-cream/50 mx-1">/</span>
          <span className="text-orchestra-cream/70">{project.neededMusicians}</span>
        </div>
      </td>
      <td className="px-6 py-4 text-orchestra-cream">
        <div className="space-y-1">
          <div className="flex items-center">
            <span className="text-green-400 font-medium">${project.budgetUsd.toLocaleString()}</span>
          </div>
          <div className="flex items-center text-sm text-orchestra-gold">
            <Coins className="h-3 w-3 mr-1" />
            {project.beamCoinsTotal} BEAM
          </div>
        </div>
      </td>
    </motion.tr>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orchestra-gold"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-3xl font-bold text-orchestra-gold mb-2">BEAM Admin Dashboard</h1>
        <p className="text-orchestra-cream/70">Overview of all projects, organizations, and musicians across the BEAM ecosystem</p>
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <StatCard
          title="Total Organizations"
          value={stats.totalOrganizations}
          icon={Building2}
          trend={{ value: 12, label: 'vs last month' }}
        />
        <StatCard
          title="Active Projects"
          value={stats.activeProjects}
          icon={FolderOpen}
          trend={{ value: 8, label: 'vs last month' }}
        />
        <StatCard
          title="Total Musicians"
          value={stats.totalMusicians}
          icon={Users}
          trend={{ value: 25, label: 'vs last month' }}
        />
        <StatCard
          title="BEAM Coin Economy"
          value={`${stats.totalBeamCoins.toLocaleString()} BEAM`}
          icon={Coins}
          color="orchestra-gold"
        />
      </motion.div>

      {/* Projects Table */}
      <motion.div
        className="bg-orchestra-cream/5 backdrop-blur-sm rounded-xl border border-orchestra-gold/20 overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <div className="p-6 border-b border-orchestra-gold/20">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-orchestra-gold">Active Projects</h2>
            <motion.button
              className="flex items-center space-x-2 px-4 py-2 bg-orchestra-gold hover:bg-orchestra-gold/90 text-orchestra-dark font-medium rounded-lg transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Plus className="h-4 w-4" />
              <span>Create Project</span>
            </motion.button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-orchestra-gold/10">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-orchestra-gold uppercase tracking-wider">Project</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-orchestra-gold uppercase tracking-wider">City</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-orchestra-gold uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-orchestra-gold uppercase tracking-wider">Musicians</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-orchestra-gold uppercase tracking-wider">Budget</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-orchestra-gold/10">
              {mockData.projects.map((project, index) => (
                <ProjectRow key={project.id} project={project} />
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.6 }}
      >
        <motion.div
          className="bg-gradient-to-r from-orchestra-gold/20 to-orchestra-brown/20 backdrop-blur-sm rounded-xl border border-orchestra-gold/30 p-6"
          whileHover={{ scale: 1.02 }}
        >
          <h3 className="text-lg font-bold text-orchestra-gold mb-2">Recent Activity</h3>
          <p className="text-orchestra-cream/70 text-sm">3 new auditions submitted this week</p>
        </motion.div>
        
        <motion.div
          className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 backdrop-blur-sm rounded-xl border border-blue-500/30 p-6"
          whileHover={{ scale: 1.02 }}
        >
          <h3 className="text-lg font-bold text-blue-400 mb-2">Upcoming Events</h3>
          <p className="text-orchestra-cream/70 text-sm">2 rehearsals scheduled for next week</p>
        </motion.div>
        
        <motion.div
          className="bg-gradient-to-r from-green-500/20 to-teal-500/20 backdrop-blur-sm rounded-xl border border-green-500/30 p-6"
          whileHover={{ scale: 1.02 }}
        >
          <h3 className="text-lg font-bold text-green-400 mb-2">System Health</h3>
          <p className="text-orchestra-cream/70 text-sm">All systems operational</p>
        </motion.div>
      </motion.div>
    </div>
  )
}
