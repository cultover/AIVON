import test from 'node:test';
import assert from 'node:assert/strict';
import { SCENARIO_RESPONSE_BANKS } from '../data/guestResponses';
import { SCENARIOS } from '../data/hotelManual';
import { detectInappropriateReply, evaluateInstantTurn } from './instantResponder';

test('all 16 scenarios (5 facilities + rank situations) have rich topic-grounded response banks', () => {
  assert.equal(SCENARIOS.length, 16);
  for (const scenario of SCENARIOS) {
    const bank = SCENARIO_RESPONSE_BANKS[scenario.id];
    assert.ok(bank, `Missing response bank for ${scenario.id}`);
    assert.ok(bank.topics.length >= 3, `Expected >= 3 topics for ${scenario.id}`);

    const allReplies = [
      ...bank.topics.flatMap((t) => t.replies),
      ...(bank.comboReplies ?? []).flatMap((c) => c.replies),
      ...Object.values(bank.baseReplies).flat(),
    ];
    const uniqueReplies = new Set(allReplies.map((r) => r.trim()));
    assert.ok(
      uniqueReplies.size >= 18,
      `Expected >= 18 unique replies for ${scenario.id}, got ${uniqueReplies.size}`
    );
  }
});

test('realistic difficulty: a single great Turn 1 reply does NOT immediately calm a furious guest', () => {
  const res = evaluateInstantTurn({
    scenarioId: 'double-checkin',
    traineeMessage:
      '김도현 고객님, 정말 놀라고 불쾌하셨겠습니다. 진심으로 사죄드리며 지금 즉시 상위 파노라마 스위트 객실로 무료 업그레이드하고 라운지 웰컴 드링크와 당직 지배인 인사까지 준비해 드리겠습니다.',
    currentSatisfaction: 22,
    turnNumber: 1,
    usedReplies: [],
  });

  // Furious emotional inertia caps Turn 1 gain at <= +15 (guest stays angry, not calm/satisfied!)
  assert.ok(res.satisfactionDelta <= 15, `Expected delta <= 15 on Turn 1, got ${res.satisfactionDelta}`);
  assert.ok(res.newSatisfaction < 45, `Expected guest to remain angry (<45) after 1 turn, got ${res.newSatisfaction}`);
  assert.equal(res.emotion, 'angry');
  assert.equal(res.outcome, 'ongoing');
  assert.match(res.guestReply, /아직 화가|바로 풀릴/);

  // Turn 2 adds lounge + manager report after Turn 1 already covered room upgrade —
  // guest should acknowledge the new offers and NOT re-ask about how the room will be solved!
  const t2 = evaluateInstantTurn({
    scenarioId: 'double-checkin',
    traineeMessage:
      '기다리시는 동안 라운지에서 웰컴 드링크와 조식 바우처를 제공해 드리고 당직 지배인님께 즉시 보고드리겠습니다. 불편을 드려 죄송합니다.',
    currentSatisfaction: res.newSatisfaction,
    turnNumber: 2,
    usedReplies: [res.guestReply],
    traineeHistory: [
      '고객님 정말 놀라고 불쾌하셨겠습니다. 진심으로 사죄드리며 지금 즉시 상위 파노라마 스위트 객실로 무료 업그레이드 도와드리겠습니다.',
    ],
  });
  assert.doesNotMatch(t2.guestReply, /객실 문제도 바로 어떻게 해결/);
  assert.equal(t2.emotion, 'skeptical');
});

test('realistic difficulty: repeating only apology on Turn 2 yields tiny gain and cannot calm guest', () => {
  const t1 = evaluateInstantTurn({
    scenarioId: 'double-checkin',
    traineeMessage: '고객님, 정말 놀라셨겠습니다. 진심으로 죄송합니다.',
    currentSatisfaction: 22,
    turnNumber: 1,
    usedReplies: [],
  });
  assert.ok(t1.satisfactionDelta <= 6);

  const t2 = evaluateInstantTurn({
    scenarioId: 'double-checkin',
    traineeMessage: '정말 불편을 드려 다시 한번 깊이 사과드립니다.',
    currentSatisfaction: t1.newSatisfaction,
    turnNumber: 2,
    usedReplies: [t1.guestReply],
    traineeHistory: ['고객님, 정말 놀라셨겠습니다. 진심으로 죄송합니다.'],
  });
  assert.ok(t2.satisfactionDelta <= 3, `Expected impatient tiny delta on Turn 2 apology-only, got ${t2.satisfactionDelta}`);
  assert.equal(t2.emotion, 'angry');
});

