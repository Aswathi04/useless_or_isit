// sandbox.js

// This script runs inside the sandboxed iframe.
let video, canvas;

// This function will be called from content.js to send the video stream
function startDetection(stream) {
  video = document.getElementById('videoElement');
  canvas = document.getElementById('canvasElement');
  
  video.srcObject = stream;
  video.play();

  // Load models before starting the video loop
  Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(chrome.runtime.getURL('models/')),
    faceapi.nets.faceLandmark68Net.loadFromUri(chrome.runtime.getURL('models/'))
  ]).then(() => {
    console.log("Models loaded in sandbox.");
    processVideo();
  });
}

// The main video processing loop
async function processVideo() {
  const displaySize = { width: video.videoWidth, height: video.videoHeight };
  faceapi.matchDimensions(canvas, displaySize);

  setInterval(async () => {
    const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks();
    
    // Check for inattention
    let isInactive = false;
    if (detections.length === 0) {
      isInactive = true;
    } else {
      const landmarks = detections[0].landmarks;
      const leftEye = landmarks.getLeftEye();
      const rightEye = landmarks.getRightEye();
      
      const getEAR = eye => (faceapi.euclideanDistance(eye[1], eye[5]) + faceapi.euclideanDistance(eye[2], eye[4])) / (2 * faceapi.euclideanDistance(eye[0], eye[3]));
      
      const avgEAR = (getEAR(leftEye) + getEAR(rightEye)) / 2;
      
      if (avgEAR < 0.25) {
        isInactive = true;
      }
    }

    // Send a message back to the main content.js script if inactive
    if (isInactive) {
      window.parent.postMessage({ type: 'inattention_detected' }, '*');
    }

  }, 500); // Run detection every 500ms
}

// Listen for messages from content.js to get the video stream
window.addEventListener('message', event => {
  if (event.data.type === 'start_stream') {
    startDetection(event.data.stream);
  }
});