import { useEffect, useMemo, useRef, useState, type Dispatch, type PointerEvent as ReactPointerEvent } from "react";
import { fmt2, ownerSvg, svgPoint } from "@/explorations/circle-circumference/components/svg-utils";
import { assembled, currentApprox, exactC, formulaC, formulaS, formulaVisible, gapToTrue, round2 } from "../model/derived";
import { pieceGeometry, piecePath, piecePose, rectLayout, triLayout, type StageLayout } from "../model/geometry";
import type { LengthContrast, WidthContrast } from "../model/pattern";
import type { Action } from "../model/reducer";
import { MOVE_EXPLODE, R_MAX, R_MIN, type NValue, type State } from "../model/types";

export const STAGE_W = 1380;
export const STAGE_H = 760;
/** 1 cm ≈ 34 px：r 最大 6 cm 的原圆与长 ≈ 18.8 cm 的长方形同屏放得下 */
export const SCALE = 34;
const SOURCE_CX = 300;
const ASSEMBLY_CX = 960;
const CY = 380;
/** 半径拖点所在方向 */
const HANDLE_ANGLE = -Math.PI / 6;

export const LAYOUT: StageLayout = {
  sourceCenter: { x: SOURCE_CX / SCALE, y: CY / SCALE },
  assemblyOrigin: { x: ASSEMBLY_CX / SCALE, y: CY / SCALE },
  assemblyMaxWidth: (STAGE_W - 560 - 20) / SCALE,
};

export interface Contrast {
  length: LengthContrast;
  width: WidthContrast;
}

interface Props {
  state: State;
  dispatch: Dispatch<Action>;
  interactive: boolean;
  /** 步骤 5 填「周长 / 直径」时的对照线段 */
  contrast?: Contrast | null;
  /** 低端一体机降级渲染：直边、无缝、无过渡 */
  degraded?: boolean;
  /** 步骤 5 只读缩小显示 */
  compact?: boolean;
}

/**
 * 主舞台：网格底 + 左「原圆」（r 可拖、n 等分、两色交替）+ 右「拼合区」（按轨道插值到位）。
 * 全部由 state 派生；半径拖点按 pointerId 捕获自己的指针，可与滑块同时操作。
 */
