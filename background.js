// Listen for installation
chrome.runtime.onInstalled.addListener(() => {
  // Initialize storage with default settings
  chrome.storage.local.set({
    settings: {
      autoAnalyze: true,
      notificationsEnabled: true,
      reportFormat: 'detailed',
      aiAssistanceLevel: 'advanced'
    }
  });

  // Initialize badge settings
  chrome.action.setBadgeBackgroundColor({ color: '#4285f4' });
  chrome.action.setBadgeText({ text: '...' });
});

// Track page load timing
chrome.webNavigation.onBeforeNavigate.addListener((details) => {
  if (details.frameId === 0) { // Only track main frame
    chrome.storage.local.set({ navigationStart: Date.now() });
    // Show loading indicator
    chrome.action.setBadgeText({
      text: '...',
      tabId: details.tabId
    });
  }
});

// Listen for tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    // Calculate load time
    chrome.storage.local.get(['navigationStart'], (data) => {
      const loadTime = Date.now() - (data.navigationStart || Date.now());
      const displayTime = formatLoadTime(loadTime);
      
      console.log('Load time:', loadTime, 'Display time:', displayTime); // Debug log

      // Update extension badge
      chrome.action.setBadgeText({
        text: displayTime,
        tabId: tabId
      });
      
      chrome.action.setBadgeBackgroundColor({
        color: getBadgeColor(loadTime),
        tabId: tabId
      });
    });
  }
});

// Format load time for display
function formatLoadTime(ms) {
  if (ms < 1000) {
    return String(ms); // Convert to string explicitly
  } else {
    const seconds = (ms / 1000).toFixed(1);
    return `${seconds}`;
  }
}

// Get badge color based on load time
function getBadgeColor(loadTime) {
  if (loadTime < 1000) { // Under 1 second - Great
    return '#0f9d58'; // Green
  } else if (loadTime < 2500) { // Under 2.5 seconds - Good
    return '#f4b400'; // Yellow
  } else { // Over 2.5 seconds - Poor
    return '#db4437'; // Red
  }
}

// Handle messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.type) {
    case 'START_ANALYSIS':
      analyzePage(sender.tab);
      break;
    case 'GENERATE_REPORT':
      generateReport(request.data);
      break;
    case 'SAVE_SETTINGS':
      saveSettings(request.settings);
      break;
  }
  return true;
});

// Test function to verify badge functionality
function testBadge() {
  chrome.action.setBadgeText({ text: 'TEST' });
  chrome.action.setBadgeBackgroundColor({ color: '#4285f4' });
}

// Call test function on service worker startup
testBadge();

// Helper functions
async function analyzePage(tab) {
  // Implementation for page analysis
}

async function generateReport(data) {
  // Implementation for report generation
}

async function saveSettings(settings) {
  // Implementation for settings management
}



