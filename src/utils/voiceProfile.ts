import type { GuestEmotion, ScenarioId } from '../types';

export type GeminiVoiceName = 'Puck' | 'Charon' | 'Fenrir' | 'Kore' | 'Zephyr';

export const MALE_VOICES: readonly GeminiVoiceName[] = ['Charon', 'Fenrir', 'Puck'] as const;
export const FEMALE_VOICES: readonly GeminiVoiceName[] = ['Kore', 'Zephyr'] as const;

export interface GuestVoiceProfile {
  voiceName: GeminiVoiceName;
  gender: 'male' | 'female';
  ageGroup: string;
  ageDescriptor: string;
  vocalRegister: string;
  voiceLabel: string;
  personaStyle: string;
  fallbackPitch: number;
  fallbackRate: number;
}

/**
 * Voice casting calibrated individually to each scenario's character portrait
 * (visual gender, apparent age, attire/demeanor, and vocal register).
 */
const SCENARIO_VOICE_MAP: Record<ScenarioId, GuestVoiceProfile> = {
  'double-checkin': {
    voiceName: 'Charon',
    gender: 'male',
    ageGroup: '40대 중반 남성',
    ageDescriptor: 'mid-40s (around 44 years old)',
    vocalRegister: 'deep, commanding corporate baritone with strong chest resonance',
    voiceLabel: '40대 중반 남성 · 중저음 바리톤',
    personaStyle:
      'authoritative mid-40s Korean corporate executive in a sharp charcoal suit, crisp commanding enunciation after a tiring overseas flight',
    fallbackPitch: 0.89,
    fallbackRate: 1.0,
  },
  'dirty-room': {
    voiceName: 'Zephyr',
    gender: 'female',
    ageGroup: '30대 중반 여성',
    ageDescriptor: 'early-to-mid 30s (around 34 years old)',
    vocalRegister: 'clear, articulate modern mid-tone soprano-mezzo',
    voiceLabel: '30대 중반 여성 · 또렷한 톤',
    personaStyle:
      'stylish mid-30s Korean female luxury hotel guest celebrating her wedding anniversary, crisp modern Seoul intonation with sharp exasperation',
    fallbackPitch: 1.06,
    fallbackRate: 1.03,
  },
  'room-noise': {
    voiceName: 'Puck',
    gender: 'male',
    ageGroup: '30대 후반 남성',
    ageDescriptor: 'late 30s (around 38 years old)',
    vocalRegister: 'slightly lighter, tense, sleep-deprived tenor-baritone',
    voiceLabel: '30대 후반 남성 · 피곤한 중음',
    personaStyle:
      'exhausted, bespectacled late-30s Korean business traveler speaking at 1 AM before a big presentation, strained and frayed from lack of sleep',
    fallbackPitch: 1.02,
    fallbackRate: 1.04,
  },
  'unreasonable-vip': {
    voiceName: 'Kore',
    gender: 'female',
    ageGroup: '50대 중반 여성',
    ageDescriptor: 'mid-to-late 50s (around 56 years old)',
    vocalRegister: 'noticeably mature, lower-pitched rich alto with worldly weight',
    voiceLabel: '50대 중반 여성 · 묵직한 중저음',
    personaStyle:
      'haughty, assertive mid-50s affluent Korean woman in a tweed jacket and silk scarf, entitled demanding cadence that clearly sounds mature and in her mid-50s',
    fallbackPitch: 0.88,
    fallbackRate: 0.96,
  },
  'fnb-delay-order': {
    voiceName: 'Charon',
    gender: 'male',
    ageGroup: '40대 후반 남성',
    ageDescriptor: 'mid-to-late 40s (around 47 years old)',
    vocalRegister: 'robust, heavy-chested lower baritone with booming projection',
    voiceLabel: '40대 후반 남성 · 굵직한 저음',
    personaStyle:
      'impatient late-40s Korean company president hosting overseas business partners at a fine-dining table, forceful and status-conscious',
    fallbackPitch: 0.86,
    fallbackRate: 1.02,
  },
  'fnb-seat-corkage': {
    voiceName: 'Kore',
    gender: 'female',
    ageGroup: '40대 초반 여성',
    ageDescriptor: 'early-to-mid 40s (around 42 years old)',
    vocalRegister: 'cool, polished low-mid mezzo-alto with poised resonance',
    voiceLabel: '40대 초반 여성 · 차분한 중저음',
    personaStyle:
      'elegant early-40s Korean woman in a sleek black evening dress at a high-rise skyline restaurant, refined icy diction and sharp disapproval',
    fallbackPitch: 0.95,
    fallbackRate: 0.98,
  },
  'culinary-allergy': {
    voiceName: 'Zephyr',
    gender: 'female',
    ageGroup: '30대 초반 여성',
    ageDescriptor: 'late 20s to early 30s (around 30 years old)',
    vocalRegister: 'youthful, brighter high-mid voice trembling with urgent alarm',
    voiceLabel: '30대 초반 여성 · 젊은 고음 톤',
    personaStyle:
      'shocked, panicked late-20s to early-30s Korean woman reacting immediately to a dangerous nut-allergy food incident at an open kitchen',
    fallbackPitch: 1.13,
    fallbackRate: 1.08,
  },
  'culinary-undercooked': {
    voiceName: 'Fenrir',
    gender: 'male',
    ageGroup: '40대 후반 남성',
    ageDescriptor: 'late 40s (around 48 years old)',
    vocalRegister: 'slightly gravelly, seasoned stern baritone with firm bite',
    voiceLabel: '40대 후반 남성 · 거친 중저음',
    personaStyle:
      'discerning late-40s Korean gourmet diner in a casual dark shirt confronting the open-kitchen grill chef, clipped and unforgiving',
    fallbackPitch: 0.88,
    fallbackRate: 0.97,
  },
  'convention-av-failure': {
    voiceName: 'Fenrir',
    gender: 'male',
    ageGroup: '40대 후반 남성',
    ageDescriptor: 'late 40s to early 50s (around 49 years old)',
    vocalRegister: 'sharp, forceful, high-pressure authoritative baritone',
    voiceLabel: '40대 후반 남성 · 단호한 저음',
    personaStyle:
      'stressed late-40s Korean international conference director wearing glasses and an event lanyard, speaking briskly under live 300-guest keynote pressure',
    fallbackPitch: 0.9,
    fallbackRate: 1.06,
  },
  'convention-catering-shortage': {
    voiceName: 'Kore',
    gender: 'female',
    ageGroup: '30대 후반 여성',
    ageDescriptor: 'late 30s (around 37 years old)',
    vocalRegister: 'crisp, brisk, articulate career-woman mezzo',
    voiceLabel: '30대 후반 여성 · 또렷한 중음',
    personaStyle:
      'sharply focused late-30s Korean corporate gala organizer in a cream suit holding a clipboard, urgent and tightly wound under executive deadline pressure',
    fallbackPitch: 1.02,
    fallbackRate: 1.06,
  },
  'pool-capacity-rules': {
    voiceName: 'Zephyr',
    gender: 'female',
    ageGroup: '30대 중반 여성',
    ageDescriptor: 'mid-30s (around 35 years old)',
    vocalRegister: 'lively, expressive bright-mid everyday conversational female voice',
    voiceLabel: '30대 중반 여성 · 밝고 또렷한 톤',
    personaStyle:
      'frustrated mid-30s Korean mother in a poolside linen cover-up with hair tied in a bun, protesting directly and energetically at an indoor pool desk',
    fallbackPitch: 1.08,
    fallbackRate: 1.04,
  },
  'pool-hygiene-locker': {
    voiceName: 'Puck',
    gender: 'male',
    ageGroup: '30대 중반 남성',
    ageDescriptor: 'mid-to-late 30s (around 36 years old)',
    vocalRegister: 'clean, younger natural mid-baritone/tenor',
    voiceLabel: '30대 중반 남성 · 깔끔한 중음',
    personaStyle:
      'chilly, annoyed mid-30s Korean male spa guest in a dark grey robe with wet hair and a towel over his shoulder, brisk and clearly younger than middle-aged executives',
    fallbackPitch: 1.0,
    fallbackRate: 1.01,
  },
  'rank-intern-authority': {
    voiceName: 'Charon',
    gender: 'male',
    ageGroup: '50대 초반 남성',
    ageDescriptor: 'early 50s (around 51 years old)',
    vocalRegister: 'heavy, patrician bass-baritone with imperious executive weight',
    voiceLabel: '50대 초반 남성 · 묵직한 저음',
    personaStyle:
      'stern, commanding early-50s Korean CEO and longtime VIP regular in a three-piece suit waving a checkout receipt at a trainee, deliberate and authoritative',
    fallbackPitch: 0.84,
    fallbackRate: 0.96,
  },
  'rank-senior-billing': {
    voiceName: 'Kore',
    gender: 'female',
    ageGroup: '40대 초반 여성',
    ageDescriptor: 'late 30s to early 40s (around 40 years old)',
    vocalRegister: 'firm, incisive, crisp corporate executive mezzo-alto',
    voiceLabel: '40대 초반 여성 · 단호한 중음',
    personaStyle:
      'time-pressed early-40s Korean global consulting director in an ivory blazer holding up her phone with a rolling suitcase, razor-sharp and urgent before an airport departure',
    fallbackPitch: 0.97,
    fallbackRate: 1.06,
  },
  'rank-manager-escalation': {
    voiceName: 'Charon',
    gender: 'male',
    ageGroup: '50대 중반 남성',
    ageDescriptor: 'mid-50s (around 54 years old)',
    vocalRegister: 'deep, resonant, dignified patriarch bass-baritone with mature gravitas',
    voiceLabel: '50대 중반 남성 · 중후한 저음',
    personaStyle:
      'distinguished mid-50s Korean gentleman with graying temples seated in a VIP lounge, deeply hurt and sternly holding management accountable over his parents 70th birthday cake',
    fallbackPitch: 0.81,
    fallbackRate: 0.93,
  },
  'rank-gm-crisis': {
    voiceName: 'Kore',
    gender: 'female',
    ageGroup: '30대 중반 여성',
    ageDescriptor: 'mid-to-late 30s (around 36 years old)',
    vocalRegister: 'poised, resonant, media-trained articulate mezzo',
    voiceLabel: '30대 중반 여성 · 단단한 중음',
    personaStyle:
      'charismatic mid-30s Korean columnist and public figure in a camel coat and black turtleneck inside an executive boardroom, controlled yet fiercely indignant with clear projection',
    fallbackPitch: 1.0,
    fallbackRate: 0.99,
  },
};

