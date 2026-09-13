import type { Dispatch } from "react";
import { href } from "@/app/router";
import { fmt2 } from "@/explorations/circle-circumference/components/svg-utils";
import { currentApprox, formulaS, gapToTrue, n128Available } from "../model/derived";
import type { Action } from "../model/reducer";
import { N_EASTER, type State } from "../model/types";

interface Props {
  state: State;
  dispatch: Dispatch<Action>;
  interactive: boolean;
}

/**
 * 步骤 9 延伸：六下圆柱钩子、圆环 / 方圆两个迷你探究单入口（已拍板第 7 条独立成单）、
 * n = 128 彩蛋、易混并排入口。
 */
export function ExtensionStage({ state, dispatch, interactive }: Props) {
  const s = state;
  const approx = currentApprox(s);
  const gap = Math.abs(gapToTrue(s));
  const easter = n128Available(s);

  return (
    <div className="extension">
      <div className="hook">
        六下我们会问——把圆「立起来」变成<b>圆柱</b>，体积怎么算？（树上暂无节点，先记着这个问题）
      </div>

      <div className="ext-grid">
        <a className="ext-card" href={href("/explore/exp-6a-05-ring")}>
          <svg viewBox="0 0 200 120" aria-hidden>
            <circle cx={100} cy={60} r={52} fill="var(--c-area)" stroke="var(--c-wheel-stroke)" strokeWidth={4} />
            <circle cx={100} cy={60} r={22} fill="var(--c-panel)" stroke="var(--c-wheel-stroke)" strokeWidth={4} />
          </svg>
          <div>
            <b>延伸 A · 圆环</b>
            <div className="muted">光盘：外圆 − 内圆；两种算法结果一样吗？</div>
          </div>
        </a>
        <a className="ext-card" href={href("/explore/exp-6a-05-square-circle")}>
          <svg viewBox="0 0 200 120" aria-hidden>
            <rect x={10} y={10} width={100} height={100} fill="none" stroke="var(--c-warn)" strokeWidth={4} />
            <circle cx={60} cy={60} r={50} fill="var(--c-area)" stroke="var(--c-wheel-stroke)" strokeWidth={4} />
            <circle cx={150} cy={60} r={45} fill="var(--c-area)" stroke="var(--c-wheel-stroke)" strokeWidth={4} />
            <polygon points="150,15 195,60 150,105 105,60" fill="none" stroke="var(--c-warn)" strokeWidth={4} />
          </svg>
          <div>
            <b>延伸 B · 外方内圆 / 外圆内方</b>
            <div className="muted">正方形与圆的面积差是 r² 的几倍？</div>
          </div>
        </a>
      </div>

      <div className="task-card">
        <b>彩蛋 · n = 128</b>
        {easter ? (
          <>
            {" "}
            <button className="btn" aria-pressed={s.n === N_EASTER} disabled={!interactive} onClick={() => dispatch({ type: "SET_N", n: N_EASTER })}>
              切到 128 份
            </button>
            {s.n === N_EASTER && (
              <span>
                　拼出 ≈ {fmt2(approx.area)}，精确 {fmt2(formulaS(s.r))}，相差 {gap < 0.005 ? "不到 0.01" : fmt2(gap)} cm² ——「割之又割，以至于不可割」
              </span>
            )}
            {s.n === N_EASTER && !s.cutDone && <span className="muted">　回步骤 3 剪一剪、拼一拼看看。</span>}
          </>
        ) : (
          <span className="muted">　老师模式常显；学生模式在等分数 64 上长按 3 秒解锁。</span>
        )}
      </div>

      <div className="choice-row">
        <button className="btn primary lg" disabled={!interactive} onClick={() => dispatch({ type: "SET_CONFUSION", on: true })}>
          面积和周长有什么不同？
        </button>
      </div>
    </div>
  );
}
