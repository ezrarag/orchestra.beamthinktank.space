const SESSION_ID = 'beam-orchestra-main'
const FIREBASE_CONFIG_STORAGE_KEY = 'beamDevtoolsFirebaseConfig'
const TAB_NAMES = ['checklist', 'context', 'console']
const OPTIONAL_FIREBASE_KEYS = [
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
]

let activeTab = 'checklist'
let firebaseAppInstance = null
let firestoreDb = null
let checklistUnsubscribe = null
let currentChecklistItems = []
let currentContext = null
let consoleEntries = []
let consoleRefreshTimer = null
let editingNoteItemId = null

const elements = {
  syncStatus: document.getElementById('syncStatus'),
  tabButtons: [...document.querySelectorAll('[data-tab]')],
  panels: [...document.querySelectorAll('[data-panel]')],
  setupCard: document.getElementById('setupCard'),
  setupForm: document.getElementById('setupForm'),
  setupMessage: document.getElementById('setupMessage'),
  checklistContent: document.getElementById('checklistContent'),
  checklistGroups: document.getElementById('checklistGroups'),
  checklistRouteLabel: document.getElementById('checklistRouteLabel'),
  checklistContextStatus: document.getElementById('checklistContextStatus'),
  pendingCount: document.getElementById('pendingCount'),
  addItemForm: document.getElementById('addItemForm'),
  newItemInput: document.getElementById('newItemInput'),
  refreshChecklistContextButton: document.getElementById('refreshChecklistContextButton'),
  claudeImportForm: document.getElementById('claudeImportForm'),
  claudeImportInput: document.getElementById('claudeImportInput'),
  claudeImportStatus: document.getElementById('claudeImportStatus'),
  refreshContextButton: document.getElementById('refreshContextButton'),
  copyClaudeButton: document.getElementById('copyClaudeButton'),
  contextStatus: document.getElementById('contextStatus'),
  contextUrl: document.getElementById('contextUrl'),
  contextRoute: document.getElementById('contextRoute'),
  contextAuth: document.getElementById('contextAuth'),
  contextTimestamp: document.getElementById('contextTimestamp'),
  refreshConsoleButton: document.getElementById('refreshConsoleButton'),
  clearConsoleButton: document.getElementById('clearConsoleButton'),
  consoleStatus: document.getElementById('consoleStatus'),
  consoleList: document.getElementById('consoleList'),
}

bootstrap()

async function bootstrap() {
  bindEvents()
  renderContext()
  renderChecklistComposerContext()
  renderConsole(consoleEntries)

  const storedConfig = await getStoredFirebaseConfig()
  populateSetupForm(storedConfig)

  if (!hasRequiredFirebaseConfig(storedConfig)) {
    showSetupCard()
    setSyncStatus('Setup required', 'warning')
    return
  }

  await connectFirestore(storedConfig)
}

function bindEvents() {
  elements.tabButtons.forEach((button) => {
    button.addEventListener('click', () => setActiveTab(button.dataset.tab))
  })

  elements.setupForm.addEventListener('submit', handleSetupSubmit)
  elements.addItemForm.addEventListener('submit', handleAddItem)
  elements.refreshChecklistContextButton.addEventListener('click', () => refreshChecklistRouteContext())
  elements.claudeImportForm.addEventListener('submit', handleClaudeImport)
  elements.refreshContextButton.addEventListener('click', refreshContext)
  elements.copyClaudeButton.addEventListener('click', copyContextForClaude)
  elements.refreshConsoleButton.addEventListener('click', refreshConsole)
  elements.clearConsoleButton.addEventListener('click', clearConsoleView)
}

function setActiveTab(tabName) {
  if (!TAB_NAMES.includes(tabName)) {
    return
  }

  activeTab = tabName

  elements.tabButtons.forEach((button) => {
    button.classList.toggle('is-active', button.dataset.tab === tabName)
  })

  elements.panels.forEach((panel) => {
    panel.classList.toggle('is-active', panel.dataset.panel === tabName)
  })

  if (tabName === 'console') {
    startConsoleRefresh()
  } else {
    stopConsoleRefresh()
  }

  if (tabName === 'checklist') {
    refreshChecklistRouteContext({ silent: true })
  }

  if (tabName === 'context' && !currentContext) {
    refreshContext()
  }
}

