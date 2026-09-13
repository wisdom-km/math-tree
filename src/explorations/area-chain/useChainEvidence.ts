import { useEffect, useRef, useState } from "react";
import { useSettings } from "@/app/settings";
import { useRepository } from "@/db/context";
import { AREA_CHAIN_EVENTS } from "@/db/evidence-events";
import type { Session } from "@/db/schema";
import { evidenceKeys } from "./model/derived";
import type { State } from "./model/types";

/**
 * 沿用「圆的周长」的证据机制：
 * - 事件由状态派生、一次会话只记一次；
 * - 全班一条（scope=class），有上台学生再记一条（scope=student）；
 * - 只记录，不改掌握度。嵌入模式 evidenceKeys 为空，不写。
 */
export function useChainEvidence(state: State, explorationId: string, epoch: number): void {
  const repo = useRepository();
  const { currentStudentId } = useSettings();
  const session = useRef<Session | null>(null);
  const recorded = useRef<Set<string>>(new Set());
  const [sessionId, setSessionId] = useState<string | null>(null);
  const keys = evidenceKeys(state);
  const keysSig = keys.join("|");

  useEffect(() => {
    if (!repo || state.embedded) return;
    recorded.current = new Set();
    let active = true;
    void repo.startSession(explorationId, state.mode).then((s) => {
      if (active) {
        session.current = s;
        setSessionId(s.id);
      } else void repo.endSession(s.id);
    });
    return () => {
      active = false;
      const s = session.current;
      session.current = null;
      setSessionId(null);
      if (s) void repo.endSession(s.id);
    };
    // 会话只随 repo / 探究单 / 重置纪元变化重开
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repo, explorationId, epoch]);

  useEffect(() => {
    const s = session.current;
    if (!repo || !s) return;
    for (const key of keys) {
      if (recorded.current.has(key)) continue;
      recorded.current.add(key);
      const def = AREA_CHAIN_EVENTS[key];
      const station = key.includes(":") ? key.split(":")[1] : state.station;
      const base = {
        sessionId: s.id,
        explorationId,
        event: def.event,
        nodeId: "nodeId" in def ? def.nodeId : null,
        masteryHint: "masteryHint" in def ? def.masteryHint : null,
        payload: { station, playThrough: state.playThrough },
      };
      void repo.recordEvidence({ ...base, scope: "class" }).catch((e: unknown) => console.error("写证据失败", e));
      if (currentStudentId) {
        void repo
          .recordEvidence({ ...base, scope: "student", studentId: currentStudentId })
          .catch((e: unknown) => console.error("写证据失败", e));
      }
    }
    // 只在证据集合变化时写
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keysSig, repo, sessionId]);
}
