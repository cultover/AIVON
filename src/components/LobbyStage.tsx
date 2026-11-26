import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Award,
  BedDouble,
  BookOpen,
  ChefHat,
  Home,
  LayoutGrid,
  Menu,
  Presentation,
  TrendingUp,
  UtensilsCrossed,
  Waves,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { FACILITY_CATEGORY_IMAGES, GUEST_SCENE_IMAGES } from '../data/guestVisuals';
import {
  FACILITY_CATEGORIES,
  getFacilityMeta,
  getScenarioById,
  SCENARIOS,
} from '../data/hotelManual';
import type {
  FacilityCategory,
  GrowthMetrics,
  LevelProgress,
  ScenarioId,
  TrainingMode,
} from '../types';

const FACILITY_ICONS: Record<FacilityCategory, LucideIcon> = {
  rooms: BedDouble,
  fnb: UtensilsCrossed,
  culinary: ChefHat,
  convention: Presentation,
  pool: Waves,
  rank: Award,
};

interface LobbyStageProps {
  levelProgress: LevelProgress;
  metrics: GrowthMetrics;
  selectedFacility: FacilityCategory | null;
  selectedScenarioId: ScenarioId;
  trainingMode: TrainingMode;
  onChangeMode: (mode: TrainingMode) => void;
  onSelectFacility: (facility: FacilityCategory | null) => void;
  onSelectScenario: (id: ScenarioId) => void;
  onStartScenario: (id: ScenarioId, mode?: TrainingMode) => void;
  onBackToHome: () => void;
  onOpenDashboard: () => void;
  onOpenManual: () => void;
}