test('strict grounding: guest NEVER thanks for room change when trainee only offered lounge/voucher', () => {
  const res = evaluateInstantTurn({
    scenarioId: 'double-checkin',
    traineeMessage:
      '죄송합니다 고객님. 우선 라운지에서 웰컴 드링크를 드시며 쉬실 수 있도록 안내해 드리고 조식 바우처를 제공해 드리겠습니다.',
    currentSatisfaction: 22,
    turnNumber: 1,
    usedReplies: [],
  });

  assert.doesNotMatch(
    res.guestReply,
    /업그레이드해\s*주시고|객실.*바꿔주신|새\s*객실로\s*바로\s*재배정해\s*주신|상위\s*스위트로/
  );
  assert.match(res.guestReply, /라운지|보상|객실/);
  assert.doesNotMatch(res.coachingNote, /상위 객실 재배정·업그레이드' 안내가 적절했습니다/);
});

test('strict grounding: negated room change ("객실 변경은 어렵습니다") is NOT credited as offering a room change', () => {
  const res = evaluateInstantTurn({
    scenarioId: 'dirty-room',
    traineeMessage: '죄송합니다 고객님. 현재 객실 변경은 어렵습니다.',
    currentSatisfaction: 20,
    turnNumber: 1,
    usedReplies: [],
  });

  assert.doesNotMatch(res.guestReply, /새 객실로 바로 바꿔주신|교체해 주신|교체 부탁/);
  assert.ok(res.satisfactionDelta <= 6);
});

test('strict grounding: dirty-room recleaning reply does NOT falsely claim room replacement', () => {
  const res = evaluateInstantTurn({
    scenarioId: 'dirty-room',
    traineeMessage: '죄송합니다 고객님. 지금 바로 하우스키핑 팀에서 다시 청소하고 철저히 검수하겠습니다.',
    currentSatisfaction: 20,
    turnNumber: 1,
    usedReplies: [],
  });

  assert.doesNotMatch(res.guestReply, /새 객실로 바로 바꿔주신|교체해 주신/);
  assert.match(res.guestReply, /하우스키핑|검수|청소|다른/);
});

test('strict grounding: room-noise security visit reply does NOT falsely thank for quiet room move', () => {
  const res = evaluateInstantTurn({
    scenarioId: 'room-noise',
    traineeMessage: '죄송합니다 고객님. 지금 즉시 보안팀이 옆방에 직접 방문해 정숙 주의 조치하겠습니다.',
    currentSatisfaction: 28,
    turnNumber: 1,
    usedReplies: [],
  });

  assert.doesNotMatch(res.guestReply, /조용한 객실로.*옮겨주신|방.*바꿔주신/);
  assert.match(res.guestReply, /보안팀|현장|주의/);
});

test('rude or excuse replies lower satisfaction and keep guest angry/furious', () => {
  const res = evaluateInstantTurn({
    scenarioId: 'double-checkin',
    traineeMessage: '전산 오류라서 어쩔 수 없어요. 그냥 기다리세요.',
    currentSatisfaction: 25,
    turnNumber: 1,
    usedReplies: [],
  });

  assert.ok(res.satisfactionDelta < 0);
  assert.ok(res.newSatisfaction < 25);
  assert.equal(res.emotion, 'furious');
  assert.ok(res.turnScores.sopCompliance <= 35);
});

test('policy violation vs polite policy refusal in unreasonable-vip', () => {
  const violation = evaluateInstantTurn({
    scenarioId: 'unreasonable-vip',
    traineeMessage: '죄송합니다. 스위트 무료 업그레이드 해드리겠습니다.',
    currentSatisfaction: 28,
    turnNumber: 1,
    usedReplies: [],
  });
  assert.ok(violation.turnScores.sopCompliance <= 40);
  assert.ok(violation.satisfactionDelta < 0);
  assert.match(violation.coachingNote, /규정|무료|업그레이드/);

  const politeRefusal = evaluateInstantTurn({
    scenarioId: 'unreasonable-vip',
    traineeMessage:
      '최미경 고객님, 일찍 방문해 주셔서 감사드리며 편안한 투숙을 기대하신 마음 충분히 이해합니다. 다만 모든 고객님과의 형평성 및 객실 정비 기준상 스위트 무료 업그레이드와 무료 조식 제공은 어려운 점 너그러이 양해 부탁드립니다.',
    currentSatisfaction: 24,
    turnNumber: 1,
    usedReplies: [],
  });
  assert.ok(politeRefusal.turnScores.sopCompliance >= 80);
  assert.ok(politeRefusal.satisfactionDelta > 0);
});

test('culinary-allergy requires health safety check and remembers prior safety check across turns', () => {
  const missingSafety = evaluateInstantTurn({
    scenarioId: 'culinary-allergy',
    traineeMessage: '죄송합니다. 지금 바로 접시를 회수하고 분리된 전용 도구로 새로 조리해 드리겠습니다.',
    currentSatisfaction: 16,
    turnNumber: 1,
    usedReplies: [],
  });
  assert.ok(missingSafety.turnScores.sopCompliance <= 55);

  const turn1Health = evaluateInstantTurn({
    scenarioId: 'culinary-allergy',
    traineeMessage:
      '정말 크게 놀라셨겠습니다. 먼저 음식을 섭취하셨거나 호흡·가려움 등 이상 증상은 없으신지부터 확인하겠습니다. 필요하시면 즉시 의무실과 의료 지원을 연결해 드리겠습니다.',
    currentSatisfaction: 16,
    turnNumber: 1,
    usedReplies: [],
  });
  assert.ok(turn1Health.turnScores.sopCompliance >= 80);
  assert.doesNotMatch(turn1Health.guestReply, /전용 조리 도구로.*새로 해주신/);

  const turn2Recook = evaluateInstantTurn({
    scenarioId: 'culinary-allergy',
    traineeMessage:
      '진심으로 사죄드립니다. 해당 접시는 즉시 회수하고 교차 오염이 없는 분리된 전용 조리 도구로 처음부터 새로 조리해 드리겠습니다.',
    currentSatisfaction: turn1Health.newSatisfaction,
    turnNumber: 2,
    usedReplies: [turn1Health.guestReply],
    traineeHistory: [
      '정말 크게 놀라셨겠습니다. 먼저 음식을 섭취하셨거나 호흡·가려움 등 이상 증상은 없으신지부터 확인하겠습니다. 필요하시면 즉시 의무실과 의료 지원을 연결해 드리겠습니다.',
    ],
  });
  assert.ok(turn2Recook.turnScores.sopCompliance >= 80);
  assert.ok(turn2Recook.satisfactionDelta >= 12);
});

test('realistic multi-turn SOP progression resolves cleanly over 4-5 turns without repeating replies', () => {
  let satisfaction = 22;
  const usedReplies: string[] = [];
  const traineeHistory: string[] = [];
  const messages = [
    '김도현 고객님, 장시간 이동 후 크게 놀라고 불쾌하셨겠습니다. 명백한 저희 호텔의 불찰로 진심으로 사죄드립니다.',
    '지금 즉시 한 단계 높은 파노라마 스위트 객실로 무료 업그레이드 배정해 드리고, 5분 내로 새 키카드를 준비해 드리겠습니다. 진심으로 죄송합니다.',
    '준비되는 동안 라운지에서 편안히 쉬실 수 있도록 웰컴 드링크와 F&B 바우처·무료 조식을 제공해 드리고 당직 지배인이 직접 찾아뵙고 사과드리겠습니다.',
    '새 객실 입실 후 30분 뒤에 불편 사항이 없으신지 제가 직접 해피콜로 다시 확인해 드리겠습니다. 다시 한번 진심으로 사과드립니다.',
    '기다리시는 동안 불편 없으시도록 끝까지 책임지고 모시겠습니다. 정말 죄송합니다 고객님.',
  ];

  let lastResult = null;
  let resolvedTurn = 0;
  for (let i = 0; i < messages.length; i++) {
    const res = evaluateInstantTurn({
      scenarioId: 'double-checkin',
      traineeMessage: messages[i],
      currentSatisfaction: satisfaction,
      turnNumber: i + 1,
      usedReplies,
      traineeHistory,
    });
    assert.ok(
      !usedReplies.includes(res.guestReply),
      `Duplicate reply encountered on turn ${i + 1}: ${res.guestReply}`
    );
    usedReplies.push(res.guestReply);
    traineeHistory.push(messages[i]);
    satisfaction = res.newSatisfaction;
    lastResult = res;
    if (res.shouldEnd) {
      resolvedTurn = i + 1;
      break;
    }
  }

  assert.ok(lastResult);
  assert.equal(lastResult.outcome, 'resolved');
  assert.equal(lastResult.emotion, 'satisfied');
  assert.ok(resolvedTurn >= 4, `Expected realistic de-escalation to take >= 4 turns, resolved on turn ${resolvedTurn}`);
  assert.ok(lastResult.newSatisfaction >= 82);
});

test('inappropriate reply detector flags playful, gibberish, and off-topic replies without false positives', () => {
  const weirdInputs = [
    'ㅋㅋㅋ 장난치지 마세요',
    '바나나는 원래 하얗다',
    'asdfasdf',
    '123456',
    '어쩔티비 저쩔티비',
    '오늘 저녁 치킨 먹을래요',
    '메롱메롱',
  ];
  for (const input of weirdInputs) {
    const check = detectInappropriateReply(input, 'double-checkin');
    assert.equal(check.isInappropriate, true, `Expected "${input}" to be flagged as inappropriate`);

    const turnRes = evaluateInstantTurn({
      scenarioId: 'double-checkin',
      traineeMessage: input,
      currentSatisfaction: 22,
      turnNumber: 1,
      usedReplies: [],
    });
    assert.equal(turnRes.isInappropriateReply, true);
    assert.ok(turnRes.satisfactionDelta < 0);
    assert.match(turnRes.guestReply, /장난|이상한|헛소리|어이가/);
  }

  const genuineInputs = [
    '고객님, 불편을 드려 진심으로 죄송합니다.',
    '잠시만 기다려 주시면 예약 내역을 확인해 드리겠습니다.',
    '지금 즉시 상위 객실로 업그레이드 도와드리겠습니다.',
    '성함과 객실 번호를 말씀해 주시면 바로 조치하겠습니다.',
  ];
  for (const input of genuineInputs) {
    const check = detectInappropriateReply(input, 'double-checkin');
    assert.equal(check.isInappropriate, false, `Expected genuine reply "${input}" NOT to be flagged`);
  }
});

test('rank-specific scenarios enforce leadership SOPs and forbid cover-ups in GM crisis', () => {
  const coverUp = evaluateInstantTurn({
    scenarioId: 'rank-gm-crisis',
    traineeMessage: '죄송합니다. 합의금을 드릴 테니 SNS에 올리지 마시고 조용히 덮어주세요.',
    currentSatisfaction: 16,
    turnNumber: 1,
    usedReplies: [],
  });
  assert.ok(coverUp.satisfactionDelta < 0);
  assert.ok(coverUp.turnScores.sopCompliance <= 35);
  assert.match(coverUp.guestReply, /입막음|덮으려|폭로/);

  const safetyFirst = evaluateInstantTurn({
    scenarioId: 'rank-gm-crisis',
    traineeMessage:
      '한소라 고객님, 가장 안전해야 할 공간에서 큰 공포와 불안을 느끼시게 한 점, 총지배인으로서 깊이 사죄드립니다. 신변 안전을 최우선으로 즉시 비공개 가명 등록 최고층 스위트 이전과 전담 보안 요원 배치를 진행하겠습니다.',
    currentSatisfaction: 16,
    turnNumber: 1,
    usedReplies: [],
  });
  assert.equal(safetyFirst.isInappropriateReply, false);
  assert.ok(safetyFirst.satisfactionDelta > 0);
  assert.ok(safetyFirst.turnScores.sopCompliance >= 80);

  const internGood = evaluateInstantTurn({
    scenarioId: 'rank-intern-authority',
    traineeMessage:
      '강태석 고객님, 미니바 오과금으로 불쾌하셨겠습니다. 진심으로 죄송합니다. 즉시 하우스키핑 점검 기록을 확인해 전액 취소해 드리고, 같은 말씀을 반복하시지 않도록 당직 지배인님께 경위를 요약해 2분 내로 인계해 드리겠습니다.',
    currentSatisfaction: 24,
    turnNumber: 1,
    usedReplies: [],
  });
  assert.equal(internGood.isInappropriateReply, false);
  assert.ok(internGood.satisfactionDelta > 0);
  assert.ok(internGood.turnScores.sopCompliance >= 80);
});
