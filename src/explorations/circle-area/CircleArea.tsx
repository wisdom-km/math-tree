import { useEffect, useReducer, useState, type Dispatch } from "react";
import { href } from "@/app/router";
import { useSettings } from "@/app/settings";
import { ConfirmModal, OnScreenKeypad } from "@/explorations/circle-circumference/components/OnScreenKeypad";
import type { ExplorationProps } from "@/explorations/registry";
import { AssemblyStage, type Contrast } from "./components/AssemblyStage";
import { ConfusionSplit } from "./components/ConfusionSplit";
import { ContextStage } from "./components/ContextStage";
import { CutMoveAssembleBar, SegmentControl } from "./components/Controls";
import { DataTable } from "./components/DataTable";
import { DerivationChain } from "./components/DerivationChain";
import { ExtensionStage } from "./components/ExtensionStage";
import { GuessPanel } from "./components/GuessPanel";
import { HandVoteChart } from "./components/HandVoteChart";
import { LiveFormula } from "./components/LiveFormula";
import { PatternFillIn } from "./components/PatternFillIn";
import { QuestionDrawer } from "./components/QuestionDrawer";
import { RecallStage } from "./components/RecallStage";
import { SvgSlider } from "./components/SvgSlider";
import { TriRecallModal } from "./components/TriRecallModal";
import { VerifyPanel } from "./components/VerifyPanel";
import {
  canAdvance,
  canGoto,
  confusionAvailable,
  evidenceKeys,
  formulaVisible,
  nextStepOf,
  questionCardVisible,
  unrecordedAssembly,
  visibleSteps,
} from "./model/derived";
import { CIRCLE_AREA_EVENTS } from "./model/evidence";
import { checkLength, checkWidth } from "./model/pattern";
import { initialState, reducer, type Action } from "./model/reducer";
import { R_MAX, R_MIN, STEP_LABEL, type Assembly, type Step } from "./model/types";
import { useAssembleAnimation } from "./useAssembleAnimation";
import { useEvidenceSync } from "./useEvidenceSync";
import "@/explorations/circle-circumference/circumference.css";
import "./circle-area.css";

/** 各步「下一步」按钮文案（交互稿第 5 节「进入下一步条件」） */
const NEXT_LABEL: Partial<Record<Step, string>> = {
  0: "下一步",
  1: "先猜一猜要多大",
  2: "开始动手",
  3: "去记数据",
  4: "找规律",
  5: "可以揭示公式了",
  6: "用新圆验证一下",
  7: "继续",
  8: "延伸",
};

const DEFAULT_ROUTE_KEY = "math-tree.circle-area.defaultAssembly";

function loadDefaultRoute(): Assembly {
  try {
    return localStorage.getItem(DEFAULT_ROUTE_KEY) === "tri" ? "tri" : "rect";
  } catch {
    return "rect";
  }
}

/**
 * 「圆的面积」探究单外壳：顶栏 + 主舞台 + 右侧栏 + 步骤条。
 * 布局、模式切换、提问卡、撤销 / 重置全部沿用「圆的周长」探究单的框架与样式（circumference.css）。
 */
