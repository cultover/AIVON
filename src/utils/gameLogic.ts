import { COMPETENCY_LABELS, FACILITY_CATEGORIES, SCENARIOS } from '../data/hotelManual';
import type {
  ChatTurn,
  CompetencyKey,
  CompetencyScores,
  FacilityCategory,
  FacilityProgressStat,
  Grade,
  GrowthMetrics,
  GuestEmotion,
  LevelProgress,
  ScenarioDefinition,
  ScenarioId,
  SessionOutcome,
  TrainingMode,
  TrainingSessionRecord,
} from '../types';

export interface LevelTier {
  level: number;
  title: string;
  minXp: number;
}

export const LEVEL_TIERS: LevelTier[] = [
  { level: 1, title: '수습 인턴', minXp: 0 },
  { level: 2, title: '주니어 프론트 사원', minXp: 200 },
  { level: 3, title: '시니어 프론트 사원', minXp: 480 },
  { level: 4, title: '주임 컨시어지', minXp: 850 },
  { level: 5, title: '호텔 서비스 매니저', minXp: 1300 },
  { level: 6, title: '총지배인 마스터', minXp: 1850 },
];

export const ALL_SCENARIO_IDS: ScenarioId[] = SCENARIOS.map((s) => s.id);

export const COMPETENCY_KEYS: CompetencyKey[] = [
  'empathy',
  'apology',
  'sopCompliance',
  'composure',
  'resolution',
];

export function clampScore(value: number, min = 0, max = 100): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.round(value)));
}

export function calculateLevelFromXp(totalXp: number): LevelProgress {
  const safeXp = Math.max(0, Math.round(totalXp));
  let currentTierIndex = 0;

  for (let i = 0; i < LEVEL_TIERS.length; i++) {
    if (safeXp >= LEVEL_TIERS[i].minXp) {
      currentTierIndex = i;
    } else {
      break;
    }
  }

  const currentTier = LEVEL_TIERS[currentTierIndex];
  const nextTier = LEVEL_TIERS[currentTierIndex + 1];

  if (!nextTier) {
    return {
      level: currentTier.level,
      title: currentTier.title,
      currentXp: safeXp,
      xpInCurrentLevel: safeXp - currentTier.minXp,
      xpForNextLevel: 0,
      progressPercent: 100,
      isMaxLevel: true,
    };
  }

  const span = nextTier.minXp - currentTier.minXp;
  const xpInCurrentLevel = safeXp - currentTier.minXp;
  const progressPercent = clampScore((xpInCurrentLevel / span) * 100, 0, 100);

  return {
    level: currentTier.level,
    title: currentTier.title,
    currentXp: safeXp,
    xpInCurrentLevel,
    xpForNextLevel: nextTier.minXp - safeXp,
    progressPercent,
    isMaxLevel: false,
  };
}

export function determineEmotionFromSatisfaction(satisfaction: number): GuestEmotion {
  const s = clampScore(satisfaction);
  if (s < 25) return 'furious';
  if (s < 45) return 'angry';
  if (s < 65) return 'skeptical';
  if (s < 82) return 'calm';
  return 'satisfied';
}

export function calculateOverallScore(scores: CompetencyScores): number {
  const sum =
    clampScore(scores.empathy) +
    clampScore(scores.apology) +
    clampScore(scores.sopCompliance) +
    clampScore(scores.composure) +
    clampScore(scores.resolution);
  return Math.round(sum / 5);
}

export function calculateGrade(overallScore: number): Grade {
  const s = clampScore(overallScore);
  if (s >= 90) return 'S';
  if (s >= 80) return 'A';
  if (s >= 70) return 'B';
  if (s >= 60) return 'C';
  return 'D';
}

export function calculateXpReward(
  overallScore: number,
  outcome: Exclude<SessionOutcome, 'ongoing'>,
  difficultyBonus = 0,
  mode: TrainingMode = 'practice'
): number {
  const base = Math.round(clampScore(overallScore) * 1.4);
  const outcomeBonus = outcome === 'resolved' ? 45 : 15;
  const subtotal = Math.max(30, base + outcomeBonus + difficultyBonus);
  return mode === 'real' ? Math.round(subtotal * 1.25) : subtotal;
}

export const INAPPROPRIATE_STRIKE_LIMIT = 3;

export type InappropriateAction = 'none' | 'warning' | 'fail';

