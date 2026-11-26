import { useEffect, useState } from 'react';
import { BookOpen, CheckCircle2, X, XCircle } from 'lucide-react';
import {
  FACILITY_CATEGORIES,
  getFacilityMeta,
  HOTEL_SOP_MANUAL,
  SCENARIOS,
} from '../data/hotelManual';
import type { FacilityCategory, ScenarioId } from '../types';

interface ManualDrawerProps {
  open: boolean;
  onClose: () => void;
  initialScenarioId?: ScenarioId;
}

export function ManualDrawer({ open, onClose, initialScenarioId }: ManualDrawerProps) {
  const initialScenario =
    SCENARIOS.find((s) => s.id === initialScenarioId) ?? SCENARIOS[0];
  const [activeTab, setActiveTab] = useState<'core' | 'scenarios'>(
    initialScenarioId ? 'scenarios' : 'core'
  );
  const [selectedFacility, setSelectedFacility] = useState<FacilityCategory>(
    initialScenario.facility
  );
  const [selectedScenarioId, setSelectedScenarioId] = useState<ScenarioId>(
    initialScenario.id
  );

  useEffect(() => {
    if (initialScenarioId) {
      const target = SCENARIOS.find((s) => s.id === initialScenarioId);
      if (target) {
        setSelectedFacility(target.facility);
        setSelectedScenarioId(target.id);
      }
      setActiveTab('scenarios');
    }
  }, [initialScenarioId, open]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  const facilityScenarios = SCENARIOS.filter((s) => s.facility === selectedFacility);
  const activeScenario =
    facilityScenarios.find((s) => s.id === selectedScenarioId) ??
    facilityScenarios[0] ??
    SCENARIOS[0];
  const activeFacilityMeta = getFacilityMeta(activeScenario.facility);

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-[#0B162C]/55 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sop-manual-title"
      onClick={onClose}
    >
      <div
        className="flex h-full w-full max-w-2xl flex-col border-l border-[#E2E8F0] bg-white text-[#0B162C] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 border-b border-[#E2E8F0] px-6 py-5">
          <div>
            <p className="text-xs font-semibold text-[#0052FF]">{HOTEL_SOP_MANUAL.hotelName}</p>
            <h2
              id="sop-manual-title"
              className="mt-1 flex items-center gap-2 text-xl font-bold text-[#0B162C]"
            >
              <BookOpen className="h-5 w-5 text-[#0052FF]" aria-hidden="true" />
              호텔 시설별 컴플레인 표준 응대 매뉴얼
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="응대 매뉴얼 닫기"
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#E2E8F0] text-[#64748B] transition-colors hover:bg-[#F5F7FA] hover:text-[#0B162C] focus-visible:outline-2 focus-visible:outline-[#0052FF]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="border-b border-[#E2E8F0] bg-[#F8FAFC] px-6 py-3">
          <div className="inline-flex items-center gap-1 rounded-lg bg-[#E9EEF6] p-1">
            <button
              type="button"
              onClick={() => setActiveTab('core')}
              className={`rounded-md px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'core'
                  ? 'bg-[#0052FF] text-white shadow-xs'
                  : 'text-[#475569] hover:text-[#0B162C]'
              }`}
            >
              LAST 기본 원칙 · 금지/권장 화법
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('scenarios')}
              className={`rounded-md px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'scenarios'
                  ? 'bg-[#0052FF] text-white shadow-xs'
                  : 'text-[#475569] hover:text-[#0B162C]'
              }`}
            >
              시설별 표준 조치 규정 ({SCENARIOS.length}종)
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
          {activeTab === 'core' ? (
            <>
              <section>
                <h3 className="text-base font-bold text-[#0B162C]">
                  5성급 호텔 컴플레인 대응 4단계 (LAST)
                </h3>
                <div className="mt-4 divide-y divide-[#E2E8F0] border-y border-[#E2E8F0]">
                  {HOTEL_SOP_MANUAL.coreFramework.map((item) => (
                    <div key={item.step} className="py-4">
                      <p className="text-sm font-semibold text-[#0052FF]">{item.step}</p>
                      <p className="mt-1.5 text-sm leading-relaxed text-[#334155]">
                        {item.detail}
                      </p>
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <h3 className="text-base font-bold text-[#0B162C]">
                  현장 금지 표현 vs 5성급 권장 표현
                </h3>
                <div className="mt-4 space-y-4">
                  {HOTEL_SOP_MANUAL.forbiddenVsRecommended.map((pair, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 space-y-2.5"
                    >
                      <div className="flex items-start gap-2.5 text-sm text-rose-700">
                        <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" aria-hidden="true" />
                        <span>
                          <strong className="font-semibold">금지: </strong>
                          {pair.forbidden}
                        </span>
                      </div>
                      <div className="flex items-start gap-2.5 text-sm text-emerald-700">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                        <span>
                          <strong className="font-semibold">권장: </strong>
                          {pair.recommended}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </>
          ) : (
            <>
              <div className="space-y-2.5">
                {/* Facility selector */}
                <div
                  role="group"
                  aria-label="시설별 매뉴얼 선택"
                  className="flex flex-wrap gap-1.5 rounded-lg bg-[#EEF2F7] p-1.5"
                >
                  {FACILITY_CATEGORIES.map((fac) => (
                    <button
                      key={fac.id}
                      type="button"
                      onClick={() => {
                        setSelectedFacility(fac.id);
                        const first = SCENARIOS.find((s) => s.facility === fac.id);
                        if (first) setSelectedScenarioId(first.id);
                      }}
                      className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                        selectedFacility === fac.id
                          ? 'bg-[#0052FF] font-semibold text-white'
                          : 'text-[#475569] hover:text-[#0B162C]'
                      }`}
                    >
                      {fac.label}
                    </button>
                  ))}
                </div>

                {/* Scenarios in selected facility */}
                <div className="flex flex-wrap gap-1.5">
                  {facilityScenarios.map((sc) => (
                    <button
                      key={sc.id}
                      type="button"
                      onClick={() => setSelectedScenarioId(sc.id)}
                      className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                        activeScenario.id === sc.id
                          ? 'border-[#0052FF] bg-[#EEF4FF] text-[#0052FF] font-semibold'
                          : 'border-[#E2E8F0] bg-white text-[#475569] hover:border-[#CBD5E1] hover:text-[#0B162C]'
                      }`}
                    >
                      {sc.shortTitle}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <p className="text-xs text-[#64748B]">
                    <span className="font-semibold text-[#0052FF]">{activeFacilityMeta.label}</span>
                    {' · '}
                    {activeScenario.category} · 난이도 {activeScenario.difficulty} · {activeScenario.guestName} 고객
                  </p>
                  <h3 className="mt-1 text-lg font-bold text-[#0B162C]">
                    {activeScenario.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#334155]">
                    {activeScenario.summary}
                  </p>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-[#0052FF]">
                    필수 준수 조치 체크리스트
                  </h4>
                  <ol className="mt-3 space-y-2.5">
                    {activeScenario.manualGuidelines.map((guide, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-3 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3.5 text-sm leading-relaxed text-[#1E293B]"
                      >
                        <span className="font-mono text-xs font-bold text-[#0052FF] tabular-nums">
                          0{i + 1}
                        </span>
                        <span>{guide}</span>
                      </li>
                    ))}
                  </ol>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-[#0052FF]">
                    핵심 권장 멘트 예시
                  </h4>
                  <ul className="mt-3 space-y-2 text-sm text-[#1E293B]">
                    {activeScenario.recommendedPhrases.map((phrase, idx) => (
                      <li
                        key={idx}
                        className="rounded-lg border border-[#DBEAFE] bg-[#EEF4FF]/60 px-4 py-3"
                      >
                        “{phrase}”
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end border-t border-[#E2E8F0] bg-[#F8FAFC] px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-[#0052FF] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0041CC] whitespace-nowrap shrink-0"
          >
            확인하고 돌아가기
          </button>
        </div>
      </div>
    </div>
  );
}
