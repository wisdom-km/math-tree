# PR #4 接手清单（圆的面积探究单）

> 给下一任（人或 Agent）直接接着干。**不要从零写。**  
> 仓库：`wisdom-km/math-tree` · 分支：`m1/circle-area` · PR：https://github.com/wisdom-km/math-tree/pull/4  
> 规格：`docs/explorations/circle-area.md`（第 9 节 28 条验收）  
> 本文随分支维护；做完一项就把状态改掉。

---

## 暂停点（2026-09-14）

Wisdom 要求暂停。本任**没有改产品代码**，只做了真机补测 + 重截 03。收尾未做完。

本地：`D:\Math-\math-tree` · 分支 `m1/circle-area` · 已与 `origin/main`（`6c3b47b`）对齐，无需再 rebase。  
HEAD：`7b3bd68`（上一任文档提交）。工作区干净。

### 本任已做

1. 老师模式按第 7 节路径走完主单 0→7，并点了第 5 节 B 的重点项（见下表）。
2. 圆环迷你单点开「π(R − r)² 也对吗？」；方圆迷你单见 0.86 / 1.14，外圆内方拆两个三角形。
3. 真机重截 `03-ring-or-square.png`（两式 100.48 + 红色错法小圆 50.24 + 「光盘」「收起错法」同时入镜）。01、02 沿用。

### 本任未做（下一任接着）

| 项 | 状态 |
| --- | --- |
| `pnpm test` / `pnpm build` | **本任未重跑**（`pnpm test` 启动后被中止；dev server 也被停）。上一任记录 112 / build 通过，请再跑一次确认。 |
| `cargo check --locked` | 本任未跑。上一任 rustc **1.97.0** 通过。本机若只有 rustc 1.83，会因 hashbrown edition2024 失败——有 ≥1.85 再 `--locked`，不要乱 pin。 |
| 更新 PR 正文 | 未改。 |
| `gh pr ready 4 --repo wisdom-km/math-tree` | **未执行**。GitHub 上 PR 已是非 draft（上一任可能已 ready）。下一任先 `gh pr view 4` 确认；若仍是 draft 再 ready。**不要 merge。** |
| 双 pointer（#23）/ SQLite（#25） | 仍缺口，不阻断取消草稿。 |

### 本任补测记录（真机，老师模式）

| 项 | 结果 |
| --- | --- |
| 步骤 1 数格子 | 完整 **32** + 不完整 **28** |
| 步骤 2 | 太低 30 / 最可能 45 / 太高 60；先「+ 添加候选」50 后出现 +1/−1 |
| 步骤 3 | 剪前「移」「拼」禁用；剪后解锁；n=8/16/32 各记一行后可进规律 |
| 步骤 5 | 填「周长」出现对照线段「周长 C = 25.12 cm」；再填「周长的一半」「半径」+ 发现/因为后可揭示 |
| 步骤 6 | 点 3 次到 S=πr²；「另一条路：拆成三角形」卡：½ × C × r = πr² |
| 步骤 7 填 31.4（r=5） | 「预测偏少——你算的可能是周长；r² 是 r × r，不是 r × 2」。拼出 ≈ 78.41，精确 78.50 |
| 任务 B | 点「d → r」前该任务只有该按钮、**无 S**；点后出现「S = ？」。任务 C「① 面积」始终在，不要搞混 |
| 对照全班 | 精确值 50.24，最接近候选 **50** |
| 学生模式 | 藏步骤 8 与「?」；步骤 7 无「周长∥面积」；切回老师，表行 8/16/32 仍在 |
| 三角形放大 | 点一份放大（文案「点空白关闭」）；点舞台空白关闭 |
| 重置 | 「确定重置？」后点取消，表行仍在 |
| 圆环 | 光盘内 2 · 外 6；两式均为 100.48；错法小圆 50.24；内半径滑块 0.5–5.5 |
| 方圆 | 外方内圆系数 0.86；外圆内方 1.14 且标「不变」；拆成两个三角形：底 2r、高 r，合计 2r² |

---

## 0. 硬约束（先读再动手）

