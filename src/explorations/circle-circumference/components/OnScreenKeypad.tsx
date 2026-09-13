import { useState } from "react";

export interface KeypadProps {
  title: string;
  unit?: string;
  initial?: number | null;
  min?: number;
  max?: number;
  /** 允许小数位数（0 = 只整数） */
  decimals?: number;
  onConfirm: (value: number) => void;
  onCancel: () => void;
}

/** 屏幕大数字键盘（0–9、小数点、退格、确定），不依赖物理键盘。 */
export function OnScreenKeypad({ title, unit, initial, min, max, decimals = 1, onConfirm, onCancel }: KeypadProps) {
  const [text, setText] = useState<string>(initial === null || initial === undefined ? "" : String(initial));

  const value = text === "" || text === "." ? NaN : parseFloat(text);
  const inRange =
    Number.isFinite(value) && (min === undefined || value >= min) && (max === undefined || value <= max);

  const press = (k: string) => {
    if (k === ".") {
      if (decimals === 0 || text.includes(".")) return;
      setText(text === "" ? "0." : `${text}.`);
      return;
    }
    const [, frac = ""] = text.split(".");
    if (text.includes(".") && frac.length >= decimals) return;
    if (text === "0") {
      setText(k);
      return;
    }
    if (text.replace(".", "").length >= 6) return;
    setText(text + k);
  };

  return (
    <div className="modal-backdrop" onPointerDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="keypad" role="dialog" aria-label={title}>
        <div className="kp-title">{title}</div>
        <div className={`kp-display ${text && !inRange ? "invalid" : ""}`} aria-live="polite">
          {text || "\u00a0"}
          {unit && text && <span className="muted"> {unit}</span>}
        </div>
        <div className="kp-grid">
          {["7", "8", "9", "4", "5", "6", "1", "2", "3"].map((k) => (
            <button key={k} className="btn" onClick={() => press(k)}>
              {k}
            </button>
          ))}
          <button className="btn" onClick={() => press(".")} disabled={decimals === 0}>
            .
          </button>
          <button className="btn" onClick={() => press("0")}>
            0
          </button>
          <button className="btn" onClick={() => setText(text.slice(0, -1))} aria-label="退格">
            ⌫
          </button>
        </div>
        <div className="kp-actions">
          <button className="btn" onClick={onCancel}>
            取消
          </button>
          <button className="btn primary" disabled={!inRange} onClick={() => inRange && onConfirm(value)}>
            确定
          </button>
        </div>
        {(min !== undefined || max !== undefined) && (
          <div className="kp-range">
            范围 {min ?? "—"} ～ {max ?? "—"} {unit}
          </div>
        )}
      </div>
    </div>
  );
}

export function ConfirmModal({
  title,
  body,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  title: string;
  body?: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="modal-backdrop">
      <div className="modal" role="alertdialog" aria-label={title}>
        <h2>{title}</h2>
        {body && <p>{body}</p>}
        <div className="actions">
          <button className="btn lg" onClick={onCancel}>
            取消
          </button>
          <button className="btn lg danger" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
