import { useEffect, useReducer, useRef, type Dispatch } from "react";
import { fillCheck } from "./model/derived";
import { initialState, reducer, type Action, type StationInit } from "./model/reducer";
import type { ShapeStationId } from "./model/types";
import { StationView } from "./StationView";
import "./area-chain.css";

/** 回传宿主的事件（只作日志 / 提示用；嵌入站不进宿主撤销栈，已拍板第 6 条） */
export interface ChainStationEvent {
  station: ShapeStationId;
  action: Action["type"];
}

export interface ChainStationProps {
  station: ShapeStationId;
  /** 宿主可指定初值，如长方形 6 × 4 */
  initial?: StationInit;
  /** 宿主提供的一行短提示，如「长方形的面积 = ____ × ____」 */
  prompt?: string;
  /** 填空结果回传：每次提交调用一次，宿主据此决定是否解锁「下一步」 */
  onFillIn?: (ok: boolean) => void;
  /** 拖参数 / 拼等事件回传（信息用） */
  onAction?: (evt: ChainStationEvent) => void;
  /** 宿主是否允许操作（回看时只读） */
  interactive?: boolean;
}

/**
 * 嵌入用封装（交互稿 6.2）：作为其他探究单的第 0 步「回忆」。
 * - 组件内部仍走链的单一数据源（独立 reducer 实例），宿主只拿到事件与结果；
 * - 隐藏链顶栏 / 链条 / 情境 / 进度滑块，只显示本站核心动作（第 2 站预先剪好只留「拼」）；
 * - 只可重置本站，不进宿主撤销栈；
 * - 不写证据（由宿主记 step0_fill_completed）。
 */
export function ChainStation({ station, initial, prompt, onFillIn, onAction, interactive = true }: ChainStationProps) {
  const [state, rawDispatch] = useReducer(
    reducer,
    { station, embedded: true, initial: { [station]: { ...initial, preCut: station === "para" } } },
    initialState,
  );
  const onActionRef = useRef(onAction);
  onActionRef.current = onAction;
  const dispatch: Dispatch<Action> = (a) => {
    rawDispatch(a);
    if (a.type !== "SET_T") onActionRef.current?.({ station, action: a.type });
  };

  const st = state.stations[station];
  const onFillRef = useRef(onFillIn);
  onFillRef.current = onFillIn;
  const submittedRef = useRef(false);
  useEffect(() => {
    if (st.fillSubmitted && !submittedRef.current) onFillRef.current?.(fillCheck(station, st.fillIn));
    submittedRef.current = st.fillSubmitted;
  }, [st.fillSubmitted, st.fillIn, station]);

  return (
    <div className="chain-embed">
      <StationView station={station} state={state} dispatch={dispatch} embedded interactive={interactive} prompt={prompt} />
      <div className="chain-embed-actions">
        <button className="btn" disabled={!interactive} onClick={() => dispatch({ type: "RESET_STATION", init: initial })}>
          重置本站
        </button>
      </div>
    </div>
  );
}
