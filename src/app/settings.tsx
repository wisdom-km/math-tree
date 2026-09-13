import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { UiMode } from "@/db/schema";

interface Settings {
  mode: UiMode;
  setMode: (m: UiMode) => void;
  /** 当前上台学生（可空）；证据按全班一条 + 上台学生一条 */
  currentStudentId: string | null;
  setCurrentStudentId: (id: string | null) => void;
}

const KEY = "math-tree.settings";

function load(): { mode: UiMode; currentStudentId: string | null } {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<{ mode: UiMode; currentStudentId: string | null }>;
      return {
        mode: parsed.mode === "student" ? "student" : "teacher",
        currentStudentId: parsed.currentStudentId ?? null,
      };
    }
  } catch {
    /* 忽略损坏的本地设置 */
  }
  return { mode: "teacher", currentStudentId: null };
}

const SettingsContext = createContext<Settings | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(load);
  const persist = useCallback((next: { mode: UiMode; currentStudentId: string | null }) => {
    setState(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* 无 localStorage 时只保存在内存 */
    }
  }, []);
  const value = useMemo<Settings>(
    () => ({
      mode: state.mode,
      setMode: (mode) => persist({ ...state, mode }),
      currentStudentId: state.currentStudentId,
      setCurrentStudentId: (currentStudentId) => persist({ ...state, currentStudentId }),
    }),
    [state, persist],
  );
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): Settings {
  const v = useContext(SettingsContext);
  if (!v) throw new Error("useSettings 必须在 SettingsProvider 内使用");
  return v;
}
