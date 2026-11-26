import { useEffect } from 'react';

const AIVON_BRAND_LOGO = '/assets/aistudio/7b316523db378f81_70843f51.png';

interface HomeStageProps {
  onStart: () => void;
}

export function HomeStage({ onStart }: HomeStageProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement instanceof HTMLButtonElement) {
        return;
      }
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onStart();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onStart]);

  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center bg-[#F1F2F3] px-6 py-12">
      <div className="flex w-full max-w-[520px] flex-col items-center">
        <img
          src={AIVON_BRAND_LOGO}
          alt="AIVON AI Education Platform"
          referrerPolicy="no-referrer"
          className="w-full max-w-[460px] h-auto object-contain select-none"
        />

        <button
          type="button"
          data-start="true"
          onClick={onStart}
          className="mt-12 inline-flex min-w-[220px] items-center justify-center rounded-xl bg-[#0052FF] px-12 py-4 font-display text-base font-bold tracking-[0.16em] text-white shadow-[0_12px_28px_-10px_rgba(0,82,255,0.5)] transition-all duration-150 hover:-translate-y-0.5 hover:bg-[#0041CC] hover:shadow-[0_16px_32px_-10px_rgba(0,82,255,0.58)] active:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0052FF]"
        >
          START
        </button>
      </div>
    </main>
  );
}
