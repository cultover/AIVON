import { AlertTriangle, Award, CheckCircle2, RotateCcw, TrendingUp, XCircle } from 'lucide-react';
import { COMPETENCY_LABELS } from '../data/hotelManual';
import { COMPETENCY_KEYS, calculateLevelFromXp } from '../utils/gameLogic';
import type { TrainingSessionRecord } from '../types';

interface SessionResultModalProps {
  loading: boolean;
  error: string | null;
  record: TrainingSessionRecord | null;
  previousTotalXp: number;
  newTotalXp: number;
  onRetryReport?: () => void;
  onReplay: () => void;
  onSwitchToRealMode?: () => void;
  onOpenDashboard: () => void;
  onBackToLobby: () => void;
}

export function SessionResultModal({
  loading,
  error,
  record,
  previousTotalXp,
  newTotalXp,
  onRetryReport,
  onReplay,
  onSwitchToRealMode,
  onOpenDashboard,
  onBackToLobby,
}: SessionResultModalProps) {
  const prevLevel = calculateLevelFromXp(previousTotalXp);
  const nextLevel = calculateLevelFromXp(newTotalXp);
  const didLevelUp = nextLevel.level > prevLevel.level;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B162C]/70 p-4 overflow-y-auto backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-result-title"
    >
      <div className="my-auto w-full max-w-3xl rounded-2xl border border-[#E2E8F0] bg-white text-[#0B162C] shadow-2xl">
        {loading ? (
          <div className="flex flex-col items-center justify-center px-8 py-16 text-center">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#0052FF]/20 border-t-[#0052FF]" />
            <h2 id="session-result-title" className="mt-5 text-xl font-bold text-[#0B162C]">
              호텔 매뉴얼 기준 종합 평가 리포트 생성 중
            </h2>
            <p className="mt-2 text-sm text-[#64748B]">
              대화 녹취록의 공감도, 사과 진정성, 규정 준수 여부를 분석하고 있습니다.
            </p>
          </div>
        ) : error || !record ? (
          <div className="px-8 py-12 text-center">
            <h2 id="session-result-title" className="text-xl font-bold text-rose-700">
              리포트 생성 중 오류가 발생했습니다
            </h2>
            <p className="mt-2 text-sm text-[#475569]">
              {error ?? '평가 데이터를 불러올 수 없습니다.'}
            </p>
            <div className="mt-6 flex items-center justify-center gap-3">
              {onRetryReport && (
                <button
                  type="button"
                  onClick={onRetryReport}
                  className="rounded-lg bg-[#0052FF] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0041CC] whitespace-nowrap shrink-0"
                >
                  다시 분석하기
                </button>
              )}
              <button
                type="button"
                onClick={onBackToLobby}
                className="rounded-lg border border-[#CBD5E1] bg-white px-5 py-2.5 text-sm font-medium text-[#334155] hover:bg-[#F8FAFC] whitespace-nowrap shrink-0"
              >
                로비로 돌아가기
              </button>
            </div>
          </div>
        ) : (
          <div className="max-h-[90vh] overflow-y-auto">
            {/* Header & Grade Banner */}
            <div
              className={`border-b px-6 py-6 sm:px-8 ${
                record.misconductFailed
                  ? 'border-rose-200 bg-rose-50/60'
                  : 'border-[#E2E8F0]'
              }`}
            >
              {record.misconductFailed && (
                <div
                  role="alert"
                  className="mb-4 flex items-center gap-2.5 rounded-lg border border-rose-300 bg-rose-100/90 px-4 py-2.5 text-xs font-semibold text-rose-800"
                >
                  <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" aria-hidden="true" />
                  <span>
                    실전 모드 공지: 이상하거나 장난스러운 응대가 {record.inappropriateCount ?? 3}회 누적되어
                    대응 실패로 종료되었으며 최저 점수(0점)가 부여되었습니다.
                  </span>
                </div>
              )}

              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p
                    className={`text-xs font-semibold ${
                      record.misconductFailed ? 'text-rose-600' : 'text-[#0052FF]'
                    }`}
                  >
                    {record.mode === 'real' ? '실전 모드 · 무힌트' : '연습 모드'} · {record.scenarioTitle} · {record.guestName} 고객 · {record.turnCount}턴 진행
                  </p>
                  <h2
                    id="session-result-title"
                    className={`mt-1.5 text-2xl font-extrabold ${
                      record.misconductFailed ? 'text-rose-600' : 'text-[#0B162C]'
                    }`}
                  >
                    {record.misconductFailed
                      ? '대응 실패'
                      : record.outcome === 'resolved'
                        ? '컴플레인 응대 완료'
                        : '컴플레인 에스컬레이션 발생'}
                  </h2>
                  <p className="mt-2 max-w-xl text-sm leading-relaxed text-[#475569]">
                    {record.summary}
                  </p>
                </div>

                <div
                  className={`flex items-center gap-5 rounded-xl border px-5 py-3.5 ${
                    record.misconductFailed
                      ? 'border-rose-200 bg-white'
                      : 'border-[#E2E8F0] bg-[#F8FAFC]'
                  }`}
                >
                  <div className="text-center">
                    <p className="text-xs text-[#64748B]">평가 등급</p>
                    <p
                      className={`mt-0.5 font-mono text-3xl font-bold tabular-nums ${
                        record.misconductFailed ? 'text-rose-600' : 'text-[#0052FF]'
                      }`}
                    >
                      {record.grade}
                    </p>
                  </div>
                  <div className="h-10 w-px bg-[#E2E8F0]" aria-hidden="true" />
                  <div className="text-center">
                    <p className="text-xs text-[#64748B]">
                      {record.misconductFailed ? '최저 점수' : '종합 점수'}
                    </p>
                    <p
                      className={`mt-0.5 font-mono text-2xl font-bold tabular-nums ${
                        record.misconductFailed ? 'text-rose-600' : 'text-[#0B162C]'
                      }`}
                    >
                      {record.overallScore}
                      <span className="text-sm font-normal text-[#64748B]">/100</span>
                    </p>
                  </div>
                  <div className="h-10 w-px bg-[#E2E8F0]" aria-hidden="true" />
                  <div className="text-center">
                    <p className="text-xs text-[#64748B]">최종 만족도</p>
                    <p
                      className={`mt-0.5 font-mono text-2xl font-bold tabular-nums ${
                        record.misconductFailed ? 'text-rose-600' : 'text-emerald-600'
                      }`}
                    >
                      {record.finalSatisfaction}%
                    </p>
                  </div>
                </div>
              </div>

              {/* XP & Level Progression Strip */}
              <div className="mt-5 rounded-xl border border-[#BFDBFE] bg-[#EEF4FF]/60 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4 text-[#0052FF]" aria-hidden="true" />
                    <span className="font-bold text-[#0B162C]">
                      Lv.{nextLevel.level} {nextLevel.title}
                    </span>
                    {didLevelUp && (
                      <span className="font-semibold text-emerald-700">
                        · 승급 달성! (Lv.{prevLevel.level} → Lv.{nextLevel.level})
                      </span>
                    )}
                  </div>
                  <span className="font-mono text-xs font-bold text-[#0052FF] tabular-nums">
                    +{record.xpEarned} XP 획득 · 누적 {nextLevel.currentXp} XP
                  </span>
                </div>
                <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-[#DBEAFE]">
                  <div
                    className="h-full bg-[#0052FF] transition-all duration-500"
                    style={{ width: `${nextLevel.progressPercent}%` }}
                  />
                </div>
                <p className="mt-1.5 text-xs text-[#475569] tabular-nums">
                  {nextLevel.isMaxLevel
                    ? '최고 직급인 총지배인 마스터에 도달했습니다.'
                    : `다음 직급 승급까지 ${nextLevel.xpForNextLevel} XP 남았습니다.`}
                </p>
              </div>
            </div>

            {/* Body Analytics */}
            <div className="space-y-6 px-6 py-6 sm:px-8">
              {/* 5 Competency Bars */}
              <section>
                <h3 className="text-sm font-bold text-[#0052FF]">5대 역량 세부 채점</h3>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-5">
                  {COMPETENCY_KEYS.map((key) => {
                    const score = record.scores[key];
                    return (
                      <div
                        key={key}
                        className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[#475569]">{COMPETENCY_LABELS[key]}</span>
                          <span className="font-mono font-bold text-[#0B162C] tabular-nums">
                            {score}
                          </span>
                        </div>
                        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#E2E8F0]">
                          <div
                            className={`h-full ${
                              score >= 80
                                ? 'bg-emerald-500'
                                : score >= 65
                                  ? 'bg-[#0052FF]'
                                  : 'bg-rose-500'
                            }`}
                            style={{ width: `${score}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Strengths & Weaknesses */}
              <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4">
                  <h3 className="text-sm font-bold text-emerald-700">잘 대처한 부분</h3>
                  <ul className="mt-3 space-y-2 text-sm leading-relaxed text-[#1E293B]">
                    {record.strengths.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle2
                          className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600"
                          aria-hidden="true"
                        />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4">
                  <h3 className="text-sm font-bold text-amber-700">부족한 점 및 개선 과제</h3>
                  <ul className="mt-3 space-y-2 text-sm leading-relaxed text-[#1E293B]">
                    {record.weaknesses.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <XCircle
                          className="mt-0.5 h-4 w-4 shrink-0 text-amber-600"
                          aria-hidden="true"
                        />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>

              {/* Manual Checklist */}
              {record.manualChecklist.length > 0 && (
                <section>
                  <h3 className="text-sm font-bold text-[#0052FF]">
                    매뉴얼 필수 절차 이행 점검
                  </h3>
                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {record.manualChecklist.map((check, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between gap-3 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3.5 py-2.5 text-sm"
                      >
                        <span className="text-[#1E293B]">{check.item}</span>
                        <span
                          className={`shrink-0 text-xs font-bold ${
                            check.met ? 'text-emerald-700' : 'text-rose-600'
                          }`}
                        >
                          {check.met ? '충족' : '미충족'}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Model Answer */}
              <section className="rounded-lg border border-[#BFDBFE] bg-[#EEF4FF]/60 p-4">
                <h3 className="text-sm font-bold text-[#0052FF]">
                  5성급 호텔리어 모범 응대 예시
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[#0B162C]">
                  “{record.modelResponse}”
                </p>
              </section>
            </div>

            {/* Footer CTAs */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E2E8F0] bg-[#F8FAFC] px-6 py-4 sm:px-8">
              <button
                type="button"
                onClick={onBackToLobby}
                className="rounded-lg border border-[#CBD5E1] bg-white px-4 py-2.5 text-sm font-medium text-[#334155] transition-colors hover:bg-[#F5F7FA] hover:text-[#0B162C] whitespace-nowrap shrink-0"
              >
                다른 시나리오 선택
              </button>
              <div className="flex flex-wrap items-center gap-3">
                {onSwitchToRealMode && !record.misconductFailed && (
                  <button
                    type="button"
                    onClick={onSwitchToRealMode}
                    className="rounded-lg border border-[#0052FF] bg-white px-4 py-2.5 text-sm font-semibold text-[#0052FF] transition-colors hover:bg-[#EEF4FF] whitespace-nowrap shrink-0"
                  >
                    실전 모드로 도전
                  </button>
                )}
                {record.misconductFailed ? (
                  <>
                    <button
                      type="button"
                      onClick={onOpenDashboard}
                      className="inline-flex items-center gap-2 rounded-lg border border-[#CBD5E1] bg-white px-4 py-2.5 text-sm font-medium text-[#0B162C] transition-colors hover:bg-[#F1F2F3] whitespace-nowrap shrink-0"
                    >
                      <TrendingUp className="h-4 w-4 text-[#0052FF]" aria-hidden="true" />
                      성장 리포트 보기
                    </button>
                    <button
                      type="button"
                      onClick={onReplay}
                      className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-rose-700 whitespace-nowrap shrink-0"
                    >
                      <RotateCcw className="h-4 w-4" aria-hidden="true" />
                      시뮬레이션 다시 하기
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={onReplay}
                      className="inline-flex items-center gap-2 rounded-lg border border-[#CBD5E1] bg-white px-4 py-2.5 text-sm font-medium text-[#0B162C] transition-colors hover:bg-[#F1F2F3] whitespace-nowrap shrink-0"
                    >
                      <RotateCcw className="h-4 w-4" aria-hidden="true" />
                      다시 도전
                    </button>
                    <button
                      type="button"
                      onClick={onOpenDashboard}
                      className="inline-flex items-center gap-2 rounded-lg bg-[#0052FF] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0041CC] whitespace-nowrap shrink-0"
                    >
                      <TrendingUp className="h-4 w-4" aria-hidden="true" />
                      성장 리포트 보기
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
