import { useRef, useState, type Dispatch, type PointerEvent as ReactPointerEvent } from "react";
import { ownerSvg, svgPoint } from "@/explorations/circle-circumference/components/svg-utils";
import type { Action } from "../model/reducer";
import { RECT_A_MAX, RECT_A_MIN, RECT_B_MAX, RECT_B_MIN, type RectChoice, type State } from "../model/types";

const W = 1380;
const H = 640;
const SCALE = 44;
/** 长方形左下角固定在网格原点 */
const X0 = 160;
const Y0 = 560;

interface Props {
  state: State;
  dispatch: Dispatch<Action>;
  interactive: boolean;
}

/**
 * 步骤 0 回忆：长方形面积（数格子 = 长 × 宽）。
 *
 * TODO(area-chain): 这是转化链第 1 站「长方形」的嵌入模式（docs/explorations/area-chain.md 第 6 节）。
 * 链在 m1/area-chain 分支落地后，把本组件替换为：
 *   <ChainStation station="rect" embedded size={{ width, height }}
 *     initial={{ param: state.step0.a, fixed: { b: state.step0.b } }}
 *     prompt="长方形的面积 = ____ × ____"
 *     onFillIn={(ok) => ok && dispatch({ type: "STEP0_CHOOSE", choice: "长 × 宽" })}
 *     onAction={(evt) => …} />
 * 宿主只消费 onFillIn（解锁「下一步」）与 onAction（进宿主撤销栈）；链的状态由链自己持有。
 * 三角形回忆按已拍板第 6 条不放在这里，改为首次点「拆成三角形」时弹出（TriRecallModal）。
 */