export function LobbyStage({
  levelProgress,
  metrics,
  selectedFacility,
  selectedScenarioId,
  trainingMode,
  onChangeMode,
  onSelectFacility,
  onSelectScenario,
  onStartScenario,
  onBackToHome,
  onOpenDashboard,
  onOpenManual,
}: LobbyStageProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const filteredScenarios = useMemo(
    () => (selectedFacility ? SCENARIOS.filter((s) => s.facility === selectedFacility) : []),
    [selectedFacility]
  );

  const activeFacilityMeta = selectedFacility ? getFacilityMeta(selectedFacility) : null;
  const activeFacilityStat = selectedFacility ? metrics.facilityStats[selectedFacility] : null;

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

  function handleChooseCategory(facilityId: FacilityCategory) {
    onSelectFacility(facilityId);
    const currentFacility = getScenarioById(selectedScenarioId).facility;
    if (currentFacility !== facilityId) {
      const firstScenario = SCENARIOS.find((s) => s.facility === facilityId);
      if (firstScenario) {
        onSelectScenario(firstScenario.id);
      }
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <div className="min-h-screen bg-[#F1F2F3] text-[#0B162C]">
      {/* Minimal Top-Right 3-Line Menu Trigger */}
      {!menuOpen && (
        <button
          type="button"
          aria-label="메뉴 열기"
          aria-expanded={false}
          aria-controls="app-navigation-drawer"
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
            id="app-navigation-drawer"
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
                    onBackToHome();
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

              {/* Current Rank Button */}
              <div className="mt-5">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onOpenDashboard();
                  }}
                  className="flex w-full items-center justify-between rounded-xl bg-[#0052FF] px-4 py-3.5 text-left text-white transition-colors hover:bg-[#0041CC] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0052FF]"
                >
                  <div>
                    <p className="text-[11px] font-medium text-white/80">현재 사원 직급</p>
                    <p className="mt-0.5 text-sm font-bold">
                      Lv.{levelProgress.level} {levelProgress.title}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-white/90" aria-hidden="true" />
                </button>
              </div>

              {/* Primary Navigation List */}
              <nav aria-label="주요 메뉴" className="mt-6 flex flex-col gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onSelectFacility(null);
                  }}
                  className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold transition-colors ${
                    selectedFacility === null
                      ? 'bg-[#EEF4FF] text-[#0052FF]'
                      : 'text-[#334155] hover:bg-[#F1F2F3] hover:text-[#0B162C]'
                  }`}
                >
                  <LayoutGrid className="h-4 w-4 shrink-0" aria-hidden="true" />
                  카테고리 선택
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    handleChooseCategory('rank');
                  }}
                  className={`flex w-full items-center justify-between gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold transition-colors ${
                    selectedFacility === 'rank'
                      ? 'bg-[#EEF4FF] text-[#0052FF]'
                      : 'text-[#334155] hover:bg-[#F1F2F3] hover:text-[#0B162C]'
                  }`}
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
                  onClick={() => {
                    setMenuOpen(false);
                    onOpenDashboard();
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold text-[#334155] transition-colors hover:bg-[#F1F2F3] hover:text-[#0B162C]"
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

                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onBackToHome();
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold text-[#334155] transition-colors hover:bg-[#F1F2F3] hover:text-[#0B162C]"
                >
                  <Home className="h-4 w-4 shrink-0" aria-hidden="true" />
                  처음 화면
                </button>
              </nav>
            </div>

            <div className="border-t border-[#E5E8EC] pt-4 text-xs text-[#64748B] tabular-nums">
              누적 {levelProgress.currentXp} XP · 평균 {metrics.averageScore}점
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <main
        id="scenarios"
        className={`mx-auto max-w-[1280px] px-6 pb-10 ${
          selectedFacility === null ? 'pt-16 sm:pt-11' : 'pt-16'
        }`}
      >
        {selectedFacility === null ? (
          /* Step 1: Dedicated 5-Facility Category Selection Screen (3 + 2 Centered Layout) */
          <section aria-labelledby="category-picker-heading">
            <h1
              id="category-picker-heading"
              className="text-center text-xl font-bold tracking-tight text-[#0B162C] sm:text-2xl text-balance"
            >
              훈련할 호텔 시설 5개 중 하나를 선택해 주세요.
            </h1>

            <div className="mt-8 flex flex-wrap justify-center gap-5">
              {FACILITY_CATEGORIES.filter((cat) => cat.id !== 'rank').map((cat) => {
                const Icon = FACILITY_ICONS[cat.id];
                const stat = metrics.facilityStats[cat.id];
                const previewAsset = FACILITY_CATEGORY_IMAGES[cat.id];

                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleChooseCategory(cat.id)}
                    className="group flex w-full flex-col overflow-hidden rounded-2xl border border-[#DFE2E7] bg-white text-left transition-all duration-150 hover:-translate-y-0.5 hover:border-[#0052FF] hover:shadow-[0_14px_30px_-16px_rgba(11,22,44,0.2)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0052FF] sm:w-[calc(50%-10px)] lg:w-[calc(33.333%-14px)]"
                  >
                    <div className="relative h-40 w-full overflow-hidden bg-[#0B162C]">
                      <img
                        src={previewAsset.src}
                        alt={`${cat.label} 대표 공간`}
                        referrerPolicy="no-referrer"
                        style={{ objectPosition: previewAsset.objectPosition }}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0B162C]/80 via-[#0B162C]/15 to-transparent" />
                      <div className="absolute bottom-3 left-5 right-5 flex items-center justify-between text-xs text-white">
                        <span className="inline-flex items-center gap-1.5 font-semibold">
                          <Icon className="h-4 w-4 text-[#93C5FD]" aria-hidden="true" />
                          {cat.staffRole}
                        </span>
                        <span className="font-mono font-semibold text-[#93C5FD] tabular-nums">
                          {stat.totalScenarios}개 시나리오
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-1 flex-col justify-between p-5">
                      <div>
                        <h2 className="text-lg font-bold text-[#0B162C] transition-colors group-hover:text-[#0052FF]">
                          {cat.label}
                        </h2>
                        <p className="mt-1.5 text-sm leading-relaxed text-[#475569]">
                          {cat.description}
                        </p>
                      </div>

                      <div className="mt-4 flex items-center justify-between border-t border-[#E5E8EC] pt-3.5 text-xs">
                        <span className="font-medium text-[#64748B] tabular-nums">
                          해결 {stat.clearedScenarios} / {stat.totalScenarios}
                          {stat.attempts > 0 ? ` · 평균 ${stat.averageScore}점` : ''}
                        </span>
                        <span className="inline-flex items-center gap-1 font-semibold text-[#0052FF] transition-transform duration-150 group-hover:translate-x-0.5">
                          선택하기
                          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        ) : (
          /* Step 2: Scenarios within the Selected Category */
          <section aria-labelledby="selected-category-heading">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => onSelectFacility(null)}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#475569] transition-colors hover:text-[#0052FF]"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                시설 카테고리 다시 선택
              </button>

              {/* Compact Practice vs Real Mode Switch */}
              <div
                role="group"
                aria-label="훈련 모드 선택"
                className="inline-flex items-center gap-1 rounded-lg border border-[#DFE2E7] bg-white p-1"
              >
                <button
                  type="button"
                  aria-pressed={trainingMode === 'practice'}
                  onClick={() => onChangeMode('practice')}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    trainingMode === 'practice'
                      ? 'bg-[#0052FF] text-white'
                      : 'text-[#475569] hover:text-[#0B162C]'
                  }`}
                >
                  연습 모드 · 힌트 제공
                </button>
                <button
                  type="button"
                  aria-pressed={trainingMode === 'real'}
                  onClick={() => onChangeMode('real')}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    trainingMode === 'real'
                      ? 'bg-[#0B162C] text-white'
                      : 'text-[#475569] hover:text-[#0B162C]'
                  }`}
                >
                  실전 모드 · 무힌트 · XP +25%
                </button>
              </div>
            </div>

            {/* Quick 5-Facility Switcher Strip (hidden when viewing Rank Situations from drawer) */}
            {selectedFacility !== 'rank' && (
              <div
                role="tablist"
                aria-label="호텔 시설 카테고리 전환"
                className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5"
              >
                {FACILITY_CATEGORIES.filter((cat) => cat.id !== 'rank').map((cat) => {
                  const Icon = FACILITY_ICONS[cat.id];
                  const stat = metrics.facilityStats[cat.id];
                  const isActive = selectedFacility === cat.id;

                  return (
                    <button
                      key={cat.id}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => handleChooseCategory(cat.id)}
                      className={`flex items-center justify-between gap-2 rounded-xl border px-3.5 py-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0052FF] ${
                        isActive
                          ? 'border-[#0052FF] bg-[#EEF4FF] text-[#0B162C]'
                          : 'border-[#E2E8F0] bg-white text-[#475569] hover:border-[#CBD5E1] hover:text-[#0B162C]'
                      }`}
                    >
                      <span className="inline-flex min-w-0 items-center gap-2">
                        <Icon
                          className={`h-4 w-4 shrink-0 ${isActive ? 'text-[#0052FF]' : 'text-[#64748B]'}`}
                          aria-hidden="true"
                        />
                        <span className="truncate text-xs font-bold">{cat.label}</span>
                      </span>
                      <span
                        className={`font-mono text-[11px] font-semibold tabular-nums shrink-0 ${
                          isActive ? 'text-[#0052FF]' : 'text-[#64748B]'
                        }`}
                      >
                        {stat.totalScenarios}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {activeFacilityMeta && activeFacilityStat && (
              <div className="mt-6 flex flex-wrap items-end justify-between gap-3 border-b border-[#DFE2E7] pb-5">
                <div>
                  <h1
                    id="selected-category-heading"
                    className="text-2xl font-extrabold text-[#0B162C]"
                  >
                    {activeFacilityMeta.label}
                  </h1>
                  <p className="mt-1.5 text-sm text-[#475569]">
                    {activeFacilityMeta.description}
                  </p>
                </div>
                <p className="text-xs font-medium text-[#64748B] tabular-nums">
                  담당: {activeFacilityMeta.staffRole} · {activeFacilityStat.totalScenarios}개 시나리오 중{' '}
                  {activeFacilityStat.clearedScenarios}개 해결
                </p>
              </div>
            )}

            <div
              role="tabpanel"
              aria-label={`${activeFacilityMeta?.label ?? ''} 시나리오 목록`}
              className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2"
            >
              {filteredScenarios.map((scenario) => {
                const record = metrics.scenarioBestScores[scenario.id];
                const isSelected = selectedScenarioId === scenario.id;
                const facilityMeta = getFacilityMeta(scenario.facility);
                const previewAsset =
                  GUEST_SCENE_IMAGES[scenario.visualProfile][scenario.initialEmotion];

                return (
                  <article
                    key={scenario.id}
                    onClick={() => onSelectScenario(scenario.id)}
                    className={`group flex flex-col overflow-hidden rounded-xl border bg-white transition-colors ${
                      isSelected
                        ? 'border-[#0052FF] ring-1 ring-[#0052FF]/20'
                        : 'border-[#E2E8F0] hover:border-[#CBD5E1]'
                    }`}
                  >
                    <div className="relative h-56 w-full overflow-hidden bg-[#0B162C]">
                      <img
                        src={previewAsset.src}
                        alt={`${facilityMeta.label} - ${scenario.guestName} 고객 - ${scenario.title}`}
                        referrerPolicy="no-referrer"
                        style={{ objectPosition: previewAsset.objectPosition }}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0B162C]/88 via-[#0B162C]/20 to-transparent" />
                      <div className="absolute bottom-3 left-5 right-5 flex items-center justify-between text-xs text-white">
                        <span className="font-medium">
                          {scenario.guestName} 고객 · {scenario.guestRole}
                        </span>
                        <span className="font-mono font-semibold text-[#93C5FD] tabular-nums">
                          {record?.attempts > 0 ? `최고 ${record.bestScore}점` : '미도전'}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-1 flex-col justify-between p-6">
                      <div>
                        <p className="text-xs text-[#64748B]">
                          <span className="font-semibold text-[#0052FF]">{facilityMeta.label}</span>
                          {' · '}
                          {scenario.category} · 난이도 {scenario.difficulty} · {scenario.roomInfo}
                        </p>
                        <h2 className="mt-2 text-xl font-bold text-[#0B162C]">
                          {scenario.title}
                        </h2>
                        <p className="mt-2.5 text-sm leading-relaxed text-[#475569]">
                          {scenario.summary}
                        </p>
                      </div>

                      <div className="mt-6 flex items-center justify-between gap-4 border-t border-[#E2E8F0] pt-4">
                        <span className="text-xs font-medium text-[#64748B] tabular-nums">
                          {record?.cleared
                            ? `해결 완료 · 도전 ${record.attempts}회`
                            : record?.attempts > 0
                              ? `재도전 필요 · 도전 ${record.attempts}회`
                              : `최대 ${scenario.maxTurns}턴 시뮬레이션`}
                        </span>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onStartScenario(scenario.id, 'practice');
                            }}
                            className={`rounded-lg border px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                              trainingMode === 'practice'
                                ? 'border-[#0052FF] bg-[#0052FF] text-white hover:bg-[#0041CC]'
                                : 'border-[#CBD5E1] bg-white text-[#334155] hover:border-[#0052FF]/50 hover:text-[#0052FF]'
                            }`}
                          >
                            연습 시작
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onStartScenario(scenario.id, 'real');
                            }}
                            className={`inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                              trainingMode === 'real'
                                ? 'border-[#0B162C] bg-[#0B162C] text-white hover:bg-[#172846]'
                                : 'border-[#CBD5E1] bg-white text-[#0B162C] hover:border-[#0052FF] hover:text-[#0052FF]'
                            }`}
                          >
                            실전 시작
                            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
