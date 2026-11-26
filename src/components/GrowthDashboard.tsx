import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle2,
  LayoutGrid,
  Menu,
  RotateCcw,
  Trash2,
  TrendingUp,
  X,
  XCircle,
} from 'lucide-react';
import {
  COMPETENCY_DESCRIPTIONS,
  COMPETENCY_LABELS,
  FACILITY_CATEGORIES,
  getFacilityMeta,
  getScenarioById,
  SCENARIOS,
} from '../data/hotelManual';
import { COMPETENCY_KEYS, calculateGrade } from '../utils/gameLogic';
import { CompetencyRadarChart } from './CompetencyRadarChart';
import type {
  FacilityCategory,
  GrowthMetrics,
  LevelProgress,
  ScenarioId,
  TrainingSessionRecord,
} from '../types';

interface GrowthDashboardProps {
  sessions: TrainingSessionRecord[];
  metrics: GrowthMetrics;
  levelProgress: LevelProgress;
  onStartScenario: (id: ScenarioId) => void;
  onBackToLobby: () => void;
  onOpenRankScenarios: () => void;
  onOpenManual: () => void;
  onResetSessions: () => void;
  onRestoreSeed: () => void;
}

export function GrowthDashboard({
  sessions,
  metrics,
  levelProgress,
  onStartScenario,
  onBackToLobby,
  onOpenRankScenarios,
  onOpenManual,
  onResetSessions,
  onRestoreSeed,
}: GrowthDashboardProps) {
  const [facilityFilter, setFacilityFilter] = useState<'all' | FacilityCategory>('all');
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    sessions.length > 0 ? sessions[sessions.length - 1].id : null
  );
  const [confirmReset, setConfirmReset] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [menuOpen]);

  const sortedSessions = useMemo(
    () =>
      [...sessions].sort(
        (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
      ),
    [sessions]
  );

  const filteredSessions = useMemo(() => {
    if (facilityFilter === 'all') return sortedSessions;
    return sortedSessions.filter(
      (s) => getScenarioById(s.scenarioId).facility === facilityFilter
    );
  }, [sortedSessions, facilityFilter]);

  const activeSession = useMemo(() => {
    if (filteredSessions.length === 0) return null;
    return (
      filteredSessions.find((s) => s.id === selectedSessionId) ?? filteredSessions[0]
    );
  }, [filteredSessions, selectedSessionId]);

  const recommendedScenario = useMemo(() => {
    const unattempted = SCENARIOS.find(
      (sc) => metrics.scenarioBestScores[sc.id]?.attempts === 0
    );
    if (unattempted) return unattempted;
    return [...SCENARIOS].sort(
      (a, b) =>
        (metrics.scenarioBestScores[a.id]?.bestScore ?? 0) -
        (metrics.scenarioBestScores[b.id]?.bestScore ?? 0)
    )[0];
  }, [metrics]);

  const trendChart = useMemo(() => {
    const pts = metrics.trend;
    const width = 460;
    const height = 190;
    const padX = 36;
    const padY = 24;
    const plotW = width - padX * 2;
    const plotH = height - padY * 2;

    if (pts.length === 0) return { width, height, padX, padY, points: [], polyline: '', area: '' };

    const coords = pts.map((p, idx) => {
      const x =
        pts.length === 1
          ? padX + plotW / 2
          : padX + (idx / (pts.length - 1)) * plotW;
      const y = padY + plotH - (p.score / 100) * plotH;
      return { ...p, x, y };
    });

    const polyline = coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
    const area =
      coords.length > 1
        ? `${coords[0].x.toFixed(1)},${(padY + plotH).toFixed(1)} ${polyline} ${coords[coords.length - 1].x.toFixed(1)},${(padY + plotH).toFixed(1)}`
        : '';

    return { width, height, padX, padY, plotH, points: coords, polyline, area };
  }, [metrics.trend]);

  const sortedCompetencies = useMemo(() => {
    return [...COMPETENCY_KEYS]
      .map((key) => ({
        key,
        label: COMPETENCY_LABELS[key],
        description: COMPETENCY_DESCRIPTIONS[key],
        score: metrics.averageCompetencies[key],
      }))
      .sort((a, b) => b.score - a.score);
  }, [metrics.averageCompetencies]);

  return (
    <div className="min-h-screen bg-[#F1F2F3] text-[#0B162C]">
      {/* Minimal Top-Right 3-Line Menu Trigger */}
      {!menuOpen && (
        <button
          type="button"
          aria-label="메뉴 열기"
          aria-expanded={false}
          aria-controls="dashboard-navigation-drawer"
          onClick={() => setMenuOpen(true)}
          className="fixed top-5 right-6 z-40 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[#DFE2E7] bg-white text-[#0B162C] shadow-[0_6px_18px_-8px_rgba(11,22,44,0.18)] transition-colors hover:border-[#0052FF] hover:text-[#0052FF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0052FF]"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>
      )}

      {/* Slide-Over Navigation Drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            aria-hidden="true"
            onClick={() => setMenuOpen(false)}
            className="fixed inset-0 bg-[#0B162C]/35 backdrop-blur-[2px] transition-opacity"
          />

          <aside
            id="dashboard-navigation-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="앱 전체 메뉴"
            className="relative z-10 flex h-full w-full max-w-[320px] flex-col justify-between border-l border-[#DFE2E7] bg-white p-6 shadow-2xl"
          >
            <div>
              <div className="flex items-start justify-between gap-4 border-b border-[#E5E8EC] pb-5">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onBackToLobby();
                  }}
                  className="text-left font-display text-lg font-bold leading-snug tracking-tight text-[#0B162C] transition-colors hover:text-[#0052FF]"
                >
                  호텔사원 진상 대응 매뉴얼 훈련
                </button>
                <button
                  type="button"
                  aria-label="메뉴 닫기"
                  onClick={() => setMenuOpen(false)}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[#64748B] transition-colors hover:bg-[#F1F2F3] hover:text-[#0B162C]"
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>

              {/* Recommended Scenario CTA */}
              <div className="mt-5">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onStartScenario(recommendedScenario.id);
                  }}
                  className="flex w-full items-center justify-between gap-3 rounded-xl bg-[#0052FF] px-4 py-3.5 text-left text-white transition-colors hover:bg-[#0041CC] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0052FF]"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-bold">추천 시나리오 훈련</p>
                    <p className="mt-0.5 truncate text-[11px] font-medium text-white/80">
                      {recommendedScenario.title}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-white/90" aria-hidden="true" />
                </button>
              </div>

              {/* Navigation Links */}
              <nav aria-label="주요 메뉴" className="mt-6 flex flex-col gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onBackToLobby();
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold text-[#334155] transition-colors hover:bg-[#F1F2F3] hover:text-[#0B162C]"
                >
                  <LayoutGrid className="h-4 w-4 shrink-0" aria-hidden="true" />
                  실전 시나리오
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onOpenRankScenarios();
                  }}
                  className="flex w-full items-center justify-between gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold text-[#334155] transition-colors hover:bg-[#F1F2F3] hover:text-[#0B162C]"
                >
                  <span className="inline-flex items-center gap-3">
                    <Award className="h-4 w-4 shrink-0" aria-hidden="true" />
                    직급별 상황
                  </span>
                  <span className="font-mono text-xs font-semibold opacity-75 tabular-nums">
                    {metrics.facilityStats.rank.totalScenarios}개
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  className="flex w-full items-center gap-3 rounded-xl bg-[#EEF4FF] px-4 py-3 text-left text-sm font-semibold text-[#0052FF]"
                >
                  <TrendingUp className="h-4 w-4 shrink-0" aria-hidden="true" />
                  성장 리포트
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onOpenManual();
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold text-[#334155] transition-colors hover:bg-[#F1F2F3] hover:text-[#0B162C]"
                >
                  <BookOpen className="h-4 w-4 shrink-0" aria-hidden="true" />
                  호텔 응대 매뉴얼
                </button>
              </nav>
            </div>

            <div className="border-t border-[#E5E8EC] pt-4 text-xs text-[#64748B] tabular-nums">
              Lv.{levelProgress.level} {levelProgress.title} · 누적 {levelProgress.currentXp} XP
            </div>
          </aside>
        </div>
      )}

      <main className="mx-auto max-w-[1320px] px-6 pt-16 pb-10 space-y-10">
        {/* Page Header */}
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#E2E8F0] pb-6">
          <div>
            <p className="text-xs font-semibold text-[#0052FF]">
              AIVON AI EDUCATION PLATFORM · 신입사원 역량 성장 리포트
            </p>
            <h1 className="mt-1.5 text-3xl font-extrabold text-[#0B162C]">
              컴플레인 대응 역량 분석 대시보드
            </h1>
            <p className="mt-2 text-sm text-[#475569]">
              누적 시뮬레이션 결과를 바탕으로 강점 영역과 매뉴얼 보완 과제를 체계적으로 진단합니다.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {sessions.length === 0 ? (
              <button
                type="button"
                onClick={onRestoreSeed}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#CBD5E1] bg-white px-3.5 py-2 text-xs font-medium text-[#334155] hover:bg-[#F8FAFC] whitespace-nowrap shrink-0"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                샘플 기록 복원
              </button>
            ) : confirmReset ? (
              <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs">
                <span className="font-medium text-rose-700">모든 기록을 삭제할까요?</span>
                <button
                  type="button"
                  onClick={() => {
                    onResetSessions();
                    setConfirmReset(false);
                    setSelectedSessionId(null);
                  }}
                  className="font-semibold text-rose-700 underline whitespace-nowrap shrink-0"
                >
                  삭제
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmReset(false)}
                  className="text-[#475569] hover:text-[#0B162C] whitespace-nowrap shrink-0"
                >
                  취소
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-white px-3.5 py-2 text-xs font-medium text-[#64748B] transition-colors hover:border-[#CBD5E1] hover:text-[#0B162C] whitespace-nowrap shrink-0"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                기록 초기화
              </button>
            )}
          </div>
        </div>

        {/* Empty State */}
        {sessions.length === 0 ? (
          <section className="rounded-xl border border-[#E2E8F0] bg-white px-8 py-16 text-center">
            <h2 className="text-xl font-bold text-[#0B162C]">
              아직 완료된 훈련 시뮬레이션 기록이 없습니다
            </h2>
            <p className="mt-2 text-sm text-[#475569]">
              객실·F&amp;B·조리·컨벤션·수영장 1인칭 시뮬레이션을 완료하면 5대 핵심 역량 레이더 차트와 맞춤형 성장 피드백이 생성됩니다.
            </p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => onStartScenario('double-checkin')}
                className="rounded-lg bg-[#0052FF] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0041CC]"
              >
                첫 시뮬레이션 시작하기
              </button>
              <button
                type="button"
                onClick={onRestoreSeed}
                className="rounded-lg border border-[#CBD5E1] bg-white px-5 py-2.5 text-sm font-medium text-[#334155] hover:bg-[#F8FAFC]"
              >
                오리엔테이션 샘플 보기
              </button>
            </div>
          </section>
        ) : (
          <>
            {/* 4-Column KPI Overview Strip */}
            <section
              aria-label="핵심 성장 지표"
              className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
            >
              <div className="rounded-xl border border-[#E2E8F0] bg-white p-5">
                <div className="flex items-center justify-between text-xs font-medium text-[#64748B]">
                  <span>현재 호텔리어 직급</span>
                  <Award className="h-4 w-4 text-[#0052FF]" aria-hidden="true" />
                </div>
                <p className="mt-2 text-xl font-bold text-[#0B162C]">
                  Lv.{levelProgress.level} {levelProgress.title}
                </p>
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[#E2E8F0]">
                  <div
                    className="h-full bg-[#0052FF]"
                    style={{ width: `${levelProgress.progressPercent}%` }}
                  />
                </div>
                <p className="mt-2 font-mono text-xs text-[#64748B] tabular-nums">
                  {levelProgress.currentXp} XP ·{' '}
                  {levelProgress.isMaxLevel
                    ? '최고 직급 달성'
                    : `승급까지 ${levelProgress.xpForNextLevel} XP`}
                </p>
              </div>

              <div className="rounded-xl border border-[#E2E8F0] bg-white p-5">
                <p className="text-xs font-medium text-[#64748B]">누적 평균 점수</p>
                <p className="mt-2 font-mono text-3xl font-bold text-[#0B162C] tabular-nums">
                  {metrics.averageScore}
                  <span className="ml-1 text-base font-normal text-[#64748B]">/ 100</span>
                </p>
                <p className="mt-3 text-xs font-semibold text-[#0052FF]">
                  평균 평가 등급 {calculateGrade(metrics.averageScore)} · 총 {metrics.totalSessions}회 완료
                </p>
              </div>

              <div className="rounded-xl border border-[#E2E8F0] bg-white p-5">
                <p className="text-xs font-medium text-[#64748B]">컴플레인 해결 성공률</p>
                <p className="mt-2 font-mono text-3xl font-bold text-emerald-600 tabular-nums">
                  {metrics.resolutionRate}%
                </p>
                <p className="mt-3 text-xs text-[#64748B] tabular-nums">
                  총 {metrics.totalSessions}건 중 {metrics.resolvedCount}건 현장 해결 완료
                </p>
              </div>

              <div className="rounded-xl border border-[#E2E8F0] bg-white p-5">
                <p className="text-xs font-medium text-[#64748B]">최우수 · 집중 개선 역량</p>
                <p className="mt-2 text-sm font-semibold text-emerald-700 tabular-nums">
                  강점: {metrics.strongestCompetency.label} ({metrics.strongestCompetency.score}점)
                </p>
                <p className="mt-1.5 text-sm font-semibold text-amber-700 tabular-nums">
                  보완: {metrics.weakestCompetency.label} ({metrics.weakestCompetency.score}점)
                </p>
                <p className="mt-2 text-xs text-[#64748B]">
                  다음 추천: {recommendedScenario.shortTitle}
                </p>
              </div>
            </section>

            {/* Charts 2-Column Row */}
            <section className="grid grid-cols-1 gap-6 lg:grid-cols-2 items-stretch">
              {/* Left: 5-Axis Competency Radar */}
              <div className="flex flex-col justify-between rounded-xl border border-[#E2E8F0] bg-white p-6">
                <div>
                  <h2 className="text-lg font-bold text-[#0B162C]">
                    5대 핵심 응대 역량 분포
                  </h2>
                  <p className="mt-1 text-xs text-[#64748B]">
                    5성급 호텔 CS 기준(85점) 대비 현재 역량 밸런스를 한눈에 확인하세요.
                  </p>
                </div>

                <div className="my-4">
                  <CompetencyRadarChart scores={metrics.averageCompetencies} />
                </div>

                <div className="grid grid-cols-5 gap-2 border-t border-[#E2E8F0] pt-4 text-center">
                  {COMPETENCY_KEYS.map((key) => (
                    <div key={key}>
                      <p className="text-[11px] text-[#64748B]">{COMPETENCY_LABELS[key]}</p>
                      <p className="mt-0.5 font-mono text-sm font-bold text-[#0B162C] tabular-nums">
                        {metrics.averageCompetencies[key]}점
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: Score Growth Trend Line + Strength/Weakness Diagnostics */}
              <div className="flex flex-col justify-between rounded-xl border border-[#E2E8F0] bg-white p-6 space-y-6">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h2 className="text-lg font-bold text-[#0B162C]">
                        회차별 종합 점수 성장 추이
                      </h2>
                      <p className="mt-1 text-xs text-[#64748B]">
                        최근 {metrics.trend.length}회 훈련의 종합 매뉴얼 준수 점수 변화
                      </p>
                    </div>
                    <span className="font-mono text-xs font-semibold text-[#0052FF] tabular-nums">
                      목표선 85점
                    </span>
                  </div>

                  <div className="mt-4">
                    <svg
                      viewBox={`0 0 ${trendChart.width} ${trendChart.height}`}
                      className="w-full h-auto"
                      role="img"
                      aria-label="회차별 점수 성장 추이 차트"
                    >
                      {[25, 50, 75, 100].map((tick) => {
                        const y =
                          trendChart.padY +
                          (trendChart.plotH ?? 142) -
                          (tick / 100) * (trendChart.plotH ?? 142);
                        return (
                          <g key={tick}>
                            <line
                              x1={trendChart.padX}
                              y1={y}
                              x2={trendChart.width - trendChart.padX}
                              y2={y}
                              stroke="#E2E8F0"
                              strokeWidth="1"
                            />
                            <text
                              x={trendChart.padX - 8}
                              y={y + 3}
                              textAnchor="end"
                              fill="#64748B"
                              fontSize="10"
                              fontFamily="JetBrains Mono, monospace"
                            >
                              {tick}
                            </text>
                          </g>
                        );
                      })}

                      {/* Target 85 line */}
                      <line
                        x1={trendChart.padX}
                        y1={
                          trendChart.padY +
                          (trendChart.plotH ?? 142) -
                          0.85 * (trendChart.plotH ?? 142)
                        }
                        x2={trendChart.width - trendChart.padX}
                        y2={
                          trendChart.padY +
                          (trendChart.plotH ?? 142) -
                          0.85 * (trendChart.plotH ?? 142)
                        }
                        stroke="rgba(0, 82, 255, 0.4)"
                        strokeDasharray="4 4"
                        strokeWidth="1.2"
                      />

                      {trendChart.area && (
                        <polygon points={trendChart.area} fill="rgba(0, 82, 255, 0.1)" />
                      )}

                      {trendChart.polyline && (
                        <polyline
                          points={trendChart.polyline}
                          fill="none"
                          stroke="#0052FF"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      )}

                      {trendChart.points.map((pt, i) => (
                        <g key={i}>
                          <circle
                            cx={pt.x}
                            cy={pt.y}
                            r="4.5"
                            fill="#FFFFFF"
                            stroke="#0052FF"
                            strokeWidth="2.2"
                          />
                          <text
                            x={pt.x}
                            y={pt.y - 10}
                            textAnchor="middle"
                            fill="#0B162C"
                            fontSize="10.5"
                            fontFamily="JetBrains Mono, monospace"
                            fontWeight="700"
                          >
                            {pt.score}점 ({pt.grade})
                          </text>
                          <text
                            x={pt.x}
                            y={trendChart.height - 6}
                            textAnchor="middle"
                            fill="#64748B"
                            fontSize="10"
                          >
                            {pt.label}
                          </text>
                        </g>
                      ))}
                    </svg>
                  </div>
                </div>

                {/* Systematic Competency Diagnosis */}
                <div className="grid grid-cols-1 gap-4 border-t border-[#E2E8F0] pt-5 sm:grid-cols-2">
                  <div>
                    <h3 className="text-xs font-bold text-emerald-700">
                      잘 대처하고 있는 강점 역량
                    </h3>
                    <div className="mt-2.5 space-y-2.5">
                      {sortedCompetencies.slice(0, 2).map((item) => (
                        <div key={item.key} className="text-xs leading-relaxed">
                          <p className="font-semibold text-[#0B162C] tabular-nums">
                            {item.label} · 평균 {item.score}점
                          </p>
                          <p className="mt-0.5 text-[#64748B]">{item.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-bold text-amber-700">
                      집중 보완이 필요한 역량
                    </h3>
                    <div className="mt-2.5 space-y-2.5">
                      {sortedCompetencies.slice(-2).reverse().map((item) => (
                        <div key={item.key} className="text-xs leading-relaxed">
                          <p className="font-semibold text-[#0B162C] tabular-nums">
                            {item.label} · 평균 {item.score}점
                          </p>
                          <p className="mt-0.5 text-[#64748B]">{item.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* 5-Facility Mastery Matrix */}
            <section>
              <div className="flex items-end justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-[#0B162C]">
                    시설별 · 직급별 마스터리 현황
                  </h2>
                  <p className="mt-1 text-xs text-[#64748B]">
                    호텔 주요 시설 및 직급별 상황 중 미도전 영역이나 점수가 낮은 카테고리를 선택해 집중 훈련하세요.
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                {FACILITY_CATEGORIES.map((fac) => {
                  const st = metrics.facilityStats[fac.id];
                  const facScenarios = SCENARIOS.filter((s) => s.facility === fac.id);
                  const nextTarget =
                    facScenarios.find(
                      (s) => (metrics.scenarioBestScores[s.id]?.attempts ?? 0) === 0
                    ) ??
                    [...facScenarios].sort(
                      (a, b) =>
                        (metrics.scenarioBestScores[a.id]?.bestScore ?? 0) -
                        (metrics.scenarioBestScores[b.id]?.bestScore ?? 0)
                    )[0];

                  return (
                    <div
                      key={fac.id}
                      className="flex flex-col justify-between rounded-xl border border-[#E2E8F0] bg-white p-5"
                    >
                      <div>
                        <p className="text-xs text-[#64748B]">{fac.staffRole}</p>
                        <h3 className="mt-1 text-base font-bold text-[#0B162C]">
                          {fac.label}
                        </h3>
                        <p className="mt-3 font-mono text-2xl font-bold text-[#0052FF] tabular-nums">
                          {st.attempts > 0 ? `${st.averageScore}점` : '—'}
                        </p>
                        <p className="mt-1 text-xs text-[#64748B] tabular-nums">
                          해결 {st.clearedScenarios} / {st.totalScenarios} · 도전 {st.attempts}회
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => nextTarget && onStartScenario(nextTarget.id)}
                        className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] px-3.5 py-2 text-xs font-semibold text-[#0B162C] transition-colors hover:border-[#0052FF] hover:bg-[#EEF4FF] hover:text-[#0052FF] whitespace-nowrap shrink-0"
                      >
                        {st.attempts > 0 ? '재훈련 시작' : '훈련 시작'}
                        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Training History & Detailed Feedback Inspector */}
            <section className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-[#0B162C]">
                    훈련 세션 상세 리포트 및 대화 복기
                  </h2>
                  <p className="mt-1 text-xs text-[#64748B]">
                    각 회차를 클릭하면 AI 평가관의 상세 피드백과 모범 응대 예시, 전체 녹취록을 확인할 수 있습니다.
                  </p>
                </div>

                {/* Facility Category Filter Segmented Control */}
                <div className="flex flex-wrap items-center gap-1 rounded-lg border border-[#E2E8F0] bg-[#EEF2F7] p-1">
                  <button
                    type="button"
                    onClick={() => setFacilityFilter('all')}
                    className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                      facilityFilter === 'all'
                        ? 'bg-[#0052FF] text-white'
                        : 'text-[#475569] hover:text-[#0B162C]'
                    }`}
                  >
                    전체 ({sessions.length})
                  </button>
                  {FACILITY_CATEGORIES.map((fac) => {
                    const count = sessions.filter(
                      (s) => getScenarioById(s.scenarioId).facility === fac.id
                    ).length;
                    return (
                      <button
                        key={fac.id}
                        type="button"
                        onClick={() => setFacilityFilter(fac.id)}
                        className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                          facilityFilter === fac.id
                            ? 'bg-[#0052FF] text-white'
                            : 'text-[#475569] hover:text-[#0B162C]'
                        }`}
                      >
                        {fac.shortLabel} ({count})
                      </button>
                    );
                  })}
                </div>
              </div>

              {filteredSessions.length === 0 ? (
                <div className="rounded-xl border border-[#E2E8F0] bg-white p-8 text-center text-sm text-[#64748B]">
                  선택한 시설의 완료 기록이 아직 없습니다.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
                  {/* Left: Session List */}
                  <div className="lg:col-span-5 space-y-2.5">
                    {filteredSessions.map((session) => {
                      const isSelected = activeSession?.id === session.id;
                      const sessionFacility = getFacilityMeta(
                        getScenarioById(session.scenarioId).facility
                      );
                      const dateStr = new Date(session.completedAt).toLocaleDateString('ko-KR', {
                        month: 'short',
                        day: 'numeric',
                      });

                      return (
                        <button
                          key={session.id}
                          type="button"
                          onClick={() => setSelectedSessionId(session.id)}
                          className={`w-full rounded-xl border p-4 text-left transition-colors ${
                            isSelected
                              ? 'border-[#0052FF] bg-[#EEF4FF]/70'
                              : 'border-[#E2E8F0] bg-white hover:border-[#CBD5E1]'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-xs text-[#64748B]">
                                {sessionFacility.shortLabel} · {dateStr} ·{' '}
                                {session.mode === 'real' ? '실전 모드' : '연습 모드'} ·{' '}
                                {session.guestName} 고객 ·{' '}
                                {session.misconductFailed
                                  ? '대응 실패'
                                  : session.outcome === 'resolved'
                                    ? '해결 완료'
                                    : '에스컬레이션'}
                                {session.isSeed ? ' · 오리엔테이션 샘플' : ''}
                              </p>
                              <h3 className="mt-1 truncate text-sm font-bold text-[#0B162C]">
                                {session.scenarioTitle}
                              </h3>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="font-mono text-lg font-bold text-[#0052FF] tabular-nums">
                                {session.grade}
                              </span>
                              <p className="font-mono text-xs text-[#475569] tabular-nums">
                                {session.overallScore}점
                              </p>
                            </div>
                          </div>
                          <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-[#64748B]">
                            {session.summary}
                          </p>
                        </button>
                      );
                    })}
                  </div>

                  {/* Right: Selected Session Inspector */}
                  {activeSession && (
                    <div className="lg:col-span-7 rounded-xl border border-[#E2E8F0] bg-white p-6 space-y-6">
                      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#E2E8F0] pb-5">
                        <div>
                          <p className="text-xs font-semibold text-[#0052FF]">
                            {getFacilityMeta(getScenarioById(activeSession.scenarioId).facility).label} ·{' '}
                            {activeSession.mode === 'real' ? '실전 모드 · 무힌트' : '연습 모드'} ·{' '}
                            {activeSession.guestName} 고객 · {activeSession.turnCount}턴 진행 · 최종 만족도{' '}
                            {activeSession.finalSatisfaction}%
                          </p>
                          <h3 className="mt-1 text-xl font-bold text-[#0B162C]">
                            {activeSession.scenarioTitle}
                          </h3>
                          <p className="mt-2 text-sm leading-relaxed text-[#334155]">
                            {activeSession.summary}
                          </p>
                        </div>
                        <div className="text-right font-mono tabular-nums">
                          <p className="text-3xl font-bold text-[#0052FF]">
                            {activeSession.grade}
                          </p>
                          <p className="text-xs text-[#64748B]">
                            {activeSession.overallScore}점 · +{activeSession.xpEarned} XP
                          </p>
                        </div>
                      </div>

                      {/* Strengths & Weaknesses */}
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4">
                          <h4 className="text-xs font-bold text-emerald-700">잘한 점</h4>
                          <ul className="mt-2.5 space-y-2 text-xs leading-relaxed text-[#1E293B]">
                            {activeSession.strengths.map((s, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <CheckCircle2
                                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600"
                                  aria-hidden="true"
                                />
                                <span>{s}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4">
                          <h4 className="text-xs font-bold text-amber-700">부족한 점 및 개선점</h4>
                          <ul className="mt-2.5 space-y-2 text-xs leading-relaxed text-[#1E293B]">
                            {activeSession.weaknesses.map((w, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <XCircle
                                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600"
                                  aria-hidden="true"
                                />
                                <span>{w}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {/* Model Response */}
                      <div className="rounded-lg border border-[#BFDBFE] bg-[#EEF4FF]/60 p-4">
                        <h4 className="text-xs font-bold text-[#0052FF]">
                          5성급 호텔리어 모범 응대 예시
                        </h4>
                        <p className="mt-2 text-sm leading-relaxed text-[#0B162C]">
                          “{activeSession.modelResponse}”
                        </p>
                      </div>

                      {/* Dialogue Transcript */}
                      {activeSession.transcript.length > 0 && (
                        <div>
                          <h4 className="text-xs font-bold text-[#64748B]">
                            전체 대화 복기 ({activeSession.transcript.length}건)
                          </h4>
                          <div className="mt-3 max-h-72 overflow-y-auto space-y-2.5 pr-1">
                            {activeSession.transcript.map((turn) => (
                              <div
                                key={turn.id}
                                className={`rounded-lg border px-3.5 py-2.5 text-xs leading-relaxed ${
                                  turn.speaker === 'guest'
                                    ? 'border-[#E2E8F0] bg-[#F8FAFC] text-[#1E293B]'
                                    : 'border-[#BFDBFE] bg-[#EEF4FF]/50 text-[#0B162C]'
                                }`}
                              >
                                <div className="mb-1 flex items-center justify-between text-[11px] text-[#64748B]">
                                  <span
                                    className={`font-semibold ${
                                      turn.speaker === 'guest' ? 'text-[#0B162C]' : 'text-[#0052FF]'
                                    }`}
                                  >
                                    {turn.speaker === 'guest'
                                      ? `${activeSession.guestName} 고객`
                                      : '신입사원 응대'}
                                  </span>
                                  <span className="font-mono tabular-nums">
                                    {turn.timestamp}
                                  </span>
                                </div>
                                <p>{turn.text}</p>
                                {turn.coachingNote && (
                                  <p className="mt-1.5 border-t border-[#E2E8F0] pt-1.5 text-[11px] font-medium text-[#0052FF]">
                                    코칭: {turn.coachingNote}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
