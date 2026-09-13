import { useState, type Dispatch } from "react";
import { OnScreenKeypad } from "@/explorations/circle-circumference/components/OnScreenKeypad";
import { fmt2 } from "@/explorations/circle-circumference/components/svg-utils";
import { closestCandidate, formulaS, guessReferenceS, lawnExpected, tableExpected, verifyResult, within } from "../model/derived";
import type { Action } from "../model/reducer";
import { LAWN_D_M, LAWN_PRICE, R_MAX, R_MIN, TABLE_D_M, type State } from "../model/types";
import { HandVoteChart } from "./HandVoteChart";

interface Props {
  state: State;
  dispatch: Dispatch<Action>;
  interactive: boolean;
}

type Editing = "r" | "s" | "tableS" | "lawnS" | "lawnCost" | null;

/** 步骤 7：任务 A 先算再拼（n = 64）；任务 B 圆桌 d → r；任务 C 草坪两格计算器；回到猜一猜。 */
export function VerifyPanel({ state, dispatch, interactive }: Props) {
  const s = state;
  const v = s.verify;
  const [editing, setEditing] = useState<Editing>(null);
  const [showGuess, setShowGuess] = useState(false);
  const res = verifyResult(s);
  const table = tableExpected();
  const lawn = lawnExpected();
  const ref = guessReferenceS();
  const closest = closestCandidate(s, 2, ref);

  return (
    <div className="verify-panel" aria-label="反向验证">
      <div className="task">
        <h4>任务 A · 先算，再拼（n = 64）</h4>
        <div className="row">
          <span>新半径</span>
          <button className="badge-d" disabled={!interactive || v.locked} onClick={() => setEditing("r")}>
            r = {v.rPred.toFixed(1)} cm
          </button>
          {interactive && !v.locked && (
            <>
              {[5, 3, 6].map((r) => (
                <button key={r} className="btn" onClick={() => dispatch({ type: "VERIFY_SET_R", r })} aria-pressed={v.rPred === r}>
                  {r}
                </button>
              ))}
            </>
          )}
        </div>
        <div className="row">
          <span>我算出的 S</span>
          <button className="btn lg" disabled={!interactive || v.locked} onClick={() => setEditing("s")}>
            {v.sPred === null ? "？" : `${fmt2(v.sPred)} cm²`}
          </button>
          {!v.locked ? (
            <button className="btn primary" disabled={!interactive || v.sPred === null} onClick={() => dispatch({ type: "VERIFY_LOCK" })}>
              锁定预测，去拼
            </button>
          ) : !v.done ? (
            <span className="hint">预测已锁定：点「拼」或拖进度到位</span>
          ) : null}
        </div>
        {res && v.assembled !== null && (
          <div className={`result ${res.ok ? "ok" : "bad"}`}>
            <div className="big">
              预测 {fmt2(v.sPred ?? 0)} · 拼出 ≈ {fmt2(res.assembledApprox)} · 精确 {fmt2(res.exact)} cm²
            </div>
            <div>
              {res.ok
                ? "对上了"
                : `相差 ${fmt2(Math.abs(res.diff))} cm²，预测${res.direction === "over" ? "偏多" : "偏少"}${
                    res.hint === "circumference" ? "——你算的可能是周长；r² 是 r × r，不是 r × 2" : res.hint === "diameter" ? "——用的是直径还是半径？" : ""
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
        <h4>任务 B · 圆形桌面（做一做）</h4>
        <p style={{ margin: 0 }}>
          桌面直径 <b>{TABLE_D_M} m</b>，面积多少？屏上只是示意。
        </p>
        <div className="row">
          <button className="btn primary" disabled={!interactive || v.tableDToR} aria-pressed={v.tableDToR} onClick={() => dispatch({ type: "VERIFY_TABLE_D_TO_R" })}>
            d → r
          </button>
          {v.tableDToR && (
            <span className="big">
              r = {TABLE_D_M} ÷ 2 = {table.r} m
            </span>
          )}
          {v.tableDToR && (
            <button className="btn lg" disabled={!interactive} onClick={() => setEditing("tableS")}>
              S = {v.tableS === null ? "？" : `${v.tableS} m²`}
            </button>
          )}
        </div>
        {v.tableS !== null && (
          <div className={`result ${within(v.tableS, table.s) ? "ok" : "bad"}`}>
            {within(v.tableS, table.s) ? "对上了" : `再想想：3.14 × ${table.r} × ${table.r} 是多少？`}
          </div>
        )}
      </div>

      <div className="task">
        <h4>任务 C · 草坪回收（例题情境）</h4>
        <p style={{ margin: 0 }}>
          草坪直径 <b>{LAWN_D_M} m</b>，每平方米 <b>{LAWN_PRICE} 元</b>——先求面积，再求钱。
        </p>
        <div className="row">
          <span>① 面积</span>
          <button className="btn lg" disabled={!interactive} onClick={() => setEditing("lawnS")}>
            {v.lawnS === null ? "？ m²" : `${v.lawnS} m²`}
          </button>
          {v.lawnS !== null && <span className={`hint ${within(v.lawnS, lawn.s) ? "ok" : ""}`}>{within(v.lawnS, lawn.s) ? "对" : "先把直径换成半径"}</span>}
        </div>
        <div className="row">
          <span>② 钱</span>
          <button className="btn lg" disabled={!interactive || v.lawnS === null} onClick={() => setEditing("lawnCost")}>
            {v.lawnCost === null ? "？ 元" : `${v.lawnCost} 元`}
          </button>
          {v.lawnCost !== null && v.lawnS !== null && (
            <span className={`hint ${within(v.lawnCost, v.lawnS * LAWN_PRICE) ? "ok" : ""}`}>{within(v.lawnCost, v.lawnS * LAWN_PRICE) ? "面积 × 单价，对" : "面积 × 每平方米的钱"}</span>
          )}
        </div>
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
              你的三个估值：太低 {s.guess.low} · 最可能 {s.guess.likely} · 太高 {s.guess.high}（cm²）；r = 4 时 S = 3.14 × 4 × 4 = {fmt2(ref)}
            </p>
          </>
        )}
      </div>

      <div className="task">
        <h4>半径翻倍，面积几倍？</h4>
        <p style={{ margin: 0 }}>
          r = 2 → 4：S {fmt2(formulaS(2))} → {fmt2(formulaS(4))}（×4）；r = 3 → 6：S {fmt2(formulaS(3))} → {fmt2(formulaS(6))}（×4）。拖舞台上的 r 试试，或打开「周长∥面积」看周长只 ×2。
        </p>
      </div>

      {editing === "r" && (
        <OnScreenKeypad title="验证圆的半径（cm）" unit="cm" initial={v.rPred} min={R_MIN} max={R_MAX} decimals={1} onCancel={() => setEditing(null)} onConfirm={(r) => { dispatch({ type: "VERIFY_SET_R", r }); setEditing(null); }} />
      )}
      {editing === "s" && (
        <OnScreenKeypad title={`预测：半径 ${v.rPred.toFixed(1)} cm 的圆面积多少？`} unit="cm²" initial={v.sPred} min={0.1} max={9999} decimals={2} onCancel={() => setEditing(null)} onConfirm={(sPred) => { dispatch({ type: "VERIFY_SET_PRED", sPred }); setEditing(null); }} />
      )}
      {editing === "tableS" && (
        <OnScreenKeypad title="桌面面积（m²）" unit="m²" initial={v.tableS} min={0.001} max={99} decimals={4} onCancel={() => setEditing(null)} onConfirm={(value) => { dispatch({ type: "VERIFY_TABLE_S", value }); setEditing(null); }} />
      )}
      {editing === "lawnS" && (
        <OnScreenKeypad title="草坪面积（m²）" unit="m²" initial={v.lawnS} min={1} max={99999} decimals={2} onCancel={() => setEditing(null)} onConfirm={(value) => { dispatch({ type: "VERIFY_LAWN", field: "lawnS", value }); setEditing(null); }} />
      )}
      {editing === "lawnCost" && (
        <OnScreenKeypad title="草皮要多少钱（元）" unit="元" initial={v.lawnCost} min={1} max={999999} decimals={2} onCancel={() => setEditing(null)} onConfirm={(value) => { dispatch({ type: "VERIFY_LAWN", field: "lawnCost", value }); setEditing(null); }} />
      )}
      {s.mode === "teacher" && (
        <p className="muted" style={{ fontSize: "var(--fs-small)" }}>
          老师看：S = 3.14 × {v.rPred.toFixed(1)} × {v.rPred.toFixed(1)} = {fmt2(formulaS(v.rPred))} cm²；桌面 {table.s} m²；草坪 {lawn.s} m² × {LAWN_PRICE} = {lawn.cost} 元（学生模式不显示）
        </p>
      )}
    </div>
  );
}