export function RecallStage({ state, dispatch, interactive }: Props) {
  const s0 = state.step0;
  const a = s0.a;
  const b = s0.b;
  const wPx = a * SCALE;
  const hPx = b * SCALE;
  const [rowMode, setRowMode] = useState(false);
  const ptrs = useRef<Map<number, "a" | "b">>(new Map());

  const capture = (e: ReactPointerEvent<SVGElement>) => {
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* 合成事件 */
    }
  };
  const onDown = (which: "a" | "b") => (e: ReactPointerEvent<SVGElement>) => {
    if (!interactive) return;
    if ([...ptrs.current.values()].includes(which)) return;
    capture(e);
    ptrs.current.set(e.pointerId, which);
  };
  const onMove = (e: ReactPointerEvent<SVGElement>) => {
    const which = ptrs.current.get(e.pointerId);
    if (!which) return;
    const svg = ownerSvg(e);
    if (!svg) return;
    const p = svgPoint(svg, e);
    if (which === "a") dispatch({ type: "STEP0_SET_A", a: (p.x - X0) / SCALE });
    else dispatch({ type: "STEP0_SET_B", b: (Y0 - p.y) / SCALE });
  };
  const onUp = (e: ReactPointerEvent<SVGElement>) => {
    ptrs.current.delete(e.pointerId);
  };

  const wrong = s0.choice !== null && s0.choice !== "长 × 宽" && !s0.correct;
  const choices: RectChoice[] = ["长 × 宽", "长 + 宽", "边 × 4"];
  const cells: { i: number; j: number }[] = [];
  const cols = Math.round(a * 2) / 2;
  const rows = Math.round(b * 2) / 2;
  for (let i = 0; i < Math.ceil(cols); i++) for (let j = 0; j < Math.ceil(rows); j++) cells.push({ i, j });
  const total = a * b;
  const square = Math.abs(a - b) < 1e-9;

  return (
    <>
      <div className="stage-svg-wrap">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" aria-label="回忆长方形面积">
          {/* 网格 */}
          {Array.from({ length: Math.ceil(W / SCALE) + 1 }, (_, i) => (
            <line key={`v${i}`} className={i % 5 === 0 ? "grid-major" : "grid-minor"} x1={X0 + (i - 3) * SCALE} y1={0} x2={X0 + (i - 3) * SCALE} y2={H} />
          ))}
          {Array.from({ length: Math.ceil(H / SCALE) + 1 }, (_, j) => (
            <line key={`h${j}`} className={j % 5 === 0 ? "grid-major" : "grid-minor"} x1={0} y1={Y0 - (j - 1) * SCALE} x2={W} y2={Y0 - (j - 1) * SCALE} />
          ))}

          {/* 格子逐个涂蓝并计数 */}
          {cells.map(({ i, j }, k) => {
            const cw = Math.min(1, a - i) * SCALE;
            const ch = Math.min(1, b - j) * SCALE;
            const idx = rowMode ? j * Math.ceil(cols) + i : k;
            return (
              <g key={`${i}-${j}`} className="cell" style={rowMode ? { animationDelay: `${idx * 40}ms` } : undefined}>
                <rect className={`cell-fill ${wrong ? "dim" : ""}`} x={X0 + i * SCALE} y={Y0 - j * SCALE - ch} width={cw} height={ch} />
                {total <= 40 && cw === SCALE && ch === SCALE && (
                  <text className="cell-num" x={X0 + i * SCALE + SCALE / 2} y={Y0 - j * SCALE - SCALE / 2 + 8} textAnchor="middle">
                    {rowMode ? j * Math.ceil(cols) + i + 1 : k + 1}
                  </text>
                )}
              </g>
            );
          })}

          {/* 长方形边框；选错时周长描边高亮流动 */}
          <rect className={`recall-rect ${wrong ? "perimeter-flow" : ""} ${square ? "flash" : ""}`} x={X0} y={Y0 - hPx} width={wPx} height={hPx} />

          {/* 标注：长（青绿）、宽（橙色虚线） */}
          <line className="dim-line arc" x1={X0} y1={Y0 + 26} x2={X0 + wPx} y2={Y0 + 26} />
          <text className="svg-num arc" x={X0 + wPx / 2} y={Y0 + 64} textAnchor="middle">
            长 = {a.toFixed(1)} cm
          </text>
          <line className="dim-line orange dashed" x1={X0 - 26} y1={Y0} x2={X0 - 26} y2={Y0 - hPx} />
          <text className="svg-num orange" x={X0 - 40} y={Y0 - hPx / 2 + 10} textAnchor="end">
            宽 = {b.toFixed(1)} cm
          </text>

          {/* 拖点：右边线中点（长）；老师模式上边线中点（宽） */}
          <circle className="r-handle" cx={X0 + wPx} cy={Y0 - hPx / 2} r={18} />
          <circle className="hit" cx={X0 + wPx} cy={Y0 - hPx / 2} r={34} onPointerDown={onDown("a")} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onLostPointerCapture={onUp} />
          {state.mode === "teacher" && (
            <>
              <circle className="r-handle" cx={X0 + wPx / 2} cy={Y0 - hPx} r={18} />
              <circle className="hit" cx={X0 + wPx / 2} cy={Y0 - hPx} r={34} onPointerDown={onDown("b")} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onLostPointerCapture={onUp} />
            </>
          )}

          {/* 算式卡（活公式雏形） */}
          <g transform="translate(800 80)">
            <text className="svg-num">
              S = 长 × 宽 = <tspan fill="var(--c-arc)">{a.toFixed(1)}</tspan> × <tspan fill="var(--c-diameter)">{b.toFixed(1)}</tspan> ={" "}
              <tspan className="svg-num" fill="var(--c-primary)">
                {(a * b).toFixed(1)}
              </tspan>{" "}
              cm²
            </text>
            <text className="svg-label muted" y={44}>
              {rowMode ? `${rows} 行 × 每行 ${cols} 个 —— 几个几` : `一共 ${(a * b).toFixed(1)} 个 1 cm² 的格子`}
            </text>
            {square && (
              <text className="svg-num" y={100} fill="var(--c-ok)">
                长 = 宽：正方形 · 边长 × 边长 = {a.toFixed(1)} × {a.toFixed(1)} = {(a * a).toFixed(1)}
              </text>
            )}
          </g>
          <text className="svg-label muted" x={40} y={50}>
            拖橙点改长，看格子数与算式一起变（{RECT_A_MIN}–{RECT_A_MAX}；宽 {RECT_B_MIN}–{RECT_B_MAX} 老师可改）
          </text>
          <text className="svg-label muted" x={W - 40} y={H - 30} textAnchor="end">
            上节课的结论：周长 C = 2 × 3.14 × 半径
          </text>
        </svg>
      </div>
      <div className={`task-card ${s0.correct ? "ok" : ""}`}>
        长方形的面积 = <b>{s0.correct ? "长 × 宽" : "____ × ____"}</b>
        {wrong && <span className="muted">　—— 看看：亮起来流动的那一圈是「边」，涂色的是「面」。</span>}
      </div>
      <div className="choice-row" role="group" aria-label="三选一">
        {choices.map((c) => (
          <button key={c} className="btn" aria-pressed={s0.choice === c} disabled={!interactive} onClick={() => dispatch({ type: "STEP0_CHOOSE", choice: c })}>
            {c}
          </button>
        ))}
        <button className="btn" aria-pressed={rowMode} disabled={!interactive} onClick={() => setRowMode(!rowMode)}>
          一行一行数
        </button>
        {state.mode === "teacher" && interactive && !s0.correct && (
          <button className="btn" onClick={() => dispatch({ type: "STEP0_SKIP" })} aria-pressed={state.step0Skipped}>
            跳过回忆（记日志）
          </button>
        )}
      </div>
    </>
  );
}
