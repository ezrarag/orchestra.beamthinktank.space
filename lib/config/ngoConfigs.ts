import { orchestraConfig } from '@/lib/config/orchestraConfig'
import type { NGOConfig } from '@/lib/types/portal'

export const DEFAULT_NGO = 'orchestra'

export const ngoConfigs: Record<string, NGOConfig> = {
  [orchestraConfig.id]: orchestraConfig,
}

export function getNgoConfig(ngo?: string): NGOConfig | null {
  const key = ngo ?? DEFAULT_NGO
  return ngoConfigs[key] ?? null
}
