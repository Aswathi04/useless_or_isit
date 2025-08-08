console.log("Meme Focus extension loaded!");

// Load iframe
const iframe = document.createElement('iframe');
iframe.src = chrome.runtime.getURL('face-detector.html');
iframe.style.display = 'none';
document.body.appendChild(iframe);

// Initialize Web Worker
const worker = new Worker(chrome.runtime.getURL('face-detector-worker.js'));

// Show meme and play sound
function showMeme() {
  const memes = [
    chrome.runtime.getURL('memes/meme1.jpg'),
    chrome.runtime.getURL('memes/meme2.jpg'),
  ];
  const audioUrl = chrome.runtime.getURL('audio/alarm_clock_new_s5.mp3');

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
  popup.innerHTML = `<img src="${randomMeme}" width="250" height="250">`;
  document.body.appendChild(popup);

  const sound = new Audio(audioUrl);
  sound.play().catch(e => console.error("Audio error:", e));

  setTimeout(() => popup.remove(), 5000);
}

// Listen for messages from the Web Worker
worker.onmessage = (event) => {
  if (event.data?.type === 'DOZING_OFF') {
    showMeme();
  }
};

// Send a message to the Web Worker to start processing
worker.postMessage({ type: 'START_DETECTION' });
