import type { PointerEvent as ReactPointerEvent } from "react";

/** 把指针的屏幕坐标换成 SVG 用户坐标 */
export function svgPoint(svg: SVGSVGElement, e: { clientX: number; clientY: number }): { x: number; y: number } {
  const pt = svg.createSVGPoint();
  pt.x = e.clientX;
  pt.y = e.clientY;
  const ctm = svg.getScreenCTM();
  if (!ctm) return { x: e.clientX, y: e.clientY };
  const p = pt.matrixTransform(ctm.inverse());
  return { x: p.x, y: p.y };
}

export function ownerSvg(e: ReactPointerEvent<Element>): SVGSVGElement | null {
  const el = e.currentTarget as Element & { ownerSVGElement?: SVGSVGElement | null };
  return el.ownerSVGElement ?? (el instanceof SVGSVGElement ? el : null);
}

export function fmt2(x: number): string {
  return x.toFixed(2);
}
export function fmt1(x: number): string {
  return x.toFixed(1);
}
