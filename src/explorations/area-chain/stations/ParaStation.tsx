import { ShapeCanvas, type HandleSpec, type ShapeSpec } from "@/shared/shape-canvas";
import { BaseLine, HeightLine, Ruler, RulerButton, UprightCompare } from "../components/annotations";
import { Num, fmt } from "../components/Num";
import { fillFeedback, paraDerived, paraRecordsDistinct } from "../model/derived";
import { PARAM_RANGE, type State } from "../model/types";
import type { StageProps } from "./types";

/** 第 2 站 · 平行四边形（沿高剪开、平移、拼成长方形；小 L3：剪的位置不影响面积） */
export function ParaStage({ state, dispatch, embedded, interactive, onAssemble, assembling, progress }: StageProps) {
  const st = state.stations.para;
  const d = paraDerived(st);
  const fb = fillFeedback("para", st);

  const shapes: ShapeSpec[] = [];
  if (!st.cutDone) {
    shapes.push({ id: "para", points: d.shape, role: "source" });
  } else {
    shapes.push({ id: "rest", points: d.pieces.rest, role: "source" });
    if (d.assembled) shapes.push({ id: "rect", points: d.pieces.rect, role: "outline" });
    else shapes.push({ id: "target", points: d.pieces.pieceTarget, role: "ghost" });
    shapes.push({ id: "piece", points: d.pieceNow, role: "piece", label: st.moved && st.t === 0 ? (d.pieceKind === "triangle" ? "剪下的三角形" : "剪下的梯形") : undefined });
  }

  const handles: HandleSpec[] = [
    {
      id: "s",
      x: d.a + d.s,
      y: d.h,
      axis: "x",
      badge: `倾斜 s = ${d.s.toFixed(1)} cm`,
      ariaLabel: `倾斜量 s，${PARAM_RANGE.para.min} 到 ${PARAM_RANGE.para.max} 厘米`,
      disabled: !interactive,
      wiggle: !st.touched && !embedded,
      onDragStart: () => dispatch({ type: "BEGIN_DRAG" }),
      onDrag: (p) => dispatch({ type: "DRAG_PARAM", value: p.x - d.a }),
      onDragEnd: () => dispatch({ type: "END_DRAG" }),
    },
  ];
  if (!st.cutDone && !embedded) {
    handles.push({
      id: "cut",
      x: d.c,
      y: 0,
      axis: "x",
      variant: "scissors",
      badge: `剪在 x = ${d.c.toFixed(1)}`,
      ariaLabel: "剪的位置（沿一条高）",
      disabled: !interactive,
      onDragStart: () => dispatch({ type: "BEGIN_DRAG_CUT" }),
      onDrag: (p) => dispatch({ type: "DRAG_CUT_POS", value: p.x }),
      onDragEnd: () => dispatch({ type: "END_DRAG" }),
    });
  }

  const showBase = st.rulers.includes("base");
  const showHeight = st.rulers.includes("height");
  const slant = Math.hypot(d.s, d.h);

  return (
    <ShapeCanvas
      ariaLabel="第 2 站 平行四边形剪移拼"
      shapes={shapes}
      handles={handles}
      embedded={embedded}
      visibleActions={embedded ? ["assemble"] : undefined}
      actions={{
        cut: { disabled: !interactive || st.cutDone, wiggle: !st.cutDone && st.touched, onClick: () => dispatch({ type: "CUT" }) },
        move: { disabled: !interactive || !st.cutDone || st.t > 0, pressed: st.moved, onClick: () => dispatch({ type: "TOGGLE_MOVE" }) },
        assemble: { disabled: !interactive || !st.cutDone, pressed: d.assembled || assembling, onClick: onAssemble },
      }}
      progress={st.cutDone ? progress : progress ? { ...progress, disabled: true } : null}
      hint={d.sameAsBefore ? "和刚才一样" : st.cutDone && !d.assembled ? "拖进度或点「拼」，把剪下的部分平移到右边" : null}
    >
      {(ctx) => (
        <>
          {/* 剪切线预览 / 剪开后的高 */}
          {!st.cutDone ? (
            <>
              <line className="sc-cut-line" x1={ctx.toX(d.c)} y1={ctx.toY(0)} x2={ctx.toX(d.c)} y2={ctx.toY(d.h)} />
              <path className="sc-right-angle" d={`M${ctx.toX(d.c)} ${ctx.toY(0) - 22} h22 v22`} />
            </>
          ) : (
            !d.assembled && <HeightLine ctx={ctx} foot={{ x: d.c, y: 0 }} top={{ x: d.c, y: d.h }} label={`高 ${fmt(d.h)}`} />
          )}
          {/* 平移轨道 */}
          {st.cutDone && !d.assembled && (
            <line className="sc-track" x1={ctx.toX(d.c)} y1={ctx.toY(d.h / 2)} x2={ctx.toX(d.c + d.a)} y2={ctx.toY(d.h / 2)} />
          )}
          {!st.cutDone && <BaseLine ctx={ctx} from={{ x: 0, y: 0 }} to={{ x: d.a, y: 0 }} label={`底 ${fmt(d.a)} cm`} />}
          {/* 拼到位：外框「? × ?」，点边贴尺读数 */}
          {d.assembled && (
            <>
              <RulerButton ctx={ctx} at={{ x: d.c + d.a / 2, y: -0.7 }} shown={showBase} onClick={() => dispatch({ type: "TOGGLE_RULER", ruler: "base" })} />
              <RulerButton ctx={ctx} at={{ x: d.c + d.a + 0.8, y: d.h / 2 }} shown={showHeight} onClick={() => dispatch({ type: "TOGGLE_RULER", ruler: "height" })} />
              {showBase && <Ruler ctx={ctx} from={{ x: d.c, y: 0 }} to={{ x: d.c + d.a, y: 0 }} value={`${fmt(d.a)} cm`} />}
              {showHeight && <Ruler ctx={ctx} from={{ x: d.c + d.a, y: 0 }} to={{ x: d.c + d.a, y: d.h }} value={`${fmt(d.h)} cm`} alt />}
            </>
          )}
          {fb?.kind === "slant" && <UprightCompare ctx={ctx} at={{ x: d.a + d.s + 1.6, y: 0 }} height={d.h} other={slant} otherLabel="斜边" />}
        </>
      )}
    </ShapeCanvas>
  );
}

