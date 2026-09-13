import { useState, type Dispatch } from "react";
import type { Action } from "../model/reducer";
import type { State, TriChoice } from "../model/types";

interface Props {
  state: State;
  dispatch: Dispatch<Action>;
}

const CHOICES: TriChoice[] = ["½", "1", "2"];

/**
 * 首次点「拆成三角形」时弹出的迷你回忆（已拍板第 6 条）：
 * 一个三角形，点「拼」出现第二个完全一样的三角形拼成平行四边形；填 S = ___ × 底 × 高。
 * 选错不打叉：选「1」时第二个三角形半透明，让「多了一个」自己出现；选「2」两个都涂深。
 *
 * TODO(area-chain): 对应转化链第 3 站「三角形」的嵌入模式（只保留「拼」与 ÷ 2 填空），
 * 链落地后可换成 <ChainStation station="tri" embedded prompt="三角形的面积 = ___ × 底 × 高" onFillIn=… />。
 */
export function TriRecallModal({ state, dispatch }: Props) {
  const t = state.triRecall;
  const [joined, setJoined] = useState(false);
  const wrong = t.choice !== null && !t.correct;
  const base = 240;
  const h = 160;
  const x0 = 80;
  const y0 = 260;
  const apexX = x0 + base * 0.6;
  // 第二个三角形：绕右边中点旋转 180° 到位后与原三角形拼成平行四边形
  const secondPts = `${x0},${y0} ${x0 + base},${y0} ${apexX},${y0 - h}`;
  const secondPtsJoined = `${x0 + base},${y0} ${apexX},${y0 - h} ${apexX + base},${y0 - h}`;

  return (
    <div className="modal-backdrop">
      <div className="modal tri-recall" role="dialog" aria-label="回忆三角形面积">
        <h2>先回忆：三角形的面积</h2>
        <svg viewBox="0 0 640 300" preserveAspectRatio="xMidYMid meet">
          {Array.from({ length: 17 }, (_, i) => (
            <line key={`v${i}`} className="grid-minor" x1={i * 40} y1={0} x2={i * 40} y2={300} />
          ))}
          {Array.from({ length: 8 }, (_, j) => (
            <line key={`h${j}`} className="grid-minor" x1={0} y1={j * 40 + 20} x2={640} y2={j * 40 + 20} />
          ))}
          <polygon className={`tri-second ${joined ? "joined" : ""} ${t.choice === "1" && wrong ? "ghost" : ""} ${t.choice === "2" && wrong ? "deep" : ""}`} points={joined ? secondPtsJoined : secondPts} />
          <polygon className={`tri-first ${t.choice === "2" && wrong ? "deep" : ""}`} points={`${x0},${y0} ${x0 + base},${y0} ${apexX},${y0 - h}`} />
          <line className="dim-line arc" x1={x0} y1={y0 + 20} x2={x0 + base} y2={y0 + 20} />
          <text className="svg-label arc" x={x0 + base / 2} y={y0 + 50} textAnchor="middle">
            底
          </text>
          <line className="dim-line orange dashed" x1={apexX} y1={y0} x2={apexX} y2={y0 - h} />
          <text className="svg-label orange" x={apexX + 10} y={y0 - h / 2}>
            高
          </text>
          {joined && (
            <text className="svg-label" x={x0 + base} y={40} textAnchor="middle">
              两个完全一样的三角形 → 一个平行四边形
            </text>
          )}
          {wrong && t.choice === "1" && (
            <text className="svg-label" x={460} y={140} fill="var(--c-warn)">
              多了一个
            </text>
          )}
          {wrong && t.choice === "2" && (
            <text className="svg-label" x={420} y={140} fill="var(--c-warn)">
              这是两个三角形的面积
            </text>
          )}
        </svg>
        <div className="sentence">
          三角形的面积 = <b>{t.correct ? "½" : "___"}</b> × 底 × 高
        </div>
        <div className="choice-row">
          <button className="btn" aria-pressed={joined} onClick={() => setJoined(!joined)}>
            {joined ? "收回" : "拼"}
          </button>
          {CHOICES.map((c) => (
            <button key={c} className="btn" aria-pressed={t.choice === c} onClick={() => dispatch({ type: "TRI_RECALL_CHOOSE", choice: c })}>
              {c}
            </button>
          ))}
        </div>
        <div className="actions">
          {state.mode === "teacher" && !t.correct && (
            <button className="btn lg" onClick={() => dispatch({ type: "TRI_RECALL_CLOSE" })}>
              老师：先跳过
            </button>
          )}
          <button className="btn lg primary" disabled={!t.correct} onClick={() => dispatch({ type: "TRI_RECALL_CLOSE" })}>
            {t.correct ? "对，去拆三角形" : "选出那个数"}
          </button>
        </div>
      </div>
    </div>
  );
}
