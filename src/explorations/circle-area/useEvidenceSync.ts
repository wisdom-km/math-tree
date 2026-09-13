import { useEffect, useRef, useState } from "react";
import { useSettings } from "@/app/settings";
import { useRepository } from "@/db/context";
import type { EvidenceEventDef } from "@/db/evidence-events";
import type { Session } from "@/db/schema";
import type { UiMode } from "@/db/schema";

/**
 * 通用版证据写入（沿用周长探究单 useEvidenceSync 的约定）：
 * - keys 由状态派生，每个事件一次会话只记一次；
 * - 已拍板：全班本课记一条（scope=class），选了上台学生时再记一条（scope=student）；
 * - 只记录，不改掌握度；epoch 变化（重置）时开新会话。
 * 主探究单与两个迷你探究单共用。
 */
export function useEvidenceSync<K extends string>(
  explorationId: string,
  mode: UiMode,
  keys: readonly K[],
  defs: Record<K, EvidenceEventDef>,
  payload: Record<string, unknown>,
  epoch = 0,
): void {
  const repo = useRepository();
  const { currentStudentId } = useSettings();
  const session = useRef<Session | null>(null);
  const recorded = useRef<Set<string>>(new Set());
  const [sessionId, setSessionId] = useState<string | null>(null);
  const keysSig = keys.join("|");

  useEffect(() => {
    if (!repo) return;
    recorded.current = new Set();
    let active = true;
    void repo.startSession(explorationId, mode).then((s) => {
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
      const def = defs[key];
      const base = {
        sessionId: s.id,
        explorationId,
        event: def.event,
        nodeId: def.nodeId ?? null,
        masteryHint: def.masteryHint ?? null,
        payload,
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
