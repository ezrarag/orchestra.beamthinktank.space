import fs from 'fs'
import path from 'path'

const root = process.cwd()
const dataDir = path.join(root, 'scripts', 'data')

function getNormalizedMediaPath(url) {
  try {
    return decodeURIComponent(new URL(url, 'http://localhost').pathname).toLowerCase()
  } catch {
    return String(url).split('?')[0]?.toLowerCase() ?? ''
  }
}

function isMp4Like(url) {
  const pathName = getNormalizedMediaPath(url)
  return pathName.endsWith('.mp4') || pathName.endsWith('.m4v')
}

function isAdaptive(url) {
  const normalized = String(url).toLowerCase()
  const pathName = getNormalizedMediaPath(url)
  return pathName.endsWith('.m3u8') || normalized.includes('format=m3u8')
}

function walkJsonFiles(dir) {
  const files = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...walkJsonFiles(fullPath))
      continue
    }
    if (entry.isFile() && entry.name.endsWith('.json')) {
      files.push(fullPath)
    }
  }
  return files
}

function inspectNode(node, refPath, filePath, issues) {
  if (Array.isArray(node)) {
    node.forEach((value, index) => inspectNode(value, `${refPath}[${index}]`, filePath, issues))
    return
  }

  if (!node || typeof node !== 'object') {
    return
  }

  for (const [key, value] of Object.entries(node)) {
    const nextPath = refPath ? `${refPath}.${key}` : key
    if (typeof value === 'string' && (key === 'videoUrl' || key === 'hlsUrl' || key === 'explainerVideoUrl')) {
      const trimmed = value.trim()
      if (!trimmed) continue

      if (key === 'hlsUrl') {
        issues.push({
          file: filePath,
          path: nextPath,
          type: 'deprecated-hls',
          value: trimmed,
        })
        continue
      }

      if (isAdaptive(trimmed)) {
        issues.push({
          file: filePath,
          path: nextPath,
          type: key === 'explainerVideoUrl' ? 'adaptive-explainer-video-url' : 'adaptive-video-url',
          value: trimmed,
        })
        continue
      }

      if (!isMp4Like(trimmed)) {
        issues.push({
          file: filePath,
          path: nextPath,
          type: key === 'explainerVideoUrl' ? 'non-mp4-explainer-video-url' : 'non-mp4-video-url',
          value: trimmed,
        })
      }
    }

    inspectNode(value, nextPath, filePath, issues)
  }
}

const issues = []
for (const filePath of walkJsonFiles(dataDir)) {
  const raw = fs.readFileSync(filePath, 'utf8')
  const parsed = JSON.parse(raw)
  inspectNode(parsed, '', path.relative(root, filePath), issues)
}

if (issues.length === 0) {
  console.log('Viewer media audit passed: only direct MP4/M4V videoUrl values were found.')
  process.exit(0)
}

console.log(`Viewer media audit found ${issues.length} issue(s):`)
for (const issue of issues) {
  console.log(`- [${issue.type}] ${issue.file} :: ${issue.path}`)
  console.log(`  ${issue.value}`)
}

process.exitCode = 1
