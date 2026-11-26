import { COMPETENCY_LABELS } from '../data/hotelManual';
import { COMPETENCY_KEYS } from '../utils/gameLogic';
import type { CompetencyScores } from '../types';

interface CompetencyRadarChartProps {
  scores: CompetencyScores;
  benchmark?: number;
}

export function CompetencyRadarChart({
  scores,
  benchmark = 85,
}: CompetencyRadarChartProps) {
  const size = 300;
  const center = size / 2;
  const radius = 98;
  const levels = [25, 50, 75, 100];

  const getPoint = (index: number, value: number, rScale = radius) => {
    const angle = (Math.PI * 2 * index) / COMPETENCY_KEYS.length - Math.PI / 2;
    const dist = (Math.max(0, Math.min(100, value)) / 100) * rScale;
    return {
      x: center + Math.cos(angle) * dist,
      y: center + Math.sin(angle) * dist,
    };
  };

  const toPolygonPoints = (values: number[]) =>
    values
      .map((v, i) => {
        const pt = getPoint(i, v);
        return `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
      })
      .join(' ');

  const scoreValues = COMPETENCY_KEYS.map((key) => scores[key]);
  const benchmarkValues = COMPETENCY_KEYS.map(() => benchmark);

  return (
    <div className="flex flex-col items-center justify-center">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="w-full max-w-[310px] h-auto overflow-visible"
        role="img"
        aria-label="5대 호텔 응대 역량 레이더 차트"
      >
        {/* Background grid rings */}
        {levels.map((lv) => (
          <polygon
            key={lv}
            points={toPolygonPoints(COMPETENCY_KEYS.map(() => lv))}
            fill="none"
            stroke="#E2E8F0"
            strokeWidth="1"
          />
        ))}

        {/* Axis spokes */}
        {COMPETENCY_KEYS.map((key, idx) => {
          const outer = getPoint(idx, 100);
          return (
            <line
              key={key}
              x1={center}
              y1={center}
              x2={outer.x}
              y2={outer.y}
              stroke="#E2E8F0"
              strokeWidth="1"
            />
          );
        })}

        {/* 5-star target benchmark polygon */}
        <polygon
          points={toPolygonPoints(benchmarkValues)}
          fill="none"
          stroke="#64748B"
          strokeOpacity="0.55"
          strokeWidth="1.25"
          strokeDasharray="4 4"
        />

        {/* Trainee actual score polygon */}
        <polygon
          points={toPolygonPoints(scoreValues)}
          fill="rgba(0, 82, 255, 0.14)"
          stroke="#0052FF"
          strokeWidth="2.2"
        />

        {/* Vertex points */}
        {scoreValues.map((val, idx) => {
          const pt = getPoint(idx, val);
          return (
            <circle
              key={COMPETENCY_KEYS[idx]}
              cx={pt.x}
              cy={pt.y}
              r="4"
              fill="#FFFFFF"
              stroke="#0052FF"
              strokeWidth="2.2"
            />
          );
        })}

        {/* Axis labels & numeric readouts */}
        {COMPETENCY_KEYS.map((key, idx) => {
          const labelPt = getPoint(idx, 100, radius + 28);
          const anchor =
            Math.abs(labelPt.x - center) < 12
              ? 'middle'
              : labelPt.x > center
                ? 'start'
                : 'end';

          return (
            <g key={key}>
              <text
                x={labelPt.x}
                y={labelPt.y - 4}
                textAnchor={anchor}
                fill="#0B162C"
                fontSize="11.5"
                fontWeight="600"
              >
                {COMPETENCY_LABELS[key]}
              </text>
              <text
                x={labelPt.x}
                y={labelPt.y + 11}
                textAnchor={anchor}
                fill="#0052FF"
                fontSize="11"
                fontFamily="JetBrains Mono, monospace"
                fontWeight="700"
              >
                {scores[key]}점
              </text>
            </g>
          );
        })}
      </svg>

      <div className="mt-2 flex items-center gap-5 text-xs text-[#64748B]">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-4 bg-[#0052FF]/25 border border-[#0052FF]" aria-hidden="true" />
          나의 평균 역량
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0 w-4 border-t border-dashed border-[#64748B]" aria-hidden="true" />
          5성급 목표 ({benchmark}점)
        </span>
      </div>
    </div>
  );
}
