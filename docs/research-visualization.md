# 六上数学可视化教学工具 调研报告

> 调研时间：2026-09-13。目的：为 math-tree 的可视化探究单确定交互层级、设计模式和技术栈。结论已吸收进[需求文档 v1](./requirements-v1.md)。

## 一、国际代表性产品与设计特点

- **PhET**（科罗拉多大学）：交互深度最高的一类，每个 sim 是完整的物理 / 数学模型，学生可连续拖拽任意参数。核心是 [Implicit Scaffolding](https://arxiv.org/pdf/1306.6544)（affordance / 约束 / 暗示 / 即时反馈 / 多重表征），"引导但不让学生感到被引导"。[Look and Feel](https://phet.colorado.edu/publications/PhET%20Look%20and%20Feel.pdf) 要求：启动时几乎无动画只留一个 wiggle-me、少文字、限制参数范围避免无效探索、同一概念多视图。课堂模式：sim 本身不内置任务，由教师活动单和讨论承担；每个 sim 附 [Teacher Guide](https://phet.colorado.edu/files/teachers-guide/ratio-and-proportion-html-guide_en.pdf) 和 URL 参数裁剪屏幕。小学数学相关：[Build a Fraction](https://phet.colorado.edu/en/simulations/build-a-fraction)、[Fraction Matcher](https://phet.colorado.edu/sims/html/fraction-matcher/latest/fraction-matcher_en.html)、[Ratio and Proportion](https://phet.colorado.edu/en/simulations/ratio-and-proportion)（双手保持比例，触屏最佳）。
- **Desmos Classroom / Amplify**：交互深度中等（每屏一个图形 / 滑块 / 输入），但课堂编排最强：[Pause 冻结全班屏幕、Pace 限制屏幕范围、Sync to Me、Anonymize、Snapshots 选取学生作品排序讨论](https://service.amplify.com/article/amplify-classroom-facilitation-tools)，[Companion Mode 手机遥控](https://service.amplify.com/article/amplify-classroom-companion-mode)。Computation Layer 提供 [Responsive Feedback](https://service.amplify.com/article/9269315-amplify-desmos-math-program-resources)：不判对错，而是把学生输入的数学含义画出来让其自己看出矛盾。教师角色明确为[主持对话](https://blog.desmos.com/articles/what-is-the-role-of-the-teacher-during-a-desmos/)。
- **GeoGebra**：任意构造的动态几何，深度最高但门槛也高。[GeoGebra Classroom](https://www.geogebra.org/m/hncrgruu) 提供实时进度、提问、匿名、暂停、共同教师，学生无需账号。嵌入用 [Apps API](https://geogebra.github.io/docs/reference/en/GeoGebra_Apps_API/)。**非商业免费，商业需授权**（[License](https://www.geogebra.org/license)）。
- **Mathigon Polypad**（现归 Amplify）：虚拟学具沙盒（分数条 / 分数圆 / 数轴 / 天平 / 图表），深度 = 自由拼摆。[Authoring Mode](https://polypad.amplify.com/lesson/authoring-action-visibility) 可关闭某些操作只留分数条等，是"约束式沙盒"典范。[JS API](https://polypad.amplify.com/api/documentation) 年 1 万次请求内免费（含商业），须署名。
- **Brilliant**：先给"刚超出能力边缘"的问题，学生拖拽试错后再给术语（[About](https://brilliant.org/about/)、[Solving Equations 设计文](https://blog.brilliant.org/solving-equations/)）。单人自学，无课堂模式。
- **Explorable Explanations**：Bret Victor 强调[作者必须"撑起对话的一端"](https://worrydream.com/ExplorableExplanations/)，交互嵌在叙事里而非独立沙盒；Nicky Case 的[制作方法](https://blog.ncase.me/how-i-make-an-explorable-explanation/)：具体钩子 → 逐步叠加机制 → 做 / 看 / 说结合 → 用 BUT 制造反转 → 结尾开放沙盒。
- **3Blue1Brown**：视频非交互，但方法可借鉴："视觉优先、形式化其次"，[让观众觉得"我本可以自己发明它"](https://hansajekalavya.com/people/grant-sanderson/)，用悬念驱动（[TEDx](https://singjupost.com/what-makes-people-engage-with-math-grant-sanderson-transcript/)）。
- **Khan Academy**：练习为主，交互靶向"作答"而非探索；开源 [Perseus](https://github.com/Khan/perseus)（MIT）含 interactive-graph、number-line、plotter 等可自动评分的 widget。
- **NCTM Illuminations**：[Circle Tool](https://www.nctm.org/Classroom-Resources/Illuminations/Interactives/Circle-Tool/) 拖半径 → Add to Table 记数据 → 选任意两列作图找关系，是"数据表归纳"模式的经典范例；很多旧件仍是 Flash / Java，[已难运行](https://www.nctm.org/Classroom-Resources/Illuminations/Troubleshooting-Interactives/)。

## 二、教学法依据与启示

- **发现学习**：[Alfieri 2011 元分析](https://eric.ed.gov/?id=EJ933606)：无辅助发现比直接讲授差（d = −0.38），**带反馈 / 脚手架 / 引导解释的发现优于其他教法（d = +0.30）**；[Kirschner-Sweller-Clark](https://research.ou.nl/ws/files/1015152/Why%20minimal%20guidance%20during%20instruction%20does%20not%20work.pdf) 警告新手认知过载。启示：沙盒必须带约束与即时反馈，不做纯放养。
- **PhET implicit scaffolding**：把引导藏进"能拖什么、不能拖什么、显示什么"里。启示：轮胎只能调直径、周长自动展开成线段，不给其他干扰量。
- **Dan Meyer 三幕**（[原文](https://blog.mrmeyer.com/2011/the-three-acts-of-a-mathematical-story/)）：第一幕少字视觉冲突 + 先猜高低估；第二幕学生索要信息与工具；第三幕揭晓并兑现第一幕承诺，再给续集。启示：每课开头必有"猜一猜"，结尾必有"验证谁猜得最准"。
- **Building Thinking Classrooms**（[14 实践](https://www.corwin.com/docs/default-source/resources-documents/us-1581808-what-is-building-thinking-classroo.pdf)）：随机分组、站立竖直可擦白板、只回答"继续思考型"问题、"从底部归纳"。启示：工具应支持小组共享一屏、一人操作多人看，教师端能看到所有小组进度以选取讨论顺序。
- **5 Practices**（[Smith & Stein](https://www.corwin.com/books/5-practices-262956)）：预判 → 巡视 → 选取 → 排序 → 联结。启示：教师端需"快照 + 排序 + 匿名"（Desmos 已验证此模式）。

## 三、可借鉴 / 复用的开源库

| 库 | 技术栈 | 活跃度 | 许可 | 适合"学生拖拽调参"？ |
| --- | --- | --- | --- | --- |
| [JSXGraph](https://github.com/jsxgraph/jsxgraph) | 纯 JS，SVG / Canvas，1.13.1（2026-07） | 周下载 4.4 万，年会持续 | MIT 或 LGPL 双许可 | 是，几何构造 + 滑块最省事 |
| [Mafs](https://github.com/stevenpetryk/mafs) | React + TS，SVG | 3.4k star，基本单人维护 | MIT | 是，声明式、`useMovablePoint` 带约束；坐标系风格偏中学 |
| [SceneryStack](https://scenerystack.org/)（PhET 底层） | TS，Canvas / SVG / WebGL，无障碍完善 | PhET 长期维护 | MIT（sim 本身 GPLv3） | 是，最"PhET 味"，但学习曲线陡、生态小 |
| [@mathigon/euclid](https://github.com/mathigon/euclid.js) / [boost](https://github.com/mathigon/boost.js) | TS 几何类 + 绘制 | 2025 仍提交 | MIT | 是，轻量几何计算层，可配合任意渲染 |
| [Polypad API](https://polypad.amplify.com/api/documentation) | 嵌入式 JS | 商业维护 | 免费额度 + 署名 | 是，分数 / 比 / 图表学具即拿即用，但非开源、有额度 |
| [GeoGebra 嵌入](https://geogebra.github.io/docs/reference/en/GeoGebra_Apps_Embedding/) | deployggb.js | 活跃 | 非商业免费 | 是，快速原型；产品化需授权 |
| [p5.js](https://github.com/processing/p5.js) | JS Canvas，2.x | 24k star | LGPL-2.1 | 勉强，适合自由绘图动画，缺几何约束 / 拖拽点抽象 |
| [Manim CE](https://github.com/ManimCommunity/manim) | Python 离线渲染视频 | 39k star | MIT | 否，非交互，只适合做"第三幕"讲解动画 |
| [Khan Perseus](https://github.com/Khan/perseus) | React | 活跃 | MIT | 勉强，面向评分题，可借 number-line / plotter widget |
| 小学专项：[CreativeLabs-LMS](https://github.com/CreativeLabs-LMS/platform)（分数墙 / 数轴，AGPL）、[ProofLab](https://github.com/zeeshanali-k/prooflab)（分数条 / 比例表，MIT） | React | 新、小 | — | 参考交互，不建议直接依赖 |

## 四、中文圈现有方案

- **网络画板**（张景中团队）：Web 动态几何，有[开放接口](https://openapiweb.netpad.net.cn/)与 iframe 嵌入；[商业用途需书面授权](https://www.netpad.net.cn/agreement/%E7%BD%91%E7%BB%9C%E7%94%BB%E6%9D%BF%E8%BD%AF%E4%BB%B6%E6%9C%80%E7%BB%88%E7%94%A8%E6%88%B7%E8%AE%B8%E5%8F%AF%E5%8D%8F%E8%AE%AE.html)。周赛作品直接对标人教六上第五单元：[圆的周长（P62）](https://www.netpad.net.cn/competition/124/primary.html)（r 可调，滚动法 / 绕线法两策略，直尺测量 + 记录表）、[圆的面积（P67）](https://www.netpad.net.cn/competition/126/primary.html)（n 等分可调、剪拼动画、40 份以上逐步显示推导）、[周长一定圆面积最大（P74）](https://www.netpad.net.cn/competition/128/primary.html)。专家点评本身就是很好的设计评审样本（"不要直接显示答案，设计几个简单问题"）。
- **几何画板**：桌面商业软件，.gsp 资源多但跨端弱，逐步被网络画板 / GeoGebra 替代（[对比研究](https://doi.org/10.37155/2717-5561-0502-11)）。
- **洋葱学园**：5–8 分钟动画微课 + 交互练习，"讲得好看"但学生不操作模型，属被告知型。
- **希沃白板**：内置[数学画板（可调参数）、圆规、课堂活动游戏模板](https://easinote.seewo.com/baike)；课堂普及率极高。我们的工具若能嵌入希沃（网络画板已做到）会大幅降低推广阻力。
- **GeoGebra 中文作品**：[动态展示圆面积的构成](https://www.geogebra.org/m/BqbmT8J9)、[圆面积公式推导](https://www.geogebra.org/m/mpqxhjst)、香港 GeoGebra 学院柯志明的[分數乘法](https://www.geogebra.org/m/PkYPCqmt)（拖红蓝点显示"几包米重多少"，附工作纸）、[分數乘法與除法（均分 / 包含两种模型）](https://www.geogebra.org/m/TUGTqstd)、[五下分數除法教師版](https://www.geogebra.org/m/Z4hacsDJ)、[百分數：折扣 / 賺賠](https://www.geogebra.org/m/kanABnhd)、[割圆术估计圆周率（刘徽）](https://www.geogebra.org/m/abumc9ya)。

## 五、六上各单元优秀交互案例

- **圆的周长**：[Circumference and Diameter](https://www.geogebra.org/m/cc8smxbd)（滑块调直径 → 滚动展开 → 数"几个直径"，配 6 个递进问题）、[Circumference vs Diameter Roller](https://www.geogebra.org/m/hs87HYby)、[绕线法](https://www.geogebra.org/m/wZS2aECm)、NCTM [Circle Tool](https://www.nctm.org/Classroom-Resources/Illuminations/Interactives/Circle-Tool/)（数据表 + 散点图）、Desmos [Exploring Circumference](https://cl.desmos.com/t/where-does-pi-come-from/874)（多边形逼近思路）。割圆术见上节。
- **圆的面积**：[Finding Formula via Parallelogram](https://www.geogebra.org/m/Crz2gBjZ)（n 到 80，i 控制拼合进度）、[GeoGebra 官方版含开放问题](https://www.geogebra.org/m/sdgnevat)、[Area of Circle 三滑块版](https://www.geogebra.org/m/jzsxxnhq)（切 → 展开 → 上下合拼成长方形）。
- **分数乘法面积模型**：[MLC Fractions](https://apps.mathlearningcenter.org/fractions)（分数条叠合）、[TeachableMath 面积模型](https://teachablemath.com/apps/fraction-multiplication-area-model-app/)（行 × 列阴影重叠即积）、柯志明分數乘法。
- **分数除法**：Illustrative Math 6.4.11 [3/4 里有几个 1/8](https://im.kendallhunt.com/MS/teachers/1/4/11/index.html) 配 applet（包含除模型）、香港学院均分 / 包含两模型系列。
- **比 / 按比分配**：PhET [Ratio and Proportion](https://phet.colorado.edu/en/simulations/ratio-and-proportion)；Polypad 分数条 / 数轴可拼"按 2:3 分 20 个"。现成的按比分配专用交互稀缺，是我们可差异化的点。
- **百分数百格图**：[TeachMaths 10×10 网格](https://www.teachmaths.net/mathematics/percentage-grid)（点格即同步显示百分数 / 小数 / 分数，另有 Fill 10% / 25% / 50% 快捷键）、[Percentage Grid Game](https://www.onlinemathlearning.com/percentage-grid-game.html)（给目标值涂格，支持三种目标形式，带音效反馈）、[GeoGebra Percentage grid shaded explorer](https://www.geogebra.org/m/CTHdxcBm)、[Toy Theater Percentage Strips](https://toytheater.com/percentage-strips/)（拖百分数条拼 100%）。
- **扇形统计图**：[Toy Theater Pie Chart Builder](https://toytheater.com/pie-chart/)（拖彩色圆片入饼形成类别，图例实时算出计数与百分比，适合"先收集班级数据再成图"）、[Interactivate Pie Chart](https://appstate-math.github.io/interactivate/activities/PieChart/)（拖扇形边界黑点直接改比例，或输入百分数且必须凑 100%）、[Fraction Visualiser](https://www.freeclassroomtools.com/tools/fraction-visualiser)（同一分数同时显示饼图 / 条 / 数轴）。
- **数与形 1/2 + 1/4 + 1/8 + …**：[Maple 涂正方形画布](https://learn.maplesoft.com/d/7t7953kct829)（滑块逐步涂剩余一半，面积逼近 1）、[GeoGebra 视觉证明合集](https://www.geogebra.org/m/mGcA23AB)、NCTM [Limits](https://www.nctm.org/Classroom-Resources/Illuminations/Interactives/Limits/)（先让学生拖滑块预测极限值，再逐项累加到第 50 步自动校验，是"预测 → 验证"模式的直接范例）、新加坡 OSP [Geometric series 模拟](https://iwant2study.org/lookangejss/math/Series_Expansion/ejss_model_e_Geometric_series/index.html)（可调公比，同时显示项、部分和、表格）。

## 六、结论与建议

**交互层级**：采用"约束式沙盒"，PhET 级别的真实模型 + Polypad Authoring Mode 式的受限操作，而不是 GeoGebra 全开放画板，也不是洋葱式纯动画。每课只开放 1–2 个可连续拖拽的核心参数（直径、等分数 n、分子 / 分母、比值、扇形边界），其余锁定；参数范围刻意限制在有教学价值的区间。

**值得照搬的设计模式**（每课固定骨架：预测 → 操作 → 数据表 → 归纳 → 验证）：

1. 猜（三幕 Act 1）：少文字的视觉情境 + 让学生输入"太高 / 太低 / 最可能"三个估值，教师端汇总分布图。
2. 动：拖拽操作，模型即时反馈；启动时无自动动画，只有一个 wiggle-me 提示可拖的东西。
3. 记：一键"加入数据表"（NCTM Circle Tool / 网络画板模式），换参数重复实验自动累积多行。
4. 归：数据表旁自动生成比值列或散点图，学生用句式开头填写"我发现 ___，因为 ___"。
5. 验：揭晓结论，并回到第一步对照"谁猜得最准"，再给"续集"挑战（钟面指针走过的路程、太极图面积、周长相等谁面积最大）。
6. 教师侧：暂停 / 同步到我 / 限屏 + 匿名快照选取与排序 + 每屏预置 2–3 条苏格拉底提问（"直径翻倍，周长会怎样？为什么不是 4 倍？""分的份数越多，拼出的图形越像什么？哪条边一直没变？"）。
7. 小组模式：支持"一人操作、一屏投到小组"，教师端能看到各小组进度。

**技术栈推荐**：

- 前端 React + TypeScript + Vite，渲染层以 SVG 为主（分数条、百格图、扇形图、数据表都能直接绑定 DOM 事件，触屏与无障碍容易做）；几何计算用 `@mathigon/euclid`（MIT）；需要构造式几何或大量滑块的课可选 JSXGraph（MIT / LGPL 双许可）；React 生态里可借 Mafs（MIT）的 `useMovablePoint` 约束拖拽思想。全部 MIT 无授权风险；React 便于同一代码库做学生端和教师端；SVG 在希沃一体机（Chromium 内核）上表现稳定。
- 不建议把 GeoGebra、网络画板、Polypad 作为产品底座（授权 / 额度问题），但三者都适合原型阶段快速验证课件设计，并把已有作品当作交互规格参考。
- 课堂实时（第二阶段）：WebSocket（Socket.IO 或 Yjs）广播教师指令与收集学生状态快照；学生端凭课堂码免登录。
- 讲解动画可用 Manim CE（MIT）离线渲染短视频嵌入，不做交互。
- 参考 SceneryStack 的 Property / Emitter 响应式状态设计，但不直接引入。

**首个 MVP 建议选"圆的周长"**：可对照案例最多，且天然覆盖猜 → 滚 → 记 → 归 → 验全链条；第二个做"圆的面积"（等分数 n 滑块 + 拼合进度滑块），复用同一骨架验证框架的可迁移性。
