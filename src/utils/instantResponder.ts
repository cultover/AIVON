import { SCENARIO_RESPONSE_BANKS } from '../data/guestResponses';
import type {
  BaseReplyBucket,
  ScenarioResponseBank,
  TopicReplyBranch,
} from '../data/guestResponses';
import { getScenarioById } from '../data/hotelManual';
import {
  clampScore,
  determineEmotionFromSatisfaction,
  evaluateSessionOutcome,
} from './gameLogic';
import type { CompetencyScores, ScenarioId, TurnApiResponse } from '../types';

export interface InstantTurnParams {
  scenarioId: ScenarioId;
  traineeMessage: string;
  currentSatisfaction: number;
  turnNumber: number;
  usedReplies?: string[];
  /** Previous trainee messages in this session (tracks cumulative SOP / safety coverage). */
  traineeHistory?: string[];
}

const RUDE_OR_HOSTILE_RE =
  /(어쩌라고|진상|닥쳐|나가세요|나가라|꺼져|몰라요|몰라|시끄러|짜증|그냥\s*가|환불해\s*가|왜\s*저한테|네가|니가|너는|반말|미쳤|웃기네|알아서\s*하)/;

const POLITE_ENDING_RE = /(요|다|까|세요|니다|게요|드릴게|죄송|사과|감사|알겠)/;

const EXCUSE_OR_DEFLECT_RE =
  /(전산\s*오류|시스템\s*오류|바빠서|어쩔\s*수\s*없|원래\s*그래|원래\s*안|규정상\s*무조건|손님\s*잘못|고객님\s*잘못|못\s*받아서|전\s*근무자|요청\s*사항일\s*뿐|만석이라\s*어쩔|정상\s*온도|그냥\s*기다리|제가\s*한\s*게\s*아니)/;

const EMPATHY_RE =
  /(놀라|불쾌|힘드|지치|기대|속상|당황|이해|기분|불편|마음|추우|춥고|화나|심려|체면|실망|예민|소중한|고생|답답|얼마나|염려|걱정|불안|신경|유감|스트레스|괴로|당혹|황당|피곤|짜증나셨)/;

const APOLOGY_RE =
  /(죄송|사죄|사과|송구|불찰|실수|잘못|결례|양해|머리\s*숙여|깊이\s*사과|미안|진심으로\s*사)/;

const NEGATION_AFTER_KEYWORD_RE =
  /^[^.,!?\n]{0,16}(어렵|어려워|불가|힘들|안\s*되|안\s*됩|못\s*해|제한|금지)/;

const REFUSAL_GUARD_RE =
  /(어렵|어려워|불가|힘들|안\s*되|안\s*됩|못\s*해|금지|제한|양해|않고|하지\s*않)/;

const PLAYFUL_OR_TROLL_RE =
  /(ㅋ{2,}|ㅎ{2,}|ㅠ{2,}|ㅜ{2,}|ㄷ{2,}|ㅇㅇ|ㄴㄴ|ㅁㅊ|ㅅㅂ|ㅂㅅ|ㅈㅅ|ㄹㅇ|ㅇㅈ|ㅎㅇ|ㅂㅇ|ㄱㅅ|ㅇㅋ|ㅗ|장난|농담|메롱|바보|멍청|호구|꿀잼|노잼|아싸|에베베|어쩔티비|저쩔티비|킹받|하하하|푸하하|키키|헤헤|히히|우히히|방귀|똥|치킨|피자|롤\s*할래|게임\s*할래|배고파|집에\s*갈래|퇴근\s*할래|퇴근하고|월급|사귀|결혼\s*해|사랑해|뽀뽀|춤\s*출|노래\s*불러|로또|비트코인|유튜브|인스타|틱톡|빠이|바이바이|굿바이|\b(?:lol|lmao|wtf|haha|hehe|gg|asdf|qwer|zxcv|test)\b)/i;

const REPEATED_CHAR_SPAM_RE = /(.)\1{3,}/;

