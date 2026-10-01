import nlp from 'compromise';

// English -> ISL gloss.
//
// ISL grammar differs from English: it has no articles or copula, is largely
// Subject-Object-Verb, puts time markers first, negation after the verb and
// question words at the end. We use compromise's POS tagger / lemmatiser to
// classify each token and then re-order with those rules.
//
//   "I am not going to the market tomorrow"  ->  TOMORROW I MARKET GO NOT
//   "Where is your house?"                   ->  YOUR HOUSE WHERE

const DROP_WORDS = new Set([
  'a', 'an', 'the',
  'is', 'am', 'are', 'was', 'were', 'be', 'been', 'being',
  'will', 'shall', 'would',
  'to', 'of',
]);

const DO_FORMS = new Set(['do', 'does', 'did']);

const TIME_WORDS = new Set([
  'today', 'tomorrow', 'yesterday', 'now', 'tonight', 'morning', 'evening',
  'night', 'afternoon', 'later', 'soon', 'always', 'never', 'daily', 'weekly',
]);

const QUESTION_WORDS = new Set(['what', 'where', 'when', 'why', 'who', 'whom', 'whose', 'which', 'how']);

const NEGATIONS = new Set(['not', 'no', 'never']);

const has = (term, tag) => term.tags.includes(tag);

const lemmaOf = (term, word) => {
  if (has(term, 'Verb') || has(term, 'Plural')) return term.root || word;
  return word;
};

const posOf = (term) => {
  if (has(term, 'Pronoun')) return 'pronoun';
  if (has(term, 'Verb')) return 'verb';
  if (has(term, 'Noun')) return 'noun';
  if (has(term, 'Adjective')) return 'adjective';
  if (has(term, 'Adverb')) return 'adverb';
  if (has(term, 'Value')) return 'number';
  return 'other';
};

const toWords = (terms) => terms
  .map((t) => ({ term: t, word: (t.implicit || t.normal || '').toLowerCase().replace(/[^a-z0-9']/g, '') }))
  .filter(({ word }) => word);

/**
 * Merge fixed expressions ("thank you", "how are you", "thanks") into one item, longest match first.
 * Runs before grammar rules so their words are neither dropped nor reordered.
 * @param phrases  map of lower-case phrase -> gloss, e.g. {'thank you': 'THANK_YOU'}
 */
const mergePhrases = (words, phrases) => {
  const patterns = Object.keys(phrases).map((p) => p.split(' ')).sort((a, b) => b.length - a.length);
  const out = [];
  for (let i = 0; i < words.length;) {
    const match = patterns.find((p) => p.every((w, k) => words[i + k] && words[i + k].word === w));
    if (match) {
      const source = match.join(' ');
      out.push({ phrase: phrases[source], word: source });
      i += match.length;
    } else {
      out.push(words[i++]);
    }
  }
  return out;
};

const sentenceToGloss = (terms, phrases) => {
  const words = mergePhrases(toWords(terms), phrases);

  const verbCount = words.filter(({ term, word }) => term && has(term, 'Verb') && !DROP_WORDS.has(word)).length;

  const time = [], body = [], verbs = [], negation = [], question = [];

  for (const { term, word, phrase } of words) {
    if (phrase) {
      body.push({ gloss: phrase, source: word, pos: 'phrase' });
      continue;
    }
    if (DROP_WORDS.has(word)) continue;
    // "do" is only an auxiliary when there is another verb: "do you go" -> GO
    if (DO_FORMS.has(word) && verbCount > 1) continue;

    const token = {
      gloss: lemmaOf(term, word).replace(/'/g, '').toUpperCase(),
      source: word,
      pos: posOf(term),
    };

    if (QUESTION_WORDS.has(word) || has(term, 'QuestionWord')) question.push(token);
    else if (NEGATIONS.has(word) || has(term, 'Negative')) negation.push(token);
    else if (TIME_WORDS.has(word) || has(term, 'Date')) time.push(token);
    else if (token.pos === 'verb') verbs.push(token);
    else body.push(token);
  }

  return [...time, ...body, ...verbs, ...negation, ...question];
};

/**
 * Convert English text to a list of ISL gloss tokens.
 * @param phrases  multi-word signs, lower-case phrase -> gloss (see signPlanner.PHRASES)
 * @returns {{gloss: string, source: string, pos: string}[]}
 */
export const textToGloss = (text, phrases = {}) => {
  const doc = nlp(text || '');
  doc.numbers().toText();
  doc.compute('root');
  return doc.json().flatMap((sentence) => sentenceToGloss(sentence.terms, phrases));
};

/**
 * Literal mode: keep every English word in its original order (still POS-tagged).
 */
export const textToLiteralTokens = (text, phrases = {}) =>
  nlp(text || '')
    .json()
    .flatMap((sentence) => mergePhrases(
      sentence.terms
        .map((term) => ({ term, word: (term.normal || '').replace(/[^a-z0-9]/g, '') }))
        .filter(({ word }) => word),
      phrases,
    ))
    .map(({ term, word, phrase }) => phrase
      ? { gloss: phrase, source: word, pos: 'phrase' }
      : { gloss: word.toUpperCase(), source: word, pos: posOf(term) });
