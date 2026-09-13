import type { ComponentType } from "react";
import type { Exploration } from "@/content/schema";
import { CircleCircumference } from "./circle-circumference/CircleCircumference";

export interface ExplorationProps {
  exploration: Exploration;
}

/** 内容文件里的 component 键 → 前端实现 */
export const EXPLORATION_COMPONENTS: Record<string, ComponentType<ExplorationProps>> = {
  "circle-circumference": CircleCircumference,
};
