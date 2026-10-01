// Semantic sign matcher (runs off the main thread).
// Embeds words with a sentence-transformer and returns, for each word, the most
// similar sign in the avatar's vocabulary when the cosine similarity clears the
// threshold. Lets "house" use the HOME sign instead of being fingerspelled.
import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1';

env.allowLocalModels = false;

const MODEL = 'Xenova/all-MiniLM-L6-v2';

let extractor = null;
const vocabEmbeddings = new Map();

const getExtractor = () => {
  extractor ??= pipeline('feature-extraction', MODEL, {
    dtype: 'q8',
    progress_callback: (data) => self.postMessage({ type: 'progress', data }),
  });
  return extractor;
};

const embed = async (texts) => {
  const model = await getExtractor();
  // Sign names use underscores for multi-word signs (THANK_YOU -> "thank you").
  const output = await model(texts.map((t) => t.toLowerCase().replace(/_/g, ' ')), { pooling: 'mean', normalize: true });
  return output.tolist();
};

const dot = (a, b) => a.reduce((sum, x, i) => sum + x * b[i], 0);

const match = async ({ words, vocabulary, threshold }) => {
  const missing = vocabulary.filter((v) => !vocabEmbeddings.has(v));
  if (missing.length) {
    (await embed(missing)).forEach((vec, i) => vocabEmbeddings.set(missing[i], vec));
  }
  if (!words.length) return {};

  const wordVecs = await embed(words);
  const matches = {};
  words.forEach((word, i) => {
    let best = null;
    for (const sign of vocabulary) {
      const score = dot(wordVecs[i], vocabEmbeddings.get(sign));
      if (!best || score > best.score) best = { sign, score };
    }
    if (best && best.score >= threshold) matches[word] = best;
  });
  return matches;
};

self.onmessage = async ({ data: { id, type, payload } }) => {
  try {
    if (type === 'load') {
      await getExtractor();
      self.postMessage({ id, type: 'result', result: true });
    } else if (type === 'match') {
      self.postMessage({ id, type: 'result', result: await match(payload) });
    }
  } catch (err) {
    self.postMessage({ id, type: 'error', message: err.message || String(err) });
  }
};
