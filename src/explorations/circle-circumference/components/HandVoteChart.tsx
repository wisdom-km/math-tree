import { useState, type Dispatch } from "react";
import type { Action } from "../model/reducer";
import type { HandVoteCandidate, State, Step } from "../model/types";
import { OnScreenKeypad } from "./OnScreenKeypad";

interface Props {
  state: State;
  dispatch: Dispatch<Action>;
  step: Step;
  /** 固定候选（来自内容文件），没有则由老师用键盘添加数值候选 */
  options?: readonly string[];
  /** 实测参考值（步骤 7 回看时画竖线、标最接近的柱） */
  reference?: number | null;
  closestLabel?: string | null;
  title?: string;
  interactive?: boolean;
}

/** 举手分布（匿名、只当堂用）：候选 +1/−1，柱状图实时变高。 */
export function HandVoteChart({ state, dispatch, step, options, reference, closestLabel, title, interactive = true }: Props) {
  const [adding, setAdding] = useState(false);
  const stored = state.handVotes[step] ?? [];
  const list: HandVoteCandidate[] = options
    ? options.map((label) => stored.find((c) => c.label === label) ?? { label, count: 0 })
    : [...stored].sort((a, b) => parseFloat(a.label) - parseFloat(b.label));
  const max = Math.max(1, ...list.map((c) => c.count));

  return (
    <div className="hand-vote" aria-label={title ?? "举手分布"}>
      {title && <h3>{title}</h3>}
      {list.length === 0 ? (
        <p className="muted">老师点「添加候选」，写下孩子们说出的数。</p>
      ) : (
        <>
          <div className="bars">
            {list.map((c) => (
              <div className="bar-col" key={c.label}>
                <span className="count">{c.count}</span>
                <div
                  className={`bar ${closestLabel === c.label ? "closest" : ""}`}
                  style={{ height: `${Math.max(2, (c.count / max) * 100)}%` }}
                  aria-label={`${c.label}：${c.count} 人`}
                />
              </div>
            ))}
          </div>
          <div className="labels">
            {list.map((c) => (
              <div className="label-col" key={c.label}>
                <span className="lbl">{c.label}</span>
                {interactive && (
                  <div className="pm">
                    <button className="btn" aria-label={`${c.label} 减一`} onClick={() => dispatch({ type: "VOTE", step, label: c.label, delta: -1 })}>
                      −1
                    </button>
                    <button className="btn primary" aria-label={`${c.label} 加一`} onClick={() => dispatch({ type: "VOTE", step, label: c.label, delta: 1 })}>
                      +1
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
      {reference !== undefined && reference !== null && (
        <p className="measured-line">
          实测 {reference.toFixed(2)} cm{closestLabel ? `，最接近的候选是 ${closestLabel}` : ""}
        </p>
      )}
      {!options && interactive && (
        <div className="add">
          <button className="btn" onClick={() => setAdding(true)}>
            + 添加候选
          </button>
        </div>
      )}
      {adding && (
        <OnScreenKeypad
          title="候选值（cm）"
          unit="cm"
          min={1}
          max={200}
          decimals={1}
          onCancel={() => setAdding(false)}
          onConfirm={(v) => {
            dispatch({ type: "ADD_CANDIDATE", step, label: String(v) });
            setAdding(false);
          }}
        />
      )}
    </div>
  );
}
