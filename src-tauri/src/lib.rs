use tauri_plugin_sql::{Migration, MigrationKind};

/// 与前端 `src/db/client.ts` 里的 DB_URL 保持一致。
const DB_URL: &str = "sqlite:math-tree.db";

/// 迁移 SQL 由 `pnpm db:generate`（drizzle-kit）生成到 drizzle/ 目录，这里逐个引入。
/// 新增迁移：生成新文件后在此追加一项，version 递增。
fn migrations() -> Vec<Migration> {
    vec![Migration {
        version: 1,
        description: "init: students / knowledge_nodes / mastery / sessions / evidence",
        sql: include_str!("../../drizzle/0000_init.sql"),
        kind: MigrationKind::Up,
    }]
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations(DB_URL, migrations())
                .build(),
        )
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
