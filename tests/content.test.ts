import { describe, expect, it } from "vitest";
import { buildIndex, loadContent, outgoing } from "@/content/loader";

describe("content/ 加载与校验", () => {
  const index = loadContent();

  it("能加载单元五「圆」的 12 个知识点", () => {
    const unit = index.units.find((u) => u.id === "6a-05");
    expect(unit?.title).toBe("圆");
    expect(index.unitNodes.get("6a-05")).toHaveLength(12);
  });

  it("旧知识 30 个、方法 13 个（与 docs/knowledge-tree-6a.md 第 7 节一致）", () => {
    expect(index.legacy).toHaveLength(30);
    expect(index.methods).toHaveLength(13);
  });

  it("圆周率 π 的关系边抄录正确", () => {
    const edges = outgoing(index, "6a-05-05");
    const from = edges.filter((e) => e.type === "transformsFrom").map((e) => e.to);
    expect(from).toEqual(["6a-05-04", "6a-04-02"]);
    expect(edges.find((e) => e.type === "relatesTo")?.to).toBe("6a-05-06");
  });

  it("周长含义 ↔ 圆面积 的易混边存在", () => {
    const e = outgoing(index, "6a-05-04").find((x) => x.type === "confusedWith");
    expect(e?.to).toBe("6a-05-08");
    expect(index.incoming.get("6a-05-08")?.some((x) => x.from === "6a-05-04")).toBe(true);
  });

  it("探究单挂在主节点与覆盖节点上，且每步提问卡 ≥ 2 条", () => {
    const exp = index.explorations.find((e) => e.id === "exp-6a-05-circumference");
    expect(exp).toBeDefined();
    for (const id of ["6a-05-05", "6a-05-04", "6a-05-06"]) {
      expect(index.explorationsByNode.get(id)?.map((e) => e.id)).toContain(exp!.id);
    }
    const steps = exp!.questionCards.map((c) => c.step).sort();
    expect(steps).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 9]);
    for (const c of exp!.questionCards) expect(c.questions.length).toBeGreaterThanOrEqual(2);
  });

  it("引用尚未落库的节点只产生警告，不报错", () => {
    expect(index.warnings.some((w) => w.includes("6a-04-02"))).toBe(true);
  });
});

describe("buildIndex 校验规则", () => {
  const unitOk = `
unit: { id: 6a-05, grade: 6a, order: 5, title: 圆 }
nodes:
  - id: 6a-05-01
    title: 圆的基本概念
    summary: 圆心 O。
`;

  it("引用不存在且无 title 占位的节点时报错", () => {
    const bad = `
unit: { id: 6a-05, grade: 6a, order: 5, title: 圆 }
nodes:
  - id: 6a-05-01
    title: 圆的基本概念
    summary: 圆心 O。
    relations:
      transformsFrom: [3a-99]
`;
    expect(() => buildIndex({ "/content/units/x.yaml": bad })).toThrow(/3a-99/);
  });

  it("知识点 id 不属于单元时报错", () => {
    const bad = unitOk.replace("6a-05-01", "6a-04-01");
    expect(() => buildIndex({ "/content/units/x.yaml": bad })).toThrow(/不属于单元/);
  });

  it("节点 id 重复时报错", () => {
    expect(() =>
      buildIndex({
        "/content/units/a.yaml": unitOk,
        "/content/units/b.yaml": unitOk.replace("id: 6a-05,", "id: 6a-05,").replace("order: 5", "order: 6"),
      }),
    ).toThrow(/重复/);
  });

  it("探究单引用不存在的主节点时报错", () => {
    const exp = `
id: exp-6a-05-x
title: x
component: x
level: L3
primaryNode: 6a-05-09
`;
    expect(() => buildIndex({ "/content/units/x.yaml": unitOk, "/content/explorations/e.yaml": exp })).toThrow(
      /primaryNode/,
    );
  });
});
