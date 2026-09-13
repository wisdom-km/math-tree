import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { createRepository } from "./client";
import type { NodeRef, Repository } from "./repository";

interface DbContextValue {
  repo: Repository | null;
  error: string | null;
}

const DbContext = createContext<DbContextValue>({ repo: null, error: null });

export function DbProvider({ nodes, children }: { nodes: NodeRef[]; children: ReactNode }) {
  const [value, setValue] = useState<DbContextValue>({ repo: null, error: null });

  useEffect(() => {
    let cancelled = false;
    createRepository()
      .then(async (repo) => {
        try {
          await repo.syncNodes(nodes);
        } catch (e) {
          console.error("知识节点同步失败：", e);
        }
        if (!cancelled) setValue({ repo, error: null });
      })
      .catch((e: unknown) => {
        if (!cancelled) setValue({ repo: null, error: (e as Error).message });
      });
    return () => {
      cancelled = true;
    };
    // nodes 来自内容层，在应用生命周期内不变
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <DbContext.Provider value={value}>{children}</DbContext.Provider>;
}

export function useRepository(): Repository | null {
  return useContext(DbContext).repo;
}

export function useDbStatus(): DbContextValue {
  return useContext(DbContext);
}
