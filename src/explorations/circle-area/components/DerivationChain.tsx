import { useState, type Dispatch } from "react";
import { fmt2 } from "@/explorations/circle-circumference/components/svg-utils";
import { formulaC } from "../model/derived";
import type { Action } from "../model/reducer";
import type { State } from "../model/types";

interface Props {
  state: State;
  dispatch: Dispatch<Action>;
  interactive: boolean;
}

/**
 * 步骤 6 揭示：推导链逐行出现（点一下出一行），S = πr² 在第 3 行首次出现；
 * 「拆成三角形」对照卡与刘徽数学史条可点开。
 */
export function DerivationChain({ state, dispatch, interactive }: Props) {
  const s = state;
  const lines = s.derivationLines;
  const [triCard, setTriCard] = useState(false);
  const [history, setHistory] = useState(false);
  const C = formulaC(s.r);

  return (
    <div className="derivation" aria-label="推导链">
      <h3>长方形 → 圆</h3>
      <ol className="chain">
        <li className={lines >= 1 ? "shown" : ""}>长方形的面积 = 长 × 宽</li>
        <li className={lines >= 2 ? "shown" : ""}>圆的面积 = πr × r</li>
        <li className={`${lines >= 3 ? "shown" : ""} final`}>
          <b>S = πr²</b>
        </li>
      </ol>
      {lines < 3 && interactive && (
        <button className="btn primary lg" onClick={() => dispatch({ type: "REVEAL_LINE" })}>
          {lines === 0 ? "长方形的面积怎么算？" : lines === 1 ? "长和宽分别是圆的什么？" : "写成公式"}
        </button>
      )}
      {lines >= 3 && (
        <p className="hint" style={{ color: "var(--c-text)" }}>
          如果用 S 表示圆的面积，圆的面积计算公式：<b>S = πr²</b>。r² 读作「r 的平方」，表示 r × r。
        </p>
      )}
      <div className="row">
        <button
          className="btn"
          aria-pressed={triCard}
          onClick={() => {
            setTriCard(!triCard);
            if (!triCard) dispatch({ type: "OPEN_TRI_CARD" });
          }}
        >
          另一条路：拆成三角形
        </button>
        <button className="btn" aria-pressed={history} onClick={() => setHistory(!history)}>
          数学史：割之弥细
        </button>
      </div>
      {triCard && (
        <div className="task-card tri-card">
          n 个三角形 = n × ½ × (C ÷ n) × r = ½ × C × r = ½ × 2πr × r = <b>πr²</b>
          <div className="muted" style={{ fontSize: "var(--fs-body)" }}>
            这个圆：½ × {fmt2(C)} × {s.r.toFixed(1)} = {fmt2(0.5 * C * s.r)} cm² —— 两条路殊途同归。
          </div>
        </div>
      )}
      {history && <div className="history-note">刘徽说「割之弥细，所失弥少」：分得越细，丢掉的越少——今天拼到 64 份、128 份，就是这个意思。</div>}
    </div>
  );
}
