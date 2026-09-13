# PR #4 接手清单（圆的面积探究单）

> 给下一任（人或 Agent）直接接着干。**不要从零写。**  
> 仓库：`wisdom-km/math-tree` · 分支：`m1/circle-area` · 草稿 PR：https://github.com/wisdom-km/math-tree/pull/4  
> 规格：`docs/explorations/circle-area.md`（第 9 节 28 条验收）  
> 本文随分支维护；做完一项就把状态改掉。

---

## 0. 硬约束（先读再动手）

1. **不要 merge** PR #4。标题应改为「M1：圆的面积探究单（含圆环、方圆迷你探究单）」，走查收尾后 `gh pr ready 4 --repo wisdom-km/math-tree`。
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
| `pnpm test` | **112 通过**（主单 54 + 迷你单 5 + 周长 43 + 内容 10） |
| `pnpm typecheck` | 通过（含在 `pnpm build`） |
| `pnpm build` | 通过 |
| `cargo check --locked --manifest-path src-tauri/Cargo.toml` | **通过**：本机 `rustup run stable` 为 rustc **1.97.0**。未改 lock / 未 pin crate。 |
| Chrome 走查 | 老师模式 0–9 + 第 5 节 B 补测已走；见第 4 节 |
| PR 标题 / `gh pr ready` | 标题已是「M1：圆的面积探究单（含圆环、方圆迷你探究单）」。走查收尾后 `gh pr ready`。**不要 merge。** |

### 截图（Agent Store，未进 git）

- `/cursor/stores/bc-63501b5b-bea3-42a0-8931-65e509b06ddc/media/circle-area/01-assembly-rect.png` — 步骤 3 长方形拼合 + 外框 + 尺子（沿用）
- `/cursor/stores/bc-63501b5b-bea3-42a0-8931-65e509b06ddc/media/circle-area/02-formula-reveal.png` — 步骤 6 S=πr² 活公式（真机重截）
- `/cursor/stores/bc-63501b5b-bea3-42a0-8931-65e509b06ddc/media/circle-area/03-ring-or-square.png` — 圆环两式 100.48 + 红色错法小圆 50.24（真机重截，错法已点开）

