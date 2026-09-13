import { BIKE_R, PI_TEXTBOOK } from "../model/types";
import { fmt2 } from "./svg-utils";

const W = 1380;
const H = 700;
const GROUND_Y = 520;
/** 屏上按比例缩小：真半径 33 cm，屏上用 1 cm ≈ 3.6 px */
const SCALE = 3.6;

/** 步骤 7 任务 B 示意：自行车轮按比例缩小，读数仍标 33 cm，并标注「示意」。 */
export function BikeStage({ animate }: { animate: boolean }) {
  const rPx = BIKE_R * SCALE;
  const C = 2 * PI_TEXTBOOK * BIKE_R;
  const cPx = C * SCALE;
  const x0 = 120;
  const meters = Math.floor((W - x0 - 40) / (100 * SCALE));
  return (
    <div className="stage-svg-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" aria-label="自行车轮示意">
        <text className="svg-label muted" x={40} y={60}>
          示意：车轮按比例缩小，读数是真值
        </text>
        <line className="ground" x1={x0 - 40} y1={GROUND_Y} x2={W} y2={GROUND_Y} />
        {Array.from({ length: meters + 1 }, (_, i) => (
          <g key={i}>
            <line className="tick" x1={x0 + i * 100 * SCALE} y1={GROUND_Y} x2={x0 + i * 100 * SCALE} y2={GROUND_Y + 24} />
            <text className="tick-label" x={x0 + i * 100 * SCALE} y={GROUND_Y + 58}>
              {i} m
            </text>
          </g>
        ))}
        {animate && <rect className="rolled-band" x={x0} y={GROUND_Y - 6} width={cPx} height={16} />}
        <g style={{ transform: `translate(${animate ? cPx : 0}px, 0)`, transition: animate ? "transform 2.4s ease-in-out" : "none" }}>
          <circle className="wheel" cx={x0} cy={GROUND_Y - rPx} r={rPx} />
          <line className="radius-line" x1={x0} y1={GROUND_Y - rPx} x2={x0 + rPx} y2={GROUND_Y - rPx} />
          <text className="svg-num" x={x0 + rPx / 2} y={GROUND_Y - rPx - 14} textAnchor="middle" fill="var(--c-radius)">
            r = {BIKE_R} cm
          </text>
          <circle className="red-point" cx={x0} cy={GROUND_Y} r={10} />
        </g>
        {animate && (
          <text className="svg-num arc" x={x0 + cPx / 2} y={GROUND_Y + 110} textAnchor="middle">
            转 1 圈 ≈ {fmt2(C)} cm ≈ {(C / 100).toFixed(0)} m
          </text>
        )}
      </svg>
    </div>
  );
}
