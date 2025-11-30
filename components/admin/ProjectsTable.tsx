'use client'

import Link from 'next/link'
import { Building2, MapPin, Users, DollarSign, AlertCircle } from 'lucide-react'

interface Project {
  id: string
  name: string
  city: string
  confirmedMusicians: number
  totalMusicians: number
  progress: number
  revenue: number
  missingTasks: number
}

interface ProjectsTableProps {
  projects: Project[]
}

export default function ProjectsTable({ projects }: ProjectsTableProps) {
  return (
    <div className="bg-orchestra-cream/5 backdrop-blur-sm rounded-xl border border-orchestra-gold/20 overflow-hidden">
      <div className="p-6 border-b border-orchestra-gold/20">
        <h2 className="text-xl font-bold text-orchestra-gold">Projects Snapshot</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-orchestra-gold/10">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-orchestra-gold uppercase tracking-wider">
                Project
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-orchestra-gold uppercase tracking-wider">
                City
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-orchestra-gold uppercase tracking-wider">
                Musicians
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-orchestra-gold uppercase tracking-wider">
                Progress
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-orchestra-gold uppercase tracking-wider">
                Revenue
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-orchestra-gold uppercase tracking-wider">
                Tasks
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-orchestra-gold/10">
            {projects.map((project) => (
              <tr
                key={project.id}
                className="hover:bg-orchestra-gold/5 transition-colors"
              >
                <td className="px-6 py-4">
                  <Link
                    href={`/admin/projects/${project.id}`}
                    className="flex items-center space-x-2 font-medium text-orchestra-cream hover:text-orchestra-gold transition-colors"
                  >
                    <Building2 className="h-4 w-4 text-orchestra-gold" />
                    <span>{project.name}</span>
                  </Link>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-2 text-orchestra-cream/70">
                    <MapPin className="h-4 w-4" />
                    <span>{project.city}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-2 text-orchestra-cream">
                    <Users className="h-4 w-4 text-orchestra-gold" />
                    <span className="font-medium">{project.confirmedMusicians}</span>
                    <span className="text-orchestra-cream/50">/</span>
                    <span className="text-orchestra-cream/70">{project.totalMusicians}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-24 bg-orchestra-gold/10 rounded-full h-2">
                      <div
                        className="bg-orchestra-gold h-2 rounded-full transition-all"
                        style={{ width: `${Math.min(project.progress, 100)}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-orchestra-gold">
                      {Math.round(project.progress)}%
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-2 text-green-400">
                    <DollarSign className="h-4 w-4" />
                    <span className="font-medium">
                      ${project.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  {project.missingTasks > 0 ? (
                    <div className="flex items-center space-x-2 text-red-400">
                      <AlertCircle className="h-4 w-4" />
                      <span className="font-medium">{project.missingTasks}</span>
                    </div>
                  ) : (
                    <span className="text-green-400">0</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

