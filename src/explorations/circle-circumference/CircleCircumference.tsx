import { useEffect, useReducer, useState } from "react";
import { href } from "@/app/router";
import { useSettings } from "@/app/settings";
import type { ExplorationProps } from "@/explorations/registry";
import { BikeStage } from "./components/BikeStage";
import { ConfusionSplit } from "./components/ConfusionSplit";
import { ContextStage } from "./components/ContextStage";
import { DataTable } from "./components/DataTable";
import { ExtensionStage } from "./components/ExtensionStage";
import { GuessPanel } from "./components/GuessPanel";
import { HandVoteChart } from "./components/HandVoteChart";
import { LiveFormula } from "./components/LiveFormula";
import { ConfirmModal, OnScreenKeypad } from "./components/OnScreenKeypad";
import { PatternFillIn } from "./components/PatternFillIn";
import { QuestionDrawer } from "./components/QuestionDrawer";
import { RecallStage } from "./components/RecallStage";
import { VerifyPanel } from "./components/VerifyPanel";
import { WheelStage } from "./components/WheelStage";
import {
  canAdvance,
  canGoto,
  confusionAvailable,
  formulaVisible,
  nextStepOf,
  questionCardVisible,
  rollProgress,
  visibleSteps,
} from "./model/derived";
import { checkPattern } from "./model/pattern";
import { initialState, reducer } from "./model/reducer";
import { D_MAX, D_MIN, STEP_LABEL, type Step } from "./model/types";
import { useEvidenceSync } from "./useEvidenceSync";
import "./circumference.css";

/** 各步「下一步」按钮文案（交互稿第 5 节「进入下一步条件」） */
const NEXT_LABEL: Partial<Record<Step, string>> = {
  0: "下一步",
  1: "先猜一猜要多长",
  2: "开始动手",
  3: "去记数据",
  4: "找规律",
  5: "可以揭示名称了",
  6: "用新圆验证一下",
  7: "继续",
  8: "延伸",
};