1. **不要 merge** PR #4。标题保持「M1：圆的面积探究单（含圆环、方圆迷你探究单）」，走查收尾后 `gh pr ready 4 --repo wisdom-km/math-tree`。
2. **不要实现或修改** `src/shared/shape-canvas/`（那是 PR #3 面积转化链的范围）。
3. **`TODO(area-chain)` 接入点保持**（`RecallStage.tsx`、`TriRecallModal.tsx`、`Controls.tsx` 头部注释），等链落地后再换。
4. **不要改圆的周长探究单**（`src/explorations/circle-circumference/`、`docs/explorations/circle-circumference.md`）。
5. 推送用环境变量 `MATH_TREE_TOKEN`，**勿打印令牌**。
6. 提交信息中文、按功能拆。
7. 截图必须真机浏览器走完再截，不要伪造。

---

## 1. 准备

```bash
git clone https://github.com/wisdom-km/math-tree.git ~/math-tree
cd ~/math-tree
git fetch origin m1/circle-area main
git checkout m1/circle-area
git rebase origin/main          # 若已是最新可跳过
pnpm install
pnpm dev                        # http://localhost:1420/
```

推送：

```bash
git push "https://x-access-token:${MATH_TREE_TOKEN}@github.com/wisdom-km/math-tree.git" m1/circle-area
git remote set-url origin https://github.com/wisdom-km/math-tree.git
```

打开：

| 页 | Hash |
| --- | --- |
| 主探究单 | `#/explore/exp-6a-05-area` |
| 圆环迷你单 | `#/explore/exp-6a-05-ring` |
| 方圆迷你单 | `#/explore/exp-6a-05-square-circle` |

老师模式：顶栏「老师」按下。重置会清到步骤 0。

---

## 2. 当前代码状态

主单步骤 0–9、剪拼舞台、数据表、双填空、推导链、验证、延伸入口、易混并排：**已实现**。  
圆环 / 方圆迷你单：**已实现**（不是占位页）。  
交互稿口径修订：**已写入** `docs/explorations/circle-area.md` 第 11 节修订记录。  
本任（2026-09-14）**未改** `src/`。

### 目录

```
src/explorations/circle-area/
  CircleArea.tsx
  circle-area.css
  model/{types,geometry,derived,pattern,reducer,evidence}.ts
  useAssembleAnimation.ts
  useEvidenceSync.ts
  components/     AssemblyStage Controls SvgSlider DataTable LiveFormula
                  PatternFillIn DerivationChain VerifyPanel ExtensionStage
                  ConfusionSplit RecallStage TriRecallModal ContextStage
                  GuessPanel HandVoteChart QuestionDrawer
  mini/
    MiniShell.tsx                 迷你单顶栏壳
    model.ts                     圆环/方圆纯函数（有 vitest）
    RingExploration.tsx          圆环交互
    SquareCircleExploration.tsx  方圆 + 拆两个三角形
content/explorations/exp-6a-05-area.yaml
content/explorations/exp-6a-05-ring.yaml
content/explorations/exp-6a-05-square-circle.yaml
src/explorations/registry.ts    circle-area / circle-ring / circle-square
tests/circle-area-model.test.ts  54
tests/circle-area-mini.test.ts   5
```

### 已拍板口径（不要改回去）

- 「精确面积」= 教材 **3.14 × r²**，不是 `Math.PI`（`gapToTrue` / 彩蛋 0.02）。
- 步骤 7 归因：2πr = πd = π×2r 合并一句「可能是周长；r² 是 r × r」。
- r 范围 **2.0–6.0**；翻倍演示用 **2→4 / 3→6**，不要 4→8。
- 步骤 1 数格子 r=4：完整 **32**、不完整 **28**（不是教材约 24）。
- 长方形两端半份错位、外框按 n/2×弦长居中：视为「毛毛的」直观，可接受。
- 易混并排：**左周长、右面积**（全系统固定）。
- 步骤 3–5 改 r/n **清拼合区重拼**；步骤 6 起揭示后随 r **缩放不清区**。

---

## 3. 验证现状

