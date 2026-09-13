import { useCallback, useEffect, useRef, useState, type Dispatch } from "react";
import type { ProgressSpec } from "@/shared/shape-canvas";
import { FillInCard } from "./components/FillInCard";
import type { Action } from "./model/reducer";
import { ASSEMBLE_MS, type ShapeStationId, type State } from "./model/types";
import { ParaFormula, ParaStage } from "./stations/ParaStation";
import { RectFormula, RectStage } from "./stations/RectStation";
import { TrapFormula, TrapStage } from "./stations/TrapStation";
import { TriFormula, TriStage } from "./stations/TriStation";
import type { StageProps } from "./stations/types";

interface Props {
  station: ShapeStationId;
  state: State;
  dispatch: Dispatch<Action>;
  embedded?: boolean;
  interactive?: boolean;
  /** 嵌入模式：宿主提供的一行短提示 */
  prompt?: string;
}

/**
 * 「拼」动画：把 t 从当前值走到 1（或从 1 回 0），1.2 秒，可再点一次中断。
 * 动画只是驱动同一份状态里的 t；拖滑块随时可停。
 */
function useAssembleAnimation(t: number, dispatch: Dispatch<Action>, canAssemble: boolean) {
  const raf = useRef<number | null>(null);
  const [assembling, setAssembling] = useState(false);
  const tRef = useRef(t);
  tRef.current = t;

  const stop = useCallback(() => {
    if (raf.current !== null) cancelAnimationFrame(raf.current);
    raf.current = null;
    setAssembling(false);
  }, []);

  const start = useCallback(() => {
    if (!canAssemble) return;
    if (raf.current !== null) {
      stop();
      return;
    }
    const from = tRef.current;
    const to = from >= 1 - 1e-9 ? 0 : 1;
    const duration = ASSEMBLE_MS * Math.abs(to - from);
    dispatch({ type: "BEGIN_ASSEMBLE" });
    if (duration === 0) return;
    const t0 = performance.now();
    setAssembling(true);
    const tick = (now: number) => {
      const k = Math.min(1, (now - t0) / duration);
      const eased = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      dispatch({ type: "SET_T", t: from + (to - from) * eased });
      if (k < 1) raf.current = requestAnimationFrame(tick);
      else {
        raf.current = null;
        setAssembling(false);
      }
    };
    raf.current = requestAnimationFrame(tick);
  }, [canAssemble, dispatch, stop]);

  useEffect(() => stop, [stop]);
  return { start, stop, assembling };
}

/** 一站的舞台 + 右侧算式卡 / 填空卡。独立与嵌入两种模式共用。 */
export function StationView({ station, state, dispatch, embedded = false, interactive = true, prompt }: Props) {
  const st = state.stations[station];
  const canAssemble = station !== "rect" && (station !== "para" || st.cutDone);
  const anim = useAssembleAnimation(st.t, dispatch, canAssemble && interactive);

  // 改参数会把 t 归 0 需重拼：改前弹一行非模态提示（3 秒消失，不拦截）
  const [toast, setToast] = useState<string | null>(null);
  const prevParam = useRef(st.param);
  const prevProgress = useRef({ t: st.t, cut: st.cutDone });
  useEffect(() => {
    if (prevParam.current !== st.param) {
      if (prevProgress.current.t > 0 || (station === "para" && prevProgress.current.cut && !embedded)) {
        anim.stop();
        setToast("参数变了，转化进度回到 0，再拼一次");
        const id = setTimeout(() => setToast(null), 3000);
        prevParam.current = st.param;
        prevProgress.current = { t: st.t, cut: st.cutDone };
        return () => clearTimeout(id);
      }
      prevParam.current = st.param;
    }
    prevProgress.current = { t: st.t, cut: st.cutDone };
    return undefined;
  }, [st.param, st.t, st.cutDone, station, embedded, anim]);

  const progress: ProgressSpec | null = embedded
    ? null
    : {
        t: st.t,
        onChange: (t) => dispatch({ type: "SET_T", t }),
        onDragStart: () => {
          anim.stop();
          dispatch({ type: "BEGIN_ASSEMBLE" });
        },
        disabled: !canAssemble || !interactive,
      };

  const props: StageProps = { state, dispatch, embedded, interactive, onAssemble: anim.start, assembling: anim.assembling, progress };

  const stage = (() => {
    switch (station) {
      case "rect":
        return <RectStage state={state} dispatch={dispatch} embedded={embedded} interactive={interactive} />;
      case "para":
        return <ParaStage {...props} />;
      case "tri":
        return <TriStage {...props} />;
      case "trap":
        return <TrapStage {...props} />;
    }
  })();
  const formula = (() => {
    switch (station) {
      case "rect":
        return <RectFormula state={state} dispatch={dispatch} embedded={embedded} interactive={interactive} />;
      case "para":
        return <ParaFormula {...props} />;
      case "tri":
        return <TriFormula {...props} />;
      case "trap":
        return <TrapFormula {...props} />;
    }
  })();

  const showFill = st.touched || st.fillPassed || embedded;

  return (
    <div className={`chain-station ${embedded ? "embedded" : ""}`} data-station={station}>
      <section className="chain-stage">
        {stage}
        {toast && (
          <div className="chain-toast" role="status">
            {toast}
          </div>
        )}
      </section>
      <aside className="chain-side">
        {formula}
        {showFill ? (
          <FillInCard station={station} st={st} dispatch={dispatch} interactive={interactive} prompt={prompt} />
        ) : (
          <div className="chain-fill placeholder">先动手试一试——拖一拖橙点，填空卡就会出现。</div>
        )}
      </aside>
    </div>
  );
}
