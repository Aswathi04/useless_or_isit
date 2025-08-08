// content.js

console.log("Meme Focus extension loaded!");

// --- 1. CONFIGURATION AND RESOURCES ---
const memes = [
  chrome.runtime.getURL('memes/meme1.jpg'),
  chrome.runtime.getURL('memes/meme2.jpg'),
  // Add more memes here
];

const audioUrl = chrome.runtime.getURL('audio/alarm_clock_new_s5.mp3');

let isDozingOff = false;
let closedEyeFrames = 0;
const CLOSED_EYE_THRESHOLD = 30; // Number of frames to count as "dozing off"

// --- 2. AUDIO AND MEME DISPLAY FUNCTIONS ---
function playWakeUpSound() {
  const sound = new Audio(audioUrl);
  // Using .play() returns a Promise, so we use .catch() for error handling.
  sound.play().catch(e => console.error("Error playing sound:", e));
}

function showMeme() {
  // If a meme is already being shown, don't show another one.
  if (isDozingOff) {
    return;
  }
  isDozingOff = true;

  // Play the sound first to grab attention.
  playWakeUpSound();

  // Create the pop-up container element.
  const popup = document.createElement('div');
  popup.style.position = 'fixed';
  popup.style.bottom = '20px';
  popup.style.right = '20px';
  popup.style.zIndex = '99999'; // Ensure it's on top of everything.
  popup.style.backgroundColor = 'white';
  popup.style.border = '2px solid black';
  popup.style.padding = '10px';
  popup.style.borderRadius = '10px';
  popup.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';

  // Pick a random meme URL from our list.
  const randomMeme = memes[Math.floor(Math.random() * memes.length)];
  
  // Set the inner HTML of the pop-up to display the meme.
  popup.innerHTML = `<img src="${randomMeme}" width="250" height="250" style="display:block;">`;
  document.body.appendChild(popup);

  // Remove the pop-up after 5 seconds.
  setTimeout(() => {
    popup.remove();
    isDozingOff = false;
  }, 5000);
}

// --- 3. VIDEO AND CANVAS SETUP FUNCTIONS ---
async function getCameraStream() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    console.log("Camera stream acquired.");
    return stream;
  } catch (err) {
    console.error("Error accessing the camera: ", err);
  }
}

async function setupVideoAndCanvas() {
  const stream = await getCameraStream();
  if (!stream) {
    return;
  }

  // Create and configure a hidden video element.
  const video = document.createElement('video');
  video.style.display = 'none';
  video.srcObject = stream;
  video.play();
  document.body.appendChild(video);

  // Create and configure a hidden canvas element.
  const canvas = document.createElement('canvas');
  canvas.style.display = 'none';
  document.body.appendChild(canvas);

  // Match the canvas size to the video stream size.
  video.onloadedmetadata = () => {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
  };

  console.log("Hidden video and canvas elements created.");
  return { video, canvas };
}

// --- 4. THE MAIN VIDEO PROCESSING LOOP ---
async function processVideo(video, canvas) {
  // Wait for the video to be ready before starting.
  await new Promise(resolve => video.onloadedmetadata = resolve);

  const displaySize = { width: video.videoWidth, height: video.videoHeight };
  faceapi.matchDimensions(canvas, displaySize);

  setInterval(async () => {
    // Draw the current video frame onto the canvas.
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Detect faces and get landmark data (like eyes).
    const detections = await faceapi.detectAllFaces(canvas, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks();

    if (detections.length > 0) {
      const landmarks = detections[0].landmarks;
      const leftEye = landmarks.getLeftEye();
      const rightEye = landmarks.getRightEye();
      
      // Calculate a simplified "eye aspect ratio" (EAR) to check for closed eyes.
      const getEAR = eye => (faceapi.euclideanDistance(eye[1], eye[5]) + faceapi.euclideanDistance(eye[2], eye[4])) / (2 * faceapi.euclideanDistance(eye[0], eye[3]));
      
      const leftEAR = getEAR(leftEye);
      const rightEAR = getEAR(rightEye);
      
      const avgEAR = (leftEAR + rightEAR) / 2;
      
      if (avgEAR < 0.25) { // If the EAR is below a threshold, eyes are likely closed.
        closedEyeFrames++;
        if (closedEyeFrames > CLOSED_EYE_THRESHOLD) {
          showMeme();
          closedEyeFrames = 0;
        }
      } else {
        closedEyeFrames = 0;
      }
    } else {
      // If no face is detected, it's also a sign of inattention.
      closedEyeFrames++;
      if (closedEyeFrames > CLOSED_EYE_THRESHOLD * 2) { // Use a longer timeout for this case.
        showMeme();
        closedEyeFrames = 0;
      }
    }

  }, 100); // Run this check every 100 milliseconds.
}

// --- 5. INITIALIZATION AND START ---
async function init() {
  // Load the face detection models from our project's models folder.
  await faceapi.nets.tinyFaceDetector.loadFromUri(chrome.runtime.getURL('models/'));
  await faceapi.nets.faceLandmark68Net.loadFromUri(chrome.runtime.getURL('models/'));

  // Get the video and canvas elements.
  const { video, canvas } = await setupVideoAndCanvas();
  
  if (video && canvas) {
    // Start the video processing loop once everything is ready.
    processVideo(video, canvas);
  }
}

// Wait for the window to load completely before starting our extension.
window.addEventListener('load', init);