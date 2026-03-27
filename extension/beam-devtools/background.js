async function enableActionSidePanel() {
  try {
    await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
  } catch (error) {
    console.error('Failed to enable action side panel behavior:', error)
  }
}

async function openSidePanelForTab(tabId) {
  try {
    await chrome.sidePanel.setOptions({
      tabId,
      path: 'sidebar/sidebar.html',
      enabled: true,
    })

    await chrome.sidePanel.open({ tabId })
  } catch (error) {
    console.error('Failed to open side panel:', error)
  }
}

enableActionSidePanel()

chrome.runtime.onInstalled.addListener(() => {
  enableActionSidePanel()
})

chrome.runtime.onStartup.addListener(() => {
  enableActionSidePanel()
})

chrome.action.onClicked.addListener((tab) => {
  if (!tab.id) {
    return
  }

  openSidePanelForTab(tab.id)
})