export function evaluateInappropriateStrike(
  mode: TrainingMode,
  inappropriateCount: number
): InappropriateAction {
  if (inappropriateCount < INAPPROPRIATE_STRIKE_LIMIT) return 'none';
  return mode === 'real' ? 'fail' : 'warning';
}

export function buildMisconductFailureRecord(params: {
  scenario: ScenarioDefinition;
  mode: TrainingMode;
  turnCount: number;
  inappropriateCount: number;
  transcript: ChatTurn[];
}): TrainingSessionRecord {
  const { scenario, mode, turnCount, inappropriateCount, transcript } = params;
  return {
    id: `session-${Date.now()}`,
    scenarioId: scenario.id,
    scenarioTitle: scenario.title,
    guestName: scenario.guestName,
    mode,
    completedAt: new Date().toISOString(),
    outcome: 'escalated',
    finalSatisfaction: 0,
    overallScore: 0,
    grade: 'D',
    xpEarned: 0,
    turnCount: Math.max(1, turnCount),
    scores: {
      empathy: 0,
      apology: 0,
      sopCompliance: 0,
      composure: 0,
      resolution: 0,
    },
    summary: `실전 모드에서 이상하거나 장난스러운 응대가 ${inappropriateCount}회 누적되어 대응 실패로 즉시 종료되었으며, 최저 점수(0점)가 부여되었습니다.`,
    strengths: ['해당 시뮬레이션에서 매뉴얼에 부합하는 정상 응대가 확인되지 않았습니다.'],
    weaknesses: [
      `부적절하거나 장난스러운 응대가 ${inappropriateCount}회 이상 반복되어 고객 신뢰가 완전히 훼손되었습니다.`,
      '5성급 호텔 표준 매뉴얼(LAST)에 맞춰 공손한 극존칭과 진지한 문제 해결 태도로 처음부터 다시 응대해야 합니다.',
    ],
    manualChecklist: scenario.manualGuidelines.slice(0, 4).map((item) => ({
      item,
      met: false,
    })),
    modelResponse:
      scenario.recommendedPhrases[0] ??
      '고객님, 큰 불편을 드려 진심으로 사죄드립니다. 즉시 담당 부서와 확인하여 신속하게 조치해 드리겠습니다.',
    transcript,
    misconductFailed: true,
    inappropriateCount,
  };
}

export function evaluateSessionOutcome(
  satisfaction: number,
  turnCount: number,
  maxTurns: number
): SessionOutcome {
  const s = clampScore(satisfaction);
  if (s >= 82 && turnCount >= 3) return 'resolved';
  if (s <= 12 && turnCount >= 2) return 'escalated';
  if (turnCount >= maxTurns) {
    return s >= 72 ? 'resolved' : 'escalated';
  }
  return 'ongoing';
}

export function mergeTurnScores(turns: CompetencyScores[]): CompetencyScores {
  if (turns.length === 0) {
    return {
      empathy: 50,
      apology: 50,
      sopCompliance: 50,
      composure: 50,
      resolution: 50,
    };
  }
  const totals: CompetencyScores = {
    empathy: 0,
    apology: 0,
    sopCompliance: 0,
    composure: 0,
    resolution: 0,
  };
  for (const t of turns) {
    for (const key of COMPETENCY_KEYS) {
      totals[key] += clampScore(t[key]);
    }
  }
  return {
    empathy: Math.round(totals.empathy / turns.length),
    apology: Math.round(totals.apology / turns.length),
    sopCompliance: Math.round(totals.sopCompliance / turns.length),
    composure: Math.round(totals.composure / turns.length),
    resolution: Math.round(totals.resolution / turns.length),
  };
}

