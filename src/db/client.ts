import { drizzle } from "drizzle-orm/sqlite-proxy";
import * as schema from "./schema";
import { DrizzleRepository } from "./drizzle-repository";
import { MemoryRepository } from "./memory-repository";
import type { Repository } from "./repository";

/** 数据库文件名；tauri-plugin-sql 把它放在应用数据目录下（Windows：%APPDATA%/<identifier>/）。 */
export const DB_URL = "sqlite:math-tree.db";

export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

/**
 * 创建数据访问层：
 * - Tauri 里连 SQLite（迁移已由 Rust 侧在插件初始化时执行）；
 * - 否则退回内存实现，纯前端探究单照常运行。
 */
export async function createRepository(): Promise<Repository> {
  if (!isTauri()) return new MemoryRepository();
  try {
    const { default: Database } = await import("@tauri-apps/plugin-sql");
    const sqlite = await Database.load(DB_URL);
    const db = drizzle(
      async (query, params, method) => {
        if (method === "run") {
          await sqlite.execute(query, params);
          return { rows: [] };
        }
        // tauri-plugin-sql 返回对象数组，键序即列序；sqlite-proxy 需要按列位置排列的数组。
        const rows = await sqlite.select<Record<string, unknown>[]>(query, params);
        const positional = rows.map((r) => Object.values(r));
        if (method === "get") return { rows: positional[0] ?? [] };
        return { rows: positional };
      },
      { schema },
    );
    return new DrizzleRepository(db);
  } catch (err) {
    console.error("SQLite 初始化失败，降级为内存实现：", err);
    return new MemoryRepository();
  }
}