export function resolveGuestVoiceProfile(
  scenarioId: ScenarioId,
  expectedGender: 'male' | 'female'
): GuestVoiceProfile {
  const mapped = SCENARIO_VOICE_MAP[scenarioId];
  if (mapped && mapped.gender === expectedGender) {
    return mapped;
  }
  return expectedGender === 'female'
    ? {
        voiceName: 'Kore',
        gender: 'female',
        ageGroup: '30대 여성',
        ageDescriptor: 'mid-30s',
        vocalRegister: 'natural articulate adult female mezzo',
        voiceLabel: '30대 여성 · 자연스러운 톤',
        personaStyle: 'natural adult Korean female five-star hotel guest',
        fallbackPitch: 1.02,
        fallbackRate: 1.0,
      }
    : {
        voiceName: 'Charon',
        gender: 'male',
        ageGroup: '40대 남성',
        ageDescriptor: 'mid-40s',
        vocalRegister: 'natural resonant adult male baritone',
        voiceLabel: '40대 남성 · 자연스러운 톤',
        personaStyle: 'natural adult Korean male five-star hotel guest',
        fallbackPitch: 0.9,
        fallbackRate: 1.0,
      };
}

const EMOTION_VOICE_DIRECTIONS: Record<GuestEmotion, string> = {
  furious:
    'genuinely upset and exasperated, tense raised energy, brisk urgent pacing with realistic breaths and crisp emphasis, authentic real-life Korean speech (never robotic or cartoonish)',
  angry:
    'clearly dissatisfied and firm, sharp clipped phrasing, skeptical pressure in the voice, realistic conversational Korean prosody',
  skeptical:
    'guarded and unconvinced, measured slightly cool pacing while scrutinizing the hotel staff response, natural Korean intonation',
  calm:
    'frustration noticeably easing, steadier and calmer conversational rhythm, more receptive everyday Korean tone',
  satisfied:
    'warm, relieved, and genuinely appreciative, relaxed polite Korean intonation with natural warmth',
};

