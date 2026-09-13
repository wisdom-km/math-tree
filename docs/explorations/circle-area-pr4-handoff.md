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
| `pnpm typecheck` | 通过 |
| `pnpm build` | 通过 |
| `cargo check --manifest-path src-tauri/Cargo.toml` | **失败**：本环境 Cargo 1.83 无法解析 lock 里的 `hashbrown 0.17.1`（要 edition2024 / rustc ≥ 1.85）。不要为过 cargo 去乱 pin 依赖；有新 toolchain 再跑 `--locked`。 |
| Chrome 走查 | 老师模式 0–9 大部分已走；见第 4 节 |
| PR 标题 / `gh pr ready` | **未做**。更新 PR 请用 `GH_TOKEN=$MATH_TREE_TOKEN gh pr edit / gh pr ready`。**不要 merge。** |

### 截图（Agent Store，未进 git）

- `/cursor/stores/bc-63501b5b-bea3-42a0-8931-65e509b06ddc/media/circle-area/01-assembly-rect.png` — 步骤 3 长方形拼合 + 外框 + 尺子
- `/cursor/stores/bc-63501b5b-bea3-42a0-8931-65e509b06ddc/media/circle-area/02-formula-reveal.png` — 步骤 6 S=πr² 活公式
- `/cursor/stores/bc-63501b5b-bea3-42a0-8931-65e509b06ddc/media/circle-area/03-ring-or-square.png` — 圆环（**错法对照未点开**，建议重截）

备份：`/tmp/circle-area-shots/`（另有 `04-verify.png`：步骤 7 任务 A「对上了」78.50 / 78.41 / 78.50）。

---

## 4. 第 9 节 28 条验收

图例：已见 = 浏览器已见；补测 = 建议再点一次；缺口 = 未测或有洞；跳过 = 本 PR 故意不做

| # | 结果 | 证据 / 缺口 |
| --- | --- | --- |
| 1 | 已见 | 步骤 3 仅「剪」wiggle，无自动拼 |
| 2 | 已见 | 步骤 0 拖长同步格子+算式；错选描边流动。三角形回忆在首次「拆成三角形」弹窗（已拍板第 6 条） |
| 3 | 已见 | 完整 32 + 不完整 28，不给结论 |
| 4 | 补测 | 三估值 + 参照正方形 64 已见。举手须先「+ 添加候选」才有 +1/−1（不是 bug） |
| 5 | 已见 | 剪前移/拼禁用；剪后出缝 |
| 6 | 已见 | 滑块中途停、点「拼」走到 100% |
| 7 | 已见 | 改 n 清区、表行保留；老师可见 128 |
| 8 | 已见 | 外框 + 长≈? 宽=? + 点边贴尺。n=8 端头半份凸出为规格接受项 |
| 9 | 已见 | 两位小数、无噪声 |
| 10 | 已见 | 三角形锯齿/换行、点一份放大、表头切换、两拼法行可混 |
| 11 | 已见 | 8/16/32 三行后进步骤 5 |
| 12 | 已见 | 步骤 5 前无 S=πr²（当步芯片上的 πr 允许） |
| 13 | 已见 | 「周长」出对照线段而非打叉 |
| 14 | 已见 | 推导三行 + 活公式 3.14×4×4=50.24 |
| 15 | 已见 | 「另一条路：拆成三角形」卡 |
| 16 | 补测 | 任务 A 正确预测已有图「对上了」。未截图：预测 31.4 的周长提示；回看猜测高亮最接近柱 |
| 17 | 补测 | 任务 B 的 S 按钮在 `tableDToR` 前不渲染。不要把任务 C「① 面积」当成任务 B |
| 18 | 补测 | 两式同步 100.48、光盘、滑块 0.5–5.5 已见。请点「π(R − r)² 也对吗？」并重截 03 |
| 19 | 已见 | 0.86 / 1.14 不变；拆三角形；结论 2 与 3.14 |
| 20 | 已见 | 左周长右面积、同一 r 滑块 |
| 21 | 补测 | 学生藏「?」、切模式不清表已见。再确认步骤 8 不可进、易混仅步骤 9 |
| 22 | 已见 | 拖柄/主按钮 ≥48px；屏幕键盘 |
| 23 | 缺口 | 双 pointer 未实机测。代码按 pointerId 捕获 |
| 24 | 补测 | 重置二次确认已见。建议再撤销一次 r 或表行 |
| 25 | 缺口 | 未查 SQLite。点「完成探究」应写 `exploration_completed`。标记已问故意不写证据（与周长单一致） |
| 26 | 已见 | 全 SVG |
| 27 | 跳过 | 等 PR #3 共用组件，本单已 TODO(area-chain) |
| 28 | 已见 | 1920×1080 右栏可滚 |

---

## 5. 你要做完的清单（按顺序）

### A. 提交已改未推的 UI（若工作区还有）

- `AssemblyStage.tsx`：三角形放大全舞台点空白关闭；换步骤清 zoom
- `RingExploration.tsx`：R/r 标签错开；光盘按钮文案缩短
- `circle-area.css`：迷你单右栏按钮竖排、活公式字号缩小

若 `git status` 仍有这些文件：中文提交后推送。

### B. 浏览器补测（老师模式，真机）

1. 步骤 7 再验证一次填 **31.4**，必须出现周长/r² 提示。
2. 任务 B：确认 S 按钮在点「d → r」之前不出现。
3. 「对照全班的猜测」：步骤 2 先加候选（如 50）再回看。
4. 圆环点错法对照，重截 `03-ring-or-square.png`（两式 + 红色小圆同时入镜）。
5. 学生模式：步骤 8 隐藏；步骤 9 前不能开易混；切回老师数据还在。
6. 拆成三角形：点一份放大，再点舞台空白，放大层应关掉。
7. 重置出现确认后取消。

截图放到 `/cursor/stores/bc-63501b5b-bea3-42a0-8931-65e509b06ddc/media/circle-area/`（`01` `02` 可沿用；`03` 必须带错法对照）。

### C. 测试与构建

```bash
pnpm test      # 期望 ≥112
pnpm build
cargo check --locked --manifest-path src-tauri/Cargo.toml
```

### D. 更新 PR（不要 merge）

```bash
GH_TOKEN=$MATH_TREE_TOKEN gh pr edit 4 --repo wisdom-km/math-tree \
  --title "M1：圆的面积探究单（含圆环、方圆迷你探究单）"
GH_TOKEN=$MATH_TREE_TOKEN gh pr ready 4 --repo wisdom-km/math-tree
```

PR 正文改成已完成口径 + 第 3、4 节验证结果，并链到本文。

### E. Agent Store

最终状态写到 `/cursor/stores/bc-63501b5b-bea3-42a0-8931-65e509b06ddc/internal/`。  
若 `circle-area-handoff.md` 的 frontmatter `subagentId` 不是你的，新建一份并交叉链接，不要覆盖别人的 frontmatter。

---

## 6. 已知 UI 问题

| 问题 | 说明 | 状态 |
| --- | --- | --- |
| 三角形放大关不掉 | 换步骤仍留着；点空白不关 | 代码已改，请浏览器确认 |
| 圆环右栏按钮裁切 | 「光盘」按钮被裁 | 代码已改，请重截 03 |
| 圆环 R/r 标签重叠 | 内半径文字叠在圆上 | 代码已改 |
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
- 未完成项（cargo / SQLite / 双 pointer / 第 27 条）
