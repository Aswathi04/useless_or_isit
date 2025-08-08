// popup_fixed.js
document.addEventListener("DOMContentLoaded", function() {
  const statusIndicator = document.querySelector(".status-indicator");
  const statusText = document.getElementById("statusText");
  const testMemeButton = document.getElementById("testMemeButton");
  const refreshButton = document.getElementById("refreshButton");

  // Check extension status
  function checkStatus() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const currentTab = tabs[0];
      
      // Check if we're on Google Meet
      if (!currentTab.url.includes("meet.google.com")) {
        updateStatus(false, "Not on Google Meet");
        return;
      }

      // Send message to content script to check status
      chrome.tabs.sendMessage(currentTab.id, { action: "getStatus" }, (response) => {
        if (chrome.runtime.lastError) {
          updateStatus(false, "Extension not loaded");
          return;
        }
        
        if (response && response.active) {
          updateStatus(true, "Active and monitoring");
        } else {
          updateStatus(false, "Inactive");
        }
      });
    });
  }

  // Update status display
  function updateStatus(isActive, message) {
    if (isActive) {
      statusIndicator.className = "status-indicator status-active";
      statusText.textContent = message;
      testMemeButton.disabled = false;
    } else {
      statusIndicator.className = "status-indicator status-inactive";
      statusText.textContent = message;
      testMemeButton.disabled = true;
    }
  }

  // Test meme functionality
  testMemeButton.addEventListener("click", () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: "testMeme" }, (response) => {
        if (chrome.runtime.lastError) {
          console.error("Error sending test message:", chrome.runtime.lastError);
          return;
        }
        
        if (response && response.success) {
          // Visual feedback
          testMemeButton.textContent = "✅ Meme Sent!";
          setTimeout(() => {
            testMemeButton.innerHTML = "<span class=\"emoji\">😄</span>Test Meme Display<span class=\"emoji\">😄</span>";
          }, 2000);
        }
      });
    });
  });

  // Refresh status
  refreshButton.addEventListener("click", () => {
    refreshButton.textContent = "🔄 Refreshing...";
    setTimeout(() => {
      checkStatus();
      refreshButton.innerHTML = "<span class=\"emoji\">🔄</span>Refresh Status";
    }, 1000);
  });

  // Initial status check
  checkStatus();
  
  // Periodic status updates
  setInterval(checkStatus, 5000);
});
