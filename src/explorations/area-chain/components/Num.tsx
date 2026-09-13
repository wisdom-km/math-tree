import { useEffect, useRef, useState } from "react";

/** 活公式里的数字：值变化时短暂放大高亮（同一数据源驱动） */
export function Num({ value, kind = "var", digits = 0 }: { value: number | string; kind?: "var" | "res"; digits?: number }) {
  const text = typeof value === "number" ? value.toFixed(digits).replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1") : value;
  const prev = useRef(text);
  const [changed, setChanged] = useState(false);
  useEffect(() => {
    if (prev.current !== text) {
      prev.current = text;
      setChanged(true);
      const id = setTimeout(() => setChanged(false), 320);
      return () => clearTimeout(id);
    }
    return undefined;
  }, [text]);
  return <span className={`${kind} ${changed ? "changed" : ""}`}>{text}</span>;
}

/** 数字保留 ≤ 2 位小数并去掉多余的 0 */
export function fmt(x: number): string {
  return (Math.round(x * 100) / 100).toString();
}