| 项 | 结果 |
| --- | --- |
| `pnpm test` | 上一任：**112 通过**（主单 54 + 迷你单 5 + 周长 43 + 内容 10）。**本任未重跑。** |
| `pnpm typecheck` | 上一任通过（含在 `pnpm build`）。本任未跑。 |
| `pnpm build` | 上一任通过。本任未跑。 |
| `cargo check --locked --manifest-path src-tauri/Cargo.toml` | 上一任通过（rustc **1.97.0**，未 pin）。本任未跑。 |
| Chrome 走查 | **本任 2026-09-14 已再走**第 5 节 B + 第 7 节路径 + 圆环/方圆；见第 4 节 |
| PR 标题 / `gh pr ready` | 标题已是「M1：圆的面积探究单（含圆环、方圆迷你探究单）」。本任未执行 `gh pr ready`。**不要 merge。** |

### 截图（Agent Store，未进 git）

绝对路径前缀：`C:\Users\19612\AppData\Local\Cursor\AgentStores\cursor_agent_stores\bc-63501b5b-bea3-42a0-8931-65e509b06ddc\files\media\circle-area\`

- `01-assembly-rect.png` — 步骤 3 长方形拼合 + 外框 + 尺子（沿用）
- `02-formula-reveal.png` — 步骤 6 S=πr² 活公式（沿用）
- `03-ring-or-square.png` — **本任真机重截**（1664×1166）：圆环两式 100.48 + 红色错法小圆 50.24 + 「光盘：内 2 · 外 6」「收起错法」入镜。同目录有 conflict 备份，不要进 git。

---

## 4. 第 9 节 28 条验收

图例：已见 = 浏览器已见（含本任 2026-09-14 复测）；补测 = 建议再点一次；缺口 = 未测或有洞；跳过 = 本 PR 故意不做

| # | 结果 | 证据 / 缺口 |
| --- | --- | --- |
| 1 | 已见 | 步骤 3 仅「剪」wiggle，无自动拼 |
| 2 | 已见 | 步骤 0「长 × 宽」后可下一步。三角形回忆在首次「拆成三角形」弹窗（已拍板第 6 条） |
| 3 | 已见 | 完整 32 + 不完整 28，不给结论 |
| 4 | 已见 | 三估值 30/45/60 + 参照正方形 64。先「+ 添加候选」50 后出现 +1/−1（不是 bug） |
| 5 | 已见 | 剪前移/拼禁用；剪后解锁 |
| 6 | 已见 | 点「拼」走到 100%（1.2s） |
| 7 | 已见 | 改 n 清区、表行保留；老师可见 128 |
| 8 | 已见 | 外框 + 长≈? 宽=? + 点边贴尺。n=8 端头半份凸出为规格接受项 |
| 9 | 已见 | 两位小数、无噪声（8/16/32 行：45.25 / 48.98 / 49.94） |
| 10 | 已见 | 点一份放大、点空白关闭（本任复测） |
| 11 | 已见 | 8/16/32 三行后进步骤 5 |
| 12 | 已见 | 步骤 5 前无 S=πr²（当步芯片上的 πr 允许） |
| 13 | 已见 | 「周长」出对照线段「周长 C = 25.12 cm」而非打叉 |
| 14 | 已见 | 推导三行 + 活公式 3.14×4×4=50.24（截图 02） |
| 15 | 已见 | 「另一条路：拆成三角形」卡 |
| 16 | 已见 | 任务 A 填 31.4（r=5 的周长）：「预测偏少——你算的可能是周长；r² 是 r × r，不是 r × 2」。对照全班：最接近候选 50（精确 50.24） |
| 17 | 已见 | 任务 B 在点「d → r」前只有该按钮、无 S；点后才出现「S = ？」。任务 C「① 面积」始终在，不要搞混 |
| 18 | 已见 | 两式同步 100.48；点开「π(R − r)² 也对吗？」红色小圆 50.24；滑块 0.5–5.5。截图 03 |
| 19 | 已见 | 外方内圆 0.86 / 外圆内方 1.14 标「不变」；拆两个三角形合计 2r² |
| 20 | 已见 | 老师模式顶栏有「周长∥面积」；学生步骤 7 无此按钮 |
| 21 | 已见 | 学生藏「?」与步骤 8；步骤 7 无「周长∥面积」；步骤 9 才出现。切回老师表行 8/16/32 仍在 |
| 22 | 已见 | 拖柄/主按钮 ≥48px；屏幕键盘 |
| 23 | 缺口 | 双 pointer 未实机测。代码按 pointerId 捕获 |
| 24 | 已见 | 「确定重置？」出现后点取消，数据仍在 |
| 25 | 缺口 | 未查 SQLite。点「完成探究」应写 `exploration_completed`。标记已问故意不写证据（与周长单一致） |
| 26 | 已见 | 全 SVG |
| 27 | 跳过 | 等 PR #3 共用组件，本单已 TODO(area-chain)（RecallStage / TriRecallModal / Controls 头部注释未动） |
| 28 | 已见 | 右栏可滚（圆环右栏超高可滚） |

---

## 5. 下一任要做完的清单（按顺序）

### A. UI

无需。产品代码已在分支上。工作区应干净（除本文档本次提交）。

### B. 浏览器补测 — 本任已走；不必重做，除非改了 UI

见文首「本任补测记录」。

### C. 测试与构建 — 请再跑

```bash
pnpm test
pnpm build
# rustc ≥ 1.85 时：
rustup run stable cargo check --locked --manifest-path src-tauri/Cargo.toml
```

不要为 rustc 1.83 的 hashbrown edition2024 去 pin 依赖。

### D. 更新 PR（不要 merge）

1. 把本文第 4 节 28 条摘要写进 PR 正文。
2. 标题保持「M1：圆的面积探究单（含圆环、方圆迷你探究单）」。
3. `gh pr ready 4 --repo wisdom-km/math-tree`（若已是 ready 可跳过）。
4. **不要 merge。**

### E. Agent Store

截图在 `bc-63501b5b-bea3-42a0-8931-65e509b06ddc/files/media/circle-area/`。  
不要覆盖 `circle-area-handoff.md` 的 frontmatter。不要把截图 commit 进 git。

---

## 6. 已知 UI 问题

| 问题 | 说明 | 状态 |
| --- | --- | --- |
| 三角形放大关不掉 | 换步骤仍留着；点空白不关 | **已确认**：点空白关闭 |
| 圆环右栏按钮裁切 | 「光盘」按钮被裁 | **已确认**：03 入镜「光盘」「收起错法」 |
| 圆环 R/r 标签重叠 | 内半径文字叠在圆上 | **已确认**：r 标在内圆左侧、R 在右侧 |
| 举手找不到 +1/−1 | 须先「+ 添加候选」 | 不是 bug |
| 任务 B 能在 d→r 前填 S | 误点任务 C | 不是 bug |
| 步骤 1 情境文案叠字 | 「学校要给这块圆形草坪铺草皮」与「完整 32 格」略重叠 | 未修，不阻断 |

性能降级（22 ms/帧）未实测，不阻断取消草稿。

---

## 7. 快速复现路径

```
老师 → 步骤0「长 × 宽」→ 下一步
步骤1「试着数格子」（32+28）→ 先猜
步骤2 太低30 / 最可能45 / 太高60；+ 添加候选 50 → 开始动手
步骤3 剪 → 拼 → 加入数据表；n=16、n=32 再各记一行 → 找规律
步骤5 先点「周长」看对照线段，再「周长的一半」「半径」+ 我发现/因为 → 提交 → 揭示
步骤6 推导点 3 次到 S=πr² → 用新圆验证一下
步骤7 点 r=5，我算出的 S = 31.4 → 锁定 → 拼  （必须出周长/r² 提示）
再验证一次可填 78.5
任务 B：确认点「d → r」前无 S，再点
对照全班的猜测 → 最接近 50
```

数字只用屏幕键盘。圆环：`#/explore/exp-6a-05-ring` → 光盘 →「π(R − r)² 也对吗？」。

---

## 8. 不要做的事

- 不要从零重写主单或迷你单。
- 不要改周长探究单、不要动 `shape-canvas`。
- 不要为 cargo 失败去升级/降级无关 crate，除非 rustc ≥ 1.85 后再 `--locked`。
- 不要 merge。
- 不要把 Agent Store 截图 commit 进 git。

---

## 9. 汇报时交的东西

- PR 链接：https://github.com/wisdom-km/math-tree/pull/4
- 三张截图绝对路径（见第 3 节）
- `pnpm test` 用例数（本任未重跑，下一任补）
- 28 条验收表（本文第 4 节）
- 未完成项：#23 双 pointer、#25 SQLite、#27 跳过 TODO(area-chain)；本任未跑 test/build/cargo、未 `gh pr ready`