export function CircleCircumference({ exploration }: ExplorationProps) {
  const settings = useSettings();
  const [state, dispatch] = useReducer(reducer, { mode: settings.mode }, initialState);
  const [epoch, setEpoch] = useState(0);
  const [drawer, setDrawer] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [dKeypad, setDKeypad] = useState(false);
  const [contextOpen, setContextOpen] = useState(true);

  useEvidenceSync(state, exploration.id, epoch);

  // 顶层模式与探究单内模式保持一致（顶栏切换写两边）
  useEffect(() => {
    if (state.mode !== settings.mode) dispatch({ type: "SET_MODE", mode: settings.mode });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.mode]);
  const setMode = (m: "teacher" | "student") => {
    settings.setMode(m);
    dispatch({ type: "SET_MODE", mode: m });
    if (m === "student") setDrawer(false);
  };

  const s = state;
  const step = s.step;
  /** 回看已完成步骤时舞台只读；当前最远步可操作 */
  const interactive = step === s.maxStep || step >= 3;
  const next = nextStepOf(s);
  const wiggle = step === 3 && s.rollCount === 0 && s.rollAngle === 0 && !s.rollLocked;
  const contrast = step === 5 && s.patternBlank ? checkPattern(s.patternBlank).contrast : null;
  const showFormula = formulaVisible(s);

  const stage = (() => {
    if (s.confusionMode) return <ConfusionSplit state={s} dispatch={dispatch} />;
    switch (step) {
      case 0:
        return <RecallStage state={s} dispatch={dispatch} interactive={interactive} />;
      case 1:
        return <ContextStage state={s} dispatch={dispatch} interactive={interactive} />;
      case 2:
        return <GuessPanel state={s} dispatch={dispatch} interactive={interactive} />;
      case 8:
        return (
          <div className="task-card">
            这一步是老师提问卡的合集入口：右上角「?」随时打开当前步骤的问题；这里可以浏览全部。
          </div>
        );
      case 9:
        return <ExtensionStage state={s} dispatch={dispatch} interactive={interactive} />;
      default: {
        const stageInteractive = step !== 5 && interactive;
        return (
          <>
            {contextOpen && step <= 4 && (
              <div className="context-bar">
                圆桌要箍铁皮——滚一圈，这段有多长？
                <button className="btn" onClick={() => setContextOpen(false)}>
                  收起
                </button>
              </div>
            )}
            {step === 7 && s.bike.shown ? (
              <BikeStage animate />
            ) : (
              <div className="stage-svg-wrap">
                <WheelStage state={s} dispatch={dispatch} interactive={stageInteractive} contrast={contrast} wiggle={wiggle} />
              </div>
            )}
            <div className="stage-controls">
              <button className="badge-d" onClick={() => stageInteractive && setDKeypad(true)} aria-label={`直径 ${s.d.toFixed(1)} 厘米，点击输入`}>
                d = {s.d.toFixed(1)} cm
              </button>
              <span className="muted">拖直径两端的橙点，或点这里输入（{D_MIN.toFixed(1)}–{D_MAX.toFixed(1)}）</span>
              <span className="progress-ring" aria-label={`滚动进度 ${Math.round(rollProgress(s) * 100)}%`}>
                <svg viewBox="0 0 40 40">
                  <circle cx={20} cy={20} r={16} fill="none" stroke="var(--c-line)" strokeWidth={6} />
                  <circle
                    cx={20}
                    cy={20}
                    r={16}
                    fill="none"
                    stroke="var(--c-arc)"
                    strokeWidth={6}
                    strokeDasharray={`${rollProgress(s) * 100.5} 100.5`}
                    transform="rotate(-90 20 20)"
                  />
                </svg>
                {s.rollLocked ? "1 圈停" : `${Math.round(rollProgress(s) * 100)}%`}
              </span>
              {s.rollLocked && stageInteractive && !contextOpen && step <= 4 && (
                <button className="btn" onClick={() => setContextOpen(true)}>
                  情境
                </button>
              )}
            </div>
          </>
        );
      }
    }
  })();

  const side = (() => {
    if (s.confusionMode) return null;
    switch (step) {
      case 0:
        return (
          <div className="task-card">
            迷你任务：拖半径端点，看直径怎么变；然后选出「直径长度是半径的几倍」。
          </div>
        );
      case 1:
        return null;
      case 2:
        return <HandVoteChart state={s} dispatch={dispatch} step={2} title="全班猜一猜（举手分布）" />;
      case 5:
        return (
          <>
            <PatternFillIn state={s} dispatch={dispatch} interactive />
            <DataTable state={s} dispatch={dispatch} interactive={false} />
          </>
        );
      case 6:
        return (
          <>
            <LiveFormula state={s} dispatch={dispatch} />
            <DataTable state={s} dispatch={dispatch} interactive={false} />
          </>
        );
      case 7:
        return (
          <>
            <VerifyPanel state={s} dispatch={dispatch} interactive />
            {showFormula && <LiveFormula state={s} dispatch={dispatch} compact />}
          </>
        );
      case 8:
        return <div className="task-card">学生模式下本步与右上角「?」都不显示。</div>;
      case 9:
        return showFormula ? <LiveFormula state={s} dispatch={dispatch} /> : null;
      default:
        return (
          <>
            <DataTable state={s} dispatch={dispatch} interactive />
            {showFormula && <LiveFormula state={s} dispatch={dispatch} interactive={false} compact />}
          </>
        );
    }
  })();

  const steps = visibleSteps(s);

  return (
    <div className="exp-root" data-mode={s.mode}>
      <header className="exp-topbar">
        <a className="btn" href={href("/", { node: exploration.primaryNode })} aria-label="返回知识树">
          ← 知识树
        </a>
        <button className="btn" disabled={step === 0} onClick={() => dispatch({ type: "PREV_STEP" })}>
          上一步
        </button>
        <span className="title">{exploration.title}</span>
        <span className="step-name">
          · 步骤 {step}/9 {STEP_LABEL[step]}
        </span>
        <span className="spacer" />
        <div className="mode-switch" role="group" aria-label="界面模式">
          <button className="btn" aria-pressed={s.mode === "teacher"} onClick={() => setMode("teacher")}>
            老师
          </button>
          <button className="btn" aria-pressed={s.mode === "student"} onClick={() => setMode("student")}>
            学生
          </button>
        </div>
        {confusionAvailable(s) && (
          <button className="btn" aria-pressed={s.confusionMode} onClick={() => dispatch({ type: "SET_CONFUSION", on: !s.confusionMode })}>
            {s.confusionMode ? "单圆探究" : "周长∥面积"}
          </button>
        )}
        {questionCardVisible(s) && (
          <button className="qcard-btn" aria-label="老师提问卡" aria-pressed={drawer} onClick={() => setDrawer(!drawer)}>
            ?
          </button>
        )}
        <div className="danger-zone">
          <button className="btn" disabled={s.history.length === 0} onClick={() => dispatch({ type: "UNDO" })}>
            撤销
          </button>
          <button className="btn danger" onClick={() => setConfirmReset(true)}>
            重置
          </button>
        </div>
      </header>

      <div className={`exp-body ${side ? "" : "single"}`} style={{ position: "relative" }}>
        <section className="exp-stage">{stage}</section>
        {side && <aside className="exp-side">{side}</aside>}
        {drawer && questionCardVisible(s) && (
          <QuestionDrawer state={s} dispatch={dispatch} cards={exploration.questionCards} onClose={() => setDrawer(false)} />
        )}
      </div>

      <footer className="exp-stepbar">
        {steps.map((k) => (
          <button
            key={k}
            className={`step-dot ${k < s.maxStep || (k === s.maxStep && k !== step) ? "done" : ""} ${k === step ? "current" : ""}`}
            disabled={!canGoto(s, k)}
            aria-current={k === step ? "step" : undefined}
            onClick={() => dispatch({ type: "GOTO_STEP", step: k })}
          >
            <span className="n">{k}</span>
            {STEP_LABEL[k]}
          </button>
        ))}
        <span className="spacer" />
        {step === 9 ? (
          <button className="btn primary lg" aria-pressed={s.completed} onClick={() => dispatch({ type: "COMPLETE" })}>
            {s.completed ? "已记录完成" : "完成探究"}
          </button>
        ) : (
          next !== null && (
            <button className="btn primary lg" disabled={!canAdvance(s)} onClick={() => dispatch({ type: "NEXT_STEP" })}>
              {NEXT_LABEL[step] ?? "下一步"} →
            </button>
          )
        )}
      </footer>

      {confirmReset && (
        <ConfirmModal
          title="确定重置？"
          body="会清到步骤 0 初始：直径 4 cm、空表、猜测清空、公式未揭示。"
          confirmLabel="确定重置"
          onCancel={() => setConfirmReset(false)}
          onConfirm={() => {
            dispatch({ type: "RESET" });
            setEpoch((e) => e + 1);
            setConfirmReset(false);
            setContextOpen(true);
          }}
        />
      )}
      {dKeypad && (
        <OnScreenKeypad
          title="直径 d（cm）"
          unit="cm"
          initial={s.d}
          min={D_MIN}
          max={D_MAX}
          decimals={1}
          onCancel={() => setDKeypad(false)}
          onConfirm={(d) => {
            dispatch({ type: "SET_D", d });
            setDKeypad(false);
          }}
        />
      )}
    </div>
  );
}
