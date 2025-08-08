// bridge.js
// This script loads the face-api.js library from a CDN.
// It must run before content.js.

const faceApiScript = document.createElement('script');
faceApiScript.src = 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.js';
document.head.appendChild(faceApiScript);