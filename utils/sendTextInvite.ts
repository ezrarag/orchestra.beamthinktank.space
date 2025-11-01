import nodemailer from 'nodemailer'

// Carrier email gateways for SMS
const CARRIER_GATEWAYS: Record<string, string> = {
  att: '@txt.att.net',
  tmobile: '@tmomail.net',
  verizon: '@vtext.com',
  sprint: '@messaging.sprintpcs.com',
  googlefi: '@msg.fi.google.com',
  uscellular: '@email.uscc.net',
  cricket: '@sms.cricketwireless.net',
  boost: '@smsmyboostmobile.com',
  metropcs: '@mymetropcs.com'
}

// Email transporter (same config as document emails)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
})

interface SendTextInviteOptions {
  phone: string
  carrier: string
  link: string
  projectName?: string
  musicianName?: string
}

/**
 * Send text invite via email gateway
 * @param phone Phone number (digits only, e.g. "4145551234")
 * @param carrier Carrier name (att, tmobile, verizon, etc.)
 * @param link Invitation confirmation link
 * @param projectName Optional project name for personalization
 * @param musicianName Optional musician name for personalization
 */
export async function sendTextInvite({
  phone,
  carrier,
  link,
  projectName = 'BEAM Orchestra',
  musicianName = ''
}: SendTextInviteOptions): Promise<{ success: boolean; error?: string }> {
  try {
    // Validate phone number (digits only, 10 digits)
    const cleanPhone = phone.replace(/\D/g, '')
    if (cleanPhone.length !== 10) {
      return { success: false, error: 'Phone number must be 10 digits' }
    }

    // Get carrier gateway
    const gateway = CARRIER_GATEWAYS[carrier.toLowerCase()]
    if (!gateway) {
      return { 
        success: false, 
        error: `Unknown carrier: ${carrier}. Supported carriers: ${Object.keys(CARRIER_GATEWAYS).join(', ')}` 
      }
    }

    // Construct email address
    const recipient = `${cleanPhone}${gateway}`

    // Create message (SMS-friendly, short)
    const message = `${musicianName ? `Hi ${musicianName}, ` : ''}You're invited to perform with ${projectName}! Confirm here: ${link}`

    // Send email
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@beamthinktank.space',
      to: recipient,
      subject: `${projectName} Invitation`,
      text: message,
      // Some carriers support HTML, keep it simple
      html: `<p>${message}</p>`,
    })

    console.log(`✅ Text invite sent to ${cleanPhone} via ${carrier} (${recipient})`)
    return { success: true }

  } catch (error) {
    console.error('Error sending text invite:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

/**
 * Get list of supported carriers
 */
export function getSupportedCarriers(): string[] {
  return Object.keys(CARRIER_GATEWAYS)
}

/**
 * Detect carrier from phone number (basic heuristic - not 100% accurate)
 * Note: This is a simplified detection. In production, consider using a phone number lookup API.
 */
export function detectCarrier(phone: string): string | null {
  const cleanPhone = phone.replace(/\D/g, '')
  
  // Very basic area code detection (not reliable, but better than nothing)
  // Common area codes per carrier (this is approximate)
  // In production, use a phone number API service
  return null // For now, return null to require manual selection
}

