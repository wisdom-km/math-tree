import { useEffect, useReducer, useState } from "react";
import { href, navigate, useHashRoute } from "@/app/router";
import { useSettings } from "@/app/settings";
import { ConfirmModal } from "@/explorations/circle-circumference/components/OnScreenKeypad";
import type { ExplorationProps } from "@/explorations/registry";
import { CircleEntry } from "./CircleEntry";
import { ChainQuestionDrawer } from "./components/ChainQuestionDrawer";
import { canGoNext, isShapeStation, nextStation, prevStation, questionCardVisible, stationCompleted, stationIndex } from "./model/derived";
import { initialState, reducer } from "./model/reducer";
import { STATIONS, STATION_TITLE, type StationId } from "./model/types";
import { StationView } from "./StationView";
import { useChainEvidence } from "./useChainEvidence";
import "./area-chain.css";

function parseStation(v: string | null): StationId {
  return v && (STATIONS as readonly string[]).includes(v) ? (v as StationId) : "rect";
}

/**
 * 图形面积转化链（独立模式）：链顶栏 + 五站舞台 + 链条底栏。
 * 路由参数：station=rect|para|tri|trap|circle 指定进入站；play=1 沿链播放。
 */
export function AreaChain({ exploration }: ExplorationProps) {
  const settings = useSettings();
  const route = useHashRoute();
  const [state, dispatch] = useReducer(
    reducer,
    { mode: settings.mode, station: parseStation(route.params.get("station")), playThrough: route.params.get("play") === "1" },
    initialState,
  );
  const [epoch, setEpoch] = useState(0);
  const [drawer, setDrawer] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  useChainEvidence(state, exploration.id, epoch);

  // 全局模式同步到链状态（切模式不清数据）
  useEffect(() => {
    if (state.mode !== settings.mode) dispatch({ type: "SET_MODE", mode: settings.mode });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.mode]);
  const setMode = (m: "teacher" | "student") => {
    settings.setMode(m);
    dispatch({ type: "SET_MODE", mode: m });
    if (m === "student") setDrawer(false);
  };

  // 站号写回 URL（可深链、可刷新回到本站）；不触发重挂载
  useEffect(() => {
    if (route.params.get("station") !== state.station) {
      const params: Record<string, string> = { station: state.station };
      if (state.playThrough) params.play = "1";
      navigate(`/explore/${exploration.id}`, params);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.station]);

  const s = state;
  const idx = stationIndex(s.station);
  const prev = prevStation(s.station);
  const next = nextStation(s.station);
  const backNode = isShapeStation(s.station) ? (s.station === "rect" ? "5a-06" : "5a-07") : "6a-05-07";

  return (
    <div className="chain-root" data-mode={s.mode}>
      <header className="chain-topbar">
        <a className="btn" href={href("/", { node: backNode })} aria-label="返回知识树">
          ← 知识树
        </a>
        <button className="btn" disabled={prev === null} onClick={() => dispatch({ type: "PREV_STATION" })}>
          ← 上一站
        </button>
        <span className="title">{exploration.title}</span>
        <span className="station-name">
          · 第 {idx + 1} 站 {STATION_TITLE[s.station]}
          {s.playThrough && <span className="tag">沿链播放</span>}
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
        {questionCardVisible(s) && (
          <button className="chain-qcard-btn" aria-label="老师提问卡" aria-pressed={drawer} onClick={() => setDrawer(!drawer)}>
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
        {next !== null && (
          <button className="btn primary" disabled={!canGoNext(s)} onClick={() => dispatch({ type: "NEXT_STATION" })}>
            下一站 →
          </button>
        )}
      </header>

      <div className="chain-body">
        {isShapeStation(s.station) ? (
          <StationView key={s.station} station={s.station} state={s} dispatch={dispatch} />
        ) : (
          <CircleEntry state={s} dispatch={dispatch} />
        )}
        {drawer && questionCardVisible(s) && (
          <ChainQuestionDrawer state={s} dispatch={dispatch} cards={exploration.questionCards} onClose={() => setDrawer(false)} />
        )}
      </div>

      <footer className="chain-bar" aria-label="五站链条">
        {STATIONS.map((k, i) => {
          const done = isShapeStation(k) ? stationCompleted(s, k) : s.circleEntered;
          return (
            <button
              key={k}
              className={`chain-dot ${done ? "done" : ""} ${k === s.station ? "current" : ""}`}
              aria-current={k === s.station ? "step" : undefined}
              onClick={() => dispatch({ type: "SELECT_STATION", station: k })}
            >
              <span className="n">{done ? "✓" : i + 1}</span>
              {STATION_TITLE[k]}
            </button>
          );
        })}
        <span className="spacer" />
        <span className="chain-progress muted">
          已完成 {STATIONS.filter((k) => isShapeStation(k) && stationCompleted(s, k)).length} / 4 站
        </span>
      </footer>

      {confirmReset && (
        <ConfirmModal
          title="确定重置？"
          body="五站的数据都会清空，回到第 1 站。"
          confirmLabel="确定重置"
          onCancel={() => setConfirmReset(false)}
          onConfirm={() => {
            dispatch({ type: "RESET" });
            setEpoch((e) => e + 1);
            setConfirmReset(false);
          }}
        />
      )}
    </div>
  );
}
