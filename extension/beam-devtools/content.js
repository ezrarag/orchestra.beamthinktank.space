const MAX_LOG_ENTRIES = 50
const PAGE_SOURCE = 'beam-devtools-page'
const EXTENSION_SOURCE = 'beam-devtools-extension'

const consoleLogs = []
let latestFirebaseUser = null
let pendingContextResolver = null

installPageBridge()

window.addEventListener('message', (event) => {
  if (event.source !== window || !event.data || event.data.source !== PAGE_SOURCE) {
    return
  }

  if (event.data.type === 'PAGE_CONTEXT_BRIDGE') {
    latestFirebaseUser = event.data.firebaseUser ?? null

    if (pendingContextResolver) {
      pendingContextResolver(latestFirebaseUser)
      pendingContextResolver = null
    }

    return
  }

  if (event.data.type === 'CONSOLE_LOG') {
    pushConsoleLog(event.data)
  }
})

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || typeof message !== 'object') {
    return false
  }

  if (message.type === 'GET_CONTEXT') {
    getPageContext()
      .then((firebaseUser) => {
        sendResponse({
          type: 'PAGE_CONTEXT',
          url: window.location.href,
          pathname: window.location.pathname,
          search: window.location.search,
          title: document.title,
          firebaseUser: firebaseUser ?? null,
          timestamp: new Date().toISOString(),
        })
      })
      .catch(() => {
        sendResponse({
          type: 'PAGE_CONTEXT',
          url: window.location.href,
          pathname: window.location.pathname,
          search: window.location.search,
          title: document.title,
          firebaseUser: latestFirebaseUser,
          timestamp: new Date().toISOString(),
        })
      })

    return true
  }

  if (message.type === 'GET_LOGS') {
    sendResponse({
      type: 'LOGS',
      logs: [...consoleLogs].reverse(),
    })
    return false
  }

  return false
})

function installPageBridge() {
  if (document.documentElement.dataset.beamDevtoolsBridgeInstalled === 'true') {
    return
  }

  document.documentElement.dataset.beamDevtoolsBridgeInstalled = 'true'

  const script = document.createElement('script')
  script.src = chrome.runtime.getURL('page-bridge.js')
  script.async = false
  script.onload = () => script.remove()

  ;(document.head || document.documentElement).appendChild(script)
}

function getPageContext() {
  return new Promise((resolve) => {
    const timeoutId = window.setTimeout(() => {
      if (pendingContextResolver) {
        pendingContextResolver = null
      }

      resolve(latestFirebaseUser)
    }, 300)

    pendingContextResolver = (firebaseUser) => {
      window.clearTimeout(timeoutId)
      resolve(firebaseUser)
    }

    window.postMessage(
      {
        source: EXTENSION_SOURCE,
        type: 'REQUEST_CONTEXT',
      },
      '*'
    )
  })
}

function pushConsoleLog(entry) {
  if (!entry || typeof entry.message !== 'string') {
    return
  }

  consoleLogs.push({
    type: 'CONSOLE_LOG',
    level: entry.level === 'error' ? 'error' : 'warn',
    message: entry.message,
    timestamp: entry.timestamp || new Date().toISOString(),
  })

  if (consoleLogs.length > MAX_LOG_ENTRIES) {
    consoleLogs.splice(0, consoleLogs.length - MAX_LOG_ENTRIES)
  }
}
