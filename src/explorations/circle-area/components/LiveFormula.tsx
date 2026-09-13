import { useEffect, useRef, useState, type Dispatch } from "react";
import { fmt2 } from "@/explorations/circle-circumference/components/svg-utils";
import { assembled, currentApprox, formulaS, gapToTrue, piText } from "../model/derived";
import type { Action } from "../model/reducer";
import type { State } from "../model/types";

interface Props {
  state: State;
  dispatch: Dispatch<Action>;
  interactive?: boolean;
  compact?: boolean;
}

/**
 * 活公式：S = 3.14 × r × r，数字来自同一份状态（r），改 r 数字跳变并高亮；
 * 同时显示「n = __ 时拼出 ≈ __，精确 __」，与拼合区、表同一数据源。
 */
export function LiveFormula({ state, dispatch, interactive = true, compact = false }: Props) {
  const s = state;
  const r = s.r;
  const S = formulaS(r);
  const pi = piText(s);
  const approx = currentApprox(s);
  const gap = gapToTrue(s);

  const prevR = useRef(r);
  const [changed, setChanged] = useState(false);
  useEffect(() => {
    if (prevR.current !== r) {
      prevR.current = r;
      setChanged(true);
      const t = setTimeout(() => setChanged(false), 320);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [r]);
  const cls = changed ? "changed" : "";

  return (
    <div className="live-formula" aria-live="polite">
      {!compact && <h3 style={{ margin: "0 0 0.25rem" }}>圆的面积</h3>}
      <div className="formula" aria-label={`S 等于 π r 平方，等于 ${fmt2(S)}`}>
        <span>S = πr² = {pi} ×</span>
        <span className={`var ${cls}`}>{r.toFixed(1)}</span>
        <span>×</span>
        <span className={`var ${cls}`}>{r.toFixed(1)}</span>
        <span>=</span>
        <span className={`res ${cls}`}>{fmt2(S)}</span>
        <span>cm²</span>
      </div>
      <div className="pi-note">
        r² 读作「r 的平方」，表示 r × r。
        {pi === "3.1416" && " 这里显示 3.1416，计算仍用 3.14。"}
      </div>
      <div className="formula secondary">
        n = {s.n} 时拼出 ≈ <span className="res">{assembled(s) ? fmt2(approx.area) : `${fmt2(approx.area)}（未拼到位）`}</span>，精确 {fmt2(S)}
        {assembled(s) && <span className="muted">，相差 {Math.abs(gap) < 0.005 ? "不到 0.01" : fmt2(Math.abs(gap))}</span>}
      </div>
      {interactive && s.mode === "teacher" && (
        <div className="row">
          <button
            className="btn"
            aria-pressed={pi === "3.1416"}
            onClick={() => dispatch({ type: "SET_PI_PRECISION", precision: pi === "3.1416" ? "3.14" : "3.1416" })}
          >
            更精确：3.1416
          </button>
        </div>
      )}
    </div>
  );
}
