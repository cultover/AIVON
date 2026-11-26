import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import { getFacilityMeta, getScenarioById, HOTEL_SOP_MANUAL } from './src/data/hotelManual';
import {
  calculateOverallScore,
  clampScore,
  determineEmotionFromSatisfaction,
  evaluateSessionOutcome,
} from './src/utils/gameLogic';
import { detectInappropriateReply } from './src/utils/instantResponder';
import { buildSpeechStylePrompt, resolveGuestVoiceProfile } from './src/utils/voiceProfile';
import type {
  CompetencyScores,
  GuestEmotion,
  ReportApiRequest,
  ScenarioId,
  TurnApiRequest,
} from './src/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const FAST_TURN_MODEL = 'gemini-3.1-flash-lite';
const REPORT_MODEL = 'gemini-4-hydrogen';
const TTS_MODEL = 'gemini-3.8-flash-tts';
const TTS_FALLBACK_MODEL = 'gemini-3.8-flash-lite-tts';

const MAX_TTS_CACHE_ITEMS = 80;
const ttsAudioCache = new Map<string, { buffer: Buffer; mimeType: string }>();

function getCachedTts(key: string): { buffer: Buffer; mimeType: string } | undefined {
  const found = ttsAudioCache.get(key);
  if (!found) return undefined;
  // Refresh LRU order
  ttsAudioCache.delete(key);
  ttsAudioCache.set(key, found);
  return found;
}

function setCachedTts(key: string, value: { buffer: Buffer; mimeType: string }) {
  if (ttsAudioCache.size >= MAX_TTS_CACHE_ITEMS) {
    const oldestKey = ttsAudioCache.keys().next().value;
    if (oldestKey) ttsAudioCache.delete(oldestKey);
  }
  ttsAudioCache.set(key, value);
}

const VALID_EMOTIONS: readonly GuestEmotion[] = [
  'furious',
  'angry',
  'skeptical',
  'calm',
  'satisfied',
];

function createAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY가 설정되어 있지 않습니다. Settings > Secrets 패널에서 API 키를 확인해 주세요.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function isTransientError(err: unknown): boolean {
  const text = err instanceof Error ? err.message : String(err);
  return /503|429|UNAVAILABLE|RESOURCE_EXHAUSTED|high demand|overloaded/i.test(text);
}

function formatFriendlyError(err: unknown, defaultMsg: string): string {
  const raw = err instanceof Error ? err.message : String(err);
  if (/503|UNAVAILABLE|high demand/i.test(raw)) {
    return '현재 AI 서버 요청이 일시적으로 몰려 응답이 지연되고 있습니다. 잠시 후 다시 응대하기를 눌러주세요.';
  }
  if (/429|RESOURCE_EXHAUSTED/i.test(raw)) {
    return '요청 한도에 도달했습니다. 잠시 후 다시 시도하거나 Settings > Secrets에서 API 키를 확인해 주세요.';
  }
  if (/403|400|API_KEY_INVALID|PERMISSION_DENIED/i.test(raw)) {
    return 'API 키 인증에 실패했습니다. Settings > Secrets 패널에서 GEMINI_API_KEY를 확인해 주세요.';
  }
  return defaultMsg;
}

async function generateJsonWithRetry(
  ai: GoogleGenAI,
  params: {
    contents: string;
    systemInstruction: string;
    responseSchema: Record<string, unknown>;
    mode?: 'fast' | 'deep';
  }
): Promise<string> {
  const mode = params.mode ?? 'fast';
  const attempts: { model: string; thinkingLevel: ThinkingLevel; delayMs: number }[] =
    mode === 'fast'
      ? [
          { model: FAST_TURN_MODEL, thinkingLevel: ThinkingLevel.MINIMAL, delayMs: 0 },
          { model: FAST_TURN_MODEL, thinkingLevel: ThinkingLevel.MINIMAL, delayMs: 450 },
          { model: REPORT_MODEL, thinkingLevel: ThinkingLevel.LOW, delayMs: 800 },
        ]
      : [
          { model: REPORT_MODEL, thinkingLevel: ThinkingLevel.LOW, delayMs: 0 },
          { model: FAST_TURN_MODEL, thinkingLevel: ThinkingLevel.MINIMAL, delayMs: 700 },
        ];

  let lastErr: unknown = null;
  for (const attempt of attempts) {
    if (attempt.delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, attempt.delayMs));
    }
    try {
      const response = await ai.models.generateContent({
        model: attempt.model,
        contents: params.contents,
        config: {
          systemInstruction: params.systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: params.responseSchema,
          thinkingConfig: { thinkingLevel: attempt.thinkingLevel },
        },
      });
      const text = (response.text ?? '').trim();
      if (text) return text;
    } catch (err) {
      lastErr = err;
      if (!isTransientError(err)) {
        throw err;
      }
    }
  }
  throw lastErr ?? new Error('AI 응답 생성에 실패했습니다.');
}

