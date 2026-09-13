import { ShapeCanvas, type HandleSpec, type ShapeSpec } from "@/shared/shape-canvas";
import { bounds, type TriangleKind } from "@/shared/shape-canvas/geometry";
import { BaseLine, HeightLine, Ruler, RulerButton } from "../components/annotations";
import { Num, fmt } from "../components/Num";
import { fillFeedback, triDerived } from "../model/derived";
import { PARAM_RANGE } from "../model/types";
import type { StageProps } from "./types";

const KIND_LABEL: Record<TriangleKind, string> = { acute: "锐角三角形", right: "直角三角形", obtuse: "钝角三角形" };

/** 第 3 站 · 三角形（两个一样的拼成平行四边形，÷ 2） */
export function TriStage({ state, dispatch, embedded, interactive, onAssemble, assembling, progress }: StageProps) {
  const st = state.stations.tri;
  const d = triDerived(st);
  const fb = fillFeedback("tri", st);

  const shapes: ShapeSpec[] = [{ id: "tri", points: d.shape, role: "source", dark: fb?.kind === "double" }];
  if (d.copyNow) {
    shapes.push({
      id: "copy",
      points: d.copyNow,
      role: "piece",
      label: st.moved && st.t === 0 ? "一样的" : undefined,
      dark: fb?.kind === "double",
      blink: fb?.kind === "borrowed",
    });
  }
  if (d.assembled) shapes.push({ id: "para", points: d.asm.parallelogram, role: "outline" });
  else if (st.t > 0 || st.moved) shapes.push({ id: "target", points: d.asm.target, role: "ghost" });

  const handles: HandleSpec[] = [
    {
      id: "h",
      x: d.apexX,
      y: d.h,
      axis: "y",
      badge: `高 h = ${d.h.toFixed(1)} cm`,
      ariaLabel: `高 h，${PARAM_RANGE.tri.min} 到 ${PARAM_RANGE.tri.max} 厘米`,
      disabled: !interactive,
      wiggle: !st.touched && !embedded,
      onDragStart: () => dispatch({ type: "BEGIN_DRAG" }),
      onDrag: (p) => dispatch({ type: "DRAG_PARAM", value: p.y }),
      onDragEnd: () => dispatch({ type: "END_DRAG" }),
    },
  ];

  const showBase = st.rulers.includes("base");
  const showHeight = st.rulers.includes("height");
  const footOutside = d.apexX > d.a || d.apexX < 0;
  const paraBox = bounds([d.asm.parallelogram]);
  const heightX = paraBox.xMax;

  return (
    <ShapeCanvas
      ariaLabel="第 3 站 三角形拼成平行四边形"
      shapes={shapes}
      handles={handles}
      embedded={embedded}
      visibleActions={embedded ? ["assemble"] : undefined}
      actions={{
        cut: { disabled: true, note: "不用剪", onClick: () => undefined },
        move: { disabled: !interactive || st.t > 0, pressed: st.moved, onClick: () => dispatch({ type: "TOGGLE_MOVE" }) },
        assemble: { disabled: !interactive, pressed: d.assembled || assembling, wiggle: st.touched && st.t === 0 && !st.moved, onClick: onAssemble },
      }}
      progress={progress}
      hint={d.assembled ? "两个一样的三角形拼成了一个平行四边形" : st.moved ? "借来一个一样的三角形" : null}
    >
      {(ctx) => (
        <>
          <BaseLine ctx={ctx} from={{ x: 0, y: 0 }} to={{ x: d.a, y: 0 }} label={`底 ${fmt(d.a)} cm`} />
          {footOutside && <line className="sc-track" x1={ctx.toX(Math.min(0, d.apexX))} y1={ctx.toY(0)} x2={ctx.toX(Math.max(d.a, d.apexX))} y2={ctx.toY(0)} />}
          {!d.assembled && <HeightLine ctx={ctx} foot={{ x: d.apexX, y: 0 }} top={{ x: d.apexX, y: d.h }} label={`高 ${fmt(d.h)}`} side={d.apexX < d.a / 2 ? -1 : 1} />}
          {d.assembled && (
            <>
              {/* 钝角三角形拼合后宽约 14 cm：尺子贴在拼成平行四边形的底边与右端，避免落到舞台外 */}
              <RulerButton ctx={ctx} at={{ x: (paraBox.xMin + d.a) / 2, y: -1.15 }} shown={showBase} onClick={() => dispatch({ type: "TOGGLE_RULER", ruler: "base" })} />
              <RulerButton ctx={ctx} at={{ x: heightX + 0.85, y: d.h / 2 }} shown={showHeight} onClick={() => dispatch({ type: "TOGGLE_RULER", ruler: "height" })} />
              {showBase && <Ruler ctx={ctx} from={{ x: 0, y: 0 }} to={{ x: d.a, y: 0 }} value={`${fmt(d.a)} cm`} offset={0.75} />}
              {showHeight && <Ruler ctx={ctx} from={{ x: heightX, y: 0 }} to={{ x: heightX, y: d.h }} value={`${fmt(d.h)} cm`} alt />}
            </>
          )}
        </>
      )}
    </ShapeCanvas>
  );
}

export function TriFormula({ state, dispatch, interactive, embedded }: StageProps) {
  const st = state.stations.tri;
  const d = triDerived(st);
  const teacher = state.mode === "teacher" && !embedded;
  return (
    <div className="chain-formula" aria-live="polite">
      {!d.assembled ? (
        <div className="formula">
          <span>S = ? × ? ÷ ?</span>
        </div>
      ) : (
        <>
          <div className="formula secondary">
            <span>平行四边形的面积 = 底 × 高 =</span>
            <Num value={d.a} digits={1} />
            <span>×</span>
            <Num value={d.h} digits={1} />
            <span>=</span>
            <Num value={d.parallelogramArea} kind="res" digits={2} />
          </div>
          <div className="formula">
            <span>三角形是它的一半：</span>
            {st.halfNotation ? (
              <>
                <span>S =</span>
                <button className="frac" onClick={() => interactive && dispatch({ type: "TOGGLE_HALF_NOTATION" })} aria-label="切换写法">
                  ½
                </button>
                <span>×</span>
                <Num value={d.a} digits={1} />
                <span>×</span>
                <Num value={d.h} digits={1} />
              </>
            ) : (
              <>
                <span>S =</span>
                <Num value={d.a} digits={1} />
                <span>×</span>
                <Num value={d.h} digits={1} />
                <button className="frac" onClick={() => interactive && dispatch({ type: "TOGGLE_HALF_NOTATION" })} aria-label="切换写法">
                  ÷ 2
                </button>
                <span className="tag">两个拼的</span>
              </>
            )}
            <span>=</span>
            <Num value={d.area} kind="res" digits={2} />
            <span>cm²</span>
          </div>
          <p className="chain-note">点「÷ 2」或「½」可以切换写法。</p>
        </>
      )}
      {teacher && interactive && (
        <div className="row">
          <span className="chain-note">老师：</span>
          {(["acute", "right", "obtuse"] as const).map((k) => (
            <button key={k} className="btn" aria-pressed={st.triKind === k} onClick={() => dispatch({ type: "SET_TRI_KIND", kind: k })}>
              {KIND_LABEL[k]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
