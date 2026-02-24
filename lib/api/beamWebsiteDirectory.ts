export type BeamWebsiteDirectoryEntry = {
  id: string
  label: string
  title: string
  subtitle: string
  url: string
  previewImageUrl?: string
  sortOrder?: number
  isActive?: boolean
  createdBy?: string
  updatedBy?: string
  source?: string
}

type BeamWebsiteDirectoryResponse = {
  entries: BeamWebsiteDirectoryEntry[]
}

export async function fetchInternalWebsiteDirectory(): Promise<BeamWebsiteDirectoryResponse> {
  const response = await fetch('/api/website-directory/internal', {
    method: 'GET',
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`Directory request failed: ${response.status}`)
  }

  const payload = (await response.json()) as Partial<BeamWebsiteDirectoryResponse>
  return {
    entries: Array.isArray(payload.entries) ? payload.entries : [],
  }
}
