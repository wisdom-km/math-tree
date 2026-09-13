/**
 * 步骤 5 「周长大约是直径的 ___ 倍」宽松校验（交互稿 5.5）。
 * 不直接判对错：填 2 或 4 时返回 contrast，由界面把 C 与 2d / 4d 对照，让矛盾自己出现。
 */

export interface PatternCheck {
  ok: boolean;
  /** 规范化后的文本 */
  normalized: string;
  /** 需要对照反馈的倍数（2 或 4），或 null */
  contrast: 2 | 4 | null;
}

const FULLWIDTH_DIGITS = "０１２３４５６７８９";

export function normalizePattern(raw: string): string {
  let s = raw.trim();
  s = s.replace(/[０-９]/g, (ch) => String(FULLWIDTH_DIGITS.indexOf(ch)));
  s = s.replace(/[．。]/g, ".");
  s = s.replace(/\s+/g, "");
  s = s.replace(/大约|约等于|差不多/g, "约");
  s = s.replace(/多一点|多一点儿|多一些儿|多点/g, "多一些");
  return s;
}

const ACCEPT = /^(约)?3(\.1|\.14|\.1416)?(倍)?(多一些|多)?$/;

export function checkPattern(raw: string): PatternCheck {
  const normalized = normalizePattern(raw);
  if (!normalized) return { ok: false, normalized, contrast: null };
  if (ACCEPT.test(normalized) || normalized.includes("3倍多")) {
    return { ok: true, normalized, contrast: null };
  }
  const num = parseFloat(normalized.replace(/^约/, ""));
  if (Number.isFinite(num)) {
    if (num >= 1.5 && num < 2.5) return { ok: false, normalized, contrast: 2 };
    if (num >= 3.5 && num <= 4.5) return { ok: false, normalized, contrast: 4 };
  }
  return { ok: false, normalized, contrast: null };
}

/** 预设芯片（交互稿 5.5） */
export const PATTERN_CHIPS = ["3", "3倍多一些", "3.14", "约3.14"] as const;
export const FIND_CHIPS = ["周长÷直径的比值差不多一样", "都是 3 倍多一些", "直径越大周长越大"] as const;
export const BECAUSE_CHIPS = ["表里每一行的比值都接近", "换了直径比值没怎么变", "多测几个都是这样"] as const;
