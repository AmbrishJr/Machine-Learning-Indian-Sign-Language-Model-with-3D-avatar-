import * as words from '../Animations/words';
import * as alphabets from '../Animations/alphabets';

export const SIGN_VOCABULARY = words.wordList;

// Pronoun signs are only reached by exact match or synonym, never by the ML matcher:
// pronouns embed close to each other and to person nouns ("people" ~ THEY).
const PRONOUN_SIGNS = new Set(['I', 'YOU', 'HE', 'SHE', 'IT', 'WE', 'THEY', 'YOU_PLURAL']);
export const SEMANTIC_VOCABULARY = SIGN_VOCABULARY.filter((sign) => !PRONOUN_SIGNS.has(sign));

// Fixed expressions matched before grammar rules, so they are not lemmatised or reordered:
// every sign named WORD_WORD, plus other phrasings of these greetings.
export const PHRASES = {
  ...Object.fromEntries(SIGN_VOCABULARY.filter((s) => s.includes('_')).map((s) => [s.toLowerCase().replace(/_/g, ' '), s])),
  'all right': 'ALRIGHT',
  'you all': 'YOU_PLURAL',
  'all of you': 'YOU_PLURAL',
  thanks: 'THANK_YOU',
  hi: 'HELLO',
  hey: 'HELLO',
  ok: 'ALRIGHT',
  okay: 'ALRIGHT',
};

// Hand-curated synonyms for words that map onto an existing sign. Checked
// before the ML matcher because single-word embeddings are noisy for very
// short or closed-class words.
export const SYNONYMS = {
  HOUSE: 'HOME',
  RESIDENCE: 'HOME',
  MAN: 'PERSON',
  WOMAN: 'PERSON',
  PEOPLE: 'PERSON',
  HUMAN: 'PERSON',
  BOY: 'PERSON',
  GIRL: 'PERSON',
  CLOCK: 'TIME',
  HOUR: 'TIME',
  WATCH: 'TIME',
  YOUR: 'YOU',
  YOURS: 'YOU',
  YOURSELF: 'YOU',
  U: 'YOU',
  ME: 'I',
  MYSELF: 'I',
  HIM: 'HE',
  HER: 'SHE',
  US: 'WE',
  THEM: 'THEY',
};

const isSign = (name) => typeof words[name] === 'function' && SIGN_VOCABULARY.includes(name);

/**
 * Resolve a gloss token to a word sign without ML: exact match, then synonym.
 * @returns {{sign: string, via: 'exact'|'synonym'} | null}
 */
export const resolveLocally = (gloss) => {
  if (isSign(gloss)) return { sign: gloss, via: 'exact' };
  const synonym = SYNONYMS[gloss];
  if (synonym && isSign(synonym)) return { sign: synonym, via: 'synonym' };
  return null;
};

/**
 * Build the sequence of signs to perform.
 * @param tokens  gloss tokens from glossTranslator
 * @param semanticMatches  optional map gloss -> {sign, score} from the ML matcher
 * @returns {{kind: 'word'|'letter', sign: string, label: string, via: string, score?: number}[][]}
 *          one entry per token, each a list of signs (one word sign, or letters)
 */
export const planSigns = (tokens, semanticMatches = {}) =>
  tokens.map(({ gloss }) => {
    const local = resolveLocally(gloss);
    if (local) return [{ kind: 'word', sign: local.sign, label: gloss, via: local.via }];

    const semantic = semanticMatches[gloss];
    if (semantic && isSign(semantic.sign)) {
      return [{ kind: 'word', sign: semantic.sign, label: gloss, via: 'ml', score: semantic.score }];
    }

    return gloss
      .split('')
      .filter((ch) => typeof alphabets[ch] === 'function')
      .map((ch) => ({ kind: 'letter', sign: ch, label: ch, via: 'fingerspell' }));
  }).filter((group) => group.length);

/**
 * Queue a plan on the avatar's animation ref (the format used by Convert/Video pages).
 */
export const performPlan = (plan, ref) => {
  for (const group of plan) {
    group.forEach((step, index) => {
      if (step.kind === 'word') {
        const label = step.label.replace(/_/g, ' ');
        const sign = step.sign.replace(/_/g, ' ');
        ref.animations.push(['add-text', `${label}${sign !== label ? ` (${sign})` : ''} `]);
        words[step.sign](ref);
      } else {
        ref.animations.push(['add-text', index === group.length - 1 ? `${step.label} ` : step.label]);
        alphabets[step.sign](ref);
      }
    });
  }
};
