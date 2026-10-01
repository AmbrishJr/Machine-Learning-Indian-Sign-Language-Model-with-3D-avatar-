// On-device speech recognition with Whisper (runs off the main thread).
// Expects 16 kHz mono Float32 PCM and returns the transcript.
import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1';

env.allowLocalModels = false;

const MODEL = 'onnx-community/whisper-base.en';

let transcriber = null;

const getTranscriber = () => {
  transcriber ??= pipeline('automatic-speech-recognition', MODEL, {
    dtype: 'q8',
    progress_callback: (data) => self.postMessage({ type: 'progress', data }),
  });
  return transcriber;
};

self.onmessage = async ({ data: { id, type, payload } }) => {
  try {
    if (type === 'load') {
      await getTranscriber();
      self.postMessage({ id, type: 'result', result: true });
    } else if (type === 'transcribe') {
      const model = await getTranscriber();
      const output = await model(payload.audio, { chunk_length_s: 30, stride_length_s: 5 });
      self.postMessage({ id, type: 'result', result: output.text.trim() });
    }
  } catch (err) {
    self.postMessage({ id, type: 'error', message: err.message || String(err) });
  }
};