async function handleSetupSubmit(event) {
  event.preventDefault()
  setSetupMessage('Connecting to Firestore...')

  const formData = new FormData(elements.setupForm)
  const config = {}

  ;[
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'NEXT_PUBLIC_FIREBASE_APP_ID',
    ...OPTIONAL_FIREBASE_KEYS,
  ].forEach((key) => {
    config[key] = String(formData.get(key) || '').trim()
  })

  if (!hasRequiredFirebaseConfig(config)) {
    setSetupMessage('All required Firebase fields must be filled in.')
    return
  }

  await chrome.storage.local.set({
    [FIREBASE_CONFIG_STORAGE_KEY]: config,
  })

  await connectFirestore(config)
  setSetupMessage('Connected to Firestore.')
}

async function connectFirestore(storedConfig) {
  if (typeof firebase === 'undefined') {
    showSetupCard()
    setSyncStatus('Firebase unavailable', 'error')
    setSetupMessage('Firebase scripts failed to load in the sidebar.')
    return
  }

  const firebaseConfig = toFirebaseConfig(storedConfig)

  try {
    if (!firebaseAppInstance) {
      const existingApp = firebase.apps.find((app) => app.name === 'beam-devtools')
      firebaseAppInstance = existingApp || firebase.initializeApp(firebaseConfig, 'beam-devtools')
    }

    firestoreDb = firebaseAppInstance.firestore()

    await ensureChecklistDocument()
    subscribeToChecklist()
    hideSetupCard()
    refreshChecklistRouteContext({ silent: true })
    setSyncStatus('Connected', 'ready')
  } catch (error) {
    console.error('Failed to initialize Firestore:', error)
    showSetupCard()
    setSyncStatus('Connection failed', 'error')
    setSetupMessage(`Firestore connection failed: ${error.message || 'Unknown error'}`)
  }
}