const JAMO_SPAM_RE = /[ㄱ-ㅎㅏ-ㅣ]{2,}/;

const HOSPITALITY_CONTEXT_RE =
  /(고객|손님|확인|안내|준비|도와|처리|조치|진행|기다|잠시|말씀|불편|죄송|사과|양해|감사|매뉴얼|규정|정책|지배인|담당|직원|매니저|호텔|객실|룸|방|체크인|체크아웃|예약|청소|소음|보안|음식|요리|메뉴|셰프|주방|테이블|좌석|음료|와인|콜키지|알레르기|병원|건강|증상|행사|연회|마이크|음향|장비|수영장|안전|락커|라커|타월|라운지|보상|할인|환불|무료|업그레이드|교체|재조리|서비스|부탁|알겠|드리겠|해드리|살펴|점검|연락|전달|보고|책임|최선|신속|즉시|바로|우선|배정|정비|위생|수건|키카드|카드키|조식|바우처|스테이크|디저트|음향팀|의무실|구급|프론트|컨시어지|하우스키핑|성함|번호|호실|미니바|영수증|오과금|인계|망취소|법인카드|승인|취소|확인서|공항|케이크|파티시에|칠순|플라워|샴페인|교육|개인정보|가명|비공개|로그|cctv|감사|수사|사과문|프로토콜)/i;

const INAPPROPRIATE_GUEST_REPLIES = [
  '지금 저랑 장난하시는 겁니까? 5성급 호텔 직원이 컴플레인하는 고객 앞에서 이런 식으로 응대해도 되는 겁니까?',
  '방금 무슨 이상한 말씀을 하시는 거죠? 진지하게 해결할 생각이 없으시면 당장 책임자 불러오세요!',
  '지금 이 상황이 장난으로 보이십니까? 전혀 상관없는 헛소리만 하실 거면 본사에 정식으로 항의하겠습니다!',
  '정말 어이가 없네요. 고객 말을 제대로 듣지도 않고 장난치듯 대답하시는 태도가 5성급 호텔 수준입니까?',
];

export interface InappropriateCheckResult {
  isInappropriate: boolean;
  reason?: string;
}

export function detectInappropriateReply(
  traineeMessage: string,
  scenarioId: ScenarioId
): InappropriateCheckResult {
  const normalized = traineeMessage.trim().replace(/\s+/g, ' ');
  if (!normalized) {
    return { isInappropriate: true, reason: '빈 응답 또는 무의미한 입력입니다.' };
  }

  if (PLAYFUL_OR_TROLL_RE.test(normalized) || JAMO_SPAM_RE.test(normalized)) {
    return {
      isInappropriate: true,
      reason: '장난스러운 표현, 비속어·초성 남발 또는 부적절한 농담이 포함되어 있습니다.',
    };
  }

  if (REPEATED_CHAR_SPAM_RE.test(normalized)) {
    return {
      isInappropriate: true,
      reason: '의미 없는 문자 반복 입력입니다.',
    };
  }

  if (!/[가-힣a-zA-Z]{2,}/.test(normalized)) {
    return {
      isInappropriate: true,
      reason: '숫자·기호 나열 등 정상적인 문장이 아닌 답변입니다.',
    };
  }

  if (RUDE_OR_HOSTILE_RE.test(normalized)) {
    return {
      isInappropriate: true,
      reason: '고객에게 무례하거나 공격적인 반말·표현을 사용했습니다.',
    };
  }

  const bank = SCENARIO_RESPONSE_BANKS[scenarioId];
  const matchedTopics = bank ? detectMatchedTopics(normalized, bank) : [];
  const hasServiceContext =
    matchedTopics.length > 0 ||
    APOLOGY_RE.test(normalized) ||
    EMPATHY_RE.test(normalized) ||
    HOSPITALITY_CONTEXT_RE.test(normalized);

  if (normalized.length < 4 && !hasServiceContext) {
    return {
      isInappropriate: true,
      reason: '무성의하거나 의미 없는 단답형 답변입니다.',
    };
  }

  if (!hasServiceContext) {
    return {
      isInappropriate: true,
      reason: '호텔 컴플레인 응대 상황과 전혀 무관한 엉뚱한 답변입니다.',
    };
  }

  return { isInappropriate: false };
}

