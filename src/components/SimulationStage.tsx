import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  Flag,
  History,
  Send,
  Sparkles,
  Volume2,
  VolumeX,
  X,
  Zap,
} from 'lucide-react';
import { EMOTION_META, GUEST_SCENE_IMAGES } from '../data/guestVisuals';
import { COMPETENCY_LABELS, getFacilityMeta } from '../data/hotelManual';
import {
  COMPETENCY_KEYS,
  buildMisconductFailureRecord,
  calculateGrade,
  calculateOverallScore,
  calculateXpReward,
  evaluateInappropriateStrike,
  mergeTurnScores,
} from '../utils/gameLogic';
import { detectInappropriateReply, evaluateInstantTurn } from '../utils/instantResponder';
import {
  computeFallbackSpeechParams,
  pickFallbackBrowserVoice,
  resolveGuestVoiceProfile,
} from '../utils/voiceProfile';
import { SessionResultModal } from './SessionResultModal';
import type {
  ChatTurn,
  CompetencyScores,
  GuestEmotion,
  ReportApiResponse,
  ResponseSpeedMode,
  ScenarioDefinition,
  SessionOutcome,
  TrainingMode,
  TrainingSessionRecord,
  TurnApiResponse,
} from '../types';

interface SimulationStageProps {
  scenario: ScenarioDefinition;
  mode: TrainingMode;
  currentTotalXp: number;
  onSessionCompleted: (record: TrainingSessionRecord) => void;
  onSwitchToRealMode: () => void;
  onOpenManual: () => void;
  onOpenDashboard: () => void;
  onBackToLobby: () => void;
}

const UNIQUE_EMOTIONS: GuestEmotion[] = [
  'furious',
  'angry',
  'skeptical',
  'calm',
  'satisfied',
];

