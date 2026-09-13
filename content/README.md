# content/ 内容文件格式

内容与代码分离：知识树节点、关系边、探究单元信息、提问卡文案都放在这里，用 YAML 写；代码只负责加载、校验（zod）和渲染。加新单元只加文件，不改程序。

schema 的唯一定义在 `src/content/schema.ts`；本文是给写内容的人看的说明。两者不一致时以 schema 为准，并回来改本文。

## 目录

```
content/
  units/         每个单元一个文件：单元元信息 + 该单元全部知识点节点（含关系）
  legacy/        旧知识节点（六上直接依赖的三～五年级节点）
  methods/       方法节点
  explorations/  探究单元信息：挂接的节点、提问卡、举手候选
  README.md
```

加载器（`src/content/loader.ts`）按路径识别文件类型：`units/*.yaml`、`legacy/*.yaml`、`methods/*.yaml`、`explorations/*.yaml`。其他位置的 YAML 会被忽略并给出警告。

## id 约定

| 类型 | 格式 | 例 |
| --- | --- | --- |
| 单元 | `<年级><册>-<单元两位>` | `6a-05` |
| 知识点 | `<单元 id>-<两位序号>` | `6a-05-05` |
| 旧知识 | `<年级><册>-<两位序号>` | `3a-08` |
| 方法 | `M-<两位>` | `M-11` |
| 探究单 | `exp-<单元 id>-<英文短名>`；跨年级转化链 `exp-chain-<短名>` | `exp-6a-05-circumference`、`exp-chain-area` |

年级 `1–6`，册 `a` 上 / `b` 下。id 一经使用不改（数据库掌握度、证据都以它为键）。

## units/*.yaml

```yaml
unit:
  id: 6a-05
  grade: 6a
  order: 5            # 单元顺序，用于排序
  title: 圆
  pages: p55–77       # 可选
  source: …           # 可选，教材版本

nodes:
  - id: 6a-05-05
    title: 圆周率 π
    summary: 任意圆周长与直径的比值是定值 π……   # 一句话内容
    pages: "61"        # 可选；纯数字要加引号
    model: 测量填表、比值稳定                    # 可选，直观模型
    level: L3          # 可选：L1 / L2 / L3 / 静态图解
    reviewed: false    # 可选，默认 false；Wisdom 审过后改 true
    relations:
      transformsFrom:  # 转化自：新知识由哪些旧知识推导而来
        - 6a-05-04
        - node: 6a-04-02              # 引用尚未落库的节点时必须给 title 占位
          title: 比的各部分名称与比值
      decomposesInto: [周长÷直径＝定值]   # 拆解为：文字要素，不是节点引用
      relatesTo: [6a-05-06]            # 联系：平行互通关系
      confusedWith:                    # 易混：note 必填；node 可选
        - node: 6a-05-08
          note: 周长与面积混淆
```

关系引用可以写成纯 id 字符串，也可以写成 `{ node, title?, note? }`。校验规则：

- `nodes[].id` 必须以 `unit.id` 开头。
- 引用的节点必须存在于任何已加载文件（含 legacy、methods）；不存在时必须给 `title`，加载器记一条警告而不报错，方便先落一个单元。
- `confusedWith` 的 `note`（差在哪）必填。

## legacy/*.yaml

```yaml
nodes:
  - id: 3a-08
    title: 周长的含义
    source: 三年级上·长方形和正方形     # 出处（人教版）
    dependedBy: [6a-05-04]             # 被哪些六上节点依赖
    summary: 封闭图形一周的长度……       # 可选
    pending: true                       # 可选，出处待核时标 true
```

## methods/*.yaml

```yaml
methods:
  - id: M-11
    title: 列表实验找规律
    usedIn: 圆周长÷直径填表得 π；数与形奇数和
```

## explorations/*.yaml

```yaml
id: exp-6a-05-circumference
title: 圆的周长
component: circle-circumference   # 前端实现的注册键（src/explorations/registry.ts）
status: draft                     # draft / reviewed
level: L3
durationMinutes: 35–40            # 可选
pages: p60–64                     # 可选
spec: docs/explorations/circle-circumference.md   # 可选，交互稿路径
primaryNode: 6a-05-05             # 主挂节点
coversNodes: [6a-05-04, 6a-05-06] # 同屏覆盖
prerequisites: [3a-08, 6a-05-01]
methods: [M-11]
confusionEdges:
  - { a: 6a-05-04, b: 6a-05-08 }
questionCards:                    # 老师提问卡，按步骤 0–9 分组，每步 ≥ 2 条
  - step: 3
    questions:
      - 红点又贴回地面时，说明什么？
    handVote: [偏长, 偏短, 接近]  # 可选：该步投屏举手的候选项
```

`primaryNode`、`coversNodes`、`prerequisites`、`methods`、`confusionEdges` 引用的节点必须存在（这里不允许占位）。同一步骤的提问卡只能出现一次。

迷你回忆探究单（需求 3.3）挂在旧知识上时：

- `id` 允许 `exp-chain-*`（见上表），不必带单元号。
- `primaryNode` 允许旧知识 id（如 `5a-06`），不仅是 `6a-05-05` 这种知识点。
- `coversNodes` 允许知识点 / 旧知识 / 方法节点（`nodeIdSchema`），以便一条链覆盖 `5a-06`、`5a-07`、`M-04` 等。

## 写内容的原则

- 用词以教材、教参为准，不自创术语（见需求文档第 5 节、交互稿附录 A）。
- 教材原文、教辅 PDF 不进仓库；这里只放我们自己写的内容。
- 未审内容标 `reviewed: false`（默认），审过后改 `true`。

## 校验

```bash
pnpm test tests/content.test.ts   # 加载全部内容并校验 schema、引用
```

任何一处校验失败都会让应用启动时直接报错，避免带着坏数据进课堂。
