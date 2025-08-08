importScripts('libs/tf.min.js', 'libs/blazeface.min.js');

let model;

async function loadModel() {
  model = await blazeface.load();
  console.log('Web Worker: Model loaded.');
}

loadModel();

self.onmessage = async (event) => {
  if (event.data?.type === 'START_DETECTION') {
    console.log('Web Worker: Starting detection.');

    // Simulate detection logic (replace with actual video frame processing)
    setInterval(async () => {
      if (!model) return;

      // Simulated detection result
      const isDozingOff = Math.random() > 0.8; // Randomly simulate dozing off

      if (isDozingOff) {
        self.postMessage({ type: 'DOZING_OFF' });
      }
    }, 1000); // Check every second
  }
};