function nowTimeLabel(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function SimulationStage({
  scenario,
  mode,
  currentTotalXp,
  onSessionCompleted,
  onSwitchToRealMode,
  onOpenManual,
  onOpenDashboard,
  onBackToLobby,
}: SimulationStageProps) {
  const isRealMode = mode === 'real';
  const [emotion, setEmotion] = useState<GuestEmotion>(scenario.initialEmotion);
  const [satisfaction, setSatisfaction] = useState<number>(scenario.initialSatisfaction);
  const [lastDelta, setLastDelta] = useState<number | null>(null);
  const [turnCount, setTurnCount] = useState<number>(0);
  const [turns, setTurns] = useState<ChatTurn[]>([
    {
      id: 'opening',
      speaker: 'guest',
      text: scenario.openingLine,
      timestamp: nowTimeLabel(),
      emotion: scenario.initialEmotion,
      satisfactionAfter: scenario.initialSatisfaction,
    },
  ]);
  const [turnScoresList, setTurnScoresList] = useState<CompetencyScores[]>([]);
  const [latestCoaching, setLatestCoaching] = useState<string | null>(null);
  const [latestTurnScores, setLatestTurnScores] = useState<CompetencyScores | null>(null);
  const [inputText, setInputText] = useState<string>('');
  const [sending, setSending] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [showTranscript, setShowTranscript] = useState<boolean>(false);
  const [showStarters, setShowStarters] = useState<boolean>(true);
  const [ttsEnabled, setTtsEnabled] = useState<boolean>(true);
  const [voiceStatus, setVoiceStatus] = useState<'idle' | 'loading' | 'playing'>('idle');
  const [responseSpeed, setResponseSpeed] = useState<ResponseSpeedMode>('instant');
  const [shakeTrigger, setShakeTrigger] = useState<number>(0);
  const [inappropriateCount, setInappropriateCount] = useState<number>(0);
  const [practiceWarningVisible, setPracticeWarningVisible] = useState<boolean>(false);
  const [practiceWarningReason, setPracticeWarningReason] = useState<string | null>(null);

  // End-of-session report state
  const [finalOutcome, setFinalOutcome] = useState<Exclude<SessionOutcome, 'ongoing'> | null>(null);
  const [reportLoading, setReportLoading] = useState<boolean>(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [completedRecord, setCompletedRecord] = useState<TrainingSessionRecord | null>(null);
  const [xpBeforeSession, setXpBeforeSession] = useState<number>(currentTotalXp);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ttsAbortRef = useRef<AbortController | null>(null);
  const audioUrlCacheRef = useRef<Map<string, string>>(new Map());

  const latestGuestTurn = [...turns].reverse().find((t) => t.speaker === 'guest');
  const emotionMeta = EMOTION_META[emotion];
  const facilityMeta = getFacilityMeta(scenario.facility);
  const guestAssets = GUEST_SCENE_IMAGES[scenario.visualProfile];
  const guestVoiceProfile = resolveGuestVoiceProfile(scenario.id, scenario.guestGender);

  function stopVoicePlayback() {
    if (ttsAbortRef.current) {
      ttsAbortRef.current.abort();
      ttsAbortRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // noop
      }
    }
    setVoiceStatus('idle');
  }

  function speakWithBrowserFallback(text: string, targetEmotion: GuestEmotion) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setVoiceStatus('idle');
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = 'ko-KR';
      const voices = window.speechSynthesis.getVoices();
      const picked = pickFallbackBrowserVoice(voices, scenario.guestGender);
      if (picked) {
        utter.voice = picked as SpeechSynthesisVoice;
      }
      const { pitch, rate } = computeFallbackSpeechParams(guestVoiceProfile, targetEmotion);
      utter.rate = rate;
      utter.pitch = pitch;
      utter.onstart = () => setVoiceStatus('playing');
      utter.onend = () => setVoiceStatus('idle');
      utter.onerror = () => setVoiceStatus('idle');
      window.speechSynthesis.speak(utter);
    } catch {
      setVoiceStatus('idle');
    }
  }

  async function playGuestVoice(text: string, targetEmotion: GuestEmotion) {
    if (!text.trim() || typeof window === 'undefined') return;
    stopVoicePlayback();

    const cacheKey = `${scenario.id}|${targetEmotion}|${text}`;
    const cachedUrl = audioUrlCacheRef.current.get(cacheKey);
    const controller = new AbortController();
    ttsAbortRef.current = controller;

    try {
      let audioUrl = cachedUrl;
      if (!audioUrl) {
        setVoiceStatus('loading');
        const res = await fetch('/api/simulation/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text,
            scenarioId: scenario.id,
            emotion: targetEmotion,
          }),
          signal: controller.signal,
        });
        if (!res.ok) {
          throw new Error(`TTS HTTP ${res.status}`);
        }
        const blob = await res.blob();
        if (controller.signal.aborted) return;
        audioUrl = URL.createObjectURL(blob);
        audioUrlCacheRef.current.set(cacheKey, audioUrl);
      }

      if (controller.signal.aborted) return;
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.onplay = () => setVoiceStatus('playing');
      audio.onended = () => {
        if (audioRef.current === audio) {
          audioRef.current = null;
        }
        setVoiceStatus('idle');
      };
      audio.onerror = () => {
        if (audioRef.current === audio) {
          audioRef.current = null;
        }
        setVoiceStatus('idle');
      };

      await audio.play();
    } catch (err) {
      if (controller.signal.aborted) return;
      // Ignore browser autoplay gate silently; user can click "다시 듣기" or reply
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        setVoiceStatus('idle');
        return;
      }
      speakWithBrowserFallback(text, targetEmotion);
    }
  }

  // Cleanup audio & cached blob URLs on unmount
  useEffect(() => {
    return () => {
      stopVoicePlayback();
      audioUrlCacheRef.current.forEach((url) => URL.revokeObjectURL(url));
      audioUrlCacheRef.current.clear();
    };
  }, []);

  // Reset state if scenario changes
  useEffect(() => {
    stopVoicePlayback();
    setEmotion(scenario.initialEmotion);
    setSatisfaction(scenario.initialSatisfaction);
    setLastDelta(null);
    setTurnCount(0);
    setTurns([
      {
        id: 'opening',
        speaker: 'guest',
        text: scenario.openingLine,
        timestamp: nowTimeLabel(),
        emotion: scenario.initialEmotion,
        satisfactionAfter: scenario.initialSatisfaction,
      },
    ]);
    setTurnScoresList([]);
    setLatestCoaching(null);
    setLatestTurnScores(null);
    setInputText('');
    setApiError(null);
    setFinalOutcome(null);
    setCompletedRecord(null);
    setReportError(null);
    setInappropriateCount(0);
    setPracticeWarningVisible(false);
    setPracticeWarningReason(null);
    setXpBeforeSession(currentTotalXp);
  }, [scenario, mode]);

  // Natural gender-matched Gemini TTS playback whenever a new guest line arrives
  useEffect(() => {
    if (!ttsEnabled) {
      stopVoicePlayback();
      return;
    }
    if (!latestGuestTurn) return;
    void playGuestVoice(latestGuestTurn.text, latestGuestTurn.emotion ?? emotion);
    return () => {
      stopVoicePlayback();
    };
  }, [latestGuestTurn?.id, ttsEnabled, scenario.id]);

  useEffect(() => {
    if (showTranscript) {
      transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [turns.length, showTranscript]);

  async function finalizeSession(
    outcome: Exclude<SessionOutcome, 'ongoing'>,
    finalTranscript: ChatTurn[],
    finalSat: number,
    scoresHistory: CompetencyScores[],
    finalTurnsCount: number
  ) {
    setFinalOutcome(outcome);
    setReportLoading(true);
    setReportError(null);
    document.body.dataset.state = 'gameover';

    const accumulated = mergeTurnScores(scoresHistory);

    try {
      const res = await fetch('/api/simulation/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenarioId: scenario.id,
          history: finalTranscript.map((t) => ({ speaker: t.speaker, text: t.text })),
          finalSatisfaction: finalSat,
          outcome,
          accumulatedScores: accumulated,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || '리포트 분석에 실패했습니다.');
      }

      const report = data as ReportApiResponse;
      const overallScore = calculateOverallScore(report.scores);
      const grade = calculateGrade(overallScore);
      const difficultyBonus =
        scenario.difficulty === '매우 어려움' ? 25 : scenario.difficulty === '어려움' ? 15 : 5;
      const xpEarned = calculateXpReward(overallScore, outcome, difficultyBonus, mode);

      const newRecord: TrainingSessionRecord = {
        id: `session-${Date.now()}`,
        scenarioId: scenario.id,
        scenarioTitle: scenario.title,
        guestName: scenario.guestName,
        mode,
        completedAt: new Date().toISOString(),
        outcome,
        finalSatisfaction: finalSat,
        overallScore,
        grade,
        xpEarned,
        turnCount: Math.max(1, finalTurnsCount),
        scores: report.scores,
        summary: report.summary,
        strengths: report.strengths,
        weaknesses: report.weaknesses,
        manualChecklist: report.manualChecklist,
        modelResponse: report.modelResponse,
        transcript: finalTranscript,
      };

      setCompletedRecord(newRecord);
      onSessionCompleted(newRecord);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '리포트 생성 중 오류가 발생했습니다.';
      setReportError(msg);
    } finally {
      setReportLoading(false);
    }
  }

  async function handleSubmitTurn(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed || sending || finalOutcome) return;

    setApiError(null);
    setSending(true);

    const nextTurnNumber = turnCount + 1;
    const traineeTurn: ChatTurn = {
      id: `trainee-${Date.now()}`,
      speaker: 'trainee',
      text: trimmed,
      timestamp: nowTimeLabel(),
    };

    const nextTurnsBeforeReply = [...turns, traineeTurn];
    setTurns(nextTurnsBeforeReply);
    setInputText('');

    try {
      let result: TurnApiResponse;

      if (responseSpeed === 'instant') {
        await new Promise((resolve) => setTimeout(resolve, 180));
        result = evaluateInstantTurn({
          scenarioId: scenario.id,
          traineeMessage: trimmed,
          currentSatisfaction: satisfaction,
          turnNumber: nextTurnNumber,
          usedReplies: turns.filter((t) => t.speaker === 'guest').map((t) => t.text),
          traineeHistory: turns.filter((t) => t.speaker === 'trainee').map((t) => t.text),
        });
      } else {
        const res = await fetch('/api/simulation/turn', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scenarioId: scenario.id,
            traineeMessage: trimmed,
            history: turns.map((t) => ({ speaker: t.speaker, text: t.text })),
            currentSatisfaction: satisfaction,
            turnNumber: nextTurnNumber,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'AI 고객 응답을 불러오지 못했습니다.');
        }

        result = data as TurnApiResponse;
      }

      const localCheck = detectInappropriateReply(trimmed, scenario.id);
      const isThisTurnInappropriate =
        Boolean(result.isInappropriateReply) || localCheck.isInappropriate;
      const nextInappropriateCount = isThisTurnInappropriate
        ? inappropriateCount + 1
        : inappropriateCount;
      const strikeAction = isThisTurnInappropriate
        ? evaluateInappropriateStrike(mode, nextInappropriateCount)
        : 'none';

      const guestTurn: ChatTurn = {
        id: `guest-${Date.now()}`,
        speaker: 'guest',
        text: result.guestReply,
        timestamp: nowTimeLabel(),
        emotion: result.emotion,
        satisfactionAfter: result.newSatisfaction,
        satisfactionDelta: result.satisfactionDelta,
        coachingNote: result.coachingNote,
        turnScores: result.turnScores,
      };

      const updatedTurns = [...nextTurnsBeforeReply, guestTurn];
      const updatedScoresList = [...turnScoresList, result.turnScores];

      setTurns(updatedTurns);
      setTurnScoresList(updatedScoresList);
      setTurnCount(nextTurnNumber);
      setSatisfaction(strikeAction === 'fail' ? 0 : result.newSatisfaction);
      setLastDelta(result.satisfactionDelta);
      setEmotion(strikeAction === 'fail' ? 'furious' : result.emotion);
      setLatestCoaching(result.coachingNote);
      setLatestTurnScores(result.turnScores);
      setInappropriateCount(nextInappropriateCount);

      if (result.satisfactionDelta < 0 || isThisTurnInappropriate) {
        setShakeTrigger((prev) => prev + 1);
      }

      if (strikeAction === 'fail') {
        // Real Mode: 3+ inappropriate/playful replies -> immediate "대응 실패" with lowest score (0점)
        const failRecord = buildMisconductFailureRecord({
          scenario,
          mode,
          turnCount: nextTurnNumber,
          inappropriateCount: nextInappropriateCount,
          transcript: updatedTurns,
        });
        document.body.dataset.state = 'gameover';
        setFinalOutcome('escalated');
        setReportLoading(false);
        setReportError(null);
        setCompletedRecord(failRecord);
        onSessionCompleted(failRecord);
        return;
      }

      if (strikeAction === 'warning') {
        // Practice Mode: 3+ inappropriate/playful replies -> show prominent "경고" overlay
        setPracticeWarningReason(
          result.inappropriateReason ??
            localCheck.reason ??
            '호텔 응대 상황과 맞지 않는 이상하거나 장난스러운 답변이 반복되었습니다.'
        );
        setPracticeWarningVisible(true);
      }

      // Allow reaching 3 strikes before early low-satisfaction escalation cuts off Strike 2/3
      const suppressEarlyEscalation =
        result.outcome === 'escalated' &&
        nextTurnNumber < scenario.maxTurns &&
        isThisTurnInappropriate &&
        (nextInappropriateCount < 3 || !isRealMode);

      if (result.shouldEnd && result.outcome !== 'ongoing' && !suppressEarlyEscalation) {
        await finalizeSession(
          result.outcome,
          updatedTurns,
          result.newSatisfaction,
          updatedScoresList,
          nextTurnNumber
        );
      }
    } catch (err) {
      // Restore message to input so trainee doesn't lose what they typed
      setTurns(turns);
      setInputText(trimmed);
      setApiError(err instanceof Error ? err.message : '서버 통신 오류가 발생했습니다.');
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  function handleEarlyFinish() {
    if (sending || finalOutcome) return;
    const outcome: Exclude<SessionOutcome, 'ongoing'> =
      satisfaction >= 75 ? 'resolved' : 'escalated';
    finalizeSession(outcome, turns, satisfaction, turnScoresList, Math.max(1, turnCount));
  }

  function handleReplay() {
    document.body.dataset.state = 'playing';
    setEmotion(scenario.initialEmotion);
    setSatisfaction(scenario.initialSatisfaction);
    setLastDelta(null);
    setTurnCount(0);
    setTurns([
      {
        id: 'opening',
        speaker: 'guest',
        text: scenario.openingLine,
        timestamp: nowTimeLabel(),
        emotion: scenario.initialEmotion,
        satisfactionAfter: scenario.initialSatisfaction,
      },
    ]);
    setTurnScoresList([]);
    setLatestCoaching(null);
    setLatestTurnScores(null);
    setInputText('');
    setApiError(null);
    setFinalOutcome(null);
    setCompletedRecord(null);
    setReportError(null);
    setInappropriateCount(0);
    setPracticeWarningVisible(false);
    setPracticeWarningReason(null);
    setXpBeforeSession(currentTotalXp);
  }

  return (
    <div
      className="relative h-screen w-screen overflow-hidden bg-[#0B162C] text-[#F8FAFC]"
      data-testid="simulation-stage"
      data-mode={mode}
      data-emotion={emotion}
      data-satisfaction={satisfaction}
    >
      {/* LAYER 1: Full-Bleed 1st-Person POV Hotel Scene & Centered Guest NPC */}
      <div
        key={shakeTrigger}
        className={`absolute inset-0 overflow-hidden bg-[#0B162C] ${
          shakeTrigger > 0 ? 'animate-impact-shake' : ''
        }`}
      >
        {UNIQUE_EMOTIONS.map((em) => {
          const asset = guestAssets[em];
          const isActive = emotion === em;
          return (
            <img
              key={em}
              src={asset.src}
              alt={`${scenario.guestName} 고객 - ${EMOTION_META[em].label}`}
              referrerPolicy="no-referrer"
              style={{ objectPosition: asset.objectPosition }}
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ease-out ${
                isActive ? 'opacity-100 animate-pov-breathe' : 'opacity-0 pointer-events-none'
              }`}
            />
          );
        })}

        {/* Emotion-reactive ambient edge vignette + top/bottom contrast scrims */}
        <div
          className={`pointer-events-none absolute inset-0 transition-shadow duration-500 ${emotionMeta.vignetteClass}`}
        />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-[#070F1F]/90 via-[#070F1F]/45 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[52%] bg-gradient-to-t from-[#070F1F] via-[#070F1F]/84 to-transparent" />
      </div>

      {/* LAYER 2: Top AIVON Navy & Cobalt Front-Desk HUD */}
      <header className="relative z-20 flex flex-wrap items-center justify-between gap-4 border-b border-white/12 bg-[#0B162C]/92 px-4 py-3 backdrop-blur-md sm:px-6">
        {/* Left: Back & Guest Context */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onBackToLobby}
            aria-label="시나리오 로비로 돌아가기"
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-2 text-xs font-medium text-[#CBD5E1] transition-colors hover:bg-white/10 hover:text-white whitespace-nowrap shrink-0"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            로비로
          </button>

          <div className="min-w-0">
            <h1 className="truncate font-display text-sm font-bold text-white sm:text-base">
              {scenario.title}
            </h1>
            <p className="truncate text-xs text-[#94A3B8]">
              <span className={isRealMode ? 'font-semibold text-[#60A5FA]' : 'text-[#CBD5E1]'}>
                {isRealMode ? '실전 모드 · 무힌트' : '연습 모드'}
              </span>
              <span aria-hidden="true"> · </span>
              {facilityMeta.label} · {scenario.guestName} 고객 · {scenario.roomInfo}
            </p>
          </div>
        </div>

        {/* Center: Live Customer Satisfaction & Emotion Gauge */}
        <div className="flex items-center gap-4 rounded-lg border border-white/12 bg-[#10203D]/95 px-4 py-2">
          <div className="min-w-[175px] sm:min-w-[215px]">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className={`font-semibold ${emotionMeta.accentColor}`}>
                고객 감정: {emotionMeta.label}
              </span>
              <span className="font-mono font-semibold text-white tabular-nums">
                {satisfaction} / 100
                {lastDelta !== null && (
                  <span
                    className={`ml-1.5 ${
                      lastDelta >= 0 ? 'text-emerald-300' : 'text-rose-300'
                    }`}
                  >
                    ({lastDelta >= 0 ? `+${lastDelta}` : lastDelta})
                  </span>
                )}
              </span>
            </div>
            <div
              className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-white/12"
              role="progressbar"
              aria-label="고객 대처 만족도"
              aria-valuenow={satisfaction}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className={`h-full transition-all duration-500 ${emotionMeta.barColor}`}
                style={{ width: `${satisfaction}%` }}
              />
            </div>
          </div>

          <div className="h-7 w-px bg-white/12" aria-hidden="true" />

          <div className="text-right shrink-0">
            <p className="text-[11px] text-[#94A3B8]">응대 턴</p>
            <p className="font-mono text-sm font-semibold text-[#60A5FA] tabular-nums">
              {turnCount} / {scenario.maxTurns}
            </p>
          </div>
        </div>

        {/* Right: Utility Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setTtsEnabled((v) => !v)}
            aria-label={ttsEnabled ? '고객 음성 읽기 끄기' : '고객 음성 읽기 켜기'}
            title={ttsEnabled ? '음성 끄기' : '고객 대사 음성으로 듣기'}
            className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border transition-colors ${
              ttsEnabled
                ? 'border-[#3B82F6] bg-[#0052FF]/25 text-[#93C5FD]'
                : 'border-white/15 text-[#CBD5E1] hover:bg-white/10 hover:text-white'
            }`}
          >
            {ttsEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>

          <button
            type="button"
            onClick={() => setShowTranscript((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              showTranscript
                ? 'border-[#3B82F6] bg-[#0052FF]/25 text-white'
                : 'border-white/15 text-[#CBD5E1] hover:bg-white/10 hover:text-white'
            }`}
          >
            <History className="h-3.5 w-3.5" aria-hidden="true" />
            대화 기록
          </button>

          {!isRealMode && (
            <button
              type="button"
              onClick={onOpenManual}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-2 text-xs font-medium text-[#CBD5E1] transition-colors hover:bg-white/10 hover:text-white whitespace-nowrap shrink-0"
            >
              <BookOpen className="h-3.5 w-3.5 text-[#60A5FA]" aria-hidden="true" />
              응대 매뉴얼
            </button>
          )}

          {turnCount >= 1 && !finalOutcome && (
            <button
              type="button"
              onClick={handleEarlyFinish}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#0052FF] px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#1D6BFF] whitespace-nowrap shrink-0"
            >
              <Flag className="h-3.5 w-3.5" aria-hidden="true" />
              응대 종료·평가
            </button>
          )}
        </div>
      </header>

      {/* LAYER 3: Real-Time Manual Coaching Callout (Practice Mode Only) */}
      {!isRealMode && latestCoaching && !showTranscript && (
        <aside
          aria-label="실시간 매뉴얼 코칭 피드백"
          className="absolute right-4 top-20 z-20 hidden w-80 rounded-xl border border-[#3B82F6]/40 bg-[#0B162C]/94 p-4 shadow-xl backdrop-blur-md lg:block"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-[#60A5FA]">
              실시간 CS 매뉴얼 코칭
            </span>
            <button
              type="button"
              onClick={() => setLatestCoaching(null)}
              aria-label="코칭 피드백 닫기"
              className="text-[#94A3B8] hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-[#E2E8F0]">
            {latestCoaching}
          </p>
          {latestTurnScores && (
            <div className="mt-3 grid grid-cols-5 gap-1.5 border-t border-white/12 pt-2.5 text-center">
              {COMPETENCY_KEYS.map((key) => (
                <div key={key}>
                  <p className="text-[10px] text-[#94A3B8] truncate">
                    {COMPETENCY_LABELS[key].slice(0, 2)}
                  </p>
                  <p className="font-mono text-xs font-semibold text-white tabular-nums">
                    {latestTurnScores[key]}
                  </p>
                </div>
              ))}
            </div>
          )}
        </aside>
      )}

      {/* LAYER 4: Slide-Over Conversation Transcript */}
      {showTranscript && (
        <aside
          aria-label="대화 기록 패널"
          className="absolute bottom-44 right-4 top-20 z-20 flex w-full max-w-sm flex-col rounded-xl border border-white/15 bg-[#0B162C]/95 shadow-2xl backdrop-blur-md"
        >
          <div className="flex items-center justify-between border-b border-white/12 px-4 py-3">
            <h2 className="text-sm font-semibold text-white">대화 녹취록</h2>
            <button
              type="button"
              onClick={() => setShowTranscript(false)}
              aria-label="대화 기록 닫기"
              className="text-[#94A3B8] hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {turns.map((turn) => (
              <div
                key={turn.id}
                className={`rounded-lg border p-3 text-xs leading-relaxed ${
                  turn.speaker === 'guest'
                    ? 'border-white/12 bg-[#10203D] text-[#F8FAFC]'
                    : 'border-[#3B82F6]/35 bg-[#0F2654] text-white'
                }`}
              >
                <div className="mb-1 flex items-center justify-between text-[11px] text-[#94A3B8]">
                  <span className="font-semibold text-[#60A5FA]">
                    {turn.speaker === 'guest'
                      ? `${scenario.guestName} 고객`
                      : `나 (${facilityMeta.staffRole})`}
                  </span>
                  <span className="font-mono tabular-nums">{turn.timestamp}</span>
                </div>
                <p>{turn.text}</p>
                {!isRealMode && turn.coachingNote && (
                  <p className="mt-2 border-t border-white/12 pt-2 text-[11px] text-[#93C5FD]">
                    코칭: {turn.coachingNote}
                  </p>
                )}
              </div>
            ))}
            <div ref={transcriptEndRef} />
          </div>
        </aside>
      )}

      {/* LAYER 5: Bottom 1st-Person Front-Desk Dialogue Plaque & Response Input */}
      <div className="absolute inset-x-0 bottom-0 z-20 px-4 pb-4 sm:px-6 sm:pb-6">
        <div className="mx-auto max-w-4xl space-y-3">
          {/* Guest Spoken Dialogue Box */}
          <div className="rounded-xl border border-[#3B82F6]/35 bg-[#0B162C]/93 px-5 py-4 shadow-2xl backdrop-blur-md sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs">
                <span className="font-semibold text-[#60A5FA]">
                  {scenario.guestName} 고객
                </span>
                <span className="text-[#64748B]" aria-hidden="true">·</span>
                <span className="text-[#CBD5E1]">{guestVoiceProfile.ageGroup}</span>
                <span className="text-[#64748B]" aria-hidden="true">·</span>
                <span className={emotionMeta.accentColor}>{emotionMeta.label}</span>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <span className="text-[#94A3B8]">{emotionMeta.description}</span>
                {latestGuestTurn && !sending && (
                  <button
                    type="button"
                    onClick={() => {
                      if (!ttsEnabled) setTtsEnabled(true);
                      void playGuestVoice(latestGuestTurn.text, latestGuestTurn.emotion ?? emotion);
                    }}
                    aria-label={`${scenario.guestName} 고객 대사 다시 듣기 (${guestVoiceProfile.voiceLabel})`}
                    title={guestVoiceProfile.voiceLabel}
                    className="inline-flex items-center gap-1 text-[#93C5FD] transition-colors hover:text-white whitespace-nowrap shrink-0"
                  >
                    <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>
                      {voiceStatus === 'loading'
                        ? '음성 준비 중...'
                        : voiceStatus === 'playing'
                          ? '재생 중'
                          : '다시 듣기'}
                    </span>
                  </button>
                )}
              </div>
            </div>

            <div className="mt-2.5 min-h-[3.25rem]">
              {sending ? (
                <p className="text-sm text-[#60A5FA]">
                  {scenario.guestName} 고객이 응대 내용을 듣고 반응하고 있습니다...
                </p>
              ) : (
                <p
                  data-testid="guest-dialogue"
                  className="text-base leading-relaxed text-white sm:text-[17px]"
                >
                  “{latestGuestTurn?.text}”
                </p>
              )}
            </div>

            {/* Mobile compact coaching hint (Practice Mode only) */}
            {!isRealMode && latestCoaching && (
              <p className="mt-2.5 border-t border-white/12 pt-2 text-xs text-[#93C5FD] lg:hidden">
                매뉴얼 코칭: {latestCoaching}
              </p>
            )}
          </div>

          {/* Practice Mode Persistent Warning Banner (3+ inappropriate replies) */}
          {!isRealMode && inappropriateCount >= 3 && !finalOutcome && (
            <div
              role="alert"
              data-testid="practice-warning-banner"
              className="flex items-center justify-between gap-3 rounded-lg border border-amber-400/50 bg-amber-950/92 px-4 py-2.5 text-xs font-medium text-amber-100 shadow-lg"
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" aria-hidden="true" />
                <span>
                  <strong className="font-bold text-amber-300">경고</strong> · 이상하거나 장난스러운 응대가{' '}
                  {inappropriateCount}회 누적되었습니다. 호텔 매뉴얼에 맞춰 진지하게 응대해 주세요.
                </span>
              </div>
              <span className="font-mono text-[11px] font-semibold text-amber-300 shrink-0 tabular-nums">
                경고 {inappropriateCount}회
              </span>
            </div>
          )}

          {/* Error Banner */}
          {apiError && (
            <div
              role="alert"
              className="flex items-center justify-between gap-3 rounded-lg border border-rose-500/40 bg-rose-950/90 px-4 py-2.5 text-xs text-rose-100"
            >
              <span>{apiError}</span>
              <button
                type="button"
                onClick={() => setApiError(null)}
                className="underline whitespace-nowrap shrink-0"
              >
                닫기
              </button>
            </div>
          )}

          {/* Mode Guidance / Practice-Only Quick SOP Starters */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            {isRealMode ? (
              <span className="text-xs text-[#93C5FD]">
                실전 모드 진행 중 · 힌트 및 매뉴얼 없이 직접 응대하세요 (완료 시 XP +25%)
              </span>
            ) : (
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowStarters((s) => !s)}
                  className="text-xs text-[#CBD5E1] underline underline-offset-4 hover:text-white whitespace-nowrap shrink-0"
                >
                  {showStarters ? '추천 응대 힌트 숨기기' : '추천 응대 힌트 보기'}
                </button>
                {showStarters &&
                  scenario.quickStarters.map((starter) => (
                    <button
                      key={starter.label}
                      type="button"
                      disabled={sending || Boolean(finalOutcome)}
                      onClick={() => {
                        setInputText(starter.text);
                        inputRef.current?.focus();
                      }}
                      className="rounded-md border border-white/15 bg-[#0F1E38]/92 px-3 py-1.5 text-xs text-[#E2E8F0] transition-colors hover:border-[#3B82F6] hover:text-white disabled:opacity-40 whitespace-nowrap shrink-0"
                    >
                      {starter.label}
                    </button>
                  ))}
              </div>
            )}
            <div className="flex items-center gap-3 shrink-0">
              <div
                role="group"
                aria-label="고객 응답 속도 방식 선택"
                className="inline-flex items-center rounded-lg border border-white/15 bg-[#0F1E38]/95 p-0.5"
              >
                <button
                  type="button"
                  onClick={() => setResponseSpeed('instant')}
                  aria-pressed={responseSpeed === 'instant'}
                  title="사전 준비된 다양한 고객 반응으로 0.2초 내 즉시 응답"
                  className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    responseSpeed === 'instant'
                      ? 'bg-[#0052FF] text-white font-semibold'
                      : 'text-[#CBD5E1] hover:text-white'
                  }`}
                >
                  <Zap className="h-3 w-3" aria-hidden="true" />
                  즉각 반응
                </button>
                <button
                  type="button"
                  onClick={() => setResponseSpeed('live-ai')}
                  aria-pressed={responseSpeed === 'live-ai'}
                  title="실시간 고속 AI 모델로 매 턴 즉석 대사 생성"
                  className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    responseSpeed === 'live-ai'
                      ? 'bg-[#0052FF] text-white font-semibold'
                      : 'text-[#CBD5E1] hover:text-white'
                  }`}
                >
                  <Sparkles className="h-3 w-3" aria-hidden="true" />
                  실시간 AI
                </button>
              </div>
              <span className="hidden text-xs text-[#94A3B8] md:inline whitespace-nowrap">
                목표: 82점 이상
              </span>
            </div>
          </div>

          {/* Trainee Reply Input Bar */}
          <form
            onSubmit={handleSubmitTurn}
            className="flex items-end gap-3 rounded-xl border border-white/15 bg-[#0B162C]/96 p-2.5 shadow-2xl focus-within:border-[#3B82F6]"
          >
            <label htmlFor="trainee-response-input" className="sr-only">
              신입사원 응대 멘트 입력
            </label>
            <textarea
              id="trainee-response-input"
              ref={inputRef}
              rows={2}
              value={inputText}
              disabled={sending || Boolean(finalOutcome)}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmitTurn();
                }
              }}
              placeholder={
                isRealMode
                  ? '실전 모드: 힌트 없이 고객을 마주 보고 직접 정중하게 응대 멘트를 입력하세요... (Enter로 전송)'
                  : '고객을 마주 보고 호텔 매뉴얼에 따라 정중하게 응대 멘트를 입력하세요... (Enter로 전송)'
              }
              className="flex-1 resize-none bg-transparent px-2.5 py-1.5 text-sm leading-relaxed text-white placeholder-[#94A3B8] focus:outline-none disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={sending || !inputText.trim() || Boolean(finalOutcome)}
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#0052FF] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#1D6BFF] disabled:cursor-not-allowed disabled:opacity-40 whitespace-nowrap shrink-0"
            >
              {sending ? (
                '응답 대기...'
              ) : (
                <>
                  <span>응대하기</span>
                  <Send className="h-4 w-4" aria-hidden="true" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* LAYER 5.5: Practice Mode 3-Strike Warning Overlay */}
      {!isRealMode && practiceWarningVisible && !finalOutcome && (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="practice-warning-title"
          data-testid="practice-warning-modal"
          className="fixed inset-0 z-40 flex items-center justify-center bg-[#0B162C]/70 p-4 backdrop-blur-[2px]"
        >
          <div className="w-full max-w-md rounded-2xl border border-amber-300 bg-white p-6 text-[#0B162C] shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                <AlertTriangle className="h-6 w-6" aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs font-semibold text-amber-700">
                  연습 모드 태도 경고 · 누적 {inappropriateCount}회
                </p>
                <h2
                  id="practice-warning-title"
                  className="text-2xl font-extrabold tracking-tight text-rose-600"
                >
                  경고
                </h2>
              </div>
            </div>

            <p className="mt-4 text-sm leading-relaxed text-[#334155]">
              이상하거나 장난스러운 응대가 <strong className="font-bold text-[#0B162C]">{inappropriateCount}회</strong>{' '}
              누적되었습니다. 실제 실전 모드에서는 3회 누적 시 즉시{' '}
              <strong className="font-semibold text-rose-600">대응 실패 및 최저 점수(0점)</strong>로
              종료됩니다.
            </p>

            {practiceWarningReason && (
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50/70 px-3.5 py-2.5 text-xs text-amber-900">
                감지 사유: {practiceWarningReason}
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setPracticeWarningVisible(false);
                  inputRef.current?.focus();
                }}
                className="rounded-lg bg-[#0052FF] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0041CC] whitespace-nowrap shrink-0"
              >
                경고 확인 후 계속 응대하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LAYER 6: End-of-Session Evaluation Modal */}
      {finalOutcome && (
        <SessionResultModal
          loading={reportLoading}
          error={reportError}
          record={completedRecord}
          previousTotalXp={xpBeforeSession}
          newTotalXp={
            completedRecord ? xpBeforeSession + completedRecord.xpEarned : xpBeforeSession
          }
          onRetryReport={() =>
            finalizeSession(finalOutcome, turns, satisfaction, turnScoresList, turnCount)
          }
          onReplay={handleReplay}
          onSwitchToRealMode={!isRealMode ? onSwitchToRealMode : undefined}
          onOpenDashboard={onOpenDashboard}
          onBackToLobby={onBackToLobby}
        />
      )}
    </div>
  );
}
