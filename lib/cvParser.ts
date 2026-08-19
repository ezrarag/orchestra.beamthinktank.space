export interface ParsedCVData {
  fullName?: string
  email?: string
  phone?: string
  disciplineTags?: string[]
  education?: string
  bio?: string
}

/**
 * Parse raw text content extracted from uploaded CV / Resume files (.pdf, .docx, .txt, .md)
 */
export function parseCVText(text: string): ParsedCVData {
  const result: ParsedCVData = {
    disciplineTags: []
  }

  if (!text || typeof text !== 'string') return result

  const lines = text.split(/\r\n|\r|\n/).map(l => l.trim()).filter(Boolean)

  // 1. Email extraction
  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)
  if (emailMatch) {
    result.email = emailMatch[0]
  }

  // 2. Phone extraction
  const phoneMatch = text.match(/(?:\+?\d{1,3}[ -]?)?\(?\d{3}\)?[ -]?\d{3}[ -]?\d{4}/)
  if (phoneMatch) {
    result.phone = phoneMatch[0]
  }

  // 3. Name (line starting with Name: or first clean title line)
  const nameLine = lines.find(l => /^name\s*:/i.test(l))
  if (nameLine) {
    result.fullName = nameLine.replace(/^name\s*:/i, '').trim()
  } else if (lines.length > 0 && lines[0].length < 45 && !lines[0].includes('@') && !/curriculum|resume|page/i.test(lines[0])) {
    result.fullName = lines[0].trim()
  }

  // 4. Discipline & Role Tags extraction
  const tagsSet = new Set<string>()
  const roleKeywords = [
    'Resident Cellist', 'Cellist', 'Violoncello', 'Cello', 'Section Leader', 'Principal Cello',
    'Violin', 'Viola', 'Double Bass', 'Conductor', 'Composer',
    'Steinway Recording Specialist', 'Piano Technician', 'Media Producer', 'Media Editor',
    'Chamber Musician', 'Orchestra Member', 'Audio Engineer', 'Repertoire Specialist'
  ]

  for (const keyword of roleKeywords) {
    if (new RegExp(`\\b${keyword.replace('/', '\\/')}\\b`, 'i').test(text)) {
      tagsSet.add(keyword)
    }
  }

  if (tagsSet.size > 0) {
    result.disciplineTags = Array.from(tagsSet)
  }

  // 5. Education extraction
  const eduIndex = lines.findIndex(l => /education|degree|university|conservatory|bachelor|master|doctor/i.test(l))
  if (eduIndex !== -1 && eduIndex + 1 < lines.length) {
    result.education = lines.slice(eduIndex, Math.min(eduIndex + 3, lines.length)).join(' — ')
  }

  // 6. Bio / Summary extraction
  const summaryIndex = lines.findIndex(l => /summary|biography|bio|profile|about/i.test(l))
  if (summaryIndex !== -1 && summaryIndex + 1 < lines.length) {
    result.bio = lines.slice(summaryIndex + 1, Math.min(summaryIndex + 4, lines.length)).join(' ')
  } else {
    const longLines = lines.filter(l => l.length > 50 && !l.includes('@') && !/education|experience|skills/i.test(l))
    if (longLines.length > 0) {
      result.bio = longLines.slice(0, 2).join(' ')
    }
  }

  return result
}
