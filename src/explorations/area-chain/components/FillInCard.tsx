import type { Dispatch } from "react";
import { fillCheck, fillFeedback } from "../model/derived";
import type { Action } from "../model/reducer";
import { FILL_OPTIONS, type ShapeStationId, type StationState } from "../model/types";

interface Props {
  station: ShapeStationId;
  st: StationState;
  dispatch: Dispatch<Action>;
  interactive: boolean;
  /** 嵌入模式由宿主提供的一行短提示 */
  prompt?: string;
}

const FEEDBACK_TEXT: Record<string, string> = {
  perimeter: "流动的红线是周长（边上的长），涂色的是面积（面有多大）——它们是两回事。",
  slant: "把斜边竖起来和高放在一起——斜边长出了一截。算面积要用高。",
  "half-right": "拼成长方形后确实是长 × 宽。那长方形的长和宽，分别是平行四边形的什么？",
  double: "这是两个三角形的面积。",
  borrowed: "这一半是借来的。",
  leg: "把腰竖起来和高放在一起——腰更长。算面积要用高。",
};

/** 各站填空句式（用词见交互稿附录 A） */
function Sentence({ station, st }: { station: ShapeStationId; st: StationState }) {
  const blank = (i: number, w = "____") => {
    const v = st.fillIn[i];
    return <span className={`blank ${v ? "" : "empty"}`}>{v ?? w}</span>;
  };
  switch (station) {
    case "rect":
      return (
        <>
          长方形的面积 = {blank(0, "____ × ____")}
        </>
      );
    case "para":
      return (
        <>
          平行四边形的面积 = {blank(0, "____ × ____")}
        </>
      );
    case "tri":
      return (
        <>
          三角形的面积 = 底 × 高 {blank(0)}
        </>
      );
    case "trap":
      return (
        <>
          梯形的面积 = ( {blank(0)} + {blank(1)} ) × 高 ÷ 2
        </>
      );
  }
}

/**
 * 填空卡：三选一（或双空芯片）。选错不打叉，用对照反馈（第 4 节各站写明）。
 * 单选站选中即提交；梯形双空选满两个再点「确定」。
 */
export function FillInCard({ station, st, dispatch, interactive, prompt }: Props) {
  const passed = st.fillPassed;
  const fb = fillFeedback(station, st);
  const options = FILL_OPTIONS[station];
  const okNow = st.fillSubmitted && fillCheck(station, st.fillIn);

  const choose = (v: string) => {
    if (!interactive) return;
    dispatch({ type: "SET_FILL", value: v });
    if (station !== "trap") dispatch({ type: "SUBMIT_FILL" });
  };

  return (
    <div className={`chain-fill ${passed ? "passed" : ""}`} aria-label="填空卡">
      {prompt && <div className="chain-fill-prompt">{prompt}</div>}
      <div className="sentence">
        <Sentence station={station} st={st} />
        {passed && <span className="ok-mark" aria-label="填对了">✓</span>}
      </div>
      <div className="chips" role="group" aria-label="选项">
        {options.map((o) => {
          const highlight = fb?.kind === "half-right" && o === "底 × 高";
          return (
            <button key={o} className={`btn ${highlight ? "hl" : ""}`} aria-pressed={st.fillIn.includes(o)} disabled={!interactive} onClick={() => choose(o)}>
              {o}
            </button>
          );
        })}
        {station === "trap" && (
          <button className="btn primary" disabled={!interactive || st.fillIn.length < 2} onClick={() => dispatch({ type: "SUBMIT_FILL" })}>
            确定
          </button>
        )}
      </div>
      {fb && <p className="chain-hint">{FEEDBACK_TEXT[fb.kind]}</p>}
      {okNow && <p className="chain-hint ok">填对了。{station !== "trap" && "算式里的数字就是这么来的。"}</p>}
    </div>
  );
}
