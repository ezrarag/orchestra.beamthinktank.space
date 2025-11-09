import { adminDb } from './firebase-admin'

export interface GoogleTokens {
  accessToken: string
  refreshToken: string
  expiresAt: Date
}

/**
 * Get stored Google OAuth tokens from Firestore
 */
export async function getGoogleTokens(): Promise<GoogleTokens | null> {
  try {
    const doc = await adminDb.collection('integrations').doc('google').get()
    if (!doc.exists) {
      return null
    }

    const data = doc.data()
    if (!data || !data.accessToken) {
      return null
    }

    return {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      expiresAt: data.expiresAt.toDate(),
    }
  } catch (error) {
    console.error('Error getting Google tokens:', error)
    return null
  }
}

/**
 * Refresh Google OAuth access token using refresh token
 */
export async function refreshGoogleToken(refreshToken: string): Promise<string | null> {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET

    if (!clientId || !clientSecret) {
      console.error('Google OAuth credentials not configured')
      return null
    }

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('Token refresh error:', error)
      return null
    }

    const tokens = await response.json()

    // Update stored tokens
    await adminDb.collection('integrations').doc('google').update({
      accessToken: tokens.access_token,
      expiresAt: new Date(Date.now() + (tokens.expires_in * 1000)),
      updatedAt: new Date(),
    })

    return tokens.access_token
  } catch (error) {
    console.error('Error refreshing Google token:', error)
    return null
  }
}

/**
 * Get a valid Google access token (refreshes if needed)
 */
export async function getValidAccessToken(): Promise<string | null> {
  const tokens = await getGoogleTokens()
  if (!tokens) {
    return null
  }

  // Check if token is expired (with 5 minute buffer)
  const now = new Date()
  const expiresAt = new Date(tokens.expiresAt)
  expiresAt.setMinutes(expiresAt.getMinutes() - 5)

  if (now >= expiresAt) {
    // Token expired, refresh it
    const newToken = await refreshGoogleToken(tokens.refreshToken)
    return newToken
  }

  return tokens.accessToken
}

/**
 * Search Gmail for messages matching query
 */
export async function searchGmail(query: string, maxResults: number = 50): Promise<any[]> {
  const accessToken = await getValidAccessToken()
  if (!accessToken) {
    throw new Error('Google OAuth not connected. Please authorize in Settings.')
  }

  // First, search for message IDs
  const searchResponse = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=${maxResults}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  )

  if (!searchResponse.ok) {
    const error = await searchResponse.json()
    throw new Error(`Gmail API error: ${error.error?.message || 'Unknown error'}`)
  }

  const searchData = await searchResponse.json()
  const messageIds = searchData.messages?.map((m: any) => m.id) || []

  // Fetch full message details
  const messages = await Promise.all(
    messageIds.map(async (id: string) => {
      const messageResponse = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      )

      if (!messageResponse.ok) {
        return null
      }

      const messageData = await messageResponse.json()
      
      // Extract headers
      const headers = messageData.payload?.headers || []
      const getHeader = (name: string) => 
        headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || ''

      // Decode body
      let snippet = messageData.snippet || ''
      const bodyParts = messageData.payload?.parts || []
      if (bodyParts.length > 0) {
        const textPart = bodyParts.find((p: any) => p.mimeType === 'text/plain')
        if (textPart?.body?.data) {
          snippet = Buffer.from(textPart.body.data, 'base64').toString('utf-8')
        }
      }

      return {
        id: messageData.id,
        threadId: messageData.threadId,
        from: getHeader('from'),
        to: getHeader('to'),
        subject: getHeader('subject'),
        date: getHeader('date'),
        snippet: snippet.substring(0, 500), // Limit snippet length
        fullMessage: messageData,
      }
    })
  )

  return messages.filter(Boolean)
}

/**
 * Search Google Drive for documents
 */
export async function searchGoogleDocs(query: string, maxResults: number = 50): Promise<any[]> {
  const accessToken = await getValidAccessToken()
  if (!accessToken) {
    throw new Error('Google OAuth not connected. Please authorize in Settings.')
  }

  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&maxResults=${maxResults}&fields=files(id,name,mimeType,webViewLink,modifiedTime,createdTime)`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  )

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`Drive API error: ${error.error?.message || 'Unknown error'}`)
  }

  const data = await response.json()
  return data.files || []
}

/**
 * Extract potential musician information from email
 */
export function extractMusicianInfo(email: any): {
  name: string
  email: string
  phone?: string
  instrument?: string
  notes: string
} {
  // Parse "From" field (e.g., "John Doe <john@example.com>")
  const fromMatch = email.from.match(/^(.+?)\s*<(.+?)>$|^(.+)$/)
  const name = fromMatch ? (fromMatch[1] || fromMatch[3] || '').trim() : email.from
  const emailAddress = fromMatch?.[2] || email.from

  // Try to extract phone number from snippet
  const phoneMatch = email.snippet.match(/(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\d{10})/)
  const phone = phoneMatch ? phoneMatch[1] : undefined

  // Try to extract instrument mentions
  const instruments = ['violin', 'viola', 'cello', 'bass', 'flute', 'oboe', 'clarinet', 'bassoon', 'trumpet', 'horn', 'trombone', 'tuba', 'percussion', 'piano', 'harp']
  const instrumentMatch = instruments.find(inst => 
    email.snippet.toLowerCase().includes(inst) || email.subject.toLowerCase().includes(inst)
  )
  const instrument = instrumentMatch ? instrumentMatch.charAt(0).toUpperCase() + instrumentMatch.slice(1) : undefined

  return {
    name,
    email: emailAddress,
    phone,
    instrument,
    notes: `Found in email: "${email.subject}" - ${email.snippet.substring(0, 200)}`,
  }
}