export function ParaFormula({ state, dispatch, interactive, embedded }: StageProps) {
  const st = state.stations.para;
  const d = paraDerived(st);
  const distinct = paraRecordsDistinct(st);
  const teacher = state.mode === "teacher" && !embedded;

  return (
    <div className="chain-formula" aria-live="polite">
      {!d.assembled ? (
        <>
          <div className="formula">
            <span>S = ? × ?</span>
          </div>
          {!st.cutDone && (
            <div className="formula secondary">
              <span>完整</span>
              <Num value={d.grid.full} />
              <span>格 + 半格</span>
              <Num value={d.grid.partial} />
              <span>个 —— 不好数</span>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="formula secondary">
            <span>长方形的面积 =</span>
            <Num value={d.newDims.length} digits={1} />
            <span>×</span>
            <Num value={d.newDims.width} digits={1} />
            <span>=</span>
            <Num value={d.area} kind="res" digits={2} />
          </div>
          <div className="formula">
            <span>平行四边形的面积 = 底 × 高 =</span>
            <Num value={d.a} digits={1} />
            <span>×</span>
            <Num value={d.h} digits={1} />
            <span>=</span>
            <Num value={d.area} kind="res" digits={2} />
            <span>cm²</span>
            {d.sameAsBefore && <span className="tag">和刚才一样</span>}
          </div>
        </>
      )}

      {teacher && !st.cutDone && interactive && (
        <div className="row">
          <span className="chain-note">老师：剪法</span>
          <button className="btn" aria-pressed={d.pieceKind === "triangle"} onClick={() => dispatch({ type: "SET_CUT_PRESET", preset: "triangle" })}>
            剪下一个三角形
          </button>
          <button className="btn" aria-pressed={d.pieceKind === "trapezoid"} onClick={() => dispatch({ type: "SET_CUT_PRESET", preset: "trapezoids" })}>
            剪成两个梯形
          </button>
        </div>
      )}

      {!embedded && st.paraRecords.length > 0 && (
        <div className="chain-records">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>倾斜 s</th>
                <th>剪在 x =</th>
                <th>拼成 长 × 宽</th>
                <th>面积</th>
              </tr>
            </thead>
            <tbody>
              {st.paraRecords.map((r, i) => (
                <tr key={`${r.s}-${r.c}`}>
                  <td>{i + 1}</td>
                  <td>{fmt(r.s)}</td>
                  <td>{fmt(r.c)}</td>
                  <td>
                    {fmt(r.length)} × {fmt(r.width)}
                  </td>
                  <td className="res">{fmt(r.area)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {distinct >= 2 ? (
            <div className="chain-discovery">
              <span>我发现：换个位置剪，拼出的长方形面积</span>
              {(["不影响", "影响"] as const).map((v) => (
                <button key={v} className="btn" aria-pressed={st.paraDiscovery === v} disabled={!interactive} onClick={() => dispatch({ type: "SET_PARA_DISCOVERY", value: v })}>
                  {v === "不影响" ? "一样大" : "变了"}
                </button>
              ))}
              {st.paraDiscovery === "不影响" && <span className="chain-hint ok">剪的位置不影响面积——只要沿着高剪。</span>}
              {st.paraDiscovery === "影响" && <span className="chain-hint">再看看表里「面积」那一列，变了吗？</span>}
            </div>
          ) : (
            <p className="chain-note">换个位置再剪一次、再拼一次，看看面积会不会变。</p>
          )}
        </div>
      )}
      {!embedded && d.assembled && interactive && (
        <div className="row">
          <button className="btn" onClick={() => dispatch({ type: "RECUT" })}>
            换个位置再剪
          </button>
        </div>
      )}
    </div>
  );
}

export type { State };
