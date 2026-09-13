import { useState, type Dispatch } from "react";
import { canAddRow, measuredC, tableHint } from "../model/derived";
import type { Action } from "../model/reducer";
import { TABLE_MAX_ROWS, type State } from "../model/types";
import { fmt2 } from "./svg-utils";

const LABEL_PRESETS = ["杯盖", "光盘", "硬币", "圆桌", "车轮"];

interface Props {
  state: State;
  dispatch: Dispatch<Action>;
  interactive: boolean;
}

/** 数据表：物品/序号 | 直径 d/cm | 周长 C/cm | 周长÷直径（与教材例 2 实验表对齐） */
export function DataTable({ state, dispatch, interactive }: Props) {
  const s = state;
  const [shake, setShake] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);

  const addable = canAddRow(s) && interactive;
  const onAdd = () => {
    if (!interactive) return;
    if (!s.rollLocked) {
      setShake(true);
      setHint("先滚满一圈");
      setTimeout(() => setShake(false), 450);
      return;
    }
    if (s.table.length >= TABLE_MAX_ROWS) {
      setHint(`最多 ${TABLE_MAX_ROWS} 行`);
      return;
    }
    setHint(null);
    dispatch({ type: "ADD_ROW" });
  };

  const weak = tableHint(s);
  const lastId = s.table[s.table.length - 1]?.id;

  return (
    <div className="data-table" aria-label="数据表">
      <h3>数据表</h3>
      <table>
        <thead>
          <tr>
            <th>物品/序号</th>
            <th>直径 d/cm</th>
            <th>周长 C/cm</th>
            <th>周长÷直径</th>
          </tr>
        </thead>
        <tbody>
          {s.table.map((r) => (
            <tr key={r.id} className={r.id === lastId ? "fresh" : ""}>
              <td>
                <button className="row-label" onClick={() => interactive && setRenaming(r.id)} aria-label={`改名 ${r.label}`}>
                  {r.label}
                </button>
              </td>
              <td aria-label={`直径 ${r.d.toFixed(1)} 厘米`}>{r.d.toFixed(1)}</td>
              <td aria-label={`周长 ${fmt2(r.C)} 厘米`}>{fmt2(r.C)}</td>
              <td className="ratio">{fmt2(r.ratio)}</td>
            </tr>
          ))}
          {s.table.length === 0 && (
            <tr>
              <td colSpan={4} className="muted" style={{ textAlign: "center", fontSize: "var(--fs-body)" }}>
                滚满一圈后点「加入数据表」
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {s.rollLocked && interactive && (
        <p className="hint ok">
          这一圈量得 {fmt2(measuredC(s))} cm，直径 {s.d.toFixed(1)} cm
        </p>
      )}
      {(hint || weak) && <p className="hint">{hint ?? weak}</p>}

      {interactive && (
        <div className="actions">
          <button className={`btn primary lg ${shake ? "shake" : ""}`} aria-disabled={!addable} onClick={onAdd}>
            + 加入数据表
          </button>
          <button className="btn" disabled={!s.rollLocked} onClick={() => dispatch({ type: "ROLL_RESET" })}>
            再滚一次
          </button>
          <button className="btn" disabled={s.table.length === 0} onClick={() => dispatch({ type: "REMOVE_LAST_ROW" })}>
            删最后一行
          </button>
        </div>
      )}

      {renaming && (
        <div className="modal-backdrop" onPointerDown={(e) => e.target === e.currentTarget && setRenaming(null)}>
          <div className="modal" role="dialog" aria-label="给这一行起名">
            <h2>这是什么圆？</h2>
            <div className="choice-row">
              {[`圆${s.table.findIndex((r) => r.id === renaming) + 1}`, ...LABEL_PRESETS].map((l) => (
                <button
                  key={l}
                  className="btn"
                  onClick={() => {
                    dispatch({ type: "RENAME_ROW", id: renaming, label: l });
                    setRenaming(null);
                  }}
                >
                  {l}
                </button>
              ))}
            </div>
            <div className="actions">
              <button className="btn" onClick={() => setRenaming(null)}>
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
