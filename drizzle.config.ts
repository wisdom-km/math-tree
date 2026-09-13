import { defineConfig } from "drizzle-kit";

/**
 * 只用 drizzle-kit 生成迁移 SQL（pnpm db:generate）。
 * 运行时迁移由 Rust 侧 tauri-plugin-sql 执行（src-tauri/src/lib.rs 用 include_str! 引入 drizzle/*.sql）。
 */
export default defineConfig({
  dialect: "sqlite",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: "file:./math-tree.dev.db",
  },
});