export function CircleArea({ exploration }: ExplorationProps) {
  const settings = useSettings();
  const startStep: Step = new URLSearchParams(window.location.hash.split("?")[1] ?? "").get("from") === "chain" ? 3 : 0;
  const [state, dispatch] = useReducer(reducer, { mode: settings.mode, defaultAssembly: loadDefaultRoute(), startStep }, initialState);
  const [epoch, setEpoch] = useState(0);
  const [drawer, setDrawer] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [rKeypad, setRKeypad] = useState(false);
  const [contextOpen, setContextOpen] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const anim = useAssembleAnimation(state, dispatch);

  useEvidenceSync(exploration.id, state.mode, evidenceKeys(state), CIRCLE_AREA_EVENTS, {
    step: state.step,
    r: state.r,
    n: state.n,
    rows: state.table.length,
  }, epoch);

  useEffect(() => {
    if (state.mode !== settings.mode) dispatch({ type: "SET_MODE", mode: settings.mode });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.mode]);
  const setMode = (m: "teacher" | "student") => {
    settings.setMode(m);
    dispatch({ type: "SET_MODE", mode: m });
    if (m === "student") setDrawer(false);
  };

  useEffect(() => {
    if (!toast) return undefined;
    const t = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    try {
      localStorage.setItem(DEFAULT_ROUTE_KEY, state.defaultAssembly);
    } catch {
      /* 无 localStorage */
    }
  }, [state.defaultAssembly]);

  const s = state;
  const step = s.step;
  const interactive = step === s.maxStep || step >= 3;
  const next = nextStepOf(s);
  const wiggle = step === 3 && !s.cutDone && s.assembleCount === 0;
  const showFormula = formulaVisible(s);
  const contrast: Contrast | null =
    step === 5
      ? {
          length: s.patternBlank.length ? checkLength(s.patternBlank.length).contrast : null,
          width: s.patternBlank.width ? checkWidth(s.patternBlank.width).contrast : null,
        }
      : null;

  /** 改 n / r 前：拼到位却没记这一组 → 非模态提示（不拦截） */
  const guarded: Dispatch<Action> = (a) => {
    if ((a.type === "SET_N" || a.type === "BEGIN_DRAG_R" || a.type === "SET_R") && step <= 5 && unrecordedAssembly(s)) {
      setToast("还没记这一组，要先加入吗？");
    }
    dispatch(a);
  };

  const controls = (stageInteractive: boolean) => (
    <div className="stage-controls area-controls">
      <div className="row">
        <SegmentControl state={s} dispatch={guarded} interactive={stageInteractive} />
        <SvgSlider
          value={s.assembleT}
          min={0}
          max={1}
          step={0.01}
          label="拼合进度"
          ariaLabel="拼合进度"
          format={(v) => `${Math.round(v * 100)}%`}
          minLabel="0"
          maxLabel="1"
          disabled={!stageInteractive || !s.cutDone}
          onBegin={() => anim.stop()}
          onChange={(t) => dispatch({ type: "SET_ASSEMBLE_T", t })}
          color="var(--c-arc)"
        />
      </div>
      <div className="row">
        <CutMoveAssembleBar
          state={s}
          interactive={stageInteractive}
          wiggle={wiggle}
          assembling={anim.running}
          onCut={() => dispatch({ type: "CUT" })}
          onMove={() => dispatch({ type: "TOGGLE_MOVE" })}
          onAssemble={anim.toggle}
        />
        <button className="badge-d" disabled={!stageInteractive} onClick={() => setRKeypad(true)} aria-label={`半径 ${s.r.toFixed(1)} 厘米，点击输入`}>
          r = {s.r.toFixed(1)} cm
        </button>
        <span className="muted small">
          拖原圆上的橙点，或点这里输入（{R_MIN.toFixed(1)}–{R_MAX.toFixed(1)}）
          {step <= 5 ? "；改 n 或 r 会清空拼合区，先记再改" : "；揭示后拼好的图形随 r 缩放"}
        </span>
        {anim.degraded && (
          <button className="btn small" onClick={() => anim.setDegraded(false)} title="低端设备已切到简化渲染，点此恢复">
            简化渲染中
          </button>
        )}
      </div>
    </div>
  );

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
        return <div className="task-card">这一步是老师提问卡的合集入口：右上角「?」随时打开当前步骤的问题；这里可以浏览全部。</div>;
      case 9:
        return <ExtensionStage state={s} dispatch={dispatch} interactive={interactive} />;
      default: {
        const stageInteractive = step !== 5 && interactive;
        return (
          <>
            {contextOpen && step <= 4 && (
              <div className="context-bar">
                圆形草坪要铺草皮——草皮要买多大一块？
                <button className="btn" onClick={() => setContextOpen(false)}>
                  收起
                </button>
              </div>
            )}
            <div className={`stage-svg-wrap ${step === 5 ? "compact" : ""}`}>
              <AssemblyStage state={s} dispatch={guarded} interactive={stageInteractive} contrast={contrast} degraded={anim.degraded} compact={step === 5} />
            </div>
            {step !== 5 && controls(stageInteractive)}
            {step === 5 && <p className="muted">回看数据表，把「长 ≈ ___，宽 = ___」填出来。</p>}
          </>
        );
      }
    }
  })();

  const routeSwitch = (
    <div className="route-switch" role="group" aria-label="拼法">
      <span className="muted">拼法</span>
      <button className="btn" aria-pressed={s.assembly === "rect"} disabled={!interactive} onClick={() => dispatch({ type: "SET_ASSEMBLY", assembly: "rect" })}>
        拼成长方形
      </button>
      <button className="btn" aria-pressed={s.assembly === "tri"} disabled={!interactive} onClick={() => dispatch({ type: "SET_ASSEMBLY", assembly: "tri" })}>
        拆成三角形
      </button>
      {s.mode === "teacher" && (
        <button
          className="btn small"
          onClick={() => dispatch({ type: "SET_DEFAULT_ASSEMBLY", assembly: s.defaultAssembly === "rect" ? "tri" : "rect" })}
          title="课前设置：重置后默认走哪条路"
        >
          默认路线：{s.defaultAssembly === "rect" ? "长方形" : "三角形"}
        </button>
      )}
    </div>
  );

  const side = (() => {
    if (s.confusionMode) return null;
    switch (step) {
      case 0:
        return <div className="task-card">迷你任务：拖橙点改长方形的长，看格子数与算式一起变；然后选出「长方形的面积 = ？」。</div>;
      case 1:
        return null;
      case 2:
        return <HandVoteChart state={s} dispatch={dispatch} step={2} title="全班猜一猜（举手分布）" />;
      case 5:
        return (
          <>
            <PatternFillIn state={s} dispatch={dispatch} interactive />
            <DataTable state={s} dispatch={dispatch} interactive={false} />
            {showFormula && <LiveFormula state={s} dispatch={dispatch} interactive={false} compact />}
          </>
        );
      case 6:
        return (
          <>
            <DerivationChain state={s} dispatch={dispatch} interactive />
            {(s.derivationLines >= 3 || s.maxStep >= 7) && <LiveFormula state={s} dispatch={dispatch} />}
            {routeSwitch}
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
            {routeSwitch}
            <DataTable state={s} dispatch={dispatch} interactive />
            {showFormula && <LiveFormula state={s} dispatch={dispatch} interactive={false} compact />}
          </>
        );
    }
  })();

  const steps = visibleSteps(s);

  return (
    <div className="exp-root circle-area" data-mode={s.mode}>
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
        {drawer && questionCardVisible(s) && <QuestionDrawer state={s} dispatch={dispatch} cards={exploration.questionCards} onClose={() => setDrawer(false)} />}
        {toast && (
          <div className="toast" role="status">
            {toast}
          </div>
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

      {s.triRecall.open && <TriRecallModal state={s} dispatch={dispatch} />}

      {confirmReset && (
        <ConfirmModal
          title="确定重置？"
          body="会清到步骤 0 初始：r = 4 cm、n = 8、未剪、空表、猜测清空、公式未揭示。"
          confirmLabel="确定重置"
          onCancel={() => setConfirmReset(false)}
          onConfirm={() => {
            anim.stop();
            dispatch({ type: "RESET" });
            setEpoch((e) => e + 1);
            setConfirmReset(false);
            setContextOpen(true);
          }}
        />
      )}
      {rKeypad && (
        <OnScreenKeypad
          title="半径 r（cm）"
          unit="cm"
          initial={s.r}
          min={R_MIN}
          max={R_MAX}
          decimals={1}
          onCancel={() => setRKeypad(false)}
          onConfirm={(r) => {
            guarded({ type: "SET_R", r });
            setRKeypad(false);
          }}
        />
      )}
    </div>
  );
}