export function buildSpeechStylePrompt(
  profile: GuestVoiceProfile,
  emotion: GuestEmotion
): string {
  const genderWord = profile.gender === 'female' ? 'female' : 'male';
  const emotionDir = EMOTION_VOICE_DIRECTIONS[emotion] ?? EMOTION_VOICE_DIRECTIONS.angry;
  return (
    `Voice persona: native Seoul Korean ${genderWord} in their ${profile.ageDescriptor}. ` +
    `Vocal timbre & pitch: ${profile.vocalRegister}. ` +
    `Character context: ${profile.personaStyle}. ` +
    `Match the natural vocal maturity, pitch, and cadence of this exact age and gender. ` +
    `Emotional delivery: ${emotionDir}.`
  );
}

export function computeFallbackSpeechParams(
  profile: GuestVoiceProfile,
  emotion: GuestEmotion
): { pitch: number; rate: number } {
  const rateAdjust =
    emotion === 'furious'
      ? 0.05
      : emotion === 'angry'
        ? 0.02
        : emotion === 'calm'
          ? -0.04
          : emotion === 'satisfied'
            ? -0.03
            : 0;
  const pitchAdjust =
    emotion === 'furious' ? 0.03 : emotion === 'calm' || emotion === 'satisfied' ? -0.02 : 0;

  const rate = Math.min(1.2, Math.max(0.85, Number((profile.fallbackRate + rateAdjust).toFixed(2))));
  const pitch = Math.min(1.25, Math.max(0.75, Number((profile.fallbackPitch + pitchAdjust).toFixed(2))));
  return { pitch, rate };
}