备份：Windows `%TEMP%\circle-area-shots\`（02、03）。

---

## 4. 第 9 节 28 条验收

图例：已见 = 浏览器已见；补测 = 建议再点一次；缺口 = 未测或有洞；跳过 = 本 PR 故意不做

| # | 结果 | 证据 / 缺口 |
| --- | --- | --- |
| 1 | 已见 | 步骤 3 仅「剪」wiggle，无自动拼 |
| 2 | 已见 | 步骤 0 拖长同步格子+算式；错选描边流动。三角形回忆在首次「拆成三角形」弹窗（已拍板第 6 条） |
| 3 | 已见 | 完整 32 + 不完整 28，不给结论 |
| 4 | 已见 | 三估值 30/45/60 + 参照正方形 64。先「+ 添加候选」50 后出现 +1/−1（不是 bug） |
| 5 | 已见 | 剪前移/拼禁用；剪后出缝 |
| 6 | 已见 | 滑块中途停、点「拼」走到 100% |
| 7 | 已见 | 改 n 清区、表行保留；老师可见 128 |
| 8 | 已见 | 外框 + 长≈? 宽=? + 点边贴尺。n=8 端头半份凸出为规格接受项 |
| 9 | 已见 | 两位小数、无噪声 |
| 10 | 已见 | 三角形锯齿/换行、点一份放大、点空白关闭、表头切换、两拼法行可混 |
| 11 | 已见 | 8/16/32 三行后进步骤 5 |
| 12 | 已见 | 步骤 5 前无 S=πr²（当步芯片上的 πr 允许） |
| 13 | 已见 | 「周长」出对照线段而非打叉 |
| 14 | 已见 | 推导三行 + 活公式 3.14×4×4=50.24（截图 02） |
| 15 | 已见 | 「另一条路：拆成三角形」卡 |
| 16 | 已见 | 任务 A 填 31.4（r=5 的周长）：「预测偏少——你算的可能是周长；r² 是 r × r，不是 r × 2」。对照全班：最接近候选 50（精确 50.24） |
| 17 | 已见 | 任务 B 在点「d → r」前只有该按钮、无 S；点后才出现「S = ？」。任务 C「① 面积」始终在，不要搞混 |
| 18 | 已见 | 两式同步 100.48；点开「π(R − r)² 也对吗？」红色小圆 50.24；滑块 0.5–5.5。截图 03 |
| 19 | 已见 | 0.86 / 1.14 不变；拆三角形；结论 2 与 3.14 |
| 20 | 已见 | 左周长右面积、同一 r 滑块 |
| 21 | 已见 | 学生藏「?」与步骤 8；步骤 7 无「周长∥面积」；步骤 9 才出现。切回老师表行 8/16/32 仍在 |
| 22 | 已见 | 拖柄/主按钮 ≥48px；屏幕键盘 |
| 23 | 缺口 | 双 pointer 未实机测。代码按 pointerId 捕获 |
| 24 | 已见 | 「确定重置？」出现后点取消，数据仍在。另撤销一次回到步骤 7 |
| 25 | 缺口 | 未查 SQLite。点「完成探究」应写 `exploration_completed`。标记已问故意不写证据（与周长单一致） |
| 26 | 已见 | 全 SVG |
| 27 | 跳过 | 等 PR #3 共用组件，本单已 TODO(area-chain) |
| 28 | 已见 | 1920×1080 右栏可滚 |

---

## 5. 你要做完的清单（按顺序）

### A. 提交已改未推的 UI（若工作区还有）

已在分支上：`4b4475a`（三角形放大点空白关闭；圆环标签与按钮）。本任工作区干净，无需再提交 UI。

### B. 浏览器补测（老师模式，真机）— 已完成

1. 步骤 7 填 **31.4**：出现「你算的可能是周长；r² 是 r × r，不是 r × 2」。
2. 任务 B：点「d → r」前无 S 按钮；点后出现「S = ？」。
3. 步骤 2 加候选 50，步骤 7「对照全班的猜测」标最接近 50。
4. 圆环点开错法，重截 `03-ring-or-square.png`（两式 100.48 + 红色小圆 50.24）。
5. 学生模式：步骤 8 与「?」隐藏；步骤 9 前无易混；切回老师表行仍在。
6. 拆成三角形：点一份放大，点舞台空白关闭。
7. 重置出现「确定重置？」后取消，数据保留。

### C. 测试与构建 — 已完成

`pnpm test` 112 · `pnpm build` · `cargo check --locked`（rustc 1.97.0）。

### D. 更新 PR（不要 merge）

走查收尾后 `gh pr ready 4 --repo wisdom-km/math-tree`。标题保持「M1：圆的面积探究单（含圆环、方圆迷你探究单）」。

### E. Agent Store

本任状态：`internal/circle-area-pr4-ready.md`（新建，不覆盖 `circle-area-handoff.md` 的 frontmatter）。

---

## 6. 已知 UI 问题

| 问题 | 说明 | 状态 |
| --- | --- | --- |
| 三角形放大关不掉 | 换步骤仍留着；点空白不关 | **已确认**：点空白关闭 |
| 圆环右栏按钮裁切 | 「光盘」按钮被裁 | **已确认**：03 入镜「光盘」「收起错法」 |
| 圆环 R/r 标签重叠 | 内半径文字叠在圆上 | **已确认**：r 标在内圆左侧、R 在右侧 |
| 举手找不到 +1/−1 | 须先「+ 添加候选」 | 不是 bug |
| 任务 B 能在 d→r 前填 S | 误点任务 C | 不是 bug |

性能降级（22 ms/帧）未实测，不阻断取消草稿。

---

## 7. 快速复现路径

```
老师 → 步骤0「长 × 宽」→ 下一步
步骤1「试着数格子」（32+28）→ 先猜
步骤2 太低30 / 最可能45 / 太高60 → 开始动手
步骤3 剪 → 拼 → 加入数据表；n=16、n=32 再各记一行 → 找规律
步骤5 「周长的一半」「半径」+ 我发现/因为 → 提交 → 揭示
步骤6 推导点 3 次到 S=πr² → 用新圆验证一下
步骤7 我算出的 S = 78.5 → 锁定 → 拼
```

数字只用屏幕键盘。

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
- 三张截图绝对路径
- `pnpm test` 用例数
- 28 条验收表（更新本文第 4 节）
- 未完成项（SQLite / 双 pointer / 第 27 条跳过；cargo 已在 rustc 1.97 通过）
