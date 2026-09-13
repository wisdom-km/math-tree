import { useEffect, useRef, type Dispatch } from "react";
import { availableN, isEasterN, n128Available } from "../model/derived";
import type { Action } from "../model/reducer";
import type { NValue, State } from "../model/types";

/**
 * TODO(area-chain): 「剪 / 移 / 拼」三按钮是转化链五站共用组件 `CutMoveAssembleBar`
 * （见 docs/explorations/area-chain.md 2.3），由 m1/area-chain 分支实现。
 * 这里先用本探究单内的等价实现，图标、单字文案、左下位置、禁用规则已按链的约定写死；
 * 链落地后把本组件换成 `<CutMoveAssembleBar cutDisabled moveDisabled assembleDisabled onCut onMove onAssemble />`，
 * 三个回调分别对应 dispatch CUT / TOGGLE_MOVE / 自动拼合（见 useAssembleAnimation）。
 */
interface BarProps {
  state: State;
  interactive: boolean;
  /** 启动 wiggle-me：仅「剪」按钮轻抖 */
  wiggle: boolean;
  /** 自动拼合正在走 */
  assembling: boolean;
  onCut: () => void;
  onMove: () => void;
  onAssemble: () => void;
}

export function CutMoveAssembleBar({ state, interactive, wiggle, assembling, onCut, onMove, onAssemble }: BarProps) {
  const s = state;
  const cutDisabled = !interactive || s.cutDone;
  const moveDisabled = !interactive || !s.cutDone || s.assembleT > 0;
  const assembleDisabled = !interactive || !s.cutDone;
  return (
    <div className="cma-bar" role="group" aria-label="剪 移 拼">
      <button className={`btn cma ${wiggle ? "wiggle" : ""}`} disabled={cutDisabled} onClick={onCut} aria-label="剪">
        <svg viewBox="0 0 32 32" aria-hidden>
          <circle cx={9} cy={23} r={5} fill="none" stroke="currentColor" strokeWidth={3} />
          <circle cx={23} cy={23} r={5} fill="none" stroke="currentColor" strokeWidth={3} />
          <path d="M12 19 L26 3 M20 19 L6 3" stroke="currentColor" strokeWidth={3} strokeLinecap="round" fill="none" />
        </svg>
        剪
      </button>
      <button className="btn cma" disabled={moveDisabled} aria-pressed={s.moved} onClick={onMove} aria-label="移">
        <svg viewBox="0 0 32 32" aria-hidden>
          <path
            d="M16 2 L20 7 H17 V14 H24 V11 L30 16 L24 21 V18 H17 V25 H20 L16 30 L12 25 H15 V18 H8 V21 L2 16 L8 11 V14 H15 V7 H12 Z"
            fill="currentColor"
          />
        </svg>
        移
      </button>
      <button className="btn cma" disabled={assembleDisabled} aria-pressed={assembling} onClick={onAssemble} aria-label="拼">
        <svg viewBox="0 0 32 32" aria-hidden>
          <path d="M3 4 H15 V16 H3 Z" fill="currentColor" opacity={0.55} />
          <path d="M17 16 H29 V28 H17 Z" fill="currentColor" />
          <path d="M15 10 H17 M16 16 V18" stroke="currentColor" strokeWidth={2} />
        </svg>
        {s.assembleT >= 1 ? "拆回" : assembling ? "停" : "拼"}
      </button>
      {wiggle && (
        <span className="wiggle-hand" aria-hidden>
          <svg viewBox="0 0 120 60">
            <path
              className="svg-hand"
              d="M60 30 l-46 -14 a8 8 0 0 1 4 -15 l58 8 v-40 a9 9 0 0 1 18 0 v46 h6 a9 9 0 0 1 9 9 v30 a26 26 0 0 1 -26 26 h-14 a26 26 0 0 1 -19 -8 z"
              transform="translate(20 42) scale(0.45) rotate(-90)"
            />
          </svg>
          先点「剪」
        </span>
      )}
    </div>
  );
}

interface NProps {
  state: State;
  dispatch: Dispatch<Action>;
  interactive: boolean;
}

/** 等分数分段按钮；n = 64 长按 3 秒解锁 128 彩蛋（老师模式常显） */
export function SegmentControl({ state, dispatch, interactive }: NProps) {
  const s = state;
  const list = availableN(s);
  const timer = useRef<number | null>(null);
  useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current);
  }, []);

  const startLongPress = (n: NValue) => {
    if (n !== 64 || n128Available(s)) return;
    timer.current = window.setTimeout(() => dispatch({ type: "UNLOCK_N128" }), 3000);
  };
  const cancelLongPress = () => {
    if (timer.current) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  };

  return (
    <div className="n-segment" role="group" aria-label="等分数">
      <span className="seg-label">等分数 n</span>
      {list.map((n) => (
        <button
          key={n}
          className={`btn seg ${isEasterN(n) ? "easter" : ""}`}
          aria-pressed={s.n === n}
          disabled={!interactive}
          onClick={() => dispatch({ type: "SET_N", n })}
          onPointerDown={() => startLongPress(n)}
          onPointerUp={cancelLongPress}
          onPointerCancel={cancelLongPress}
          onPointerLeave={cancelLongPress}
          aria-label={isEasterN(n) ? `${n} 等分（彩蛋）` : `${n} 等分`}
        >
          {n}
          {isEasterN(n) && <span className="star">★</span>}
        </button>
      ))}
      {!n128Available(s) && s.n === 64 && <span className="muted seg-hint">长按 64 三秒…</span>}
    </div>
  );
}
