// content.js - Fixed version
console.log("MemeFocus extension loaded!");

// Configuration
const CLOSED_EYE_THRESHOLD = 30; // Number of frames to count as "dozing off"
const MEME_DISPLAY_DURATION = 5000; // 5 seconds
const DETECTION_INTERVAL = 100; // Check every 100ms
const RANDOM_MEME_INTERVAL = 300000; // Show random meme every 5 minutes

// State variables
let isDozingOff = false;
let closedEyeFrames = 0;
let isExtensionActive = false;
let detectionInterval = null;
let randomMemeInterval = null;
let video = null;
let canvas = null;
let model = null;

// Meme URLs - using placeholder images that will work
const memes = [
  'https://i.imgflip.com/1bij.jpg', // Grumpy Cat
  'https://i.imgflip.com/5c7lwq.jpg', // Distracted Boyfriend
  'https://i.imgflip.com/1ur9b0.jpg', // Surprised Pikachu
  'https://i.imgflip.com/26am.jpg', // Philosoraptor
  'https://i.imgflip.com/1otk96.jpg' // Expanding Brain
];

// Audio URL - using a web-based alarm sound
const audioUrl = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT';

// Initialize the extension
async function initializeExtension( ) {
  try {
    console.log("Initializing MemeFocus extension...");
    
    // Check if we're on Google Meet
    if (!window.location.href.includes('meet.google.com')) {
      console.log("Not on Google Meet, extension will not activate");
      return;
    }

    // Load TensorFlow.js and BlazeFace
    await loadLibraries();
    
    // Load the face detection model
    model = await blazeface.load();
    console.log("Face detection model loaded successfully");

    // Setup video and canvas
    await setupVideoAndCanvas();
    
    // Start face detection
    startFaceDetection();
    
    // Start random meme timer
    startRandomMemeTimer();
    
    isExtensionActive = true;
    console.log("MemeFocus extension initialized successfully");
    
  } catch (error) {
    console.error("Failed to initialize extension:", error);
    showErrorMessage("Failed to initialize face detection. Please refresh the page.");
  }
}

// Load required libraries
async function loadLibraries() {
  return new Promise((resolve, reject) => {
    // Load TensorFlow.js
    const tfScript = document.createElement('script');
    tfScript.src = 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@3.11.0/dist/tf.min.js';
    tfScript.onload = ( ) => {
      console.log("TensorFlow.js loaded");
      
      // Load BlazeFace
      const blazeScript = document.createElement('script');
      blazeScript.src = 'https://cdn.jsdelivr.net/npm/@tensorflow-models/blazeface@0.0.7/dist/blazeface.min.js';
      blazeScript.onload = ( ) => {
        console.log("BlazeFace loaded");
        resolve();
      };
      blazeScript.onerror = () => reject(new Error("Failed to load BlazeFace"));
      document.head.appendChild(blazeScript);
    };
    tfScript.onerror = () => reject(new Error("Failed to load TensorFlow.js"));
    document.head.appendChild(tfScript);
  });
}

// Setup video and canvas for face detection
async function setupVideoAndCanvas() {
  try {
    // Create hidden video element
    video = document.createElement('video');
    video.style.display = 'none';
    video.autoplay = true;
    video.muted = true;
    document.body.appendChild(video);

    // Create hidden canvas element
    canvas = document.createElement('canvas');
    canvas.style.display = 'none';
    document.body.appendChild(canvas);

    // Get camera stream
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: { width: 640, height: 480 } 
    });
    
    video.srcObject = stream;
    
    // Wait for video to load
    await new Promise(resolve => {
      video.onloadedmetadata = () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        resolve();
      };
    });

    console.log("Video and canvas setup complete");
    
  } catch (error) {
    console.error("Error setting up camera:", error);
    throw new Error("Camera access denied or not available");
  }
}

// Start face detection loop
function startFaceDetection() {
  detectionInterval = setInterval(async () => {
    if (!video || !canvas || !model) return;

    try {
      // Draw current video frame to canvas
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Detect faces
      const predictions = await model.estimateFaces(canvas, false);

      if (predictions.length > 0) {
        // Face detected - check for drowsiness indicators
        // For simplicity, we'll use a basic heuristic
        // In a real implementation, you'd analyze eye landmarks
        closedEyeFrames = 0; // Reset counter when face is detected
      } else {
        // No face detected - could indicate user is not paying attention
        closedEyeFrames++;
        
        if (closedEyeFrames > CLOSED_EYE_THRESHOLD) {
          triggerWakeUpAlert();
          closedEyeFrames = 0;
        }
      }
      
    } catch (error) {
      console.error("Error during face detection:", error);
    }
  }, DETECTION_INTERVAL);
}

