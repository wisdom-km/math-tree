# math-tree

人教版小学数学知识树教学系统：可视化探究单 + 主卡 / 副卡 / 方法卡 + 掌握度诊断。第一阶段做六年级上册。

- [需求文档 v1](docs/requirements-v1.md)
- [六上知识树初稿](docs/knowledge-tree-6a.md)
- [探究单交互稿：圆的周长](docs/explorations/circle-circumference.md)
- [探究单交互稿：图形面积转化链](docs/explorations/area-chain.md)
- [探究单交互稿：圆的面积](docs/explorations/circle-area.md)
- [可视化教学方案调研报告](docs/research-visualization.md)
- [内容文件格式](content/README.md)

## 形态与技术栈

Windows 桌面应用（Tauri 2），前端 React 18 + TypeScript + Vite，图形全部 SVG 参数驱动，几何计算用 `@mathigon/euclid`。本地数据用 SQLite（`tauri-plugin-sql`）+ Drizzle（sqlite-proxy 驱动）；纯前端的探究单在普通浏览器里也能脱离数据库运行（数据层自动降级为内存实现）。

```
content/            知识树节点、关系、探究单元信息、提问卡（YAML，内容与代码分离）
src/content/        内容加载器与 zod schema 校验
src/db/             Drizzle schema、仓储接口、SQLite / 内存两种实现
drizzle/            drizzle-kit 生成的迁移 SQL（Rust 侧启动时执行）
src/tree/           知识树浏览页
src/roster/         名册（M1 最小版：建学生、选当前上台学生、看证据）
src/explorations/   探究单实现；circle-circumference/ 为「圆的周长」；area-chain/ 为「图形面积转化链」
src/shared/         链上共用舞台 ShapeCanvas、剪 / 移 / 拼、几何计算
src-tauri/          Tauri 2 壳（Rust）：SQL 插件、迁移、Windows 打包配置
.github/workflows/  build-windows.yml：tauri-action 打 Windows 安装包
```

## 环境要求

- Node.js ≥ 20，pnpm 10（`corepack enable` 或 `npm i -g pnpm`）
- Rust stable（`rustup`），仅打桌面包 / `cargo check` 时需要
- Windows 打包：Visual Studio C++ 生成工具 + WebView2（Win10/11 自带）
- Linux 上开发需要 Tauri 的系统依赖：`libwebkit2gtk-4.1-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev patchelf`

## 安装与开发

```bash
pnpm install

# 纯前端预览（浏览器，数据层为内存实现）
pnpm dev            # http://localhost:1420

# 桌面壳内开发（Vite 热更新 + SQLite）
pnpm tauri dev
```

打开后：`#/` 知识树浏览页 → 点「6a-05-05 圆周率 π」→ 「圆的周长」进入探究单；也可直接访问 `#/explore/exp-6a-05-circumference`。顶栏可切老师 / 学生模式。

面积转化链（五站迷你回忆）：`#/explore/exp-chain-area?station=rect&play=1` 从第 1 站沿链播放。`station` 为 `rect` / `para` / `tri` / `trap` / `circle`。嵌入模式自检（模拟圆面积步骤 0 并排回忆）：`#/explore/exp-chain-area?embed=1`；单站 `?embed=para`。知识树旧知识 `5a-06` / `5a-08` 进第 1 站、`5a-07` 进第 2 站、`6a-05-07` 进第 5 站入口；「转化自」栏有「沿链播放」。

## 测试与检查

```bash
pnpm test           # vitest：内容层校验 + 探究单状态模型（周长 + 面积链）+ 几何
pnpm typecheck      # tsc --noEmit
pnpm build          # 类型检查 + Vite 生产构建
cargo check --manifest-path src-tauri/Cargo.toml
```

## 数据库与迁移

schema 在 `src/db/schema.ts`（students / knowledge_nodes / mastery / sessions / evidence）。改 schema 后：

```bash
pnpm db:generate    # 生成 drizzle/000N_*.sql
```

再把新文件追加到 `src-tauri/src/lib.rs` 的 `migrations()`（version 递增）。运行时由 `tauri-plugin-sql` 在启动时执行迁移；数据库文件 `math-tree.db` 位于应用数据目录（Windows：`%APPDATA%\com.wisdom-km.math-tree\`），单文件可复制备份。

## 打包

```bash
pnpm tauri build                          # 当前平台
pnpm tauri build --target x86_64-pc-windows-msvc   # Windows（需在 Windows 上或交叉编译环境）
```

Windows 安装包由 GitHub Actions 打：推 `v*` tag 自动运行 `.github/workflows/build-windows.yml`（也可手动触发），产物为 NSIS `.exe` 与 `.msi`，安装时静默安装 WebView2 运行时。

## 内容

内容文件格式与写法见 [content/README.md](content/README.md)。加新单元只加 `content/units/*.yaml`，不改程序；启动和 `pnpm test` 都会做 schema 与引用校验。

## 里程碑

见需求文档第 8 节。当前：M1 第一阶段（骨架、数据层、内容层、知识树浏览页、「圆的周长」探究单、「图形面积转化链」探究单）。
