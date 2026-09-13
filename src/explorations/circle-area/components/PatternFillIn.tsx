import { useState, type Dispatch } from "react";
import { discoveryFilled, lengthOk, patternOk, widthOk } from "../model/derived";
import { BECAUSE_CHIPS, checkLength, checkWidth, FIND_CHIPS, LENGTH_CHIPS, WIDTH_CHIPS } from "../model/pattern";
import type { Action } from "../model/reducer";
import type { State } from "../model/types";

interface Props {
  state: State;
  dispatch: Dispatch<Action>;
  interactive: boolean;
}

/** 步骤 5 填空卡：「长 ≈ ___，宽 = ___」+「我发现 ______，因为 ______。」 */
export function PatternFillIn({ state, dispatch, interactive }: Props) {
  const s = state;
  const [custom, setCustom] = useState<"length" | "width" | null>(null);
  const [draft, setDraft] = useState("");
  const lenCheck = s.patternBlank.length ? checkLength(s.patternBlank.length) : null;
  const widCheck = s.patternBlank.width ? checkWidth(s.patternBlank.width) : null;
  const ok = patternOk(s);
  const filled = discoveryFilled(s);

  const append = (field: "find" | "because", text: string) => {
    const cur = s.discoveryText[field];
    dispatch({ type: "SET_DISCOVERY", field, value: cur ? `${cur}，${text}` : text });
  };

  return (
    <div className="fill-card" aria-label="找规律">
      <div className="sentence">
        长 ≈
        <button className={`blank ${s.patternBlank.length ? "" : "empty"} ${lengthOk(s) ? "ok" : ""}`} disabled={!interactive} onClick={() => setCustom("length")}>
          {s.patternBlank.length ?? "______"}
        </button>
        ，宽 =
        <button className={`blank ${s.patternBlank.width ? "" : "empty"} ${widthOk(s) ? "ok" : ""}`} disabled={!interactive} onClick={() => setCustom("width")}>
          {s.patternBlank.width ?? "______"}
        </button>
      </div>
      {interactive && (
        <>
          <div className="chips">
            <span className="muted">长：</span>
            {LENGTH_CHIPS.map((c) => (
              <button key={c} className="btn" aria-pressed={s.patternBlank.length === c} onClick={() => dispatch({ type: "SET_BLANK", field: "length", value: c })}>
                {c}
              </button>
            ))}
            <button className="btn" onClick={() => setCustom("length")}>
              自定义…
            </button>
          </div>
          <div className="chips">
            <span className="muted">宽：</span>
            {WIDTH_CHIPS.map((c) => (
              <button key={c} className="btn" aria-pressed={s.patternBlank.width === c} onClick={() => dispatch({ type: "SET_BLANK", field: "width", value: c })}>
                {c}
              </button>
            ))}
            <button className="btn" onClick={() => setCustom("width")}>
              自定义…
            </button>
          </div>
        </>
      )}

      {lenCheck && !lenCheck.ok && lenCheck.contrast === "C" && <p className="hint">看舞台：一条和周长一样长的线段叠在长方形的长上，一样长吗？上排和下排各占了多少？</p>}
      {lenCheck && !lenCheck.ok && lenCheck.contrast === "d" && <p className="hint">看舞台：一条和直径一样长的线段叠在长方形的长上，够长吗？</p>}
      {lenCheck && !lenCheck.ok && !lenCheck.contrast && <p className="hint">再看看数据表「长 ≈」那一列在靠近哪个数，和这个圆的周长比一比。</p>}
      {widCheck && !widCheck.ok && widCheck.contrast === "d" && <p className="hint">看舞台：一条直径长的竖线叠在长方形的宽上，明显伸出去了。</p>}
      {widCheck && !widCheck.ok && !widCheck.contrast && <p className="hint">再看看「宽」那一列一直是多少，是圆的什么？</p>}
      {ok && <p className="hint ok">可以揭示公式了</p>}

      <div className="discovery">
        <div>
          我发现
          <textarea
            value={s.discoveryText.find}
            readOnly={!interactive}
            placeholder="点下面的短句拼起来，也可以自己打"
            onChange={(e) => dispatch({ type: "SET_DISCOVERY", field: "find", value: e.target.value })}
          />
        </div>
        {interactive && (
          <div className="chips">
            {FIND_CHIPS.map((c) => (
              <button key={c} className="btn" onClick={() => append("find", c)}>
                {c}
              </button>
            ))}
          </div>
        )}
        <div>
          因为
          <textarea
            value={s.discoveryText.because}
            readOnly={!interactive}
            placeholder="为什么这样说？"
            onChange={(e) => dispatch({ type: "SET_DISCOVERY", field: "because", value: e.target.value })}
          />
        </div>
        {interactive && (
          <div className="chips">
            {BECAUSE_CHIPS.map((c) => (
              <button key={c} className="btn" onClick={() => append("because", c)}>
                {c}
              </button>
            ))}
            <button
              className="btn"
              onClick={() => {
                dispatch({ type: "SET_DISCOVERY", field: "find", value: "" });
                dispatch({ type: "SET_DISCOVERY", field: "because", value: "" });
              }}
            >
              清空两句
            </button>
          </div>
        )}
      </div>

      {interactive && (
        <div className="choice-row" style={{ marginTop: "0.75rem" }}>
          <button
            className="btn primary"
            disabled={!s.patternBlank.length || !s.patternBlank.width || !filled}
            aria-pressed={s.patternSubmitted}
            onClick={() => dispatch({ type: "SUBMIT_PATTERN" })}
          >
            {s.patternSubmitted ? "已提交" : "提交我的发现"}
          </button>
          {s.mode === "teacher" && !ok && (
            <button className="btn" onClick={() => dispatch({ type: "STEP5_FORCE" })} aria-pressed={s.step5Forced}>
              老师：先往下讲（记「未填完整」）
            </button>
          )}
        </div>
      )}

      {custom && (
        <div className="modal-backdrop" onPointerDown={(e) => e.target === e.currentTarget && setCustom(null)}>
          <div className="modal" role="dialog" aria-label="自定义填空">
            <h2>{custom === "length" ? "长方形的长 ≈ ？" : "长方形的宽 = ？"}</h2>
            <textarea
              className="custom-blank"
              value={draft}
              autoFocus
              placeholder="写下你的说法，如「周长的一半」"
              onChange={(e) => setDraft(e.target.value)}
            />
            <div className="actions">
              <button className="btn lg" onClick={() => setCustom(null)}>
                取消
              </button>
              <button
                className="btn lg primary"
                disabled={!draft.trim()}
                onClick={() => {
                  dispatch({ type: "SET_BLANK", field: custom, value: draft.trim() });
                  setDraft("");
                  setCustom(null);
                }}
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
