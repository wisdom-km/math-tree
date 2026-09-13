import { useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { bounds, type Bounds, type GridCell, type Polygon, type Pt } from "./geometry";
import { CutMoveAssembleBar, type ActionKey, type ShapeCanvasActions } from "./CutMoveAssembleBar";
import { SvgSlider } from "./SvgSlider";
import "./shape-canvas.css";

/**
 * ShapeCanvas：面积转化链五站与圆的面积探究单共用的舞台。
 *
 * 契约（docs/explorations/area-chain.md 第 2 节、第 6 节）：
 * - 同一网格底（1 cm 方格，主刻度每 5 格加深，原点在左下）、同一配色、同一「剪 / 移 / 拼」三按钮位置；
 * - 图形全部由 cm 坐标的多边形描述（参数驱动），组件只负责坐标换算与绘制；
 * - 可拖参数点命中区 ≥ 48px，每个拖点按 pointerId 各自捕获，支持多点同时拖；
 * - 嵌入模式（embedded）：舞台裁到图形附近、只显示 visibleActions 里列出的核心动作、隐藏进度滑块；
 *   顶栏 / 步骤条 / 撤销由宿主负责，组件本身不含这些。
 */

/** 1 cm 对应的 viewBox 像素 */
export const PX_PER_CM = 72;
/** 独立模式默认可视范围（cm） */
export const DEFAULT_VIEW: Bounds = { xMin: -1.4, xMax: 16.2, yMin: -1.7, yMax: 9.2 };

export type ShapeRole = "source" | "piece" | "outline" | "ghost" | "result";

export interface ShapeSpec {
  id: string;
  points: Polygon;
  /** source 深蓝描边浅蓝填充；piece 浅橙；outline 青绿虚线外框；ghost 半透明；result 拼成的新图形（青绿细描边） */
  role: ShapeRole;
  /** 图形中央的文字（如「一样的」） */
  label?: string;
  /** 面积涂色暗一下（对照反馈） */
  dim?: boolean;
  /** 周长描边流动一圈（对照反馈：边 vs 面） */
  flowing?: boolean;
  /** 边框闪一下（如 a = b 时） */
  flash?: boolean;
  /** 涂深（如「这是两个三角形的面积」） */
  dark?: boolean;
  /** 闪烁（如「这一半是借来的」） */
  blink?: boolean;
}

export interface HandleSpec {
  id: string;
  x: number;
  y: number;
  /** 只能沿 x / y 拖，或自由拖 */
  axis: "x" | "y" | "free";
  onDragStart?: () => void;
  /** 回传 cm 坐标（未吸附，由调用方裁剪 / 步进） */
  onDrag: (p: Pt) => void;
  onDragEnd?: () => void;
  disabled?: boolean;
  /** 控件条上的读数徽章，如「长 a = 6.0 cm」 */
  badge?: string;
  /** 启动时抖动提示（wiggle-me） */
  wiggle?: boolean;
  /** 剪刀样式（第 2 站剪切位置） */
  variant?: "dot" | "scissors";
  ariaLabel?: string;
}

export interface CellsSpec {
  cells: GridCell[];
  /** 每格中央显示序号（超过 40 格由调用方关掉） */
  numbered?: boolean;
  /** 一行一行亮起（动画由 j 决定延迟） */
  animateRows?: boolean;
  /** 动画重启用 */
  animKey?: number;
}

export interface ProgressSpec {
  t: number;
  onChange: (t: number) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  disabled?: boolean;
}

export interface CanvasCtx {
  toX: (x: number) => number;
  toY: (y: number) => number;
  toPx: (p: Pt) => { x: number; y: number };
  scale: number;
  view: Bounds;
}

export interface ShapeCanvasProps {
  shapes: ShapeSpec[];
  handles?: HandleSpec[];
  cells?: CellsSpec;
  /** 可视范围（cm）；独立模式默认 DEFAULT_VIEW；嵌入模式默认图形外接矩形 + 1 cm 边距 */
  view?: Bounds;
  embedded?: boolean;
  actions?: ShapeCanvasActions;
  /** 只显示这些动作；undefined = 三个都显示（独立模式） */
  visibleActions?: ActionKey[];
  /** 转化进度滑块；嵌入模式忽略 */
  progress?: ProgressSpec | null;
  /** 自定义 SVG 标注（底 / 高标注线、尺子、直角标记等） */
  children?: (ctx: CanvasCtx) => ReactNode;
  /** 舞台右上角的一行提示 */
  hint?: string | null;
  ariaLabel?: string;
}

function svgPoint(svg: SVGSVGElement, e: { clientX: number; clientY: number }): { x: number; y: number } {
  const p = svg.createSVGPoint();
  p.x = e.clientX;
  p.y = e.clientY;
  const ctm = svg.getScreenCTM();
  if (!ctm) return { x: e.clientX, y: e.clientY };
  const q = p.matrixTransform(ctm.inverse());
  return { x: q.x, y: q.y };
}

function ownerSvg(e: ReactPointerEvent<Element>): SVGSVGElement | null {
  const el = e.currentTarget as Element & { ownerSVGElement?: SVGSVGElement | null };
  return el.ownerSVGElement ?? (el instanceof SVGSVGElement ? el : null);
}

function pointsAttr(poly: Polygon, ctx: CanvasCtx): string {
  return poly.map((p) => `${ctx.toX(p.x).toFixed(1)},${ctx.toY(p.y).toFixed(1)}`).join(" ");
}

function centroid(poly: Polygon): Pt {
  const n = poly.length;
  return { x: poly.reduce((s, p) => s + p.x, 0) / n, y: poly.reduce((s, p) => s + p.y, 0) / n };
}

export function makeCtx(view: Bounds): CanvasCtx {
  const scale = PX_PER_CM;
  const toX = (x: number) => (x - view.xMin) * scale;
  const toY = (y: number) => (view.yMax - y) * scale;
  return { toX, toY, toPx: (p) => ({ x: toX(p.x), y: toY(p.y) }), scale, view };
}

/** 嵌入模式默认视野：图形 + 拖点外接矩形，四周留 1 cm */
export function fitView(shapes: ShapeSpec[], handles: HandleSpec[] = [], margin = 1): Bounds {
  const polys = shapes.map((s) => s.points);
  if (handles.length) polys.push(handles.map((h) => ({ x: h.x, y: h.y })));
  if (polys.length === 0) return DEFAULT_VIEW;
  const b = bounds(polys);
  return {
    xMin: Math.floor(b.xMin) - margin,
    xMax: Math.ceil(b.xMax) + margin,
    yMin: Math.floor(b.yMin) - margin,
    yMax: Math.ceil(b.yMax) + margin,
  };
}

export function ShapeCanvas({
  shapes,
  handles = [],
  cells,
  view,
  embedded = false,
  actions,
  visibleActions,
  progress,
  children,
  hint,
  ariaLabel = "图形舞台",
}: ShapeCanvasProps) {
  const v = view ?? (embedded ? fitView(shapes, handles) : DEFAULT_VIEW);
  const ctx = makeCtx(v);
  const W = (v.xMax - v.xMin) * ctx.scale;
  const H = (v.yMax - v.yMin) * ctx.scale;

  // 指针簿记：每个拖点各自持有一个 pointerId，互不抢（两个孩子可同时各拖一个点）
  const ptrs = useRef<Map<number, string>>(new Map());
  const [active, setActive] = useState<Set<string>>(new Set());

  const onDown = (h: HandleSpec) => (e: ReactPointerEvent<SVGElement>) => {
    if (h.disabled) return;
    if ([...ptrs.current.values()].includes(h.id)) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* 合成事件无真实指针时忽略 */
    }
    ptrs.current.set(e.pointerId, h.id);
    setActive(new Set([...active, h.id]));
    h.onDragStart?.();
  };
  const onMove = (h: HandleSpec) => (e: ReactPointerEvent<SVGElement>) => {
    if (ptrs.current.get(e.pointerId) !== h.id) return;
    const svg = ownerSvg(e);
    if (!svg) return;
    const p = svgPoint(svg, e);
    const cm: Pt = { x: p.x / ctx.scale + v.xMin, y: v.yMax - p.y / ctx.scale };
    if (h.axis === "x") cm.y = h.y;
    if (h.axis === "y") cm.x = h.x;
    h.onDrag(cm);
  };
  const onUp = (h: HandleSpec) => (e: ReactPointerEvent<SVGElement>) => {
    if (ptrs.current.get(e.pointerId) !== h.id) return;
    ptrs.current.delete(e.pointerId);
    const next = new Set(active);
    next.delete(h.id);
    setActive(next);
    h.onDragEnd?.();
  };

  // 网格线
  const gridX: number[] = [];
  for (let x = Math.ceil(v.xMin); x <= Math.floor(v.xMax); x++) gridX.push(x);
  const gridY: number[] = [];
  for (let y = Math.ceil(v.yMin); y <= Math.floor(v.yMax); y++) gridY.push(y);

  const badges = handles.filter((h) => h.badge).map((h) => h.badge as string);

  return (
    <div className={`shape-canvas ${embedded ? "embedded" : ""}`}>
      <div className="sc-stage">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" aria-label={ariaLabel}>
          {/* 网格底 */}
          <rect className="sc-bg" x={0} y={0} width={W} height={H} />
          {gridX.map((x) => (
            <line key={`gx${x}`} className={`sc-grid ${x % 5 === 0 ? "major" : ""} ${x === 0 ? "axis" : ""}`} x1={ctx.toX(x)} y1={0} x2={ctx.toX(x)} y2={H} />
          ))}
          {gridY.map((y) => (
            <line key={`gy${y}`} className={`sc-grid ${y % 5 === 0 ? "major" : ""} ${y === 0 ? "axis" : ""}`} x1={0} y1={ctx.toY(y)} x2={W} y2={ctx.toY(y)} />
          ))}
          {!embedded && (
            <>
              {/* 刻度数字放在舞台最下沿，给图形下方的标注线留空 */}
              <text className="sc-tick" x={ctx.toX(0)} y={H - 10} textAnchor="middle">
                0
              </text>
              {gridX
                .filter((x) => x > 0 && x % 5 === 0)
                .map((x) => (
                  <text key={`tx${x}`} className="sc-tick" x={ctx.toX(x)} y={H - 10} textAnchor="middle">
                    {x}
                  </text>
                ))}
              {gridY
                .filter((y) => y > 0 && y % 5 === 0)
                .map((y) => (
                  <text key={`ty${y}`} className="sc-tick" x={ctx.toX(0) - 12} y={ctx.toY(y) + 8} textAnchor="end">
                    {y}
                  </text>
                ))}
              <text className="sc-tick" x={ctx.toX(1)} y={H - 10} textAnchor="middle">
                1 cm
              </text>
            </>
          )}

          {/* 数格子 */}
          {cells &&
            cells.cells.map((c) => {
              const idx = cells.cells.indexOf(c) + 1;
              const style = cells.animateRows ? { animationDelay: `${(c.j - Math.min(...cells.cells.map((k) => k.j))) * 0.45}s` } : undefined;
              return (
                <g key={`${cells.animKey ?? 0}-${c.i}-${c.j}`} className={`sc-cell ${c.kind} ${cells.animateRows ? "row-anim" : ""}`} style={style}>
                  <rect x={ctx.toX(c.i) + 2} y={ctx.toY(c.j + 1) + 2} width={ctx.scale - 4} height={ctx.scale - 4} />
                  {cells.numbered && (
                    <text x={ctx.toX(c.i + 0.5)} y={ctx.toY(c.j + 0.5) + 9} textAnchor="middle">
                      {c.kind === "full" ? idx : "½"}
                    </text>
                  )}
                </g>
              );
            })}

          {/* 图形 */}
          {shapes.map((s) => {
            const cls = [
              "sc-shape",
              s.role,
              s.dim ? "dim" : "",
              s.flowing ? "flowing" : "",
              s.flash ? "flash" : "",
              s.dark ? "dark" : "",
              s.blink ? "blink" : "",
            ]
              .filter(Boolean)
              .join(" ");
            const c = centroid(s.points);
            return (
              <g key={s.id}>
                <polygon className={cls} points={pointsAttr(s.points, ctx)} />
                {s.label && (
                  <text className="sc-shape-label" x={ctx.toX(c.x)} y={ctx.toY(c.y) + 10} textAnchor="middle">
                    {s.label}
                  </text>
                )}
              </g>
            );
          })}

          {children?.(ctx)}

          {/* 可拖参数点（命中区 ≥ 48px） */}
          {handles.map((h) => {
            const p = ctx.toPx({ x: h.x, y: h.y });
            const isActive = active.has(h.id);
            return (
              <g key={h.id} className={`sc-handle ${h.disabled ? "disabled" : ""} ${isActive ? "active" : ""} ${h.wiggle && !isActive ? "wiggle" : ""}`}>
                {h.variant === "scissors" ? (
                  <g transform={`translate(${p.x} ${p.y})`}>
                    <circle r={22} className="sc-handle-dot" />
                    <path className="sc-scissors" d="M-9 -9 l14 14 M-9 9 l14 -14 M8 -12 a4 4 0 1 0 0.1 0 M8 12 a4 4 0 1 0 0.1 0" />
                  </g>
                ) : (
                  <circle className="sc-handle-dot" cx={p.x} cy={p.y} r={18} />
                )}
                <circle
                  className="sc-hit"
                  cx={p.x}
                  cy={p.y}
                  r={34}
                  role="slider"
                  aria-label={h.ariaLabel ?? h.badge ?? h.id}
                  aria-disabled={h.disabled || undefined}
                  onPointerDown={onDown(h)}
                  onPointerMove={onMove(h)}
                  onPointerUp={onUp(h)}
                  onPointerCancel={onUp(h)}
                  onLostPointerCapture={onUp(h)}
                />
              </g>
            );
          })}

          {hint && !embedded && (
            <text className="sc-hint" x={W - 16} y={40} textAnchor="end">
              {hint}
            </text>
          )}
        </svg>
      </div>

      {(actions || badges.length > 0 || (progress && !embedded)) && (
        <div className="sc-controls">
          {actions && <CutMoveAssembleBar actions={actions} visible={visibleActions} />}
          {badges.map((b) => (
            <span key={b} className="sc-badge">
              {b}
            </span>
          ))}
          <span className="sc-spacer" />
          {progress && !embedded && (
            <SvgSlider
              value={progress.t}
              onChange={progress.onChange}
              onDragStart={progress.onDragStart}
              onDragEnd={progress.onDragEnd}
              disabled={progress.disabled}
              label="转化进度"
            />
          )}
        </div>
      )}
    </div>
  );
}
