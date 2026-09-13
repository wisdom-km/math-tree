import type { ReactNode } from "react";
import { href } from "@/app/router";
import { useSettings } from "@/app/settings";
import type { Exploration } from "@/content/schema";

interface Props {
  exploration: Exploration;
  children: ReactNode;
  side?: ReactNode;
}

/**
 * 迷你探究单共用壳：顶栏返回知识树、老师/学生模式（不清数据）、主舞台 + 可选右栏。
 * 布局沿用主探究单 circumference.css 的 exp-root。
 */
export function MiniShell({ exploration, children, side }: Props) {
  const settings = useSettings();
  return (
    <div className="exp-root circle-area mini-exp">
      <header className="exp-topbar">
        <a className="btn" href={href("/", { node: exploration.primaryNode })} aria-label="返回知识树">
          ← 知识树
        </a>
        <span className="title">{exploration.title}</span>
        <span className="step-name">· 迷你探究单</span>
        <span className="spacer" />
        <div className="mode-switch" role="group" aria-label="界面模式">
          <button className="btn" aria-pressed={settings.mode === "teacher"} onClick={() => settings.setMode("teacher")}>
            老师
          </button>
          <button className="btn" aria-pressed={settings.mode === "student"} onClick={() => settings.setMode("student")}>
            学生
          </button>
        </div>
      </header>
      <div className={`exp-body ${side ? "" : "single"}`}>
        <section className="exp-stage">{children}</section>
        {side && <aside className="exp-side">{side}</aside>}
      </div>
    </div>
  );
}
