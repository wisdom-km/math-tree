import { useCallback, useEffect, useRef, useState, type Dispatch } from "react";
import type { Action } from "./model/reducer";
import type { State } from "./model/types";

const DURATION_MS = 1200;
const DEGRADE_KEY = "math-tree.circle-area.degraded";
/** 平均一帧超过 22 ms（< 45 fps）就降级渲染（目标 60 fps，已拍板第 5 条） */
const FRAME_BUDGET_MS = 22;

function loadDegraded(): boolean {
  try {
    return localStorage.getItem(DEGRADE_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * 「拼」按钮：把 assembleT 从当前值走到 1（1.2 s，可再点一次中断 / 拆回 0）。
 * 动画只是不断写 assembleT，画面完全由状态驱动，与拖滑块等价。
 * 同时在动画中测帧率：低端一体机达不到目标时把 `degraded` 置 true（localStorage 记住），
 * 舞台据此改用直边、无缝、无过渡的渲染。
 */
export function useAssembleAnimation(state: State, dispatch: Dispatch<Action>) {
  const [running, setRunning] = useState(false);
  const [degraded, setDegraded] = useState<boolean>(loadDegraded);
  const raf = useRef<number | null>(null);
  const tRef = useRef(state.assembleT);
  tRef.current = state.assembleT;
  const nRef = useRef(state.n);
  nRef.current = state.n;

  const stop = useCallback(() => {
    if (raf.current !== null) cancelAnimationFrame(raf.current);
    raf.current = null;
    setRunning(false);
  }, []);

  useEffect(() => stop, [stop]);

  const markDegraded = useCallback((on: boolean) => {
    setDegraded(on);
    try {
      localStorage.setItem(DEGRADE_KEY, on ? "1" : "0");
    } catch {
      /* 无 localStorage */
    }
  }, []);

  const toggle = useCallback(() => {
    if (raf.current !== null) {
      stop();
      return;
    }
    if (!state.cutDone) return;
    if (tRef.current >= 1) {
      dispatch({ type: "SET_ASSEMBLE_T", t: 0 });
      return;
    }
    const from = tRef.current;
    const total = DURATION_MS * (1 - from);
    const start = performance.now();
    let frames = 0;
    setRunning(true);
    const tick = (now: number) => {
      frames++;
      const p = Math.min(1, (now - start) / total);
      const t = from + (1 - from) * p;
      dispatch({ type: "SET_ASSEMBLE_T", t });
      if (p < 1) {
        raf.current = requestAnimationFrame(tick);
      } else {
        raf.current = null;
        setRunning(false);
        const avg = (now - start) / Math.max(1, frames - 1);
        // 只在大 n 下评估；差一帧不算，看平均
        if (nRef.current >= 64 && frames > 10 && avg > FRAME_BUDGET_MS && !degraded) markDegraded(true);
      }
    };
    raf.current = requestAnimationFrame(tick);
  }, [state.cutDone, dispatch, stop, degraded, markDegraded]);

  return { running, toggle, stop, degraded, setDegraded: markDegraded };
}
