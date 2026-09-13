import type { Dispatch } from "react";
import type { ProgressSpec } from "@/shared/shape-canvas";
import type { Action } from "../model/reducer";
import type { State } from "../model/types";

export interface StageProps {
  state: State;
  dispatch: Dispatch<Action>;
  embedded: boolean;
  interactive: boolean;
  /** 「拼」按钮：由 StationView 的动画钩子把 t 走到 1（或回 0） */
  onAssemble: () => void;
  /** 「拼」动画正在进行 */
  assembling: boolean;
  /** 转化进度滑块（嵌入模式不显示） */
  progress: ProgressSpec | null;
}
