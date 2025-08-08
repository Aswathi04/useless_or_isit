(async () => {
  await faceapi.nets.tinyFaceDetector.loadFromUri('models/');
  await faceapi.nets.faceLandmark68Net.loadFromUri('models/');

  const video = document.getElementById('video');
  const canvas = document.getElementById('canvas');
  let closedEyeFrames = 0;

  const stream = await navigator.mediaDevices.getUserMedia({ video: true });
  video.srcObject = stream;

  video.onloadedmetadata = () => {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    faceapi.matchDimensions(canvas, { width: video.videoWidth, height: video.videoHeight });

    setInterval(async () => {
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const detections = await faceapi
        .detectAllFaces(canvas, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks();

      let dozing = false;

      if (detections.length > 0) {
        const landmarks = detections[0].landmarks;
        const leftEye = landmarks.getLeftEye();
        const rightEye = landmarks.getRightEye();

        const getEAR = eye =>
          (faceapi.euclideanDistance(eye[1], eye[5]) +
            faceapi.euclideanDistance(eye[2], eye[4])) /
          (2 * faceapi.euclideanDistance(eye[0], eye[3]));

        const avgEAR = (getEAR(leftEye) + getEAR(rightEye)) / 2;

        if (avgEAR < 0.25) {
          closedEyeFrames++;
          if (closedEyeFrames > 30) {
            dozing = true;
            closedEyeFrames = 0;
          }
        } else {
          closedEyeFrames = 0;
        }
      } else {
        // If no face is detected
        closedEyeFrames++;
        if (closedEyeFrames > 60) {
          dozing = true;
          closedEyeFrames = 0;
        }
      }

      // Send result back to content script
      if (dozing) {
        window.parent.postMessage({ type: 'DOZING_OFF' }, '*');
      }
    }, 100);
  };
})();