export function AssemblyStage({ state, dispatch, interactive, contrast, degraded = false, compact = false }: Props) {
  const s = state;
  const rPx = s.r * SCALE;
  const g = pieceGeometry(s.r, s.n);
  const isAssembled = assembled(s);
  const approx = currentApprox(s);
  const showFormula = formulaVisible(s);
  const straight = degraded || s.n >= 128;

  const [rulers, setRulers] = useState<{ length: boolean; width: boolean }>({ length: false, width: false });
  const [zoomPiece, setZoomPiece] = useState<number | null>(null);
  const [nHint, setNHint] = useState(false);

  useEffect(() => {
    setRulers({ length: false, width: false });
    setZoomPiece(null);
  }, [s.n, s.r, s.assembly, isAssembled]);

  // 「凹凸的地方越来越小了」每档 n 只提示一次，3 秒后消失
  useEffect(() => {
    if (isAssembled && s.assembly === "rect" && !s.hintedN.includes(s.n) && s.step <= 5) {
      setNHint(true);
      dispatch({ type: "HINT_N_SHOWN", n: s.n });
      const t = window.setTimeout(() => setNHint(false), 3000);
      return () => window.clearTimeout(t);
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAssembled, s.n, s.assembly]);

  /* ---- 半径拖点 ---- */
  const ptr = useRef<number | null>(null);
  const [handleActive, setHandleActive] = useState(false);
  const onHandleDown = (e: ReactPointerEvent<SVGElement>) => {
    if (!interactive || ptr.current !== null) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* 合成事件 */
    }
    ptr.current = e.pointerId;
    setHandleActive(true);
    dispatch({ type: "BEGIN_DRAG_R" });
  };
  const onHandleMove = (e: ReactPointerEvent<SVGElement>) => {
    if (ptr.current !== e.pointerId) return;
    const svg = ownerSvg(e);
    if (!svg) return;
    const p = svgPoint(svg, e);
    const dist = Math.hypot(p.x - SOURCE_CX, p.y - CY) / SCALE;
    dispatch({ type: "DRAG_R", r: Math.min(R_MAX, Math.max(R_MIN, dist)) });
  };
  const onHandleUp = (e: ReactPointerEvent<SVGElement>) => {
    if (ptr.current !== e.pointerId) return;
    ptr.current = null;
    setHandleActive(false);
    dispatch({ type: "END_DRAG_R" });
  };

  /* ---- 各份 ---- */
  const pieces = useMemo(() => {
    const path = piecePath(rPx, g.half, straight);
    const out: { i: number; transform: string }[] = [];
    for (let i = 0; i < s.n; i++) {
      const p = piecePose(i, s.r, s.n, s.assembly, s.assembleT, s.moved, LAYOUT, MOVE_EXPLODE);
      out.push({ i, transform: `translate(${p.x * SCALE} ${p.y * SCALE}) rotate(${(p.rot * 180) / Math.PI})` });
    }
    return { path, out };
  }, [rPx, g.half, straight, s.n, s.r, s.assembly, s.assembleT, s.moved]);

  const rect = rectLayout(s.r, s.n, LAYOUT.assemblyOrigin);
  const tri = triLayout(s.r, s.n, LAYOUT.assemblyOrigin, LAYOUT.assemblyMaxWidth);
  const frame =
    s.assembly === "rect"
      ? { x: rect.x * SCALE, y: rect.y * SCALE, w: rect.length * SCALE, h: rect.width * SCALE }
      : { x: tri.bbox.x * SCALE, y: tri.bbox.y * SCALE, w: tri.bbox.w * SCALE, h: tri.bbox.h * SCALE };
  const track =
    s.assembly === "rect"
      ? { x: rect.bbox.x * SCALE, y: rect.bbox.y * SCALE, w: rect.bbox.w * SCALE, h: rect.bbox.h * SCALE }
      : frame;

  const handleX = SOURCE_CX + rPx * Math.cos(HANDLE_ANGLE);
  const handleY = CY + rPx * Math.sin(HANDLE_ANGLE);
  const gap = gapToTrue(s);

  /* ---- 网格 ---- */
  const grid = useMemo(() => {
    const lines: { x1: number; y1: number; x2: number; y2: number; major: boolean }[] = [];
    const cols = Math.ceil(STAGE_W / SCALE);
    const rows = Math.ceil(STAGE_H / SCALE);
    for (let i = 0; i <= cols; i++) lines.push({ x1: i * SCALE, y1: 0, x2: i * SCALE, y2: STAGE_H, major: i % 5 === 0 });
    for (let j = 0; j <= rows; j++) {
      const y = STAGE_H - j * SCALE;
      lines.push({ x1: 0, y1: y, x2: STAGE_W, y2: y, major: j % 5 === 0 });
    }
    return lines;
  }, []);

  const lengthLabel = showFormula ? "长 ≈ πr" : "长 ≈ ?";
  const widthLabel = showFormula ? "宽 = r" : "宽 = ?";

  return (
    <svg
      viewBox={`0 0 ${STAGE_W} ${STAGE_H}`}
      preserveAspectRatio="xMidYMid meet"
      aria-label="剪拼舞台"
      className={`assembly-stage ${degraded ? "degraded" : ""} ${compact ? "compact" : ""}`}
    >
      {/* 网格底：1 cm 方格，主刻度每 5 格加深，原点在左下（与转化链一致） */}
      <g className="grid">
        {grid.map((l, i) => (
          <line key={i} className={l.major ? "grid-major" : "grid-minor"} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} />
        ))}
      </g>

      {/* 原圆轮廓（拼走后留虚影） */}
      <circle className={`source-outline ${s.assembleT > 0 ? "ghost" : ""}`} cx={SOURCE_CX} cy={CY} r={rPx} />

      {/* 拼合区目标轨道 */}
      {!isAssembled && <rect className="track" x={track.x} y={track.y} width={track.w} height={track.h} />}
      {s.assembleT > 0 && s.assembleT < 1 && (
        <text className="svg-label muted" x={ASSEMBLY_CX} y={frame.y - 24} textAnchor="middle">
          拼合中 {Math.round(s.assembleT * 100)}%
        </text>
      )}
      {s.assembleT === 0 && (
        <text className="svg-label muted" x={ASSEMBLY_CX} y={frame.y - 24} textAnchor="middle">
          拼合区
        </text>
      )}

      {/* 中间箭头 */}
      <g className="arrow" transform={`translate(${(SOURCE_CX + rPx + track.x) / 2} ${CY})`}>
        <path d="M-60 -10 H30 V-30 L70 0 L30 30 V10 H-60 Z" />
        <text y={-44} textAnchor="middle" className="svg-label muted">
          {s.assembly === "rect" ? "拼合" : "拆开"}
        </text>
      </g>

      {/* n 份 */}
      <g className={`pieces ${s.cutDone ? "cut" : ""}`}>
        {pieces.out.map(({ i, transform }) => (
          <path
            key={i}
            d={pieces.path}
            transform={transform}
            className={`piece ${i % 2 === 0 ? "even" : "odd"} ${zoomPiece === i ? "zoomed" : ""}`}
            onClick={() => isAssembled && s.assembly === "tri" && setZoomPiece(zoomPiece === i ? null : i)}
          />
        ))}
      </g>

      {/* 剪：n 条细白缝依次划出（0.4 s） */}
      {s.cutDone && s.assembleT === 0 && !s.moved && !degraded && (
        <g className="seams">
          {Array.from({ length: s.n }, (_, i) => {
            const a = (i * 2 * Math.PI) / s.n;
            return (
              <line
                key={i}
                className="seam"
                style={{ animationDelay: `${(i * 400) / s.n}ms` }}
                x1={SOURCE_CX}
                y1={CY}
                x2={SOURCE_CX + rPx * Math.cos(a)}
                y2={CY + rPx * Math.sin(a)}
              />
            );
          })}
        </g>
      )}

      {/* 半径 r：橙色线段 + 圆头拖点 */}
      <line className="radius-seg" x1={SOURCE_CX} y1={CY} x2={handleX} y2={handleY} />
      <circle cx={SOURCE_CX} cy={CY} r={6} fill="var(--c-wheel-stroke)" />
      <text className="svg-label" x={SOURCE_CX + 10} y={CY + 34}>
        O
      </text>
      <text className="svg-num" x={SOURCE_CX + rPx * 0.5 * Math.cos(HANDLE_ANGLE) + 20} y={CY + rPx * 0.5 * Math.sin(HANDLE_ANGLE) - 6} fill="var(--c-diameter)">
        r = {s.r.toFixed(1)} cm
      </text>
      <circle className={`r-handle ${handleActive ? "active" : ""}`} cx={handleX} cy={handleY} r={18} />
      <circle
        className="hit"
        cx={handleX}
        cy={handleY}
        r={34}
        onPointerDown={onHandleDown}
        onPointerMove={onHandleMove}
        onPointerUp={onHandleUp}
        onPointerCancel={onHandleUp}
        onLostPointerCapture={onHandleUp}
      />
      <text className="svg-label muted" x={SOURCE_CX} y={CY + rPx + 44} textAnchor="middle">
        原圆 · {s.n} 等份{s.cutDone ? "（已剪）" : ""}
      </text>

      {/* 拼合到位：外框 + 标注 + 尺子 */}
      {isAssembled && s.assembly === "rect" && (
        <g className="frame-group">
          <rect className="frame" x={frame.x} y={frame.y} width={frame.w} height={frame.h} />
          {/* 长边标注（青绿）：点开尺子 */}
          <g className="edge-label" onClick={() => setRulers({ ...rulers, length: !rulers.length })}>
            <rect className="hit" x={frame.x} y={frame.y + frame.h} width={frame.w} height={60} />
            <line className="dim-line arc" x1={frame.x} y1={frame.y + frame.h + 28} x2={frame.x + frame.w} y2={frame.y + frame.h + 28} />
            <text className="svg-num arc" x={frame.x + frame.w / 2} y={frame.y + frame.h + 66} textAnchor="middle">
              {lengthLabel}
              {(rulers.length || showFormula) && <tspan> · {fmt2(approx.length)} cm</tspan>}
            </text>
          </g>
          {/* 宽边标注（橙） */}
          <g className="edge-label" onClick={() => setRulers({ ...rulers, width: !rulers.width })}>
            <rect className="hit" x={frame.x + frame.w} y={frame.y} width={140} height={frame.h} />
            <line className="dim-line orange" x1={frame.x + frame.w + 28} y1={frame.y} x2={frame.x + frame.w + 28} y2={frame.y + frame.h} />
            <text className="svg-num orange" x={frame.x + frame.w + 44} y={frame.y + frame.h / 2 + 10}>
              {widthLabel}
            </text>
            {(rulers.width || showFormula) && (
              <text className="svg-num orange" x={frame.x + frame.w + 44} y={frame.y + frame.h / 2 + 48}>
                {fmt2(approx.width)} cm
              </text>
            )}
          </g>
          {/* 尺子 */}
          {rulers.length && <Ruler x={frame.x} y={frame.y + frame.h + 28} lengthCm={approx.length} horizontal />}
          {rulers.width && <Ruler x={frame.x + frame.w + 28} y={frame.y} lengthCm={approx.width} horizontal={false} />}
          {!rulers.length && !showFormula && (
            <text className="svg-label muted" x={frame.x + frame.w / 2} y={frame.y - 16} textAnchor="middle">
              点长边 / 宽边贴尺读数
            </text>
          )}
          {nHint && (
            <text className="svg-label ok" x={frame.x + frame.w / 2} y={frame.y - 16} textAnchor="middle">
              凹凸的地方越来越小了
            </text>
          )}
        </g>
      )}

      {isAssembled && s.assembly === "tri" && (
        <g className="frame-group">
          <text className="svg-num" x={frame.x + frame.w / 2} y={frame.y + frame.h + 48} textAnchor="middle">
            {s.n} 个三角形
            <tspan className="svg-label muted"> · 点任一份放大看底与高</tspan>
          </text>
        </g>
      )}

      {/* 三角形路线：单份放大 */}
      {zoomPiece !== null && isAssembled && s.assembly === "tri" && (
        <ZoomedPiece r={s.r} n={s.n} chord={approx.length} height={approx.width} showFormula={showFormula} onClose={() => setZoomPiece(null)} />
      )}

      {/* 步骤 5 对照线段 */}
      {contrast?.length && isAssembled && s.assembly === "rect" && (
        <g className="contrast">
          {(() => {
            const len = (contrast.length === "C" ? round2(exactC(s)) : s.r * 2) * SCALE;
            const label = contrast.length === "C" ? `周长 C = ${fmt2(formulaC(s.r))} cm` : `直径 d = ${(s.r * 2).toFixed(1)} cm`;
            const x1 = Math.max(20, frame.x + frame.w / 2 - len / 2);
            const y = frame.y - 40;
            return (
              <>
                <line className="contrast-line" x1={x1} y1={y} x2={x1 + len} y2={y} stroke="#1e5eff" />
                <text className="svg-label" x={x1} y={y - 12} fill="#1e5eff">
                  {label}
                </text>
                <text className="svg-label muted" x={frame.x + frame.w / 2} y={y - 44} textAnchor="middle">
                  和长方形的长比一比，一样长吗？
                </text>
              </>
            );
          })()}
        </g>
      )}
      {contrast?.width && isAssembled && s.assembly === "rect" && (
        <g className="contrast">
          <line className="contrast-line" x1={frame.x + frame.w + 90} y1={frame.y + frame.h / 2 - rPx} x2={frame.x + frame.w + 90} y2={frame.y + frame.h / 2 + rPx} stroke="#1e5eff" />
          <text className="svg-label" x={frame.x + frame.w + 100} y={frame.y + frame.h / 2 - rPx + 10} fill="#1e5eff">
            d = {(s.r * 2).toFixed(1)}
          </text>
        </g>
      )}

      {/* 揭示后：拼出 ≈ 与精确对照 */}
      {showFormula && isAssembled && (
        <text className="svg-label" x={ASSEMBLY_CX} y={STAGE_H - 30} textAnchor="middle">
          n = {s.n} 时拼出 ≈ <tspan className="svg-num arc">{fmt2(approx.area)}</tspan> cm²，精确 3.14 × {s.r.toFixed(1)}² ={" "}
          <tspan className="svg-num">{fmt2(formulaS(s.r))}</tspan> cm²，相差 {Math.abs(gap) < 0.005 ? "不到 0.01" : fmt2(Math.abs(gap))}
        </text>
      )}
    </svg>
  );
}

