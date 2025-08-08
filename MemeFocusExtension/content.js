// content.js

console.log("Meme Focus extension loaded!");

// --- 1. CONFIGURATION AND RESOURCES ---
const memes = [
  chrome.runtime.getURL('memes/meme1.jpg'),
  chrome.runtime.getURL('memes/meme2.jpg')
  // Add more memes here
];

const audioUrl = chrome.runtime.getURL('audio/alarm_clock_new_s5.mp3');

let isDozingOff = false;
let closedEyeFrames = 0;
const CLOSED_EYE_THRESHOLD = 30;

// --- 2. AUDIO AND MEME DISPLAY FUNCTIONS ---
function playWakeUpSound() {
  const sound = new Audio(audioUrl);
  sound.play().catch(e => console.error("Error playing sound:", e));
}

function showMeme() {
  if (isDozingOff) {
    return;
  }
  isDozingOff = true;

  playWakeUpSound();

  const popup = document.createElement('div');
  popup.style.position = 'fixed';
  popup.style.bottom = '20px';
  popup.style.right = '20px';
  popup.style.zIndex = '99999';
  popup.style.backgroundColor = 'white';
  popup.style.border = '2px solid black';
  popup.style.padding = '10px';
  popup.style.borderRadius = '10px';
  popup.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';

  const randomMeme = memes[Math.floor(Math.random() * memes.length)];
  
  popup.innerHTML = `<img src="${randomMeme}" width="250" height="250" style="display:block;">`;
  document.body.appendChild(popup);

  setTimeout(() => {
    popup.remove();
    isDozingOff = false;
  }, 5000);
}

// --- 3. BRIDGE FUNCTIONS AND INITIALIZATION ---
async function init() {
  const stream = await navigator.mediaDevices.getUserMedia({ video: true });
  if (!stream) {
    console.error("Failed to get camera stream.");
    return;
  }
  
  const video = document.createElement('video');
  video.style.display = 'none';
  video.srcObject = stream;
  video.play();
  document.body.appendChild(video);

  const canvas = document.createElement('canvas');
  canvas.style.display = 'none';
  document.body.appendChild(canvas);

  await new Promise(resolve => video.onloadedmetadata = resolve);
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const context = canvas.getContext('2d');

  const iframe = document.createElement('iframe');
  iframe.src = chrome.runtime.getURL('sandbox.html');
  iframe.style.display = 'none';
  document.body.appendChild(iframe);
  
  window.addEventListener('message', event => {
    if (event.data.type === 'inattention_detected') {
      if (!isDozingOff) {
        showMeme();
      }
    }
  });

  setInterval(() => {
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    iframe.contentWindow.postMessage({ type: 'image_data', imageData: imageData }, '*');
  }, 500);
  
  console.log("Sandbox iframe created and sending video frames.");
}

window.addEventListener('load', init);