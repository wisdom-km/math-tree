import { useState, type Dispatch } from "react";
import { discoveryFilled, patternOk } from "../model/derived";
import { BECAUSE_CHIPS, checkPattern, FIND_CHIPS, PATTERN_CHIPS } from "../model/pattern";
import type { Action } from "../model/reducer";
import type { State } from "../model/types";
import { OnScreenKeypad } from "./OnScreenKeypad";

interface Props {
  state: State;
  dispatch: Dispatch<Action>;
  interactive: boolean;
}

/** 步骤 5 填空卡：「周长大约是直径的 ___ 倍」+「我发现 ______，因为 ______。」 */
export function PatternFillIn({ state, dispatch, interactive }: Props) {
  const s = state;
  const [custom, setCustom] = useState(false);
  const check = s.patternBlank ? checkPattern(s.patternBlank) : null;
  const ok = patternOk(s);
  const filled = discoveryFilled(s);

  const append = (field: "find" | "because", text: string) => {
    const cur = s.discoveryText[field];
    dispatch({ type: "SET_DISCOVERY", field, value: cur ? `${cur}，${text}` : text });
  };

  return (
    <div className="fill-card" aria-label="找规律">
      <div className="sentence">
        周长大约是直径的
        <button className={`blank ${s.patternBlank ? "" : "empty"}`} disabled={!interactive} onClick={() => setCustom(true)}>
          {s.patternBlank ?? "___"}
        </button>
        倍
      </div>
      {interactive && (
        <div className="chips">
          {PATTERN_CHIPS.map((c) => (
            <button key={c} className="btn" aria-pressed={s.patternBlank === c} onClick={() => dispatch({ type: "SET_PATTERN_BLANK", value: c })}>
              {c}
            </button>
          ))}
          <button className="btn" onClick={() => setCustom(true)}>
            自定义…
          </button>
        </div>
      )}

      {check && !check.ok && check.contrast && (
        <p className="hint">看看地面：{check.contrast} × d 的虚线和滚一圈量得的那段，对得上吗？再看看表里的比值。</p>
      )}
      {check && !check.ok && !check.contrast && <p className="hint">再对照数据表的「周长÷直径」看看。</p>}
      {ok && <p className="hint ok">可以揭示名称了</p>}

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
            disabled={!s.patternBlank || !filled}
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
        <OnScreenKeypad
          title="周长大约是直径的几倍？"
          unit="倍"
          min={0.1}
          max={99}
          decimals={4}
          onCancel={() => setCustom(false)}
          onConfirm={(v) => {
            dispatch({ type: "SET_PATTERN_BLANK", value: String(v) });
            setCustom(false);
          }}
        />
      )}
    </div>
  );
}
