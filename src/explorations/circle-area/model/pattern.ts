/**
 * 步骤 5 双填空「长 ≈ ___，宽 = ___」宽松校验（交互稿 5.5）。
 * 不直接判对错：填「周长」「直径」时返回 contrast，由界面叠对照线段，让长短差异自己出现。
 */

export type LengthContrast = "C" | "d" | null;
export type WidthContrast = "d" | null;

export interface BlankCheck<T> {
  ok: boolean;
  normalized: string;
  contrast: T;
}

const FULLWIDTH = "０１２３４５６７８９";

/** 规范化：去空格、全角转半角、小写、常见符号统一 */
export function normalizeBlank(raw: string): string {
  let s = raw.trim();
  s = s.replace(/[０-９]/g, (ch) => String(FULLWIDTH.indexOf(ch)));
  s = s.replace(/[Ａ-Ｚａ-ｚ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0));
  s = s.replace(/[．。]/g, ".");
  s = s.replace(/[×✕✖xX＊]/g, "×");
  s = s.replace(/[÷／]/g, (ch) => (ch === "÷" ? "÷" : "/"));
  s = s.replace(/\s+/g, "");
  s = s.toLowerCase();
  s = s.replace(/^(大约|约|大概|差不多)/, "");
  s = s.replace(/^(是|等于)/, "");
  return s;
}

const LENGTH_OK = /^(周长的一半|半周长|周长÷2|周长\/2|c÷2|c\/2|πr|π×r|π\*r|3\.14×?r|3\.14\*r|半个周长|一半周长)$/;
const WIDTH_OK = /^(半径|r)$/;

export function checkLength(raw: string): BlankCheck<LengthContrast> {
  const normalized = normalizeBlank(raw);
  if (!normalized) return { ok: false, normalized, contrast: null };
  if (LENGTH_OK.test(normalized)) return { ok: true, normalized, contrast: null };
  if (/^(周长|c|2πr|πd|2×π×r|π×d)$/.test(normalized)) return { ok: false, normalized, contrast: "C" };
  if (/^(直径|d|2r|2×r)$/.test(normalized)) return { ok: false, normalized, contrast: "d" };
  return { ok: false, normalized, contrast: null };
}

export function checkWidth(raw: string): BlankCheck<WidthContrast> {
  const normalized = normalizeBlank(raw);
  if (!normalized) return { ok: false, normalized, contrast: null };
  if (WIDTH_OK.test(normalized)) return { ok: true, normalized, contrast: null };
  if (/^(直径|d|2r|2×r)$/.test(normalized)) return { ok: false, normalized, contrast: "d" };
  return { ok: false, normalized, contrast: null };
}

/** 预设芯片（交互稿 5.5） */
export const LENGTH_CHIPS = ["周长的一半", "C ÷ 2", "πr", "直径", "周长"] as const;
export const WIDTH_CHIPS = ["半径", "r", "直径", "d"] as const;
export const FIND_CHIPS = ["份数越多，拼出来越像长方形", "长方形的长差不多是周长的一半", "宽就是半径", "面积近似值越来越接近一个数"] as const;
export const BECAUSE_CHIPS = ["上排下排各占了一半的弧", "拼的时候面积没有变", "长方形的面积 = 长 × 宽", "n 越大凹凸越小"] as const;
