import { useEffect, useRef, useState } from 'react';
import { asrWorker, describeProgress } from './mlWorker';

const WHISPER_SAMPLE_RATE = 16000;

// Decode a recorded blob to 16 kHz mono PCM, the input format Whisper expects.
const blobToPcm = async (blob) => {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  const audioContext = new AudioCtx({ sampleRate: WHISPER_SAMPLE_RATE });
  try {
    const decoded = await audioContext.decodeAudioData(await blob.arrayBuffer());
    // Copy so the buffer can be transferred to the worker.
    return new Float32Array(decoded.getChannelData(0));
  } finally {
    audioContext.close();
  }
};

/**
 * Record from the microphone and transcribe on-device with Whisper.
 * status: 'idle' | 'recording' | 'transcribing'
 */
export const useWhisperRecorder = () => {
  const [status, setStatus] = useState('idle');
  const [transcript, setTranscript] = useState('');
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState(null);
  const recorderRef = useRef(null);

  useEffect(() => asrWorker.onProgress((data) => setProgress(describeProgress(data))), []);

  useEffect(() => () => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.onstop = null;
      recorder.stop();
      recorder.stream.getTracks().forEach((track) => track.stop());
    }
  }, []);

  const start = async () => {
    if (status !== 'idle') return;
    setError(null);
    try {
      // Start downloading the model while the user speaks.
      asrWorker.request('load').catch((err) => setError(err.message));

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];
      recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        setStatus('transcribing');
        try {
          const audio = await blobToPcm(new Blob(chunks, { type: recorder.mimeType }));
          const text = await asrWorker.request('transcribe', { audio }, [audio.buffer]);
          setTranscript((prev) => (prev ? `${prev} ${text}` : text));
        } catch (err) {
          setError(err.message);
        } finally {
          setProgress(null);
          setStatus('idle');
        }
      };
      recorderRef.current = recorder;
      recorder.start();
      setStatus('recording');
    } catch (err) {
      setError(err.message);
      setStatus('idle');
    }
  };

  const stop = () => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state === 'recording') recorder.stop();
  };

  const reset = () => setTranscript('');

  return { status, transcript, setTranscript, progress, error, start, stop, reset };
};