const GUARDED_OPENERS = [
  '아직 화가 가라앉은 건 아닙니다. ',
  '말 한마디로 기분이 바로 풀릴 상황은 아니에요. ',
];

function matchesKeywordWithPolarity(
  lowerText: string,
  keyword: string,
  requirePositive: boolean
): boolean {
  const lowerKw = keyword.toLowerCase();
  let startIdx = 0;

  while (startIdx < lowerText.length) {
    const foundAt = lowerText.indexOf(lowerKw, startIdx);
    if (foundAt === -1) return false;

    if (!requirePositive) {
      return true;
    }

    const tail = lowerText.slice(foundAt + lowerKw.length, foundAt + lowerKw.length + 20);
    if (!NEGATION_AFTER_KEYWORD_RE.test(tail)) {
      return true;
    }

    startIdx = foundAt + lowerKw.length;
  }

  return false;
}

export function detectMatchedTopics(
  text: string,
  bank: ScenarioResponseBank
): TopicReplyBranch[] {
  const lower = text.replace(/\s+/g, ' ').toLowerCase();
  const matched: TopicReplyBranch[] = [];

  for (const topic of bank.topics) {
    const requirePositive = topic.requirePositive !== false;
    const isHit = topic.keywords.some((kw) =>
      matchesKeywordWithPolarity(lower, kw, requirePositive)
    );
    if (isHit) {
      matched.push(topic);
    }
  }

  return matched;
}

function hasForbiddenConcession(
  normalizedText: string,
  patterns?: RegExp[]
): boolean {
  if (!patterns || patterns.length === 0) return false;
  for (const pattern of patterns) {
    const match = pattern.exec(normalizedText);
    if (!match) continue;
    const matchedSpan = match[0];
    const afterMatch = normalizedText.slice(
      match.index + matchedSpan.length,
      match.index + matchedSpan.length + 16
    );
    if (REFUSAL_GUARD_RE.test(matchedSpan) || REFUSAL_GUARD_RE.test(afterMatch)) {
      continue;
    }
    return true;
  }
  return false;
}

function pickFromList(
  candidates: string[],
  usedSet: Set<string>,
  turnNumber: number
): string {
  const available = candidates.filter((line) => !usedSet.has(line.trim()));
  if (available.length > 0) {
    return available[(Math.max(1, turnNumber) - 1) % available.length];
  }
  return candidates[(Math.max(1, turnNumber) - 1) % candidates.length];
}

function pickBaseReply(
  bank: ScenarioResponseBank,
  bucket: BaseReplyBucket,
  usedSet: Set<string>,
  turnNumber: number
): string {
  return pickFromList(bank.baseReplies[bucket], usedSet, turnNumber);
}

/**
 * Strictly selects a reply that ONLY references topics explicitly matched in THIS turn,
 * while remembering topics already addressed in earlier turns so the guest never
 * re-asks about a resolved pillar.
 */
