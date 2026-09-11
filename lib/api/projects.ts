import type { ProjectSummary } from '@/lib/types/portal'
import { fetchRecordingProjects } from '@/lib/api/recordingProjects'

export async function fetchProjects(_ngo: string): Promise<ProjectSummary[]> {
  try {
    const projects = await fetchRecordingProjects()
    return projects.map((p) => {
      let status: 'Planning' | 'Active' | 'In Review' = 'Active'
      if (p.status === 'pending_review') status = 'In Review'
      else if (p.status === 'recording' || p.status === 'mixing') status = 'Planning'
      return {
        id: p.id,
        name: p.title,
        summary: p.description || `Composer: ${p.composer}`,
        status,
        href: `/musician/select-project`,
      }
    })
  } catch (error) {
    console.error('Error in fetchProjects:', error)
    return []
  }
}