function formatHistoryText(history: { speaker: 'guest' | 'trainee'; text: string }[]): string {
  return history
    .map((m, idx) => `${idx + 1}. ${m.speaker === 'guest' ? '고객' : '신입사원'}: ${m.text}`)
    .join('\n');
}

function buildManualContext(scenarioId: TurnApiRequest['scenarioId']): string {
  const scenario = getScenarioById(scenarioId);
  const facility = getFacilityMeta(scenario.facility);
  const coreSteps = HOTEL_SOP_MANUAL.coreFramework
    .map((s) => `- ${s.step}: ${s.detail}`)
    .join('\n');
  const scenarioRules = scenario.manualGuidelines.map((g, i) => `${i + 1}. ${g}`).join('\n');

  return `[담당 호텔 시설 및 직무]
시설 카테고리: ${facility.label}
응대 사원 직무: ${facility.staffRole}

[호텔 기본 응대 원칙 (LAST 매뉴얼)]
${coreSteps}

[현재 시나리오 전용 표준 조치 규정 (${scenario.title})]
${scenarioRules}`;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, turnModel: FAST_TURN_MODEL, reportModel: REPORT_MODEL });
  });

  app.post('/api/simulation/turn', async (req, res) => {
    try {
      const body = req.body as TurnApiRequest;
      if (!body || !body.scenarioId || typeof body.traineeMessage !== 'string' || !body.traineeMessage.trim()) {
        res.status(400).json({ error: '응대 메시지를 입력해 주세요.' });
        return;
      }

      const scenario = getScenarioById(body.scenarioId);
      const facility = getFacilityMeta(scenario.facility);
      const currentSatisfaction = clampScore(body.currentSatisfaction ?? scenario.initialSatisfaction);
      const turnNumber = Math.max(1, Number(body.turnNumber || 1));
      const history = Array.isArray(body.history) ? body.history : [];

      const ai = createAiClient();
      const manualContext = buildManualContext(scenario.id);

      const systemInstruction = `당신은 5성급 호텔 사내 교육용 시뮬레이터의 '컴플레인 고객 역할(NPC)'이자 동시에 뒤에서 신입사원의 응대를 호텔 매뉴얼 기준으로 냉정하게 채점하는 'CS 교육 평가관'입니다.

[현장 및 고객 페르소나]
발생 시설: ${facility.label} (응대 직원: ${facility.staffRole})
이름: ${scenario.guestName} (${scenario.guestRole})
현장 정보: ${scenario.roomInfo}
${scenario.guestPersonaPrompt}

${manualContext}

[평가 및 반응 규칙]
0. [절대 사실 일치 규칙 — 최우선] guestReply는 반드시 신입사원이 방금 실제로 말한 내용(및 이전 대화 기록에서 실제로 언급한 내용)만을 바탕으로 반응·응답하세요. 신입사원이 아직 말하지 않은 조치(예: 객실 변경, 업그레이드, 바우처, 환불, 재조리, 지배인 호출, 무료 대여 등)를 이미 제안받은 것처럼 지어내어 감사하거나 언급하는 상황 불일치를 절대 만들지 마세요. 신입사원이 말하지 않은 해결책은 "어떻게 해결해 주실 건가요?"처럼 질문·요구만 할 수 있습니다.
1. guestReply는 자연스럽고 현실적인 한국어 구어체(2~3문장 이내)로 작성하세요. 신입사원의 방금 발언에 직접 반응해야 합니다.
2. [현실적인 감정 변화 난이도] 화가 난 고객은 말 한마디에 금방 풀리지 않습니다. 초반(현재 만족도 45 미만)에는 직원이 정중히 사과하고 대안을 제시하더라도 "말로만 그러는 건 아닌지", "정확히 얼마나 걸리는지", "남은 불편은 어떻게 할 건지" 날카롭게 되물으며 단계적으로만 진정하세요. satisfactionDelta는 -25에서 +20 사이의 정수로 신중하게 산정하세요:
   - 반말, 무례함, 변명("전산 오류라서요", "바빠서요"), 고객 탓, 무성의한 단답: -12 ~ -25
   - 사과는 했으나 구체적 해결책이나 해당 시설 매뉴얼 조치가 빠짐: +2 ~ +6 (2턴 이상 해결책 없이 사과만 반복하면 +0 ~ +2)
   - 진심 어린 공감·사과 + 해당 시설 매뉴얼에 부합하는 새로운 구체적 조치/대안/보상 제시: +10 ~ +18 (초반 분노 상태에서는 훌륭한 응대라도 최대 +14 ~ +16, 이미 했던 말 반복은 +3 ~ +5)
   - 특히 'unreasonable-vip(까다로운 진상 고객)', 'fnb-seat-corkage(콜키지·창가석 요구)', 'pool-capacity-rules(수영장 안전·정원 규정)'처럼 규정 준수가 핵심인 시나리오에서 직원이 안전 규정이나 호텔 원칙을 무단으로 어기고 예외를 허용하면 sopCompliance 점수를 40점 이하로 엄격히 깎고 coachingNote에 규정 위반을 지적하세요. 반대로 정중하게 원칙을 지키며 합리적 대안을 제시하면 높은 점수와 만족도 상승을 부여하세요.
   - 특히 'culinary-allergy(알레르기 식재료 혼입)' 시나리오에서는 고객 건강 상태(증상 여부) 확인과 즉시 접시 회수·별도 안전 조리(교차오염 차단) 안내가 빠지면 sopCompliance와 resolution 점수를 엄격히 감점하세요.
3. turnScores의 5개 지표(empathy, apology, sopCompliance, composure, resolution)는 이번 턴 신입사원의 응대 품질을 0~100점으로 정교하게 채점하세요.
4. coachingNote는 1~2문장의 간결하고 구체적인 한국어 사내 코칭 피드백으로 작성하세요.
5. isInappropriateReply는 신입사원이 호텔 컴플레인 상황과 전혀 무관한 이상한 말, 장난·농담·비웃음(예: ㅋㅋ, 헛소리, 엉뚱한 주제), 의미 없는 문자 나열, 무례한 욕설/반말을 했을 때만 true로 설정하세요. 정상적인 응대 시도는 false입니다.`;

      const prompt = `[현재 상태]
- 현재 턴: ${turnNumber} / ${scenario.maxTurns}
- 현재 고객 만족도: ${currentSatisfaction} / 100

[지금까지의 대화 기록]
${formatHistoryText(history)}

[신입사원의 방금 응대]
"${body.traineeMessage.trim()}"

위 응대에 대한 고객의 리액션 대사, 만족도 증감, 5대 역량 점수, 매뉴얼 코칭 피드백, 부적절/장난 응대 여부를 JSON으로 반환하세요.`;

      const rawText = await generateJsonWithRetry(ai, {
        contents: prompt,
        systemInstruction,
        mode: 'fast',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            guestReply: {
              type: Type.STRING,
              description: '고객 NPC의 자연스러운 한국어 대사 (2~3문장)',
            },
            satisfactionDelta: {
              type: Type.INTEGER,
              description: '이번 응대로 인한 고객 만족도 변화량 (-25 ~ +20)',
            },
            coachingNote: {
              type: Type.STRING,
              description: '신입사원에게 보여주는 1~2문장 매뉴얼 코칭 피드백',
            },
            isInappropriateReply: {
              type: Type.BOOLEAN,
              description: '호텔 응대와 무관한 이상한 답변이나 장난식 대응 여부',
            },
            turnScores: {
              type: Type.OBJECT,
              properties: {
                empathy: { type: Type.INTEGER },
                apology: { type: Type.INTEGER },
                sopCompliance: { type: Type.INTEGER },
                composure: { type: Type.INTEGER },
                resolution: { type: Type.INTEGER },
              },
              required: ['empathy', 'apology', 'sopCompliance', 'composure', 'resolution'],
            },
          },
          required: ['guestReply', 'satisfactionDelta', 'coachingNote', 'isInappropriateReply', 'turnScores'],
        },
      });
      const parsed = JSON.parse(rawText) as {
        guestReply: string;
        satisfactionDelta: number;
        coachingNote: string;
        isInappropriateReply?: boolean;
        turnScores: CompetencyScores;
      };

      const localCheck = detectInappropriateReply(body.traineeMessage, scenario.id);
      const isInappropriateReply = Boolean(parsed.isInappropriateReply) || localCheck.isInappropriate;

      const maxPositiveDelta = currentSatisfaction < 38 ? 16 : 20;
      const boundedDelta = clampScore(parsed.satisfactionDelta, -25, maxPositiveDelta);
      let newSatisfaction = clampScore(currentSatisfaction + boundedDelta, 0, 100);
      // Angry guests never fully resolve in fewer than 3 turns
      if (turnNumber < 3 && newSatisfaction >= 80) {
        newSatisfaction = 78;
      }
      const effectiveDelta = newSatisfaction - currentSatisfaction;
      const emotion = determineEmotionFromSatisfaction(newSatisfaction);
      const outcome = evaluateSessionOutcome(newSatisfaction, turnNumber, scenario.maxTurns);
      const turnScores: CompetencyScores = {
        empathy: clampScore(parsed.turnScores?.empathy ?? 65),
        apology: clampScore(parsed.turnScores?.apology ?? 65),
        sopCompliance: clampScore(parsed.turnScores?.sopCompliance ?? 65),
        composure: clampScore(parsed.turnScores?.composure ?? 70),
        resolution: clampScore(parsed.turnScores?.resolution ?? 65),
      };

      res.json({
        guestReply: parsed.guestReply || '말씀하신 내용 알겠습니다. 조금 더 구체적으로 안내해 주실 수 있을까요?',
        emotion,
        satisfactionDelta: effectiveDelta,
        newSatisfaction,
        coachingNote: parsed.coachingNote || '공감과 매뉴얼 기반 대안을 구체적으로 제시해 보세요.',
        turnScores,
        shouldEnd: outcome !== 'ongoing',
        outcome,
        isInappropriateReply,
        inappropriateReason:
          localCheck.reason ??
          (parsed.isInappropriateReply ? '호텔 응대와 무관한 이상한 답변 또는 장난식 대응이 감지되었습니다.' : undefined),
      });
    } catch (err) {
      const message = formatFriendlyError(err, 'AI 고객 응답 생성 중 오류가 발생했습니다.');
      console.error('[POST /api/simulation/turn] Error:', err);
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/simulation/report', async (req, res) => {
    try {
      const body = req.body as ReportApiRequest;
      if (!body || !body.scenarioId || !Array.isArray(body.history)) {
        res.status(400).json({ error: '분석할 시뮬레이션 기록이 올바르지 않습니다.' });
        return;
      }

      const scenario = getScenarioById(body.scenarioId);
      const facility = getFacilityMeta(scenario.facility);
      const ai = createAiClient();
      const manualContext = buildManualContext(scenario.id);

      const systemInstruction = `당신은 5성급 호텔 인재개발팀(CS 교육팀) 수석 평가관입니다.
신입사원의 컴플레인 대응 시뮬레이션 전체 대화 로그를 해당 시설(${facility.label})의 호텔 매뉴얼(SOP)과 대조하여 체계적인 성장 리포트를 작성하세요.

${manualContext}

[작성 기준]
- summary: 2~3문장으로 신입사원의 전반적 대응 수준, 감정 관리, 시설 매뉴얼 적용도를 명확하게 총평
- strengths: 잘 대처한 구체적 부분 2~3가지 (실제 대화 내용 근거)
- weaknesses: 부족했거나 매뉴얼 대비 보완이 필요한 부분 2~3가지 (실행 가능한 개선 지침 포함)
- manualChecklist: 해당 시나리오 매뉴얼 항목 4~5개에 대해 실제 충족 여부(true/false) 평가
- modelResponse: 이 상황에서 S등급을 받을 수 있는 5성급 호텔리어(${facility.staffRole})의 이상적인 모범 응대 멘트 (2~3문장)
- scores: 전체 대화 흐름을 종합한 최종 5대 역량 점수 (0~100 정수)`;

      const prompt = `[시설/직무] ${facility.label} (${facility.staffRole})
[시나리오] ${scenario.title} (고객: ${scenario.guestName})
[최종 결과] ${body.outcome === 'resolved' ? '컴플레인 해결 완료' : '에스컬레이션(미해결)'} / 최종 고객 만족도: ${body.finalSatisfaction}점
[턴별 누적 참고 점수] ${JSON.stringify(body.accumulatedScores)}

[전체 대화 녹취록]
${formatHistoryText(body.history)}

위 녹취록을 분석해 체계적인 성장 리포트 JSON을 생성해 주세요.`;

      const rawText = await generateJsonWithRetry(ai, {
        contents: prompt,
        systemInstruction,
        mode: 'deep',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            strengths: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            weaknesses: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            manualChecklist: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  item: { type: Type.STRING },
                  met: { type: Type.BOOLEAN },
                },
                required: ['item', 'met'],
              },
            },
            modelResponse: { type: Type.STRING },
            scores: {
              type: Type.OBJECT,
              properties: {
                empathy: { type: Type.INTEGER },
                apology: { type: Type.INTEGER },
                sopCompliance: { type: Type.INTEGER },
                composure: { type: Type.INTEGER },
                resolution: { type: Type.INTEGER },
              },
              required: ['empathy', 'apology', 'sopCompliance', 'composure', 'resolution'],
            },
          },
          required: ['summary', 'strengths', 'weaknesses', 'manualChecklist', 'modelResponse', 'scores'],
        },
      });
      const parsed = JSON.parse(rawText) as {
        summary: string;
        strengths: string[];
        weaknesses: string[];
        manualChecklist: { item: string; met: boolean }[];
        modelResponse: string;
        scores: CompetencyScores;
      };

      const scores: CompetencyScores = {
        empathy: clampScore(parsed.scores?.empathy ?? body.accumulatedScores.empathy),
        apology: clampScore(parsed.scores?.apology ?? body.accumulatedScores.apology),
        sopCompliance: clampScore(parsed.scores?.sopCompliance ?? body.accumulatedScores.sopCompliance),
        composure: clampScore(parsed.scores?.composure ?? body.accumulatedScores.composure),
        resolution: clampScore(parsed.scores?.resolution ?? body.accumulatedScores.resolution),
      };

      res.json({
        summary: parsed.summary,
        strengths: Array.isArray(parsed.strengths) ? parsed.strengths.slice(0, 4) : [],
        weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses.slice(0, 4) : [],
        manualChecklist: Array.isArray(parsed.manualChecklist) ? parsed.manualChecklist : [],
        modelResponse: parsed.modelResponse,
        scores,
        overallScore: calculateOverallScore(scores),
      });
    } catch (err) {
      const message = formatFriendlyError(err, '성장 리포트 분석 중 오류가 발생했습니다.');
      console.error('[POST /api/simulation/report] Error:', err);
      res.status(500).json({ error: message });
    }
  });

