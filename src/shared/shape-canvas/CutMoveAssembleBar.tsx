export type ActionKey = "cut" | "move" | "assemble";

export interface ActionSpec {
  disabled?: boolean;
  /** 「移」展开时为 true，「拼」到位时为 true */
  pressed?: boolean;
  /** 按钮下方的小注，如「不用剪」 */
  note?: string;
  onClick: () => void;
  /** 启动时抖动提示 */
  wiggle?: boolean;
}

export interface ShapeCanvasActions {
  cut?: ActionSpec;
  move?: ActionSpec;
  assemble?: ActionSpec;
}

export const ACTION_ORDER: readonly ActionKey[] = ["cut", "move", "assemble"];
export const ACTION_LABEL: Record<ActionKey, string> = { cut: "剪", move: "移", assemble: "拼" };

function Icon({ kind }: { kind: ActionKey }) {
  switch (kind) {
    case "cut":
      return (
        <svg viewBox="0 0 32 32" aria-hidden>
          <circle cx="9" cy="23" r="4.5" />
          <circle cx="23" cy="23" r="4.5" />
          <path d="M12 20 L24 4 M20 20 L8 4" />
        </svg>
      );
    case "move":
      return (
        <svg viewBox="0 0 32 32" aria-hidden>
          <path d="M16 3 v26 M3 16 h26 M16 3 l-4 4 M16 3 l4 4 M16 29 l-4 -4 M16 29 l4 -4 M3 16 l4 -4 M3 16 l4 4 M29 16 l-4 -4 M29 16 l-4 4" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 32 32" aria-hidden>
          <path d="M4 8 h11 v16 h-11 z" />
          <path d="M17 8 h11 v16 h-11 z" className="fill" />
        </svg>
      );
  }
}

/**
 * 「剪 / 移 / 拼」三个动作按钮（链上共用组件，交互稿 2.3）。
 * 固定顺序、单字、同图标；≥ 48×48 px；位置固定在控件条左侧。
 * visible 未给时三个都显示（独立模式）；嵌入模式只给本站核心动作。
 */
export function CutMoveAssembleBar({ actions, visible }: { actions: ShapeCanvasActions; visible?: ActionKey[] }) {
  const keys = ACTION_ORDER.filter((k) => !visible || visible.includes(k));
  if (keys.length === 0) return null;
  return (
    <div className="cma-bar" role="group" aria-label="剪、移、拼">
      {keys.map((k) => {
        const a = actions[k];
        const disabled = !a || a.disabled;
        return (
          <div key={k} className="cma-item">
            <button
              className={`cma-btn ${k} ${a?.wiggle && !disabled ? "wiggle" : ""}`}
              disabled={disabled}
              aria-pressed={a?.pressed}
              aria-label={ACTION_LABEL[k]}
              onClick={() => a && !a.disabled && a.onClick()}
            >
              <Icon kind={k} />
              <span>{ACTION_LABEL[k]}</span>
            </button>
            {a?.note && <span className="cma-note">{a.note}</span>}
          </div>
        );
      })}
    </div>
  );
}
