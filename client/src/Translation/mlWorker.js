// Promise-based wrapper around the ML Web Workers in public/ml/.
// Workers are created lazily so models are only downloaded when a feature is used.

class MLWorker {
  constructor(script) {
    this.script = script;
    this.worker = null;
    this.nextId = 0;
    this.pending = new Map();
    this.progressListeners = new Set();
  }

  ensureWorker() {
    if (this.worker) return this.worker;
    this.worker = new Worker(`${process.env.PUBLIC_URL}/ml/${this.script}`, { type: 'module' });
    this.worker.onmessage = ({ data }) => {
      if (data.type === 'progress') {
        this.progressListeners.forEach((listener) => listener(data.data));
        return;
      }
      const request = this.pending.get(data.id);
      if (!request) return;
      this.pending.delete(data.id);
      if (data.type === 'error') request.reject(new Error(data.message));
      else request.resolve(data.result);
    };
    this.worker.onerror = (event) => {
      const error = new Error(event.message || `Failed to start ${this.script}`);
      this.pending.forEach(({ reject }) => reject(error));
      this.pending.clear();
      this.worker.terminate();
      this.worker = null;
    };
    return this.worker;
  }

  request(type, payload, transfer = []) {
    const worker = this.ensureWorker();
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      worker.postMessage({ id, type, payload }, transfer);
    });
  }

  onProgress(listener) {
    this.progressListeners.add(listener);
    return () => this.progressListeners.delete(listener);
  }
}

export const semanticWorker = new MLWorker('semantic-worker.js');
export const asrWorker = new MLWorker('asr-worker.js');

/**
 * Turn transformers.js progress events into a short status string (or null when idle).
 */
export const describeProgress = (data) => {
  if (data.status === 'progress' && data.total) {
    return `Downloading ${data.file} ${Math.round(data.progress)}%`;
  }
  if (data.status === 'initiate') return `Loading ${data.file}…`;
  return null;
};
