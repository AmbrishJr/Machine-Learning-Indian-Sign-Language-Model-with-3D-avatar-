import { textToGloss, textToLiteralTokens } from './glossTranslator';
import { planSigns, resolveLocally, PHRASES, SEMANTIC_VOCABULARY } from './signPlanner';
import { translate } from './translate';

const glossOf = (text) => textToGloss(text).map((t) => t.gloss).join(' ');

describe('textToGloss', () => {
  it.each([
    ['I am not going to the market tomorrow', 'TOMORROW I MARKET GO NOT'],
    ['Where is your house?', 'YOUR HOUSE WHERE'],
    ['What time do you go home?', 'TIME YOU HOME GO WHAT'],
    ['She has two cats', 'SHE TWO CAT HAVE'],
    ['The boys were playing football yesterday', 'YESTERDAY BOY FOOTBALL PLAY'],
    ["We can't go!", 'WE CAN GO NOT'],
  ])('%s -> %s', (english, gloss) => {
    expect(glossOf(english)).toBe(gloss);
  });

  it('handles multiple sentences and empty input', () => {
    expect(glossOf('Hello. You go home.')).toBe('HELLO YOU HOME GO');
    expect(textToGloss('')).toEqual([]);
  });

  it('spells out digits as number words', () => {
    expect(glossOf('He ate 25 apples')).toBe('HE TWENTY FIVE APPLE EAT');
  });
});

describe('textToLiteralTokens', () => {
  it('keeps English order and strips punctuation', () => {
    expect(textToLiteralTokens('Hello, you!').map((t) => t.gloss)).toEqual(['HELLO', 'YOU']);
  });
});

describe('planSigns', () => {
  it('uses word signs, synonyms, and fingerspelling', () => {
    const plan = planSigns([{ gloss: 'YOU' }, { gloss: 'HOUSE' }, { gloss: 'GO' }]);
    expect(plan).toEqual([
      [{ kind: 'word', sign: 'YOU', label: 'YOU', via: 'exact' }],
      [{ kind: 'word', sign: 'HOME', label: 'HOUSE', via: 'synonym' }],
      [
        { kind: 'letter', sign: 'G', label: 'G', via: 'fingerspell' },
        { kind: 'letter', sign: 'O', label: 'O', via: 'fingerspell' },
      ],
    ]);
  });

  it('uses ML matches and skips characters without an animation', () => {
    const plan = planSigns([{ gloss: 'DWELLING' }, { gloss: '42' }], { DWELLING: { sign: 'HOME', score: 0.7 } });
    expect(plan).toEqual([[{ kind: 'word', sign: 'HOME', label: 'DWELLING', via: 'ml', score: 0.7 }]]);
  });

  it('ignores ML matches that are not real signs', () => {
    expect(resolveLocally('CAR')).toBeNull();
    const plan = planSigns([{ gloss: 'AB' }], { AB: { sign: 'NOT_A_SIGN', score: 0.9 } });
    expect(plan[0].map((s) => s.kind)).toEqual(['letter', 'letter']);
  });
});

describe('translate', () => {
  it('produces a plan without the ML matcher', async () => {
    const { tokens, plan, warning } = await translate('Is this your house?', { semantic: false });
    expect(tokens.map((t) => t.gloss)).toEqual(['THIS', 'YOUR', 'HOUSE']);
    expect(plan.map((g) => g.map((s) => s.sign).join(''))).toEqual(['THIS', 'YOU', 'HOME']);
    expect(warning).toBeUndefined();
  });
});

describe('multi-word signs and pronouns', () => {
  const signsOf = async (text, options) =>
    (await translate(text, { semantic: false, ...options })).plan.map((g) => g.map((s) => s.sign).join(''));

  it('keeps phrases together instead of dropping or reordering their words', () => {
    expect(textToGloss('Hello, how are you?', PHRASES).map((t) => t.gloss)).toEqual(['HELLO', 'HOW_ARE_YOU']);
    expect(textToGloss('Good morning! Thank you.', PHRASES).map((t) => t.gloss)).toEqual(['GOOD_MORNING', 'THANK_YOU']);
    expect(textToLiteralTokens('thank you all right', PHRASES).map((t) => t.gloss)).toEqual(['THANK_YOU', 'ALRIGHT']);
  });

  it('plays word signs for greetings and pronouns', async () => {
    expect(await signsOf('Hello, how are you?')).toEqual(['HELLO', 'HOW_ARE_YOU']);
    expect(await signsOf('Thanks, good night')).toEqual(['THANK_YOU', 'GOOD_NIGHT']);
    expect(await signsOf('Hi! Okay')).toEqual(['HELLO', 'ALRIGHT']);
    expect(await signsOf('They like me')).toEqual(['THEY', 'I', 'LIKE']);
    expect(await signsOf('Thank you all', { grammar: false })).toEqual(['THANK_YOU', 'ALL']);
  });

  it('never offers pronoun signs to the ML matcher', () => {
    expect(SEMANTIC_VOCABULARY).toContain('HOME');
    expect(SEMANTIC_VOCABULARY).not.toContain('THEY');
    expect(SEMANTIC_VOCABULARY).not.toContain('YOU');
  });
});