async function ensureChecklistDocument() {
  if (!firestoreDb) {
    return
  }

  const checklistRef = getChecklistRef()
  const snapshot = await checklistRef.get()

  if (snapshot.exists) {
    return
  }

  await checklistRef.set({
    items: [],
    lastUpdatedBy: getUpdaterId(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
  })
}

function subscribeToChecklist() {
  if (!firestoreDb) {
    return
  }

  if (checklistUnsubscribe) {
    checklistUnsubscribe()
  }

  checklistUnsubscribe = getChecklistRef().onSnapshot(
    (snapshot) => {
      const data = snapshot.data() || {}
      currentChecklistItems = Array.isArray(data.items) ? data.items : []
      renderChecklist()
      setSyncStatus('Synced', 'ready')
    },
    (error) => {
      console.error('Checklist snapshot failed:', error)
      setSyncStatus('Sync error', 'error')
    }
  )
}

async function handleAddItem(event) {
  event.preventDefault()

  if (!firestoreDb) {
    showSetupCard()
    return
  }

  const text = elements.newItemInput.value.trim()

  if (!text) {
    return
  }

  const pageContext = await getChecklistPageContext()
  const item = buildChecklistItem({
    text,
    pageContext,
  })

  await getChecklistRef().set(
    {
      items: firebase.firestore.FieldValue.arrayUnion(item),
      lastUpdatedBy: getUpdaterId(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  )

  elements.newItemInput.value = ''
  setChecklistContextStatus(pageContext)
}

async function handleClaudeImport(event) {
  event.preventDefault()

  if (!firestoreDb) {
    showSetupCard()
    return
  }

  const rawText = elements.claudeImportInput.value.trim()

  if (!rawText) {
    setClaudeImportStatus('Paste checklist items from Claude first.')
    return
  }

  setClaudeImportStatus('Importing checklist items...')

  const pageContext = await getChecklistPageContext()
  const items = parseClaudeImport(rawText, pageContext)

  if (!items.length) {
    setClaudeImportStatus('No checklist items were found in that paste.')
    return
  }

  await getChecklistRef().set(
    {
      items: firebase.firestore.FieldValue.arrayUnion(...items),
      lastUpdatedBy: getUpdaterId(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  )

  elements.claudeImportInput.value = ''
  setChecklistContextStatus(pageContext)
  setClaudeImportStatus(`Imported ${items.length} item${items.length === 1 ? '' : 's'} into the shared checklist.`)
}

function renderChecklist() {
  elements.pendingCount.textContent = String(getPendingItemCount())

  if (!currentChecklistItems.length) {
    elements.checklistGroups.innerHTML = `
      <div class="empty-state">
        No checklist items yet. Add one below to start the shared session checklist.
      </div>
    `
    return
  }

  const groups = groupChecklistItems(currentChecklistItems)

  elements.checklistGroups.innerHTML = groups
    .map(([groupName, items]) => {
      return `
        <section class="group-card">
          <div class="group-header">
            <h3>${escapeHtml(groupName)}</h3>
            <span class="group-count">${items.length} item${items.length === 1 ? '' : 's'}</span>
          </div>
          <div class="item-list">
            ${items.map(renderChecklistItem).join('')}
          </div>
        </section>
      `
    })
    .join('')

  attachChecklistItemEvents()
}

function renderChecklistItem(item) {
  const note = typeof item.note === 'string' ? item.note : ''
  const badge = badgeValueForItem(item)
  const priority = priorityValueForItem(item)
  const isEditing = editingNoteItemId === item.id
  const routeContext =
    typeof item.contextPath === 'string' && item.contextPath.trim() && item.contextPath !== item.group
      ? item.contextPath.trim()
      : ''

  return `
    <article class="checklist-item ${item.done ? 'is-done' : ''}" data-item-id="${escapeHtml(item.id)}">
      <div class="item-main">
        <input data-action="toggle-item" type="checkbox" ${item.done ? 'checked' : ''} />
        <div class="item-copy">
          <div class="item-title-row">
            <span class="priority-dot priority-${escapeHtml(priority)}" aria-hidden="true"></span>
            <p class="item-text">${escapeHtml(item.text || 'Untitled item')}</p>
            <span class="badge badge-${escapeHtml(badge)}">${escapeHtml(badge)}</span>
          </div>
          ${routeContext ? `<p class="item-context">From ${escapeHtml(routeContext)}</p>` : ''}
          ${note ? `<p class="item-note">${escapeHtml(note)}</p>` : ''}
          <div class="item-actions">
            <button class="link-button" data-action="edit-note" type="button">${note ? 'Edit note' : 'Add note'}</button>
          </div>
          ${
            isEditing
              ? `<div class="note-editor">
                  <input
                    data-action="note-input"
                    type="text"
                    maxlength="300"
                    value="${escapeHtmlAttribute(note)}"
                    placeholder="Add note"
                  />
                </div>`
              : ''
          }
        </div>
      </div>
    </article>
  `
}

function attachChecklistItemEvents() {
  elements.checklistGroups.querySelectorAll('[data-action="toggle-item"]').forEach((checkbox) => {
    checkbox.addEventListener('change', async (event) => {
      const item = getChecklistItemFromEvent(event)

      if (!item) {
        return
      }

      const nextItem = sanitizeChecklistItem({
        ...item,
        done: event.currentTarget.checked,
        badge: event.currentTarget.checked ? 'done' : item.badge === 'done' ? 'todo' : badgeValueForItem(item),
        updatedAt: new Date().toISOString(),
      })

      await replaceChecklistItem(item, nextItem)
    })
  })

  elements.checklistGroups.querySelectorAll('[data-action="edit-note"]').forEach((button) => {
    button.addEventListener('click', (event) => {
      const item = getChecklistItemFromEvent(event)

      if (!item) {
        return
      }

      editingNoteItemId = item.id
      renderChecklist()

      window.setTimeout(() => {
        const input = elements.checklistGroups.querySelector('[data-action="note-input"]')

        if (input) {
          input.focus()
          input.select()
        }
      }, 0)
    })
  })

  elements.checklistGroups.querySelectorAll('[data-action="note-input"]').forEach((input) => {
    const save = async () => {
      const item = findChecklistItem(editingNoteItemId)

      if (!item) {
        editingNoteItemId = null
        renderChecklist()
        return
      }

      const nextItem = sanitizeChecklistItem({
        ...item,
        note: input.value.trim(),
        updatedAt: new Date().toISOString(),
      })

      editingNoteItemId = null
      renderChecklist()
      await replaceChecklistItem(item, nextItem)
    }

    input.addEventListener('blur', save, { once: true })

    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault()
        input.blur()
        return
      }

      if (event.key === 'Escape') {
        editingNoteItemId = null
        renderChecklist()
      }
    })
  })
}

async function replaceChecklistItem(previousItem, nextItem) {
  if (!firestoreDb) {
    return
  }

  setSyncStatus('Saving...', 'warning')

  await getChecklistRef().update({
    items: firebase.firestore.FieldValue.arrayRemove(previousItem),
  })

  await getChecklistRef().set(
    {
      items: firebase.firestore.FieldValue.arrayUnion(nextItem),
      lastUpdatedBy: getUpdaterId(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  )
}

async function fetchActivePageContext() {
  const response = await sendMessageToActiveTab({ type: 'GET_CONTEXT' })

  if (!response || response.type !== 'PAGE_CONTEXT') {
    throw new Error('BEAM page context was not available on the active tab.')
  }

  return response
}

async function getChecklistPageContext() {
  try {
    currentContext = await fetchActivePageContext()
    renderContext()
    renderChecklistComposerContext()
    return currentContext
  } catch (error) {
    renderChecklistComposerContext()
    elements.checklistContextStatus.textContent = error.message || 'Open a BEAM tab to use route-aware checklist items.'
    return currentContext
  }
}

async function refreshChecklistRouteContext(options = {}) {
  const { silent = false } = options

  if (!silent) {
    elements.checklistContextStatus.textContent = 'Refreshing current BEAM route...'
  }

  const pageContext = await getChecklistPageContext()

  if (!silent) {
    setChecklistContextStatus(pageContext)
  }
}

function setChecklistContextStatus(pageContext) {
  const group = deriveChecklistGroup(pageContext)

  if (!group) {
    elements.checklistContextStatus.textContent = 'Open a BEAM tab to use route-aware checklist items.'
    return
  }

  elements.checklistContextStatus.textContent = `New checklist items will be grouped under ${group}.`
}

async function refreshContext() {
  elements.contextStatus.textContent = 'Refreshing active tab context...'

  try {
    currentContext = await fetchActivePageContext()
    renderContext()
    renderChecklistComposerContext()
    setChecklistContextStatus(currentContext)
    elements.contextStatus.textContent = 'Context synced from the active tab.'
  } catch (error) {
    currentContext = null
    renderContext()
    renderChecklistComposerContext()
    setChecklistContextStatus(null)
    elements.contextStatus.textContent = error.message || 'Open a BEAM tab and try again.'
  }
}

function renderContext() {
  elements.contextUrl.value = currentContext?.url || '-'
  elements.contextRoute.value = currentContext?.pathname || '-'
  elements.contextAuth.value = currentContext?.firebaseUser?.email || 'not signed in'
  elements.contextTimestamp.value = currentContext?.timestamp || '-'
}

function renderChecklistComposerContext() {
  const group = deriveChecklistGroup(currentContext)

  elements.checklistRouteLabel.textContent = group || 'No BEAM page selected'
  elements.newItemInput.placeholder = group ? `Add checklist item for ${group}` : 'Add checklist item'
}

async function copyContextForClaude() {
  if (!currentContext) {
    await refreshContext()
  }

  if (!currentContext) {
    elements.contextStatus.textContent = 'No BEAM context is available to copy.'
    return
  }

  if (!consoleEntries.length) {
    await refreshConsole()
  }

  const block = [
    '---',
    `BEAM dev context — ${currentContext.timestamp}`,
    `URL: ${currentContext.url}`,
    `Route: ${currentContext.pathname}`,
    `Auth: ${currentContext.firebaseUser?.email || 'not signed in'}`,
    `Open checklist items: ${getPendingItemCount()} items pending`,
    `Recent errors: ${consoleEntries.filter((entry) => entry.level === 'error').length}`,
    '---',
  ].join('\n')

  await navigator.clipboard.writeText(block)
  elements.contextStatus.textContent = 'Context copied to clipboard.'
}

async function refreshConsole() {
  elements.consoleStatus.textContent = 'Refreshing console logs...'

  try {
    const response = await sendMessageToActiveTab({ type: 'GET_LOGS' })
    consoleEntries = Array.isArray(response?.logs) ? response.logs.slice(0, 50) : []
    renderConsole(consoleEntries)
    elements.consoleStatus.textContent = `Showing ${consoleEntries.length} captured log${consoleEntries.length === 1 ? '' : 's'}.`
  } catch (error) {
    consoleEntries = []
    renderConsole(consoleEntries)
    elements.consoleStatus.textContent = error.message || 'Open a BEAM tab and try again.'
  }
}

function renderConsole(entries) {
  if (!entries.length) {
    elements.consoleList.innerHTML = `
      <div class="empty-state">
        No captured warnings or errors yet.
      </div>
    `
    return
  }

  elements.consoleList.innerHTML = entries
    .map((entry) => {
      const level = entry.level === 'error' ? 'ERROR' : 'WARN'

      return `
        <article class="log-entry">
          <div class="log-meta">
            <span>${escapeHtml(formatTime(entry.timestamp))}</span>
            <span class="log-level ${escapeHtml(entry.level)}">${escapeHtml(level)}</span>
          </div>
          <pre class="log-message">${escapeHtml(entry.message || '')}</pre>
        </article>
      `
    })
    .join('')
}

function clearConsoleView() {
  renderConsole([])
  elements.consoleStatus.textContent = 'Cleared local console view. Source logs remain on the page.'
}

function startConsoleRefresh() {
  stopConsoleRefresh()
  refreshConsole()
  consoleRefreshTimer = window.setInterval(refreshConsole, 10000)
}

function stopConsoleRefresh() {
  if (consoleRefreshTimer) {
    window.clearInterval(consoleRefreshTimer)
    consoleRefreshTimer = null
  }
}

async function sendMessageToActiveTab(message) {
  const [tab] = await chrome.tabs.query({
    active: true,
    lastFocusedWindow: true,
  })

  if (!tab || !tab.id) {
    throw new Error('No active tab is available.')
  }

  try {
    return await chrome.tabs.sendMessage(tab.id, message)
  } catch (_error) {
    throw new Error('Open a BEAM tab on localhost:3000 or *.beamthinktank.space.')
  }
}

async function getStoredFirebaseConfig() {
  const result = await chrome.storage.local.get(FIREBASE_CONFIG_STORAGE_KEY)
  return sanitizeStoredConfig(result[FIREBASE_CONFIG_STORAGE_KEY] || {})
}

function sanitizeStoredConfig(rawConfig) {
  const nextConfig = {}

  ;[
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'NEXT_PUBLIC_FIREBASE_APP_ID',
    ...OPTIONAL_FIREBASE_KEYS,
  ].forEach((key) => {
    nextConfig[key] = String(rawConfig[key] || '').trim()
  })

  return nextConfig
}

function hasRequiredFirebaseConfig(config) {
  return Boolean(
    config.NEXT_PUBLIC_FIREBASE_API_KEY &&
      config.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
      config.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN &&
      config.NEXT_PUBLIC_FIREBASE_APP_ID
  )
}

function toFirebaseConfig(config) {
  return {
    apiKey: config.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: config.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: config.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    appId: config.NEXT_PUBLIC_FIREBASE_APP_ID,
    storageBucket: config.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || undefined,
    messagingSenderId: config.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || undefined,
  }
}

function populateSetupForm(config) {
  ;[
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'NEXT_PUBLIC_FIREBASE_APP_ID',
    ...OPTIONAL_FIREBASE_KEYS,
  ].forEach((key) => {
    const input = elements.setupForm.elements.namedItem(key)

    if (input) {
      input.value = config[key] || ''
    }
  })
}

function showSetupCard() {
  elements.setupCard.classList.remove('hidden')
  elements.checklistContent.classList.add('hidden')
}

function hideSetupCard() {
  elements.setupCard.classList.add('hidden')
  elements.checklistContent.classList.remove('hidden')
}

function setSetupMessage(message) {
  elements.setupMessage.textContent = message
}

function setSyncStatus(text, tone) {
  elements.syncStatus.textContent = text
  elements.syncStatus.dataset.tone = tone
}

function getChecklistRef() {
  return firestoreDb.collection('devChecklists').doc(SESSION_ID)
}

function getPendingItemCount() {
  return currentChecklistItems.filter((item) => !item.done).length
}

function deriveChecklistGroup(pageContext) {
  const pathname = typeof pageContext?.pathname === 'string' ? pageContext.pathname.trim() : ''

  if (!pathname) {
    return ''
  }

  return pathname === '/' ? 'Home' : pathname
}

function buildChecklistItem({ text, done = false, group, note = '', pageContext }) {
  return sanitizeChecklistItem({
    id: createId(),
    text,
    note,
    done,
    badge: done ? 'done' : 'todo',
    priority: 'gray',
    group: typeof group === 'string' ? group : deriveChecklistGroup(pageContext),
    updatedAt: new Date().toISOString(),
    contextPath: pageContext?.pathname || '',
    contextTitle: pageContext?.title || '',
    contextUrl: pageContext?.url || '',
  })
}

function parseClaudeImport(rawText, pageContext) {
  const defaultGroup = deriveChecklistGroup(pageContext)
  let currentGroup = defaultGroup

  return rawText.split(/\r?\n/).reduce((items, line) => {
    const trimmed = line.trim()

    if (!trimmed || shouldIgnoreClaudeLine(trimmed)) {
      return items
    }

    if (isChecklistSectionHeader(trimmed)) {
      currentGroup = trimmed.replace(/:$/, '').trim() || defaultGroup
      return items
    }

    const parsedLine = parseChecklistLine(trimmed)

    if (!parsedLine) {
      return items
    }

    items.push(
      buildChecklistItem({
        text: parsedLine.text,
        done: parsedLine.done,
        group: currentGroup,
        pageContext,
      })
    )

    return items
  }, [])
}

function parseChecklistLine(line) {
  let normalized = line
  let done = false

  const checkboxMatch = normalized.match(/^(?:[-*•]\s*)?\[(x|X| )\]\s*(.+)$/)

  if (checkboxMatch) {
    done = checkboxMatch[1].toLowerCase() === 'x'
    normalized = checkboxMatch[2]
  } else {
    normalized = normalized.replace(/^[-*•]\s+/, '').replace(/^\d+\.\s+/, '')
  }

  normalized = normalized.trim()

  if (!normalized) {
    return null
  }

  return {
    text: normalized,
    done,
  }
}

function shouldIgnoreClaudeLine(line) {
  return (
    line === '---' ||
    line.startsWith('```') ||
    /^(BEAM dev context|URL:|Route:|Auth:|Open checklist items:|Recent errors:)/i.test(line)
  )
}

function isChecklistSectionHeader(line) {
  if (!line.endsWith(':')) {
    return false
  }

  if (/^(?:[-*•]|\d+\.)/.test(line)) {
    return false
  }

  const normalized = line.replace(/:$/, '').trim().toLowerCase()

  return !['checklist', 'checklist items', 'tasks', 'to do', 'todo', 'action items'].includes(normalized)
}

function groupChecklistItems(items) {
  const groups = new Map()

  items.forEach((item) => {
    const groupName = (typeof item.group === 'string' && item.group.trim()) || 'Uncategorized'

    if (!groups.has(groupName)) {
      groups.set(groupName, [])
    }

    groups.get(groupName).push(item)
  })

  return [...groups.entries()]
}

function findChecklistItem(itemId) {
  return currentChecklistItems.find((item) => item.id === itemId) || null
}

function getChecklistItemFromEvent(event) {
  const article = event.currentTarget.closest('[data-item-id]')

  if (!article) {
    return null
  }

  return findChecklistItem(article.dataset.itemId)
}

function badgeValueForItem(item) {
  return item.badge || (item.done ? 'done' : 'todo')
}

function priorityValueForItem(item) {
  const priority = item.priority || 'gray'
  return ['red', 'amber', 'gray'].includes(priority) ? priority : 'gray'
}

function sanitizeChecklistItem(item) {
  const nextItem = {
    id: item.id,
    text: item.text,
    done: Boolean(item.done),
    badge: badgeValueForItem(item),
    priority: priorityValueForItem(item),
    group: typeof item.group === 'string' ? item.group : '',
    updatedAt: item.updatedAt || new Date().toISOString(),
  }

  if (typeof item.note === 'string' && item.note.trim()) {
    nextItem.note = item.note.trim()
  }

  if (typeof item.contextPath === 'string' && item.contextPath.trim()) {
    nextItem.contextPath = item.contextPath.trim()
  }

  if (typeof item.contextTitle === 'string' && item.contextTitle.trim()) {
    nextItem.contextTitle = item.contextTitle.trim()
  }

  if (typeof item.contextUrl === 'string' && item.contextUrl.trim()) {
    nextItem.contextUrl = item.contextUrl.trim()
  }

  return nextItem
}

function setClaudeImportStatus(message) {
  elements.claudeImportStatus.textContent = message
}

function getUpdaterId() {
  return `beam-devtools:${chrome.runtime.id}`
}

function createId() {
  if (crypto && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `item-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`
}

function formatTime(isoString) {
  const date = isoString ? new Date(isoString) : new Date()

  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function escapeHtmlAttribute(value) {
  return escapeHtml(value).replaceAll('`', '&#96;')
}