function pickGroundedTopicReply(
  bank: ScenarioResponseBank,
  matchedTopics: TopicReplyBranch[],
  previouslyMatchedIds: Set<string>,
  cumulativeMatchedIds: Set<string>,
  usedSet: Set<string>,
  turnNumber: number,
  newSatisfaction: number
): string {
  const matchedIds = new Set(matchedTopics.map((t) => t.id));

  // If the trainee has now addressed ALL core SOP pillars across prior turns + this turn,
  // acknowledge what they just offered this turn and press for reliable execution/follow-up
  // instead of re-asking about a pillar they already solved on an earlier turn.
  if (
    previouslyMatchedIds.size > 0 &&
    cumulativeMatchedIds.size >= bank.topics.length &&
    newSatisfaction >= 45
  ) {
    const justMentioned = matchedTopics.map((t) => t.label).join('과 ');
    const cumulativeChecks = [
      `방금 말씀해 주신 ${justMentioned} 부분까지 챙겨주신다니 알겠습니다. 앞서 안내해 주신 조치들이 말뿐이 아니라 실제로 빠르고 정확하게 진행되는지 끝까지 책임져 주실 수 있겠죠?`,
      `${justMentioned}까지 세심하게 챙겨주시니 마음이 한결 놓이네요. 안내해 주신 내용대로 누락 없이 진행되는지 마지막까지 꼭 확인 부탁드립니다.`,
      `네, ${justMentioned} 부분도 잘 들었습니다. 지금까지 말씀하신 조치들을 실제로 차질 없이 이행해 주신다면 믿고 기다려 보겠습니다.`,
    ];
    return pickFromList(cumulativeChecks, usedSet, turnNumber);
  }

  // 1. Warm multi-topic combo replies only unlock once the guest has genuinely started to soften (>= 48)
  if (bank.comboReplies && matchedTopics.length >= 2 && newSatisfaction >= 48) {
    const eligibleCombos = bank.comboReplies
      .filter((combo) => combo.requiredTopicIds.every((id) => matchedIds.has(id)))
      .sort((a, b) => b.requiredTopicIds.length - a.requiredTopicIds.length);

    for (const combo of eligibleCombos) {
      const available = combo.replies.filter((line) => !usedSet.has(line.trim()));
      if (available.length > 0) {
        return available[(Math.max(1, turnNumber) - 1) % available.length];
      }
    }
  }

  // 2. Pick from single-topic branches explicitly mentioned THIS turn (prefer newly introduced topics).
  const orderedTopics = [...matchedTopics].sort((a, b) => {
    const aIsNew = previouslyMatchedIds.has(a.id) ? 0 : 1;
    const bIsNew = previouslyMatchedIds.has(b.id) ? 0 : 1;
    return bIsNew - aIsNew;
  });

  let selected: string | null = null;
  for (const topic of orderedTopics) {
    const available = topic.replies.filter((line) => !usedSet.has(line.trim()));
    if (available.length > 0) {
      selected = available[(Math.max(1, turnNumber) - 1) % available.length];
      break;
    }
  }

  if (!selected) {
    selected = pickFromList(orderedTopics[0].replies, usedSet, turnNumber);
  }

  // 3. On Turn 1 while guest is still furious/angry (< 44), preserve realistic emotional tension
  //    so one polite reply does not make an upset guest instantly sound mellow.
  if (turnNumber === 1 && newSatisfaction < 44 && !selected.startsWith('다행히')) {
    const opener = GUARDED_OPENERS[(selected.length + turnNumber) % GUARDED_OPENERS.length];
    return `${opener}${selected}`;
  }

  return selected;
}

function buildGroundedCoachingNote(
  bank: ScenarioResponseBank,
  matchedTopicsThisTurn: TopicReplyBranch[],
  cumulativeMatchedIds: Set<string>,
  hasApology: boolean,
  hasEmpathy: boolean,
  isRepeatedTopicOnly: boolean
): string {
  const mentionedLabels = matchedTopicsThisTurn.map((t) => `'${t.label}'`).join(', ');
  const unmentionedTopics = bank.topics.filter((t) => !cumulativeMatchedIds.has(t.id));

  if (unmentionedTopics.length === 0) {
    return `훌륭합니다! ${mentionedLabels} 안내를 포함해 매뉴얼 핵심 조치를 빠짐없이 제시했습니다.`;
  }

  const nextSuggestion = unmentionedTopics
    .slice(0, 2)
    .map((t) => `'${t.label}'`)
    .join(' 또는 ');

  if (isRepeatedTopicOnly) {
    return `이미 안내한 ${mentionedLabels} 외에 고객이 요구하는 ${nextSuggestion}까지 추가로 제시해야 만족도가 크게 올라갑니다.`;
  }

  if (!hasApology && !hasEmpathy) {
    return `${mentionedLabels} 제안은 좋습니다. 여기에 진심 어린 공감·사과와 ${nextSuggestion}까지 함께 안내해 보세요.`;
  }

  if (matchedTopicsThisTurn.length >= 2) {
    return `좋습니다! ${mentionedLabels} 안내가 정확했습니다. 화가 아직 남아 있으므로 ${nextSuggestion}까지 이어서 챙겨보세요.`;
  }

  return `좋습니다! ${mentionedLabels} 안내가 적절했습니다. 이어서 ${nextSuggestion}도 함께 제시해 보세요.`;
}

