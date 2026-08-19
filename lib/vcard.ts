export interface ParsedVCard {
  name?: string
  email?: string
  phone?: string
  photo?: string
}

/**
 * Parse RFC 6350 / vCard 2.1 / 3.0 / 4.0 format from iOS, macOS, Android, Google, Outlook
 */
export function parseVCard(vcardText: string): ParsedVCard {
  const result: ParsedVCard = {}
  
  if (!vcardText || typeof vcardText !== 'string') {
    return result
  }

  // 1. Unfold lines (vCard specs fold long lines with a leading space or tab)
  const rawLines = vcardText.split(/\r\n|\r|\n/)
  const lines: string[] = []
  for (const rawLine of rawLines) {
    if ((rawLine.startsWith(' ') || rawLine.startsWith('\t')) && lines.length > 0) {
      lines[lines.length - 1] += rawLine.trim()
    } else {
      lines.push(rawLine.trim())
    }
  }

  for (const originalLine of lines) {
    if (!originalLine) continue

    // 2. Strip Apple/Outlook item group prefixes (e.g. "item1.EMAIL;...", "item2.TEL:...", "group1.FN:...")
    const cleanLine = originalLine.replace(/^[a-zA-Z0-9_-]+\./, '')
    const upperLine = cleanLine.toUpperCase()

    // 3. Extract Full Name (FN)
    if (upperLine.startsWith('FN:') || upperLine.startsWith('FN;')) {
      const colonIndex = cleanLine.indexOf(':')
      if (colonIndex !== -1) {
        const val = cleanLine.substring(colonIndex + 1).trim()
        if (val) result.name = cleanQuotedPrintable(val)
      }
    } 
    // 4. Extract Structured Name (N) as fallback
    else if (!result.name && (upperLine.startsWith('N:') || upperLine.startsWith('N;'))) {
      const colonIndex = cleanLine.indexOf(':')
      if (colonIndex !== -1) {
        const val = cleanLine.substring(colonIndex + 1).trim()
        const nameParts = val.split(';')
        const lastName = cleanQuotedPrintable(nameParts[0]?.trim() || '')
        const firstName = cleanQuotedPrintable(nameParts[1]?.trim() || '')
        const constructed = `${firstName} ${lastName}`.trim()
        if (constructed) result.name = constructed
      }
    } 
    // 5. Extract Email
    else if (upperLine.startsWith('EMAIL:') || upperLine.startsWith('EMAIL;')) {
      const colonIndex = cleanLine.indexOf(':')
      if (colonIndex !== -1 && !result.email) {
        const val = cleanLine.substring(colonIndex + 1).trim()
        if (val) result.email = val.replace(/^mailto:/i, '').trim()
      }
    } 
    // 6. Extract Phone
    else if (upperLine.startsWith('TEL:') || upperLine.startsWith('TEL;')) {
      const colonIndex = cleanLine.indexOf(':')
      if (colonIndex !== -1 && !result.phone) {
        const val = cleanLine.substring(colonIndex + 1).trim()
        if (val) result.phone = val.replace(/^tel:/i, '').trim()
      }
    } 
    // 7. Extract Photo (Base64 data or URI)
    else if (upperLine.startsWith('PHOTO:') || upperLine.startsWith('PHOTO;')) {
      const colonIndex = cleanLine.indexOf(':')
      if (colonIndex !== -1 && !result.photo) {
        const header = cleanLine.substring(0, colonIndex).toUpperCase()
        const val = cleanLine.substring(colonIndex + 1).trim()

        let mimeType = 'jpeg'
        if (header.includes('PNG')) mimeType = 'png'
        else if (header.includes('WEBP')) mimeType = 'webp'
        else if (header.includes('GIF')) mimeType = 'gif'

        if (val.startsWith('http://') || val.startsWith('https://') || val.startsWith('data:')) {
          result.photo = val
        } else if (val.length > 0) {
          // Remove spaces/newlines in Base64 string
          const cleanB64 = val.replace(/\s+/g, '')
          result.photo = `data:image/${mimeType};base64,${cleanB64}`
        }
      }
    }
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
