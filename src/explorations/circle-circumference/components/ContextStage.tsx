import { useState, type Dispatch } from "react";
import type { Action } from "../model/reducer";
import type { State } from "../model/types";

interface Props {
  state: State;
  dispatch: Dispatch<Action>;
  interactive: boolean;
}

/** 步骤 1 情境：圆桌面裂了，要在边缘箍一圈铁皮——铁皮要多长？（不出现「周长」「π」） */
export function ContextStage({ dispatch, interactive }: Props) {
  const [aside, setAside] = useState(false);
  return (
    <>
      <div className="stage-svg-wrap">
        <svg viewBox="0 0 1380 700" preserveAspectRatio="xMidYMid meet" aria-label="圆桌情境">
          {/* 圆桌俯视 */}
          <circle cx={520} cy={350} r={230} fill="#f2e2c4" stroke="#b58a4a" strokeWidth={10} />
          <circle cx={520} cy={350} r={200} fill="none" stroke="#d9c39a" strokeWidth={2} />
          {/* 裂缝 */}
          <polyline points="470,190 500,260 480,320 520,380 505,440 540,510" fill="none" stroke="#6b4a1e" strokeWidth={6} strokeLinejoin="round" />
          {/* 一段铁皮弯成弧（未给长度） */}
          <path d="M 900 560 A 230 230 0 0 1 1140 190" fill="none" stroke="#5c6672" strokeWidth={26} strokeLinecap="round" />
          <path d="M 900 560 A 230 230 0 0 1 1140 190" fill="none" stroke="#9aa3ad" strokeWidth={10} strokeLinecap="round" />
          <text className="svg-num" x={1090} y={420} textAnchor="middle" fontSize={64}>
            ？
          </text>
          <text className="svg-label" x={1010} y={640} textAnchor="middle">
            这段铁皮要多长？
          </text>
          <text className="svg-label muted" x={520} y={640} textAnchor="middle">
            圆桌面裂了，要在边缘箍一圈铁皮
          </text>
        </svg>
      </div>
      {aside && <div className="task-card">可以绕绳量，也可以滚一圈量。</div>}
      <div className="choice-row">
        <button className="btn" aria-pressed={aside} onClick={() => setAside(!aside)}>
          可以怎么量？
        </button>
        <button className="btn" disabled title="第 1 版不做绕绳量法">
          绕绳示意（下一版）
        </button>
        <button className="btn primary" disabled={!interactive} onClick={() => dispatch({ type: "NEXT_STEP" })}>
          用滚动的办法试试 → 先猜一猜要多长
        </button>
      </div>
    </>
  );
}
