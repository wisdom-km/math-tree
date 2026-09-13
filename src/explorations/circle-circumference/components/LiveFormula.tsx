import { useEffect, useRef, useState, type Dispatch } from "react";
import { formulaC, piText, radius } from "../model/derived";
import type { Action } from "../model/reducer";
import type { State } from "../model/types";
import { fmt2 } from "./svg-utils";

interface Props {
  state: State;
  dispatch: Dispatch<Action>;
  /** 只读回看时不显示切换按钮 */
  interactive?: boolean;
  compact?: boolean;
}

/**
 * 活公式：数字来自同一份状态（d），改 d 两式同步变并高亮。
 * 主计算恒用 3.14；老师模式可把 π 显示切成 3.1416（只改显示）。
 */
export function LiveFormula({ state, dispatch, interactive = true, compact = false }: Props) {
  const s = state;
  const d = s.d;
  const r = radius(s);
  const C = formulaC(s);
  const pi = piText(s);

  const prevD = useRef(d);
  const [changed, setChanged] = useState(false);
  useEffect(() => {
    if (prevD.current !== d) {
      prevD.current = d;
      setChanged(true);
      const t = setTimeout(() => setChanged(false), 320);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [d]);

  const cls = changed ? "changed" : "";
  const byD = (
    <div className={`formula ${s.formulaEmphasis === "r" ? "secondary" : ""}`} aria-label={`C 等于 π 乘 d，等于 ${fmt2(C)}`}>
      <span>C = πd = {pi} ×</span>
      <span className={`var ${cls}`}>{d.toFixed(1)}</span>
      <span>=</span>
      <span className={`res ${cls}`}>{fmt2(C)}</span>
    </div>
  );
  const byR = (
    <div className={`formula ${s.formulaEmphasis === "d" ? "secondary" : ""}`} aria-label={`C 等于 2 π r，等于 ${fmt2(C)}`}>
      <span>C = 2πr = 2 × {pi} ×</span>
      <span className={`var ${cls}`}>{r.toFixed(1)}</span>
      <span>=</span>
      <span className={`res ${cls}`}>{fmt2(C)}</span>
    </div>
  );

  return (
    <div className="live-formula" aria-live="polite">
      {!compact && <h3 style={{ margin: "0 0 0.25rem" }}>圆周率 π · 圆的周长</h3>}
      {s.formulaEmphasis === "d" ? (
        <>
          {byD}
          {byR}
        </>
      ) : (
        <>
          {byR}
          {byD}
        </>
      )}
      <div className="pi-note">
        π 是任意圆周长与直径的比值，是固定的数（无限不循环小数）；应用常取 π ≈ 3.14。
        {pi === "3.1416" && " 这里显示 3.1416，计算仍用 3.14。"}
      </div>
      {interactive && (
        <div className="row">
          <button
            className="btn"
            aria-pressed={s.formulaEmphasis === "r"}
            onClick={() => dispatch({ type: "SET_FORMULA_EMPHASIS", emphasis: s.formulaEmphasis === "r" ? "d" : "r" })}
          >
            {s.formulaEmphasis === "r" ? "用直径算" : "用半径算"}
          </button>
          {s.mode === "teacher" && (
            <button
              className="btn"
              aria-pressed={pi === "3.1416"}
              onClick={() => dispatch({ type: "SET_PI_PRECISION", precision: pi === "3.1416" ? "3.14" : "3.1416" })}
            >
              更精确：3.1416
            </button>
          )}
        </div>
      )}
    </div>
  );
}
