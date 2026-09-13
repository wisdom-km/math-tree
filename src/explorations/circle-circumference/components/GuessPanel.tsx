import { useState, type Dispatch } from "react";
import { guessValid } from "../model/derived";
import type { Action } from "../model/reducer";
import { GUESS_D, type State } from "../model/types";
import { OnScreenKeypad } from "./OnScreenKeypad";

type Field = "low" | "likely" | "high";
const FIELD_LABEL: Record<Field, string> = { low: "太低", likely: "最可能", high: "太高" };

interface Props {
  state: State;
  dispatch: Dispatch<Action>;
  interactive: boolean;
}

/** 步骤 2 主舞台：示范圆 d = 4 cm + 三个估值槽 */
export function GuessPanel({ state, dispatch, interactive }: Props) {
  const [editing, setEditing] = useState<Field | null>(null);
  const g = state.guess;
  const valid = guessValid(state);
  const filled = g.low !== null && g.likely !== null && g.high !== null;

  return (
    <>
      <div className="stage-svg-wrap" style={{ flex: "1 1 0" }}>
        <svg viewBox="0 0 1380 520" preserveAspectRatio="xMidYMid meet" aria-label="示范圆">
          <line className="ground" x1={200} y1={420} x2={1180} y2={420} />
          <circle className="wheel" cx={690} cy={420 - 150} r={150} />
          <line className="diameter" x1={540} y1={270} x2={840} y2={270} />
          <circle className="diameter-handle" cx={540} cy={270} r={16} />
          <circle className="diameter-handle" cx={840} cy={270} r={16} />
          <circle className="red-point" cx={690} cy={420} r={11} />
          <text className="svg-num" x={690} y={250} textAnchor="middle" fill="var(--c-diameter)">
            d = {GUESS_D.toFixed(0)} cm
          </text>
          <text className="svg-label" x={690} y={490} textAnchor="middle">
            滚一圈，地面大约多长？
          </text>
        </svg>
      </div>
      <div className="guess-slots" role="group" aria-label="三个估值">
        {(["low", "likely", "high"] as Field[]).map((f) => (
          <button key={f} className="guess-slot" aria-pressed={editing === f} onClick={() => interactive && setEditing(f)}>
            <span className="label">{FIELD_LABEL[f]}</span>
            <span className="value">{g[f] === null ? "？" : `${g[f]} cm`}</span>
          </button>
        ))}
      </div>
      <p className={`hint ${valid ? "ok" : ""}`}>
        {!filled
          ? "三个都填上：太低 < 最可能 < 太高"
          : valid
            ? "等会儿滚完再看谁最准"
            : "要满足 太低 < 最可能 < 太高"}
      </p>
      {editing && (
        <OnScreenKeypad
          title={`${FIELD_LABEL[editing]}（cm）`}
          unit="cm"
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
