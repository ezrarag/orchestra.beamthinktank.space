export interface ParsedVCard {
  name?: string
  email?: string
  phone?: string
  photo?: string
}

/**
 * Robust RFC 6350 / vCard 2.1 / 3.0 / 4.0 parser supporting multiline Base64 photos,
 * Apple/Outlook group prefixes (item1.PHOTO), Quoted-Printable, and URI photos.
 */
export function parseVCard(vcardText: string): ParsedVCard {
  const result: ParsedVCard = {}
  
  if (!vcardText || typeof vcardText !== 'string') {
    return result
  }

  const rawLines = vcardText.split(/\r\n|\r|\n/)
  let inPhotoBlock = false
  let photoMime = 'jpeg'
  let photoBuffer = ''

  for (let i = 0; i < rawLines.length; i++) {
    const raw = rawLines[i]
    const trimmed = raw.trim()
    if (!trimmed) continue

    // Remove Apple/Outlook property prefixes like "item1.", "item2.", "group1."
    const clean = trimmed.replace(/^[a-zA-Z0-9_-]+\./, '')
    const upper = clean.toUpperCase()

    // 1. Photo Property Detection
    if (upper.startsWith('PHOTO:') || upper.startsWith('PHOTO;')) {
      inPhotoBlock = true
      photoBuffer = ''
      
      if (upper.includes('PNG')) photoMime = 'png'
      else if (upper.includes('WEBP')) photoMime = 'webp'
      else if (upper.includes('GIF')) photoMime = 'gif'
      else photoMime = 'jpeg'

      const colonIdx = clean.indexOf(':')
      if (colonIdx !== -1) {
        const val = clean.substring(colonIdx + 1).trim()
        if (val.startsWith('http://') || val.startsWith('https://') || val.startsWith('data:')) {
          result.photo = val
          inPhotoBlock = false
        } else if (val.length > 0) {
          photoBuffer += val.replace(/\s+/g, '')
        }
      }
      continue
    }

    // 2. Multiline Photo Accumulation
    if (inPhotoBlock) {
      // If we encounter another standard vCard field tag (e.g. "REV:", "END:", "VERSION:", "TEL:", "EMAIL:", "N:"), finalize photo
      if (upper.includes(':') && /^[A-Z0-9_-]+(;[A-Z0-9_=-]+)*:/.test(upper)) {
        inPhotoBlock = false
        if (photoBuffer && !result.photo) {
          result.photo = `data:image/${photoMime};base64,${photoBuffer}`
        }
      } else {
        photoBuffer += trimmed.replace(/\s+/g, '')
        continue
      }
    }

    // 3. Full Name (FN)
    if (upper.startsWith('FN:') || upper.startsWith('FN;')) {
      const colonIdx = clean.indexOf(':')
      if (colonIdx !== -1) {
        const val = clean.substring(colonIdx + 1).trim()
        if (val) result.name = cleanQuotedPrintable(val)
      }
    } 
    // 4. Structured Name (N) Fallback
    else if (!result.name && (upper.startsWith('N:') || upper.startsWith('N;'))) {
      const colonIdx = clean.indexOf(':')
      if (colonIdx !== -1) {
        const val = clean.substring(colonIdx + 1).trim()
        const nameParts = val.split(';')
        const lastName = cleanQuotedPrintable(nameParts[0]?.trim() || '')
        const firstName = cleanQuotedPrintable(nameParts[1]?.trim() || '')
        const constructed = `${firstName} ${lastName}`.trim()
        if (constructed) result.name = constructed
      }
    } 
    // 5. Email
    else if (upper.startsWith('EMAIL:') || upper.startsWith('EMAIL;')) {
      const colonIdx = clean.indexOf(':')
      if (colonIdx !== -1 && !result.email) {
        const val = clean.substring(colonIdx + 1).trim()
        if (val) result.email = val.replace(/^mailto:/i, '').trim()
      }
    } 
    // 6. Phone
    else if (upper.startsWith('TEL:') || upper.startsWith('TEL;')) {
      const colonIdx = clean.indexOf(':')
      if (colonIdx !== -1 && !result.phone) {
        const val = clean.substring(colonIdx + 1).trim()
        if (val) result.phone = val.replace(/^tel:/i, '').trim()
      }
    }
  }

  if (inPhotoBlock && photoBuffer && !result.photo) {
    result.photo = `data:image/${photoMime};base64,${photoBuffer}`
  }

  return result
}

function cleanQuotedPrintable(str: string): string {
  if (!str) return ''
  return str
    .replace(/=([0-9A-F]{2})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/;/g, ' ')
    .trim()
}
