type SlackAdminNotePayload = {
  title: string
  note: string
  contextPage?: string
  adminEmail: string
  adminUid: string
}

function buildAbsolutePageLink(contextPage?: string): string | null {
  if (!contextPage) {
    return null
  }

  const trimmed = contextPage.trim()
  if (!trimmed) {
    return null
  }

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed
  }

  const appUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const normalizedPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`
  return `${appUrl}${normalizedPath}`
}

export async function sendSlackAdminNoteNotification(payload: SlackAdminNotePayload): Promise<void> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL
  if (!webhookUrl) {
    throw new Error('SLACK_WEBHOOK_URL is not configured.')
  }

  const now = new Date().toISOString()
  const pageLink = buildAbsolutePageLink(payload.contextPage)

  const textLines = [
    ':memo: New admin note',
    `Title: ${payload.title}`,
    `From: ${payload.adminEmail}`,
    `Admin UID: ${payload.adminUid}`,
    pageLink ? `Page: ${pageLink}` : '',
    `Time: ${now}`,
    'Note:',
    payload.note,
  ].filter(Boolean)

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text: textLines.join('\n') }),
  })

  if (!response.ok) {
    const details = await response.text().catch(() => 'Unknown Slack error')
    throw new Error(`Slack webhook request failed: ${response.status} ${details}`)
  }
}