/** 贴在边上的尺子：cm 刻度 + 总读数 */
function Ruler({ x, y, lengthCm, horizontal }: { x: number; y: number; lengthCm: number; horizontal: boolean }) {
  const len = lengthCm * SCALE;
  const ticks = Math.floor(lengthCm);
  return (
    <g className="ruler" transform={horizontal ? `translate(${x} ${y})` : `translate(${x} ${y}) rotate(90)`}>
      <rect x={0} y={-16} width={len} height={32} rx={4} />
      {Array.from({ length: ticks + 1 }, (_, i) => (
        <g key={i}>
          <line x1={i * SCALE} y1={-16} x2={i * SCALE} y2={i % 5 === 0 ? 0 : -8} />
          {i % 5 === 0 && (
            <text x={i * SCALE + 4} y={12} className="tick-label" textAnchor="start">
              {i}
            </text>
          )}
        </g>
      ))}
      <line x1={len} y1={-16} x2={len} y2={16} strokeWidth={4} />
      <text x={len} y={horizontal ? 42 : -26} textAnchor="middle" className="svg-num arc">
        {fmt2(lengthCm)}
      </text>
    </g>
  );
}

/** 三角形路线：单份放大，底（弧）青绿、高橙色虚线 */
function ZoomedPiece({
  r,
  n,
  chord,
  height,
  showFormula,
  onClose,
}: {
  r: number;
  n: NValue;
  chord: number;
  height: number;
  showFormula: boolean;
  onClose: () => void;
}) {
  const g = pieceGeometry(r, n);
  const zoom = Math.min(260 / (r * SCALE), 6);
  const R = r * SCALE * zoom;
  const cx = 300;
  const cy = 700;
  const x1 = cx + R * Math.cos(-Math.PI / 2 - g.half);
  const y1 = cy + R * Math.sin(-Math.PI / 2 - g.half);
  const x2 = cx + R * Math.cos(-Math.PI / 2 + g.half);
  const y2 = cy + R * Math.sin(-Math.PI / 2 + g.half);
  return (
    <g className="zoom-piece" onClick={onClose}>
      <rect x={40} y={400} width={540} height={340} rx={12} />
      <path d={`M${cx} ${cy} L${x1} ${y1} A${R} ${R} 0 0 1 ${x2} ${y2} Z`} className="piece odd" />
      <line className="dim-line arc" x1={x1} y1={y1 + 18} x2={x2} y2={y2 + 18} />
      <text className="svg-num arc" x={cx} y={y1 + 56} textAnchor="middle">
        底 ≈ {showFormula ? `C ÷ ${n} = ` : ""}
        {fmt2(chord)} cm
      </text>
      <line className="dim-line orange dashed" x1={cx} y1={cy} x2={cx} y2={cy - height * SCALE * zoom} />
      <text className="svg-num orange" x={cx + 12} y={cy - (height * SCALE * zoom) / 2} textAnchor="start">
        高 ≈ {showFormula ? "r = " : ""}
        {fmt2(height)} cm
      </text>
      <text className="svg-label muted" x={cx} y={430} textAnchor="middle">
        一份（近似三角形的小纸片）· 点空白关闭
      </text>
    </g>
  );
}
