import test from 'node:test';
import assert from 'node:assert/strict';
import {
  aggregateGrowthMetrics,
  buildMisconductFailureRecord,
  calculateGrade,
  calculateLevelFromXp,
  calculateOverallScore,
  calculateXpReward,
  determineEmotionFromSatisfaction,
  evaluateInappropriateStrike,
  evaluateSessionOutcome,
  mergeTurnScores,
} from './gameLogic';
import { getScenarioById } from '../data/hotelManual';
import type { TrainingSessionRecord } from '../types';

test('calculateLevelFromXp advances hotelier rank accurately', () => {
  const lv1 = calculateLevelFromXp(0);
  assert.equal(lv1.level, 1);
  assert.equal(lv1.title, '수습 인턴');
  assert.equal(lv1.progressPercent, 0);

  const lv2 = calculateLevelFromXp(200);
  assert.equal(lv2.level, 2);
  assert.equal(lv2.title, '주니어 프론트 사원');

  const mid = calculateLevelFromXp(340);
  assert.equal(mid.level, 2);
  assert.equal(mid.progressPercent, 50);

  const max = calculateLevelFromXp(2500);
  assert.equal(max.level, 6);
  assert.equal(max.isMaxLevel, true);
  assert.equal(max.progressPercent, 100);
});

test('determineEmotionFromSatisfaction maps all 5 emotion brackets', () => {
  assert.equal(determineEmotionFromSatisfaction(10), 'furious');
  assert.equal(determineEmotionFromSatisfaction(24), 'furious');
  assert.equal(determineEmotionFromSatisfaction(25), 'angry');
  assert.equal(determineEmotionFromSatisfaction(45), 'skeptical');
  assert.equal(determineEmotionFromSatisfaction(65), 'calm');
  assert.equal(determineEmotionFromSatisfaction(82), 'satisfied');
  assert.equal(determineEmotionFromSatisfaction(100), 'satisfied');
});

test('calculateGrade and calculateXpReward compute grades and XP consistently', () => {
  assert.equal(calculateGrade(95), 'S');
  assert.equal(calculateGrade(82), 'A');
  assert.equal(calculateGrade(74), 'B');
  assert.equal(calculateGrade(61), 'C');
  assert.equal(calculateGrade(48), 'D');

  const resolvedXp = calculateXpReward(85, 'resolved', 10, 'practice');
  const realModeXp = calculateXpReward(85, 'resolved', 10, 'real');
  const escalatedXp = calculateXpReward(50, 'escalated', 0, 'practice');
  assert.ok(resolvedXp > escalatedXp);
  assert.equal(realModeXp, Math.round(resolvedXp * 1.25));
});

test('evaluateSessionOutcome handles early resolution, escalation, and max turns', () => {
  assert.equal(evaluateSessionOutcome(85, 2, 7), 'ongoing');
  assert.equal(evaluateSessionOutcome(85, 3, 7), 'resolved');
  assert.equal(evaluateSessionOutcome(10, 2, 7), 'escalated');
  assert.equal(evaluateSessionOutcome(55, 3, 7), 'ongoing');
  assert.equal(evaluateSessionOutcome(74, 7, 7), 'resolved');
  assert.equal(evaluateSessionOutcome(66, 7, 7), 'escalated');
});

