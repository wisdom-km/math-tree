import { useState, type Dispatch } from "react";
import { fmt2 } from "@/explorations/circle-circumference/components/svg-utils";
import { assembled, canAddRow, currentApprox, duplicateRow, formulaC, relationBadgeAvailable } from "../model/derived";
import type { Action } from "../model/reducer";
import { TABLE_MAX_ROWS, type State } from "../model/types";

interface Props {
  state: State;
  dispatch: Dispatch<Action>;
  interactive: boolean;
}

/**
 * 数据表（交互稿 4.3）：表头随拼法切换；两种拼法的行可混放（小图标区分）。
 * rect：# | 等分数 n | 长 ≈ /cm | 宽 /cm | 面积 ≈ /cm²
 * tri： # | 等分数 n | 每份底 /cm | 每份高 /cm | n 份合计 ≈ /cm²
 */
export function DataTable({ state, dispatch, interactive }: Props) {
  const s = state;
  const [shake, setShake] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [relation, setRelation] = useState(false);

  const isAssembled = assembled(s);
  const dup = duplicateRow(s);
  const addable = canAddRow(s) && !dup && interactive;
  const approx = currentApprox(s);

  const onAdd = () => {
    if (!interactive) return;
    if (!isAssembled) {
      setShake(true);
      setHint("先拼到位");
      setTimeout(() => setShake(false), 450);
      return;
    }
    if (dup) {
      setHint("这一组已经记过");
      return;
    }
    if (s.table.length >= TABLE_MAX_ROWS) {
      setHint(`最多 ${TABLE_MAX_ROWS} 行`);
      return;
    }
    setHint(null);
    dispatch({ type: "ADD_ROW" });
  };

  const lastId = s.table[s.table.length - 1]?.id;
  const headers =
    s.assembly === "rect"
      ? ["#", "等分数 n", "长 ≈ /cm", "宽 /cm", "面积 ≈ /cm²"]
      : ["#", "等分数 n", "每份底 /cm", "每份高 /cm", "n 份合计 ≈ /cm²"];
  const badge = relationBadgeAvailable(s);

  return (
    <div className="data-table" aria-label="数据表">
      <h3>数据表 {s.table.length > 0 && <span className="muted">· r = {s.r.toFixed(1)} cm 时</span>}</h3>
      <table>
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={h}>
                {h}
                {i === 2 && badge && (
                  <button className="btn mini" aria-pressed={relation} onClick={() => setRelation(!relation)} aria-label="和什么有关？">
                    和什么有关？
                  </button>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {s.table.map((row, i) => (
            <tr key={row.id} className={`${row.id === lastId ? "fresh" : ""} ${row.assembly}`}>
              <td>
                <span className={`kind-icon ${row.assembly}`} title={row.assembly === "rect" ? "拼成长方形" : "拆成三角形"} aria-hidden />
                {i + 1}
                {Math.abs(row.r - s.r) > 0.05 && <span className="muted small"> r={row.r.toFixed(1)}</span>}
              </td>
              <td>{row.n}</td>
              <td className="len">{fmt2(row.length)}</td>
              <td className="wid">{fmt2(row.width)}</td>
              <td className="area">{fmt2(row.areaApprox)}</td>
            </tr>
          ))}
          {s.table.length === 0 && (
            <tr>
              <td colSpan={5} className="muted" style={{ textAlign: "center", fontSize: "var(--fs-body)" }}>
                拼合到位后点「加入数据表」
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {relation && badge && (
        <p className="hint" style={{ color: "var(--c-text)" }}>
          这个圆：C = 2 × 3.14 × {s.r.toFixed(1)} = <b>{fmt2(formulaC(s.r))}</b>；C ÷ 2 = <b>{fmt2(formulaC(s.r) / 2)}</b>
        </p>
      )}

      {isAssembled && interactive && (
        <p className="hint ok">
          这次拼出：{s.assembly === "rect" ? `长 ≈ ${fmt2(approx.length)}，宽 ${fmt2(approx.width)}` : `每份底 ${fmt2(approx.length)}，高 ${fmt2(approx.width)}`}，
          {s.assembly === "rect" ? "面积" : `${s.n} 份合计`} ≈ {fmt2(approx.area)} cm²
        </p>
      )}
      {(hint || (dup && isAssembled && interactive)) && <p className="hint">{hint ?? "这一组已经记过"}</p>}

      {interactive && (
        <div className="actions">
          <button className={`btn primary lg ${shake ? "shake" : ""}`} aria-disabled={!addable} onClick={onAdd}>
            + 加入数据表
          </button>
          <button className="btn" disabled={s.table.length === 0} onClick={() => dispatch({ type: "REMOVE_LAST_ROW" })}>
            删最后一行
          </button>
        </div>
      )}
    </div>
  );
}
