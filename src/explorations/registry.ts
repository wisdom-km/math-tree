import type { ComponentType } from "react";
import type { Exploration } from "@/content/schema";
import { CircleArea } from "./circle-area/CircleArea";
import { RingExploration } from "./circle-area/mini/RingExploration";
import { SquareCircleExploration } from "./circle-area/mini/SquareCircleExploration";
import { CircleCircumference } from "./circle-circumference/CircleCircumference";

export interface ExplorationProps {
  exploration: Exploration;
}

/** 内容文件里的 component 键 → 前端实现 */
export const EXPLORATION_COMPONENTS: Record<string, ComponentType<ExplorationProps>> = {
  "circle-circumference": CircleCircumference,
  "circle-area": CircleArea,
  "circle-ring": RingExploration,
  "circle-square": SquareCircleExploration,
};