const MALE_VOICE_KEYWORDS = [
  'injoon',
  'hyunsu',
  'bongjin',
  'gookmin',
  'minsu',
  'jinho',
  'male',
  'man',
  '남성',
  '남자',
];

const FEMALE_VOICE_KEYWORDS = [
  'sunhi',
  'yuna',
  'sora',
  'heami',
  'jimin',
  'seohyeon',
  'yu-jin',
  'yujin',
  'female',
  'woman',
  '여성',
  '여자',
];

export function pickFallbackBrowserVoice(
  voices: readonly { name: string; lang: string }[],
  gender: 'male' | 'female'
): { name: string; lang: string } | null {
  const koreanVoices = voices.filter((v) => v.lang.toLowerCase().startsWith('ko'));
  if (koreanVoices.length === 0) return null;

  const preferredKeywords = gender === 'male' ? MALE_VOICE_KEYWORDS : FEMALE_VOICE_KEYWORDS;
  const oppositeKeywords = gender === 'male' ? FEMALE_VOICE_KEYWORDS : MALE_VOICE_KEYWORDS;

  const scored = koreanVoices.map((voice) => {
    const lower = voice.name.toLowerCase();
    let score = 0;
    if (preferredKeywords.some((k) => lower.includes(k))) score += 10;
    if (oppositeKeywords.some((k) => lower.includes(k))) score -= 8;
    if (lower.includes('natural') || lower.includes('neural') || lower.includes('online')) {
      score += 4;
    }
    return { voice, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.voice ?? koreanVoices[0];
}
