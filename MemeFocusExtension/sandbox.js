// sandbox.js

let canvas, context;
let modelLoadingCompleted = false;

async function initModels(modelUrls) {
  // Wait for TensorFlow.js to be defined before loading models
  if (typeof tf === 'undefined' || typeof faceapi === 'undefined') {
    setTimeout(() => initModels(modelUrls), 100);
    return;
  }

  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(modelUrls.tinyFaceDetector),
    faceapi.nets.faceLandmark68Net.loadFromUri(modelUrls.faceLandmark)
  ]);
  console.log("Models loaded in sandbox.");
  modelLoadingCompleted = true;
}

async function processImage(imageData) {
  if (!modelLoadingCompleted) {
    return;
  }

  if (!canvas) {
    canvas = document.getElementById('canvasElement');
    context = canvas.getContext('2d');
  }

  canvas.width = imageData.width;
  canvas.height = imageData.height;
  context.putImageData(imageData, 0, 0);

  const detections = await faceapi.detectAllFaces(canvas, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks();

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

  if (isInactive) {
    window.parent.postMessage({ type: 'inattention_detected' }, '*');
  }
}

window.addEventListener('message', event => {
  if (event.data.type === 'init_models') {
    initModels(event.data.modelUrls);
  }
  if (event.data.type === 'image_data') {
    processImage(event.data.imageData);
  }
});