function ensurePlayableWav(
  audioBuffer: Buffer,
  rawMimeType?: string
): { buffer: Buffer; mimeType: string } {
  const hasRiffHeader =
    audioBuffer.length >= 12 &&
    audioBuffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    audioBuffer.subarray(8, 12).toString('ascii') === 'WAVE';

  if (hasRiffHeader || rawMimeType?.toLowerCase().includes('wav')) {
    return { buffer: audioBuffer, mimeType: 'audio/wav' };
  }

  // If raw 16-bit linear PCM (24kHz mono) is returned, prepend a standard 44-byte WAV header
  const sampleRateMatch = rawMimeType?.match(/rate=(\d+)/i);
  const sampleRate = sampleRateMatch ? Number(sampleRateMatch[1]) : 24000;
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = audioBuffer.length;
  const header = Buffer.alloc(44);
  header.write('RIFF', 0, 'ascii');
  header.writeUInt32LE(36 + dataSize, 4);
  header.write('WAVE', 8, 'ascii');
  header.write('fmt ', 12, 'ascii');
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36, 'ascii');
  header.writeUInt32LE(dataSize, 40);
  return { buffer: Buffer.concat([header, audioBuffer]), mimeType: 'audio/wav' };
}

  app.post('/api/simulation/tts', async (req, res) => {
    try {
      const body = req.body as {
        text?: string;
        scenarioId?: ScenarioId;
        emotion?: GuestEmotion;
      };
      const cleanText = typeof body?.text === 'string' ? body.text.trim() : '';
      if (!cleanText || !body?.scenarioId) {
        res.status(400).json({ error: '음성으로 변환할 대사와 시나리오 정보가 필요합니다.' });
        return;
      }

      const clippedText = cleanText.slice(0, 500);
      const scenario = getScenarioById(body.scenarioId);
      const emotion: GuestEmotion = VALID_EMOTIONS.includes(body.emotion as GuestEmotion)
        ? (body.emotion as GuestEmotion)
        : scenario.initialEmotion;

      const voiceProfile = resolveGuestVoiceProfile(scenario.id, scenario.guestGender);
      const style = buildSpeechStylePrompt(voiceProfile, emotion);
      const cacheKey = `${scenario.id}|${voiceProfile.voiceName}|${emotion}|${clippedText}`;

      const cached = getCachedTts(cacheKey);
      if (cached) {
        res.setHeader('Content-Type', cached.mimeType);
        res.setHeader('X-Voice-Name', voiceProfile.voiceName);
        res.setHeader('X-Voice-Gender', voiceProfile.gender);
        res.setHeader('X-Voice-Age', voiceProfile.ageDescriptor);
        res.setHeader('X-TTS-Cache', 'HIT');
        res.send(cached.buffer);
        return;
      }

      const ai = createAiClient();
      let inlineData: { data?: string; mimeType?: string } | undefined;
      let lastErr: unknown = null;
      const modelOrder = [TTS_MODEL, TTS_FALLBACK_MODEL];

      for (let attempt = 0; attempt < modelOrder.length; attempt++) {
        if (attempt > 0) {
          await new Promise((resolve) => setTimeout(resolve, 250));
        }
        try {
          const response = await ai.models.generateContent({
            model: modelOrder[attempt],
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    text: clippedText,
                    speechMetadata: {
                      style,
                    },
                  },
                ],
              },
            ],
            config: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: {
                    voiceName: voiceProfile.voiceName,
                  },
                },
              },
            },
          });
          inlineData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData;
          if (inlineData?.data) break;
        } catch (err) {
          lastErr = err;
          if (!isTransientError(err) && attempt === modelOrder.length - 1) {
            throw err;
          }
        }
      }

      if (!inlineData?.data) {
        throw lastErr ?? new Error('TTS 모델에서 음성 데이터를 반환하지 않았습니다.');
      }

      const rawBuffer = Buffer.from(inlineData.data, 'base64');
      const playable = ensurePlayableWav(rawBuffer, inlineData.mimeType);
      setCachedTts(cacheKey, playable);

      res.setHeader('Content-Type', playable.mimeType);
      res.setHeader('X-Voice-Name', voiceProfile.voiceName);
      res.setHeader('X-Voice-Gender', voiceProfile.gender);
      res.setHeader('X-Voice-Age', voiceProfile.ageDescriptor);
      res.setHeader('X-TTS-Cache', 'MISS');
      res.send(playable.buffer);
    } catch (err) {
      const message = formatFriendlyError(err, '고객 음성 생성 중 오류가 발생했습니다.');
      console.error('[POST /api/simulation/tts] Error:', err);
      res.status(500).json({ error: message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Grand Aurelia CS Training Server running on http://localhost:${PORT}`);
  });
}

startServer();