// Start random meme timer
function startRandomMemeTimer() {
  randomMemeInterval = setInterval(() => {
    if (Math.random() < 0.3) { // 30% chance every interval
      showRandomMeme();
    }
  }, RANDOM_MEME_INTERVAL);
}

// Trigger wake up alert (sound + meme)
function triggerWakeUpAlert() {
  if (isDozingOff) return; // Prevent multiple alerts
  
  console.log("User appears to be dozing off - triggering alert");
  playWakeUpSound();
  showMeme("Wake up! Stay focused! 😴");
}

// Show random meme
function showRandomMeme() {
  const funMessages = [
    "Time for a quick laugh! 😄",
    "Meme break! 🎉",
    "Stay entertained! 😊",
    "Quick giggle time! 😂"
  ];
  
  const randomMessage = funMessages[Math.floor(Math.random() * funMessages.length)];
  showMeme(randomMessage);
}

// Play wake up sound
function playWakeUpSound() {
  try {
    // Create a simple beep sound using Web Audio API
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800; // 800 Hz beep
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 1);
    
  } catch (error) {
    console.error("Error playing wake up sound:", error);
  }
}

// Show meme popup
function showMeme(message = "Stay focused!") {
  if (isDozingOff) return; // Prevent multiple popups
  
  isDozingOff = true;

  // Create popup container
  const popup = document.createElement('div');
  popup.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 999999;
    background: white;
    border: 3px solid #007bff;
    border-radius: 15px;
    padding: 20px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.3);
    text-align: center;
    max-width: 400px;
    animation: bounceIn 0.5s ease-out;
  `;

  // Add bounce animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes bounceIn {
      0% { transform: translate(-50%, -50%) scale(0.3); opacity: 0; }
      50% { transform: translate(-50%, -50%) scale(1.05); }
      70% { transform: translate(-50%, -50%) scale(0.9); }
      100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
    }
  `;
  document.head.appendChild(style);

  // Select random meme
  const randomMeme = memes[Math.floor(Math.random() * memes.length)];
  
  // Create popup content
  popup.innerHTML = `
    <h3 style="margin: 0 0 15px 0; color: #007bff; font-family: Arial, sans-serif;">
      ${message}
    </h3>
    <img src="${randomMeme}" 
         style="max-width: 100%; height: auto; border-radius: 10px; margin-bottom: 15px;"
         onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxOCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk1lbWUgTm90IEZvdW5kPC90ZXh0Pjwvc3ZnPic;" />
    <button onclick="this.parentElement.remove(); isDozingOff = false;" 
            style="background: #007bff; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; font-size: 14px;">
      Got it! 👍
    </button>
  `;

  document.body.appendChild(popup);

  // Auto-remove after duration
  setTimeout(() => {
    if (popup.parentElement) {
      popup.remove();
    }
    isDozingOff = false;
  }, MEME_DISPLAY_DURATION);
}

// Show error message
function showErrorMessage(message) {
  const errorDiv = document.createElement('div');
  errorDiv.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #dc3545;
    color: white;
    padding: 15px;
    border-radius: 5px;
    z-index: 999999;
    font-family: Arial, sans-serif;
    max-width: 300px;
  `;
  errorDiv.textContent = message;
  document.body.appendChild(errorDiv);

  setTimeout(() => {
    if (errorDiv.parentElement) {
      errorDiv.remove();
    }
  }, 5000);
}

// Cleanup function
function cleanup() {
  if (detectionInterval) {
    clearInterval(detectionInterval);
    detectionInterval = null;
  }
  
  if (randomMemeInterval) {
    clearInterval(randomMemeInterval);
    randomMemeInterval = null;
  }
  
  if (video && video.srcObject) {
    const tracks = video.srcObject.getTracks();
    tracks.forEach(track => track.stop());
  }
  
  if (video) {
    video.remove();
    video = null;
  }
  
  if (canvas) {
    canvas.remove();
    canvas = null;
  }
  
  isExtensionActive = false;
  console.log("Extension cleanup completed");
}

// Initialize when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeExtension);
} else {
  initializeExtension();
}

// Cleanup when page unloads
window.addEventListener('beforeunload', cleanup);

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getStatus') {
    sendResponse({ active: isExtensionActive });
  } else if (request.action === 'testMeme') {
    showRandomMeme();
    sendResponse({ success: true });
  }
});
