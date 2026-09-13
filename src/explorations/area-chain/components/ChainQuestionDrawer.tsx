import { useState, type Dispatch } from "react";
import type { QuestionCard } from "@/content/schema";
import { stationIndex } from "../model/derived";
import type { Action } from "../model/reducer";
import { STATION_TITLE, type State } from "../model/types";

interface Props {
  state: State;
  dispatch: Dispatch<Action>;
  /** 内容文件里 questionCards 的 step 字段 = 站序号 1–5 */
  cards: QuestionCard[];
  onClose: () => void;
}

/** 老师提问卡侧抽屉（迷你单：每站 2 条，不做举手分布） */
export function ChainQuestionDrawer({ state, dispatch, cards, onClose }: Props) {
  const idx = stationIndex(state.station) + 1;
  const shown = cards.filter((c) => c.step === idx);
  const flat = shown.flatMap((c) => c.questions.map((q, i) => ({ q, key: `${c.step}:${i}` })));
  const [cursor, setCursor] = useState(0);

  return (
    <aside className="chain-qdrawer" aria-label="老师提问卡">
      <h3>
        提问卡 · 第 {idx} 站 {STATION_TITLE[state.station]}
        <button className="btn" style={{ float: "right" }} onClick={onClose}>
          关闭
        </button>
      </h3>
      {flat.length === 0 && <p className="muted">本站没有预置问题。</p>}
      {flat.map((item, i) => (
        <div key={item.key} className={`q ${state.askedQuestions.includes(item.key) ? "asked" : ""} ${i === cursor % Math.max(1, flat.length) ? "" : "muted"}`}>
          <button className="btn" aria-pressed={state.askedQuestions.includes(item.key)} aria-label="标记已问" onClick={() => dispatch({ type: "MARK_ASKED", key: item.key })}>
            {state.askedQuestions.includes(item.key) ? "✓" : "○"}
          </button>
          <span>{item.q}</span>
        </div>
      ))}
      {flat.length > 1 && (
        <div className="row">
          <button className="btn primary" onClick={() => setCursor((cursor + 1) % flat.length)}>
            下一问
          </button>
        </div>
      )}
    </aside>
  );
}