export function aggregateGrowthMetrics(sessions: TrainingSessionRecord[]): GrowthMetrics {
  const scenarioBestScores = {} as Record<
    ScenarioId,
    { bestScore: number; attempts: number; cleared: boolean }
  >;

  for (const sc of SCENARIOS) {
    scenarioBestScores[sc.id] = { bestScore: 0, attempts: 0, cleared: false };
  }

  const facilityStats = {} as Record<FacilityCategory, FacilityProgressStat>;
  const facilityScoreSums: Record<FacilityCategory, { sum: number; count: number }> = {
    rooms: { sum: 0, count: 0 },
    fnb: { sum: 0, count: 0 },
    culinary: { sum: 0, count: 0 },
    convention: { sum: 0, count: 0 },
    pool: { sum: 0, count: 0 },
    rank: { sum: 0, count: 0 },
  };

  for (const fac of FACILITY_CATEGORIES) {
    const totalScenarios = SCENARIOS.filter((s) => s.facility === fac.id).length;
    facilityStats[fac.id] = {
      attempts: 0,
      clearedScenarios: 0,
      totalScenarios,
      averageScore: 0,
    };
  }

  if (sessions.length === 0) {
    return {
      totalSessions: 0,
      resolvedCount: 0,
      resolutionRate: 0,
      averageScore: 0,
      totalXp: 0,
      averageCompetencies: {
        empathy: 0,
        apology: 0,
        sopCompliance: 0,
        composure: 0,
        resolution: 0,
      },
      strongestCompetency: { key: 'empathy', label: COMPETENCY_LABELS.empathy, score: 0 },
      weakestCompetency: { key: 'sopCompliance', label: COMPETENCY_LABELS.sopCompliance, score: 0 },
      scenarioBestScores,
      facilityStats,
      trend: [],
    };
  }

  let resolvedCount = 0;
  let totalScore = 0;
  let totalXp = 0;

  const compSums: CompetencyScores = {
    empathy: 0,
    apology: 0,
    sopCompliance: 0,
    composure: 0,
    resolution: 0,
  };

  const scenarioMap = new Map(SCENARIOS.map((s) => [s.id, s]));

  const chronological = [...sessions].sort(
    (a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime()
  );

  for (const session of chronological) {
    if (session.outcome === 'resolved') resolvedCount += 1;
    totalScore += session.overallScore;
    totalXp += session.xpEarned;

    for (const key of COMPETENCY_KEYS) {
      compSums[key] += clampScore(session.scores[key]);
    }

    const bucket = scenarioBestScores[session.scenarioId];
    if (bucket) {
      bucket.attempts += 1;
      if (session.overallScore > bucket.bestScore) {
        bucket.bestScore = session.overallScore;
      }
      if (session.outcome === 'resolved') {
        bucket.cleared = true;
      }
    }

    const scMeta = scenarioMap.get(session.scenarioId);
    if (scMeta) {
      facilityStats[scMeta.facility].attempts += 1;
      facilityScoreSums[scMeta.facility].sum += session.overallScore;
      facilityScoreSums[scMeta.facility].count += 1;
    }
  }

  for (const fac of FACILITY_CATEGORIES) {
    const facScenarios = SCENARIOS.filter((s) => s.facility === fac.id);
    facilityStats[fac.id].clearedScenarios = facScenarios.filter(
      (s) => scenarioBestScores[s.id]?.cleared
    ).length;
    const sumEntry = facilityScoreSums[fac.id];
    facilityStats[fac.id].averageScore =
      sumEntry.count > 0 ? Math.round(sumEntry.sum / sumEntry.count) : 0;
  }

  const count = chronological.length;
  const averageCompetencies: CompetencyScores = {
    empathy: Math.round(compSums.empathy / count),
    apology: Math.round(compSums.apology / count),
    sopCompliance: Math.round(compSums.sopCompliance / count),
    composure: Math.round(compSums.composure / count),
    resolution: Math.round(compSums.resolution / count),
  };

  let strongestKey: CompetencyKey = COMPETENCY_KEYS[0];
  let weakestKey: CompetencyKey = COMPETENCY_KEYS[0];

  for (const key of COMPETENCY_KEYS) {
    if (averageCompetencies[key] > averageCompetencies[strongestKey]) {
      strongestKey = key;
    }
    if (averageCompetencies[key] < averageCompetencies[weakestKey]) {
      weakestKey = key;
    }
  }

  const trend = chronological.slice(-8).map((s, idx) => ({
    label: `${idx + 1}회차`,
    score: s.overallScore,
    scenarioTitle: s.scenarioTitle,
    grade: s.grade,
  }));

  return {
    totalSessions: count,
    resolvedCount,
    resolutionRate: Math.round((resolvedCount / count) * 100),
    averageScore: Math.round(totalScore / count),
    totalXp,
    averageCompetencies,
    strongestCompetency: {
      key: strongestKey,
      label: COMPETENCY_LABELS[strongestKey],
      score: averageCompetencies[strongestKey],
    },
    weakestCompetency: {
      key: weakestKey,
      label: COMPETENCY_LABELS[weakestKey],
      score: averageCompetencies[weakestKey],
    },
    scenarioBestScores,
    facilityStats,
    trend,
  };
}