export function evaluateInstantTurn(params: InstantTurnParams): TurnApiResponse {
  const scenario = getScenarioById(params.scenarioId);
  const bank = SCENARIO_RESPONSE_BANKS[scenario.id];
  const rawMessage = params.traineeMessage.trim();
  const normalized = rawMessage.replace(/\s+/g, ' ');
  const turnNumber = Math.max(1, params.turnNumber);
  const currentSatisfaction = clampScore(params.currentSatisfaction);
  const usedSet = new Set((params.usedReplies ?? []).map((line) => line.trim()));

  const previouslyMatchedIds = new Set<string>();
  for (const prevMsg of params.traineeHistory ?? []) {
    for (const t of detectMatchedTopics(prevMsg, bank)) {
      previouslyMatchedIds.add(t.id);
    }
  }

  const matchedTopicsThisTurn = detectMatchedTopics(normalized, bank);
  const matchedTopicIdsThisTurn = new Set(matchedTopicsThisTurn.map((t) => t.id));
  const cumulativeMatchedIds = new Set<string>([
    ...previouslyMatchedIds,
    ...matchedTopicIdsThisTurn,
  ]);

  const inappropriateCheck = detectInappropriateReply(normalized, scenario.id);
  const isInappropriateReply = inappropriateCheck.isInappropriate;

  const isRudeOrBanmal =
    RUDE_OR_HOSTILE_RE.test(normalized) ||
    (normalized.length < 7 && !POLITE_ENDING_RE.test(normalized));

  const isExcuse = EXCUSE_OR_DEFLECT_RE.test(normalized);

  const isPolicyViolation = hasForbiddenConcession(
    normalized,
    bank.forbiddenConcessionPatterns
  );

  const hasEmpathy = EMPATHY_RE.test(normalized);
  const hasApology = APOLOGY_RE.test(normalized);

  const newlyAddedTopicsCount = matchedTopicsThisTurn.filter(
    (t) => !previouslyMatchedIds.has(t.id)
  ).length;

  const requiresSafety = Boolean(bank.requiredSafetyTopicId);
  const hasSafetyEver =
    !requiresSafety ||
    Boolean(bank.requiredSafetyTopicId && cumulativeMatchedIds.has(bank.requiredSafetyTopicId));
  const missingSafety = requiresSafety && !hasSafetyEver;

  let satisfactionDelta: number;
  let coachingNote: string;
  let turnScores: CompetencyScores;
  let replyMode: 'base' | 'topic' | 'inappropriate' = 'base';
  let baseBucket: BaseReplyBucket = 'apology_only';

  if (isInappropriateReply) {
    replyMode = 'inappropriate';
    satisfactionDelta = -14;
    coachingNote = `${inappropriateCheck.reason ?? '부적절하거나 장난스러운 응대입니다.'} 호텔 표준 매뉴얼에 맞춰 진지하고 정중하게 응대하세요.`;
    turnScores = {
      empathy: 8,
      apology: 6,
      sopCompliance: 8,
      composure: 10,
      resolution: 8,
    };
  } else if (isRudeOrBanmal || (isExcuse && matchedTopicsThisTurn.length === 0)) {
    baseBucket = 'excuse_or_rude';
    satisfactionDelta = isRudeOrBanmal ? -22 : -15;
    coachingNote = bank.coaching.excuseOrRude;
    turnScores = {
      empathy: isRudeOrBanmal ? 16 : 26,
      apology: isRudeOrBanmal ? 14 : 28,
      sopCompliance: 22,
      composure: isRudeOrBanmal ? 18 : 48,
      resolution: 22,
    };
  } else if (isPolicyViolation) {
    baseBucket = 'policy_violation';
    satisfactionDelta = -12;
    coachingNote = bank.coaching.policyViolation;
    turnScores = {
      empathy: hasEmpathy ? 66 : 46,
      apology: hasApology ? 64 : 40,
      sopCompliance: 28,
      composure: 56,
      resolution: 34,
    };
  } else if (missingSafety && matchedTopicsThisTurn.length >= 1) {
    replyMode = 'topic';
    satisfactionDelta = 5;
    coachingNote = bank.coaching.missingSafety ?? bank.coaching.apologyOnly;
    turnScores = {
      empathy: hasEmpathy ? 70 : 56,
      apology: hasApology ? 72 : 52,
      sopCompliance: 46,
      composure: 78,
      resolution: 50,
    };
  } else if (matchedTopicsThisTurn.length >= 1) {
    replyMode = 'topic';
    const isRepeatedTopicOnly = newlyAddedTopicsCount === 0;
    const allPillarsCovered = cumulativeMatchedIds.size >= bank.topics.length;

    if (isRepeatedTopicOnly) {
      if (allPillarsCovered && currentSatisfaction >= 58 && (hasEmpathy || hasApology)) {
        // Polite closing assurance after already covering all core SOP pillars
        satisfactionDelta = 14;
      } else if (cumulativeMatchedIds.size >= 2 && currentSatisfaction >= 68 && (hasEmpathy || hasApology)) {
        satisfactionDelta = 12;
      } else {
        // Repeating the same proposal while leaving other concerns unaddressed
        satisfactionDelta = hasEmpathy || hasApology ? 5 : 3;
      }
      turnScores = {
        empathy: hasEmpathy ? 82 : 66,
        apology: hasApology ? 84 : 64,
        sopCompliance: allPillarsCovered ? 88 : 70,
        composure: 84,
        resolution: allPillarsCovered ? 86 : 66,
      };
    } else {
      const isStrong =
        matchedTopicsThisTurn.length >= 2 ||
        (matchedTopicsThisTurn.length === 1 && (hasEmpathy || hasApology) && normalized.length >= 26);

      if (isStrong) {
        const rawBonus =
          9 +
          (hasEmpathy ? 3 : 0) +
          (hasApology ? 3 : 0) +
          Math.min(5, newlyAddedTopicsCount * 3) +
          (requiresSafety &&
          bank.requiredSafetyTopicId &&
          matchedTopicIdsThisTurn.has(bank.requiredSafetyTopicId)
            ? 2
            : 0) -
          (isExcuse ? 7 : 0);

        // Furious emotional inertia: when guest is still deeply upset (< 35),
        // even a stellar single reply calms them gradually (max +15, or +16 with critical safety check).
        const maxGain =
          currentSatisfaction < 35
            ? requiresSafety &&
              bank.requiredSafetyTopicId &&
              matchedTopicIdsThisTurn.has(bank.requiredSafetyTopicId)
              ? 16
              : 15
            : 19;

        satisfactionDelta = clampScore(rawBonus, 8, maxGain);
        turnScores = {
          empathy: clampScore(hasEmpathy ? 86 + Math.min(8, newlyAddedTopicsCount * 3) : 72),
          apology: clampScore(hasApology ? 88 + (hasEmpathy ? 4 : 0) : 72),
          sopCompliance: clampScore(
            (isExcuse ? 66 : 84) + Math.min(12, newlyAddedTopicsCount * 4)
          ),
          composure: clampScore(88 + (normalized.length >= 40 ? 4 : 0)),
          resolution: clampScore(85 + Math.min(11, newlyAddedTopicsCount * 4)),
        };
      } else {
        const cap = currentSatisfaction < 35 ? 10 : 12;
        satisfactionDelta = clampScore(hasEmpathy || hasApology ? 11 : 8, 6, cap);
        turnScores = {
          empathy: hasEmpathy ? 76 : 58,
          apology: hasApology ? 78 : 56,
          sopCompliance: 74,
          composure: 80,
          resolution: 74,
        };
      }
    }

    coachingNote = buildGroundedCoachingNote(
      bank,
      matchedTopicsThisTurn,
      cumulativeMatchedIds,
      hasApology,
      hasEmpathy,
      isRepeatedTopicOnly
    );
  } else if (hasApology || hasEmpathy) {
    baseBucket = 'apology_only';
    if (turnNumber >= 2 && cumulativeMatchedIds.size === 0) {
      // Guest grows impatient if trainee keeps only apologizing without concrete actions
      satisfactionDelta = 2;
    } else if (cumulativeMatchedIds.size >= 2 && currentSatisfaction >= 68) {
      satisfactionDelta = 9;
    } else {
      satisfactionDelta = hasApology && hasEmpathy ? 6 : 4;
    }
    coachingNote =
      missingSafety && bank.coaching.missingSafety
        ? bank.coaching.missingSafety
        : bank.coaching.apologyOnly;
    turnScores = {
      empathy: hasEmpathy ? 78 : 56,
      apology: hasApology ? 80 : 54,
      sopCompliance: missingSafety ? 40 : 48,
      composure: 80,
      resolution: 42,
    };
  } else {
    baseBucket = 'vague_reply';
    satisfactionDelta = -6;
    coachingNote = bank.coaching.vagueReply;
    turnScores = {
      empathy: 40,
      apology: 38,
      sopCompliance: 40,
      composure: 66,
      resolution: 36,
    };
  }

  let newSatisfaction = clampScore(currentSatisfaction + satisfactionDelta, 0, 100);

  // Realistic multi-turn & multi-pillar gates:
  // 1) An upset customer never fully resolves in fewer than 3 turns.
  // 2) Full resolution requires addressing at least 2 distinct aspects of the complaint.
  if ((turnNumber < 3 || cumulativeMatchedIds.size < 2) && newSatisfaction >= 80) {
    newSatisfaction = 78;
  }

  const effectiveDelta = newSatisfaction - currentSatisfaction;
  const emotion = determineEmotionFromSatisfaction(newSatisfaction);
  const outcome = evaluateSessionOutcome(newSatisfaction, turnNumber, scenario.maxTurns);

  let guestReply: string;
  if (replyMode === 'inappropriate') {
    guestReply = pickFromList(INAPPROPRIATE_GUEST_REPLIES, usedSet, turnNumber);
  } else if (outcome === 'resolved') {
    guestReply = pickBaseReply(bank, 'resolved_final', usedSet, turnNumber);
  } else if (outcome === 'escalated') {
    guestReply = pickBaseReply(bank, 'escalated_final', usedSet, turnNumber);
  } else if (replyMode === 'topic' && matchedTopicsThisTurn.length > 0) {
    guestReply = pickGroundedTopicReply(
      bank,
      matchedTopicsThisTurn,
      previouslyMatchedIds,
      cumulativeMatchedIds,
      usedSet,
      turnNumber,
      newSatisfaction
    );
  } else {
    guestReply = pickBaseReply(bank, baseBucket, usedSet, turnNumber);
  }

  return {
    guestReply,
    emotion,
    satisfactionDelta: effectiveDelta,
    newSatisfaction,
    coachingNote,
    turnScores,
    shouldEnd: outcome !== 'ongoing',
    outcome,
    isInappropriateReply,
    inappropriateReason: inappropriateCheck.reason,
  };
}
