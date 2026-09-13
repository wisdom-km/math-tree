import type { Dispatch } from "react";
import { ShapeCanvas, type HandleSpec, type ShapeSpec } from "@/shared/shape-canvas";
import { BaseLine, HeightLine } from "../components/annotations";
import { Num, fmt } from "../components/Num";
import { fillFeedback, rectDerived } from "../model/derived";
import type { Action } from "../model/reducer";
import { CELL_NUMBER_LIMIT, PARAM_RANGE, RECT_B_RANGE, type State } from "../model/types";

interface Props {
  state: State;
  dispatch: Dispatch<Action>;
  embedded: boolean;
  interactive: boolean;
}

/** 第 1 站 · 长方形（数格子；含正方形特例与不规则图形估算） */
export function RectStage({ state, dispatch, embedded, interactive }: Props) {
  const st = state.stations.rect;
  const d = rectDerived(st);
  const fb = fillFeedback("rect", st);
  const perimeterFb = fb?.kind === "perimeter";

  const shapes: ShapeSpec[] = st.irregular
    ? [{ id: "irregular", points: d.irregular, role: "source" }]
    : [{ id: "rect", points: d.shape, role: "source", flowing: perimeterFb, dim: perimeterFb, flash: d.isSquare }];

  const grid = st.irregular ? d.irregularGrid : d.grid;
  const numbered = grid.cells.length <= CELL_NUMBER_LIMIT;

  const handles: HandleSpec[] = [];
  if (!st.irregular) {
    handles.push({
      id: "a",
      x: d.a,
      y: d.b / 2,
      axis: "x",
      badge: `长 a = ${d.a.toFixed(1)} cm`,
      ariaLabel: `长 a，${PARAM_RANGE.rect.min} 到 ${PARAM_RANGE.rect.max} 厘米`,
      disabled: !interactive,
      wiggle: !st.touched,
      onDragStart: () => dispatch({ type: "BEGIN_DRAG" }),
      onDrag: (p) => dispatch({ type: "DRAG_PARAM", value: p.x }),
      onDragEnd: () => dispatch({ type: "END_DRAG" }),
    });
    if (state.mode === "teacher" || embedded) {
      handles.push({
        id: "b",
        x: d.a / 2,
        y: d.b,
        axis: "y",
        badge: `宽 b = ${d.b.toFixed(1)} cm`,
        ariaLabel: `宽 b，${RECT_B_RANGE.min} 到 ${RECT_B_RANGE.max} 厘米`,
        disabled: !interactive,
        onDragStart: () => dispatch({ type: "BEGIN_DRAG" }),
        onDrag: (p) => dispatch({ type: "SET_RECT_B", value: p.y }),
        onDragEnd: () => dispatch({ type: "END_DRAG" }),
      });
    }
  }

  return (
    <ShapeCanvas
      ariaLabel="第 1 站 长方形数格子"
      shapes={shapes}
      cells={{ cells: grid.cells, numbered, animateRows: st.rowCountAnim > 0, animKey: st.rowCountAnim }}
      handles={handles}
      embedded={embedded}
      visibleActions={embedded ? [] : undefined}
      actions={
        embedded
          ? undefined
          : {
              cut: { disabled: true, note: "不用剪", onClick: () => undefined },
              move: { disabled: true, onClick: () => undefined },
              assemble: { disabled: true, onClick: () => undefined },
            }
      }
      hint={st.rowCountAnim > 0 && !st.irregular ? `${fmt(d.b)} 行 × 每行 ${fmt(d.a)} 个` : st.irregular ? "边上的半格怎么办？先按半格估一估" : null}
    >
      {(ctx) =>
        st.irregular ? (
          <text className="sc-label" x={ctx.toX(0)} y={ctx.toY(d.irregular.reduce((m, p) => Math.max(m, p.y), 0)) - 24}>
            完整 <tspan className="sc-num base">{d.irregularGrid.full}</tspan> 格 + 半格 <tspan className="sc-num height">{d.irregularGrid.partial}</tspan> 个 ≈{" "}
            <tspan className="sc-num">{fmt(d.irregularGrid.estimate)}</tspan> cm²
          </text>
        ) : (
          <>
            <BaseLine ctx={ctx} from={{ x: 0, y: 0 }} to={{ x: d.a, y: 0 }} label={`长 ${fmt(d.a)} cm`} />
            <HeightLine ctx={ctx} foot={{ x: 0, y: 0 }} top={{ x: 0, y: d.b }} label={`宽 ${fmt(d.b)}`} side={-1} />
          </>
        )
      }
    </ShapeCanvas>
  );
}

/** 第 1 站算式卡（活公式） */
export function RectFormula({ state, dispatch, interactive, embedded }: Props) {
  const st = state.stations.rect;
  const d = rectDerived(st);
  return (
    <div className="chain-formula" aria-live="polite">
      {st.irregular ? (
        <>
          <div className="formula">
            <span>不规则图形：数格子估一估</span>
          </div>
          <div className="formula">
            <span>≈ 整格</span>
            <Num value={d.irregularGrid.full} />
            <span>+ 半格</span>
            <Num value={d.irregularGrid.partial} />
            <span>÷ 2 ≈</span>
            <Num value={d.irregularGrid.estimate} kind="res" digits={1} />
            <span>cm²</span>
          </div>
          <p className="chain-note">数不出准确的——圆也数不清格子。等到第 5 站再想办法。</p>
        </>
      ) : (
        <>
          <div className="formula">
            <span>S = 长 × 宽 =</span>
            <Num value={d.a} digits={1} />
            <span>×</span>
            <Num value={d.b} digits={1} />
            <span>=</span>
            <Num value={d.area} kind="res" digits={2} />
            <span>cm²</span>
          </div>
          <div className="formula secondary">
            <span>格子数：</span>
            <Num value={d.grid.full} kind="res" />
            <span>个整格</span>
            {d.grid.partial > 0 && (
              <>
                <span>+</span>
                <Num value={d.grid.partial} />
                <span>个半格</span>
              </>
            )}
          </div>
          {d.isSquare && (
            <div className="formula square">
              <span>正方形：边长 × 边长 =</span>
              <Num value={d.a} digits={1} />
              <span>×</span>
              <Num value={d.a} digits={1} />
              <span>=</span>
              <Num value={d.area} kind="res" digits={2} />
            </div>
          )}
        </>
      )}
      {interactive && (
        <div className="row">
          {!st.irregular && (
            <button className="btn" onClick={() => dispatch({ type: "ROW_COUNT" })}>
              一行一行数
            </button>
          )}
          {!embedded && (
            <button className="btn" aria-pressed={st.irregular} onClick={() => dispatch({ type: "SET_IRREGULAR", on: !st.irregular })}>
              {st.irregular ? "回到长方形" : "换个不规则图形数数"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
