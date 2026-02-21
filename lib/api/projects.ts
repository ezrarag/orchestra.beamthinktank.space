import { getNgoConfig } from '@/lib/config/ngoConfigs'
import type { ProjectSummary } from '@/lib/types/portal'

export async function fetchProjects(ngo: string): Promise<ProjectSummary[]> {
  const config = getNgoConfig(ngo)
  return config?.projects ?? []
}
