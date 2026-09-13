import { useState, type Dispatch } from "react";
import { closestCandidate, formulaC, guessReferenceC, verifyResult } from "../model/derived";
import type { Action } from "../model/reducer";
import { BIKE_R, D_MAX, D_MIN, PI_TEXTBOOK, type State } from "../model/types";
import { HandVoteChart } from "./HandVoteChart";
import { OnScreenKeypad } from "./OnScreenKeypad";
import { fmt2 } from "./svg-utils";

interface Props {
  state: State;
  dispatch: Dispatch<Action>;
  interactive: boolean;
}

/** 步骤 7：任务 A 先算再滚；任务 B 自行车轮；回到猜一猜；可选独轮车关卡 */
export function VerifyPanel({ state, dispatch, interactive }: Props) {
  const s = state;
  const [editing, setEditing] = useState<"d" | "c" | "dist" | "wheelD" | null>(null);
  const [uni, setUni] = useState<{ dist: number; wheelD: number }>({ dist: 50.24, wheelD: 40 });
  const [showUni, setShowUni] = useState(false);
  const [showGuess, setShowGuess] = useState(false);
  const res = verifyResult(s);
  const v = s.verify;
  const bikeC = 2 * PI_TEXTBOOK * s.bike.r;
  const ref = guessReferenceC(s);
  const closest = closestCandidate(s, 2, ref);
  const uniC = PI_TEXTBOOK * uni.wheelD;
  const uniTurns = (uni.dist * 100) / uniC;

  return (
    <div className="verify-panel" aria-label="反向验证">
      <div className="task">
        <h4>任务 A · 先算，再滚</h4>
        <div className="row">
          <span>新直径</span>
          <button className="badge-d" disabled={!interactive || v.locked} onClick={() => setEditing("d")}>
            d = {s.d.toFixed(1)} cm
          </button>
          {interactive && !v.locked && (
            <>
              {[5, 7, 8].map((d) => (
                <button key={d} className="btn" onClick={() => dispatch({ type: "VERIFY_SET_D", d })} aria-pressed={s.d === d}>
                  {d}
                </button>
              ))}
            </>
          )}
        </div>
        <div className="row">
          <span>我算出的 C</span>
          <button className="btn lg" disabled={!interactive || v.locked} onClick={() => setEditing("c")}>
            {v.cPred === null ? "？" : `${fmt2(v.cPred)} cm`}
          </button>
          {!v.locked ? (
            <button className="btn primary" disabled={!interactive || v.cPred === null} onClick={() => dispatch({ type: "VERIFY_LOCK" })}>
              锁定预测，去滚
            </button>
          ) : !v.done ? (
            <span className="hint">预测已锁定：按住轮子滚满一圈</span>
          ) : null}
        </div>
        {res && v.measured !== null && (
          <div className={`result ${res.ok ? "ok" : "bad"}`}>
            <div className="big">
              实测 {fmt2(v.measured)} cm · 预测 {fmt2(v.cPred ?? 0)} cm
            </div>
            <div>
              {res.ok
                ? "对上了"
                : `相差 ${fmt2(Math.abs(res.diff))} cm，预测${res.direction === "over" ? "偏多" : "偏少"}${
                    res.usedRadiusHint ? "——是不是把半径当成直径了？" : ""
                  }`}
            </div>
            {interactive && (
              <div className="row">
                <button className="btn" onClick={() => dispatch({ type: "VERIFY_AGAIN" })}>
                  再验证一次
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="task">
        <h4>任务 B · 自行车轮（例 3）</h4>
        <p style={{ margin: 0 }}>
          车轮半径约 <b>{BIKE_R} cm</b>，转 1 圈大约走多远？
        </p>
        {s.bike.shown ? (
          <div className="big">
            C = 2 × 3.14 × {BIKE_R} = {fmt2(bikeC)} cm ≈ {(bikeC / 100).toFixed(0)} m
          </div>
        ) : (
          <p className="muted" style={{ margin: "0.25rem 0" }}>
            先自己算：已知的是半径，用哪条公式？结果保留整米想一想。
          </p>
        )}
        {interactive && (
          <div className="row">
            <button className="btn" aria-pressed={s.bike.shown} onClick={() => dispatch({ type: "BIKE_SHOW", shown: !s.bike.shown })}>
              {s.bike.shown ? "收起" : "看示意与结果"}
            </button>
          </div>
        )}
      </div>

      <div className="task">
        <h4>回到猜一猜</h4>
        {interactive && (
          <button className="btn" aria-pressed={showGuess} onClick={() => setShowGuess(!showGuess)}>
            {showGuess ? "收起分布" : "对照全班的猜测"}
          </button>
        )}
        {showGuess && (
          <>
            <HandVoteChart state={s} dispatch={dispatch} step={2} reference={ref} closestLabel={closest} interactive={false} />
            <p className="muted" style={{ margin: "0.25rem 0 0" }}>
              你的三个估值：太低 {s.guess.low} · 最可能 {s.guess.likely} · 太高 {s.guess.high}（cm）
            </p>
          </>
        )}
      </div>

      <div className="task">
        <h4>可选关卡 · 独轮车</h4>
        {interactive && (
          <button className="btn" aria-pressed={showUni} onClick={() => setShowUni(!showUni)}>
            {showUni ? "收起" : "打开"}
          </button>
        )}
        {showUni && (
          <>
            <div className="row">
              <span>车轮直径</span>
              <button className="btn" onClick={() => setEditing("wheelD")}>
                {uni.wheelD} cm
              </button>
              <span>路程</span>
              <button className="btn" onClick={() => setEditing("dist")}>
                {uni.dist} m
              </button>
            </div>
            <div className="big">
              路程 ÷ C = {(uni.dist * 100).toFixed(0)} ÷ {fmt2(uniC)} ≈ {uniTurns.toFixed(uniTurns % 1 === 0 ? 0 : 1)} 周
            </div>
          </>
        )}
      </div>

      {editing === "d" && (
        <OnScreenKeypad
          title="验证圆的直径（cm）"
          unit="cm"
          initial={s.d}
          min={D_MIN}
          max={D_MAX}
          decimals={1}
          onCancel={() => setEditing(null)}
          onConfirm={(d) => {
            dispatch({ type: "VERIFY_SET_D", d });
            setEditing(null);
          }}
        />
      )}
      {editing === "c" && (
        <OnScreenKeypad
          title={`预测：直径 ${s.d.toFixed(1)} cm 的圆滚一圈多长？`}
          unit="cm"
          initial={v.cPred}
          min={0.1}
          max={999}
          decimals={2}
          onCancel={() => setEditing(null)}
          onConfirm={(c) => {
            dispatch({ type: "VERIFY_SET_PRED", cPred: c });
            setEditing(null);
          }}
        />
      )}
      {editing === "wheelD" && (
        <OnScreenKeypad
          title="独轮车车轮直径（cm）"
          unit="cm"
          initial={uni.wheelD}
          min={10}
          max={200}
          decimals={0}
          onCancel={() => setEditing(null)}
          onConfirm={(wheelD) => {
            setUni({ ...uni, wheelD });
            setEditing(null);
          }}
        />
      )}
      {editing === "dist" && (
        <OnScreenKeypad
          title="路程（m）"
          unit="m"
          initial={uni.dist}
          min={1}
          max={9999}
          decimals={2}
          onCancel={() => setEditing(null)}
          onConfirm={(dist) => {
            setUni({ ...uni, dist });
            setEditing(null);
          }}
        />
      )}
      {s.mode === "teacher" && (
        <p className="muted" style={{ fontSize: "var(--fs-small)" }}>
          老师看：按公式 C = 3.14 × {s.d.toFixed(1)} = {fmt2(formulaC(s))} cm（学生模式不显示，不替孩子算）
        </p>
      )}
    </div>
  );
}
