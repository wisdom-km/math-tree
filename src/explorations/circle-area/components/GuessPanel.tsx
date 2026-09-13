import { useState, type Dispatch } from "react";
import { OnScreenKeypad } from "@/explorations/circle-circumference/components/OnScreenKeypad";
import { guessSquareArea, guessValid } from "../model/derived";
import type { Action } from "../model/reducer";
import { GUESS_R, type State } from "../model/types";

type Field = "low" | "likely" | "high";
const FIELD_LABEL: Record<Field, string> = { low: "太低", likely: "最可能", high: "太高" };

interface Props {
  state: State;
  dispatch: Dispatch<Action>;
  interactive: boolean;
}

/** 步骤 2 主舞台：示范圆 r = 4 cm + 边长 = 直径的参照正方形（64 cm²）+ 三个估值槽 */
export function GuessPanel({ state, dispatch, interactive }: Props) {
  const [editing, setEditing] = useState<Field | null>(null);
  const g = state.guess;
  const valid = guessValid(state);
  const filled = g.low !== null && g.likely !== null && g.high !== null;
  const sq = guessSquareArea();
  const overSquare = g.likely !== null && g.likely >= sq;
  const S = 56;
  const rPx = GUESS_R * S;

  return (
    <>
      <div className="stage-svg-wrap" style={{ flex: "1 1 0" }}>
        <svg viewBox="0 0 1380 540" preserveAspectRatio="xMidYMid meet" aria-label="示范圆与参照正方形">
          <rect className="square" x={690 - rPx} y={270 - rPx} width={2 * rPx} height={2 * rPx} />
          <circle className="area-fill" cx={690} cy={270} r={rPx} stroke="var(--c-wheel-stroke)" strokeWidth={6} />
          <line className="radius-seg" x1={690} y1={270} x2={690 + rPx} y2={270} />
          <circle cx={690} cy={270} r={6} fill="var(--c-wheel-stroke)" />
          <text className="svg-num" x={690 + rPx / 2} y={250} textAnchor="middle" fill="var(--c-diameter)">
            r = {GUESS_R.toFixed(0)} cm
          </text>
          <text className="svg-num" x={690 + rPx + 24} y={270 - rPx + 40} fill="var(--c-warn)">
            正方形边长 = 直径 = {2 * GUESS_R} cm
          </text>
          <text className="svg-num" x={690 + rPx + 24} y={270 - rPx + 88} fill="var(--c-warn)">
            面积 = {2 * GUESS_R} × {2 * GUESS_R} = {sq} cm²
          </text>
          <text className="svg-label" x={690} y={510} textAnchor="middle">
            圆的面积大约多少 cm²？
          </text>
        </svg>
      </div>
      <div className="guess-slots" role="group" aria-label="三个估值">
        {(["low", "likely", "high"] as Field[]).map((f) => (
          <button key={f} className="guess-slot" aria-pressed={editing === f} onClick={() => interactive && setEditing(f)}>
            <span className="label">{FIELD_LABEL[f]}</span>
            <span className="value">{g[f] === null ? "？" : `${g[f]} cm²`}</span>
          </button>
        ))}
      </div>
      <p className={`hint ${valid ? "ok" : ""}`}>
        {!filled ? "三个都填上：太低 < 最可能 < 太高" : valid ? "等会儿拼完再看谁最准" : "要满足 太低 < 最可能 < 太高"}
        {overSquare && "　圆装在正方形里面，会比正方形大吗？"}
      </p>
      {editing && (
        <OnScreenKeypad
          title={`${FIELD_LABEL[editing]}（cm²）`}
          unit="cm²"
          initial={g[editing]}
          min={0.1}
          max={999}
          decimals={1}
          onCancel={() => setEditing(null)}
          onConfirm={(v) => {
            dispatch({ type: "SET_GUESS", field: editing, value: v });
            setEditing(null);
          }}
        />
      )}
    </>
  );
}
