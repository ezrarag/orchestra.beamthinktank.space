export interface ParsedVCard {
  name?: string
  email?: string
  phone?: string
  photo?: string
}

/**
 * Parse RFC 6350 vCard text file format
 */
export function parseVCard(vcardText: string): ParsedVCard {
  const result: ParsedVCard = {}
  const lines = vcardText.split(/\r\n|\r|\n/)

  let inPhoto = false
  let photoData = ''
  let photoType = 'jpeg'

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    // Handle multiline Base64 photo data
    if (inPhoto) {
      if (line.startsWith(' ') || line.startsWith('\t') || line.match(/^[A-Za-z0-9+/=]+$/)) {
        photoData += line.trim()
        if (line.includes(':') && !line.startsWith(' ') && !line.startsWith('\t')) {
          inPhoto = false
          if (photoData) {
            result.photo = `data:image/${photoType};base64,${photoData}`
          }
        } else {
          continue
        }
      } else {
        inPhoto = false
        if (photoData) {
          result.photo = `data:image/${photoType};base64,${photoData}`
        }
      }
    }

    // Full Name (FN)
    if (line.toUpperCase().startsWith('FN:') || line.toUpperCase().startsWith('FN;')) {
      const parts = line.split(':')
      if (parts.length >= 2) {
        const val = parts.slice(1).join(':').trim()
        if (val) result.name = val
      }
    } 
    // Structured Name (N) as fallback
    else if (!result.name && (line.toUpperCase().startsWith('N:') || line.toUpperCase().startsWith('N;'))) {
      const parts = line.split(':')
      if (parts.length >= 2) {
        const nameParts = parts.slice(1).join(':').split(';')
        const lastName = nameParts[0]?.trim() || ''
        const firstName = nameParts[1]?.trim() || ''
        const constructed = `${firstName} ${lastName}`.trim()
        if (constructed) result.name = constructed
      }
    } 
    // Email
    else if (line.toUpperCase().startsWith('EMAIL:') || line.toUpperCase().startsWith('EMAIL;')) {
      const parts = line.split(':')
      if (parts.length >= 2 && !result.email) {
        result.email = parts.slice(1).join(':').trim()
      }
    } 
    // Phone
    else if (line.toUpperCase().startsWith('TEL:') || line.toUpperCase().startsWith('TEL;')) {
      const parts = line.split(':')
      if (parts.length >= 2 && !result.phone) {
        result.phone = parts.slice(1).join(':').trim()
      }
    } 
    // Photo (Base64 or URI)
    else if (line.toUpperCase().startsWith('PHOTO;') || line.toUpperCase().startsWith('PHOTO:')) {
      const colonIndex = line.indexOf(':')
      if (colonIndex !== -1) {
        const header = line.substring(0, colonIndex).toUpperCase()
        const val = line.substring(colonIndex + 1).trim()

        if (header.includes('PNG')) photoType = 'png'
        else if (header.includes('WEBP')) photoType = 'webp'
        else photoType = 'jpeg'

        if (val.startsWith('http://') || val.startsWith('https://') || val.startsWith('data:')) {
          result.photo = val
        } else if (val.length > 0) {
          photoData = val
          inPhoto = true
        }
      }
    }
  }

  if (inPhoto && photoData && !result.photo) {
    result.photo = `data:image/${photoType};base64,${photoData}`
  }

  return result
}
