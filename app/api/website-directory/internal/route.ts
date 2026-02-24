import { NextRequest, NextResponse } from 'next/server'

type DirectoryEntry = {
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

type DirectoryPayload = {
  entries: DirectoryEntry[]
}

const productionEndpoint = 'https://beamthinktank.space/api/website-directory/internal'

function resolveSourceEndpoint(request: NextRequest): string {
  const configured = process.env.BEAM_HOME_INTERNAL_DIRECTORY_URL?.trim()
  if (!configured) return productionEndpoint

  try {
    const configuredUrl = new URL(configured)
    const requestHost = request.headers.get('host')

    // Guard against accidental self-proxy loops in local/dev.
    if (requestHost && configuredUrl.host === requestHost) {
      return productionEndpoint
    }
  } catch {
    return productionEndpoint
  }

  return configured
}

export async function GET(request: NextRequest) {
  const sourceEndpoint = resolveSourceEndpoint(request)
  const debug = process.env.NODE_ENV !== 'production'

  try {
    const response = await fetch(sourceEndpoint, {
      method: 'GET',
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
      },
    })

    if (!response.ok) {
      const bodyPreview = await response.text()
      if (debug) {
        console.error('[website-directory/internal] upstream non-OK', {
          sourceEndpoint,
          status: response.status,
          bodyPreview: bodyPreview.slice(0, 500),
        })
      }
      return NextResponse.json(
        {
          entries: [],
          error: `Upstream response status ${response.status}`,
        },
        {
          headers: {
            'Cache-Control': 'no-store, max-age=0',
          },
        },
      )
    }

    const payload = (await response.json()) as Partial<DirectoryPayload>
    const entries = Array.isArray(payload.entries) ? payload.entries : []
    if (debug) {
      console.info('[website-directory/internal] upstream OK', {
        sourceEndpoint,
        count: entries.length,
      })
    }

    return NextResponse.json(
      { entries },
      {
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      },
    )
  } catch (error) {
    if (debug) {
      console.error('[website-directory/internal] upstream fetch error', {
        sourceEndpoint,
        error: error instanceof Error ? error.message : String(error),
      })
    }
    return NextResponse.json(
      {
        entries: [],
        error: error instanceof Error ? error.message : 'Unable to load website directory',
      },
      {
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      },
    )
  }
}