test('mergeTurnScores and aggregateGrowthMetrics summarize sessions accurately', () => {
  const merged = mergeTurnScores([
    { empathy: 80, apology: 70, sopCompliance: 60, composure: 90, resolution: 70 },
    { empathy: 90, apology: 80, sopCompliance: 80, composure: 90, resolution: 80 },
  ]);
  assert.equal(merged.empathy, 85);
  assert.equal(calculateOverallScore(merged), 79);

  const sampleSessions: TrainingSessionRecord[] = [
    {
      id: 's1',
      scenarioId: 'room-noise',
      scenarioTitle: '층간 및 옆방 심야 소음 컴플레인',
      guestName: '이준호',
      completedAt: '2026-11-20T09:00:00.000Z',
      outcome: 'resolved',
      finalSatisfaction: 84,
      overallScore: 76,
      grade: 'B',
      xpEarned: 151,
      turnCount: 4,
      scores: { empathy: 82, apology: 80, sopCompliance: 64, composure: 86, resolution: 68 },
      summary: '테스트 요약',
      strengths: ['차분함'],
      weaknesses: ['보상 안내 부족'],
      manualChecklist: [{ item: '보안팀 파견', met: true }],
      modelResponse: '모범 답안',
      transcript: [],
    },
    {
      id: 's2',
      scenarioId: 'double-checkin',
      scenarioTitle: '이중 체크인(오버부킹) 객실 충돌 항의',
      guestName: '김도현',
      completedAt: '2026-11-22T09:00:00.000Z',
      outcome: 'resolved',
      finalSatisfaction: 90,
      overallScore: 88,
      grade: 'A',
      xpEarned: 168,
      turnCount: 3,
      scores: { empathy: 90, apology: 88, sopCompliance: 86, composure: 92, resolution: 84 },
      summary: '테스트 요약 2',
      strengths: ['업그레이드 제시'],
      weaknesses: ['소요시간 명시'],
      manualChecklist: [{ item: '상위 객실 업그레이드', met: true }],
      modelResponse: '모범 답안 2',
      transcript: [],
    },
  ];

  const metrics = aggregateGrowthMetrics(sampleSessions);
  assert.equal(metrics.totalSessions, 2);
  assert.equal(metrics.resolutionRate, 100);
  assert.equal(metrics.averageScore, 82);
  assert.equal(metrics.strongestCompetency.key, 'composure');
  assert.equal(metrics.weakestCompetency.key, 'sopCompliance');
  assert.equal(metrics.scenarioBestScores['double-checkin'].bestScore, 88);
  assert.equal(metrics.facilityStats.rooms.attempts, 2);
  assert.equal(metrics.facilityStats.rooms.clearedScenarios, 2);
  assert.equal(metrics.facilityStats.rooms.totalScenarios, 4);
  assert.equal(metrics.facilityStats.fnb.attempts, 0);
  assert.equal(metrics.facilityStats.pool.totalScenarios, 2);
  assert.equal(metrics.trend.length, 2);
});

test('evaluateInappropriateStrike triggers warning in practice mode and fail in real mode at 3+ strikes', () => {
  assert.equal(evaluateInappropriateStrike('practice', 0), 'none');
  assert.equal(evaluateInappropriateStrike('practice', 2), 'none');
  assert.equal(evaluateInappropriateStrike('practice', 3), 'warning');
  assert.equal(evaluateInappropriateStrike('practice', 4), 'warning');

  assert.equal(evaluateInappropriateStrike('real', 1), 'none');
  assert.equal(evaluateInappropriateStrike('real', 2), 'none');
  assert.equal(evaluateInappropriateStrike('real', 3), 'fail');
});

test('buildMisconductFailureRecord assigns lowest score (0점, D등급, 0 XP) and misconductFailed flag', () => {
  const scenario = getScenarioById('double-checkin');
  const record = buildMisconductFailureRecord({
    scenario,
    mode: 'real',
    turnCount: 3,
    inappropriateCount: 3,
    transcript: [],
  });

  assert.equal(record.misconductFailed, true);
  assert.equal(record.inappropriateCount, 3);
  assert.equal(record.overallScore, 0);
  assert.equal(record.grade, 'D');
  assert.equal(record.xpEarned, 0);
  assert.equal(record.finalSatisfaction, 0);
  assert.equal(record.outcome, 'escalated');
  assert.deepEqual(record.scores, {
    empathy: 0,
    apology: 0,
    sopCompliance: 0,
    composure: 0,
    resolution: 0,
  });
});
