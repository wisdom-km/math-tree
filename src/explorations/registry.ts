import type { ComponentType } from "react";
import type { Exploration } from "@/content/schema";
import { AreaChain } from "./area-chain/AreaChain";
import { CircleCircumference } from "./circle-circumference/CircleCircumference";

export interface ExplorationProps {
  exploration: Exploration;
}

/** 内容文件里的 component 键 → 前端实现 */
export const EXPLORATION_COMPONENTS: Record<string, ComponentType<ExplorationProps>> = {
  "circle-circumference": CircleCircumference,
  "area-chain": AreaChain,
};

/** 知识树浏览页上的探究单入口（一个探究单在某节点上可有多个入口） */
export interface ExplorationEntry {
  label: string;
  /** 路由参数（拼到 #/explore/<id>?…） */
  params?: Record<string, string>;
  badge?: string;
}

/** 面积转化链：不同节点进入不同站；「转化自」边上另有「沿链播放」入口 */
const CHAIN_STATION_BY_NODE: Record<string, { station: string; label: string }> = {
  "5a-06": { station: "rect", label: "第 1 站 · 长方形（数格子）" },
  "5a-08": { station: "rect", label: "第 1 站 · 长方形（正方形是特例）" },
  "5a-07": { station: "para", label: "第 2–4 站 · 平行四边形 / 三角形 / 梯形" },
  "6a-05-07": { station: "circle", label: "第 5 站 · 圆（入口屏）" },
};

const ENTRY_RESOLVERS: Record<string, (exp: Exploration, nodeId: string) => ExplorationEntry[]> = {
  "area-chain": (exp, nodeId) => {
    const hit = CHAIN_STATION_BY_NODE[nodeId];
    const entries: ExplorationEntry[] = [];
    if (hit) entries.push({ label: `${exp.title} · ${hit.label}`, params: { station: hit.station }, badge: "迷你回忆探究单" });
    else entries.push({ label: exp.title, badge: exp.level });
    return entries;
  },
};

export function explorationEntries(exp: Exploration, nodeId: string): ExplorationEntry[] {
  const resolver = ENTRY_RESOLVERS[exp.component];
  if (resolver) return resolver(exp, nodeId);
  return [{ label: exp.title, badge: `${exp.primaryNode === nodeId ? "主挂" : "同屏覆盖"} · ${exp.level}` }];
}

/** 探究单是否支持「沿链播放」（从「转化自」边进入五站连走） */
export function playThroughEntry(exp: Exploration): ExplorationEntry | null {
  if (exp.component !== "area-chain") return null;
  return { label: "沿链播放：长方形 → 平行四边形 → 三角形 → 梯形 → 圆", params: { play: "1", station: "rect" }, badge: "五站连走 22–30 分钟" };
}
