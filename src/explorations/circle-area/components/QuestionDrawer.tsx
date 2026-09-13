import { useState, type Dispatch } from "react";
import type { QuestionCard } from "@/content/schema";
import type { Action } from "../model/reducer";
import { STEP_LABEL, type State, type Step } from "../model/types";
import { HandVoteChart } from "./HandVoteChart";

interface Props {
  state: State;
  dispatch: Dispatch<Action>;
  cards: QuestionCard[];
  onClose: () => void;
}

const QUICK_VOTE = ["同意", "不同意", "不确定"] as const;

/** 老师提问卡侧抽屉（半宽）。步骤 8 显示全部；其余按当前步骤过滤。与周长探究单同款。 */
export function QuestionDrawer({ state, dispatch, cards, onClose }: Props) {
  const s = state;
  const shown = s.step === 8 ? cards : cards.filter((c) => c.step === s.step);
  const [cursor, setCursor] = useState(0);
  const [quickVote, setQuickVote] = useState(false);
  const flat = shown.flatMap((c) => c.questions.map((q, i) => ({ step: c.step as Step, q, key: `${c.step}:${i}` })));
  const current = flat[cursor % Math.max(1, flat.length)];
  const handVote = shown.length === 1 ? shown[0]!.handVote : undefined;

  return (
    <aside className="qdrawer" aria-label="老师提问卡">
      <h3>
        提问卡 · {s.step === 8 ? "全部步骤" : `步骤 ${s.step} ${STEP_LABEL[s.step]}`}
        <button className="btn" style={{ float: "right" }} onClick={onClose}>
          关闭
        </button>
      </h3>
      {flat.length === 0 && <p className="muted">本步没有预置问题。</p>}
      {flat.map((item, i) => (
        <div key={item.key} className={`q ${s.askedQuestions.includes(item.key) ? "asked" : ""} ${i === cursor ? "" : "muted"}`}>
          <button className="btn" aria-pressed={s.askedQuestions.includes(item.key)} aria-label="标记已问" onClick={() => dispatch({ type: "MARK_ASKED", key: item.key })}>
            {s.askedQuestions.includes(item.key) ? "✓" : "○"}
          </button>
          <span>
            {s.step === 8 && <span className="muted">[{item.step}] </span>}
            {item.q}
          </span>
        </div>
      ))}
      {handVote && <HandVoteChart state={s} dispatch={dispatch} step={s.step} options={handVote} title="投屏举手" />}
      {quickVote && current && <HandVoteChart state={s} dispatch={dispatch} step={8} options={QUICK_VOTE} title={`临时举手：${current.q}`} />}
      <div className="row">
        {flat.length > 1 && (
          <button className="btn primary" onClick={() => setCursor((cursor + 1) % flat.length)}>
            下一问
          </button>
        )}
        <button className="btn" aria-pressed={quickVote} onClick={() => setQuickVote(!quickVote)}>
          临时三选项举手
        </button>
      </div>
    </aside>
  );
}
