import { ShapeCanvas, TRAP_TOP_OFFSET, type HandleSpec, type ShapeSpec } from "@/shared/shape-canvas";
import { BaseLine, HeightLine, Ruler, RulerButton, UprightCompare } from "../components/annotations";
import { Num, fmt } from "../components/Num";
import { fillFeedback, trapDerived } from "../model/derived";
import { PARAM_RANGE } from "../model/types";
import type { StageProps } from "./types";

/** 第 4 站 · 梯形（两个一样的拼成平行四边形，底是上底 + 下底） */
export function TrapStage({ state, dispatch, embedded, interactive, onAssemble, assembling, progress }: StageProps) {
  const st = state.stations.trap;
  const d = trapDerived(st);
  const fb = fillFeedback("trap", st);
  const off = TRAP_TOP_OFFSET;

  const shapes: ShapeSpec[] = [{ id: "trap", points: d.shape, role: "source" }];
  if (d.copyNow) shapes.push({ id: "copy", points: d.copyNow, role: "piece", label: st.moved && st.t === 0 ? "一样的" : undefined });
  if (d.assembled) shapes.push({ id: "para", points: d.asm.parallelogram, role: "outline" });
  else if (st.t > 0 || st.moved) shapes.push({ id: "target", points: d.asm.target, role: "ghost" });

  const handles: HandleSpec[] = [
    {
      id: "b",
      x: off + d.b,
      y: d.h,
      axis: "x",
      badge: `上底 b = ${d.b.toFixed(1)} cm`,
      ariaLabel: `上底 b，${PARAM_RANGE.trap.min} 到 ${PARAM_RANGE.trap.max} 厘米`,
      disabled: !interactive,
      wiggle: !st.touched && !embedded,
      onDragStart: () => dispatch({ type: "BEGIN_DRAG" }),
      onDrag: (p) => dispatch({ type: "DRAG_PARAM", value: p.x - off }),
      onDragEnd: () => dispatch({ type: "END_DRAG" }),
    },
  ];

  const showBase = st.rulers.includes("base");
  const showHeight = st.rulers.includes("height");
  const leg = Math.hypot(off, d.h);

  return (
    <ShapeCanvas
      ariaLabel="第 4 站 梯形拼成平行四边形"
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
      hint={d.assembled ? "两个一样的梯形拼成了一个平行四边形" : st.moved ? "借来一个一样的梯形" : null}
    >
      {(ctx) => (
        <>
          {!d.assembled && (
            <>
              <BaseLine ctx={ctx} from={{ x: 0, y: 0 }} to={{ x: d.a, y: 0 }} label={`下底 ${fmt(d.a)} cm`} />
              <BaseLine ctx={ctx} from={{ x: off, y: d.h }} to={{ x: off + d.b, y: d.h }} label={`上底 ${fmt(d.b)} cm`} offset={-0.55} />
              <HeightLine ctx={ctx} foot={{ x: off, y: 0 }} top={{ x: off, y: d.h }} label={`高 ${fmt(d.h)}`} side={-1} />
            </>
          )}
          {d.assembled && (
            <>
              <RulerButton ctx={ctx} at={{ x: (d.a + d.b) / 2, y: -0.9 }} shown={showBase} onClick={() => dispatch({ type: "TOGGLE_RULER", ruler: "base" })} />
              <RulerButton ctx={ctx} at={{ x: d.a + off + d.b + 0.9, y: d.h / 2 }} shown={showHeight} onClick={() => dispatch({ type: "TOGGLE_RULER", ruler: "height" })} />
              {showBase && (
                <>
                  {/* 底边尺子分两段色：下底段 + 上底段 */}
                  <Ruler ctx={ctx} from={{ x: 0, y: 0 }} to={{ x: d.a, y: 0 }} value={`下底 ${fmt(d.a)}`} offset={0.5} />
                  <Ruler ctx={ctx} from={{ x: d.a, y: 0 }} to={{ x: d.a + d.b, y: 0 }} value={`上底 ${fmt(d.b)}`} alt offset={0.5} />
                  <text className="sc-num" x={ctx.toX((d.a + d.b) / 2)} y={ctx.toY(-1.55)} textAnchor="middle">
                    {fmt(d.a)} + {fmt(d.b)} = {fmt(d.a + d.b)} cm
                  </text>
                </>
              )}
              {showHeight && <Ruler ctx={ctx} from={{ x: d.a + off + d.b, y: 0 }} to={{ x: d.a + off + d.b, y: d.h }} value={`${fmt(d.h)} cm`} alt />}
            </>
          )}
          {fb?.kind === "leg" && <UprightCompare ctx={ctx} at={{ x: d.a + off + d.b + 2.2, y: 0 }} height={d.h} other={leg} otherLabel="腰" />}
        </>
      )}
    </ShapeCanvas>
  );
}

export function TrapFormula({ state }: StageProps) {
  const st = state.stations.trap;
  const d = trapDerived(st);
  return (
    <div className="chain-formula" aria-live="polite">
      {!d.assembled ? (
        <div className="formula">
          <span>S = (? + ?) × ? ÷ ?</span>
        </div>
      ) : (
        <>
          <div className="formula secondary">
            <span>平行四边形的面积 = (下底 + 上底) × 高 = (</span>
            <Num value={d.a} digits={1} />
            <span>+</span>
            <Num value={d.b} digits={1} />
            <span>) ×</span>
            <Num value={d.h} digits={1} />
            <span>=</span>
            <Num value={d.parallelogramArea} kind="res" digits={2} />
          </div>
          <div className="formula">
            <span>梯形是它的一半：S = (</span>
            <Num value={d.a} digits={1} />
            <span>+</span>
            <Num value={d.b} digits={1} />
            <span>) ×</span>
            <Num value={d.h} digits={1} />
            <span>÷ 2 =</span>
            <Num value={d.area} kind="res" digits={2} />
            <span>cm²</span>
          </div>
        </>
      )}
    </div>
  );
}
