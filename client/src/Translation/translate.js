import { textToGloss, textToLiteralTokens } from './glossTranslator';
import { planSigns, resolveLocally, PHRASES, SEMANTIC_VOCABULARY } from './signPlanner';
import { semanticWorker } from './mlWorker';

// Minimum cosine similarity for the ML matcher to substitute a sign.
// Calibrated on all-MiniLM-L6-v2: house->HOME 0.79, woman->PERSON 0.67,
// hour->TIME 0.63, lady->PERSON 0.60, residence->HOME 0.60, while unrelated
// words (car, school, dog, apple) stay below 0.48.
export const SEMANTIC_THRESHOLD = 0.55;

// Only content words are matched semantically; pronouns and function words
// embed close to each other ("i" ~ "you" = 0.66) and would get wrong signs.
const SEMANTIC_POS = new Set(['noun', 'verb', 'adjective', 'adverb']);

/**
 * Translate English text into a sign plan for the avatar.
 *
 * @param text
 * @param options.grammar   reorder into ISL grammar (otherwise word-by-word)
 * @param options.semantic  use the ML matcher for words without a sign
 * @returns {Promise<{tokens, plan, warning?: string}>}
 */
export const translate = async (text, { grammar = true, semantic = true } = {}) => {
  const tokens = grammar ? textToGloss(text, PHRASES) : textToLiteralTokens(text, PHRASES);

  let semanticMatches = {};
  let warning;
  if (semantic) {
    const candidates = [...new Set(
      tokens
        .filter(({ gloss, pos }) => SEMANTIC_POS.has(pos) && gloss.length > 2 && !resolveLocally(gloss))
        .map(({ gloss }) => gloss)
    )];
    if (candidates.length) {
      try {
        semanticMatches = await semanticWorker.request('match', {
          words: candidates,
          vocabulary: SEMANTIC_VOCABULARY,
          threshold: SEMANTIC_THRESHOLD,
        });
      } catch (err) {
        warning = `Smart sign matching unavailable (${err.message}); fingerspelling instead.`;
      }
    }
  }

  return { tokens, plan: planSigns(tokens, semanticMatches), warning };
};
