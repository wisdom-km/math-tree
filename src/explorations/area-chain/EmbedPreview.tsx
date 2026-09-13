import { href } from "@/app/router";
import { ChainStation } from "./ChainStation";
import { SHAPE_STATIONS, STATION_TITLE, type ShapeStationId, type StationId } from "./model/types";

function parseEmbed(raw: string | null): ShapeStationId | "recall" {
  if (!raw || raw === "1" || raw === "recall") return "recall";
  if ((SHAPE_STATIONS as readonly string[]).includes(raw)) return raw as ShapeStationId;
  return "recall";
}

/**
 * 本 PR 的嵌入模式自检入口（圆的面积探究单尚未实现，无法真嵌进步骤 0）。
 * `#/explore/exp-chain-area?embed=1`：并排第 1 站 + 第 3 站（模拟圆面积回忆）。
 * `?embed=para` 等：单站。
 */
export function EmbedPreview({ embed }: { embed: string | null }) {
  const mode = parseEmbed(embed);
  const stations: ShapeStationId[] = mode === "recall" ? ["rect", "tri"] : [mode];
  return (
    <div className="chain-embed-preview">
      <header className="chain-topbar">
        <a className="btn" href={href("/explore/exp-chain-area", { station: "rect", play: "1" })}>
          ← 独立模式
        </a>
        <span className="title">嵌入模式自检</span>
        <span className="station-name">
          {mode === "recall" ? "模拟圆面积步骤 0：长方形 + 三角形并排" : `ChainStation · ${STATION_TITLE[mode]}`}
        </span>
        <span className="spacer" />
        {SHAPE_STATIONS.map((k) => (
          <a key={k} className="btn" href={href("/explore/exp-chain-area", { embed: k })} aria-current={mode === k ? "page" : undefined}>
            {STATION_TITLE[k]}
          </a>
        ))}
        <a className="btn" href={href("/explore/exp-chain-area", { embed: "1" })} aria-current={mode === "recall" ? "page" : undefined}>
          并排回忆
        </a>
      </header>
      <div className={`chain-embed-slots ${stations.length > 1 ? "pair" : "single"}`}>
        {stations.map((k) => (
          <div key={k} className="chain-embed-slot">
            <div className="chain-embed-slot-title">{STATION_TITLE[k]} · 只可重置本站</div>
            <ChainStation
              station={k}
              prompt={k === "rect" ? "长方形的面积 = ____ × ____" : k === "tri" ? "三角形的面积 = 底 × 高 ____" : undefined}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export function parseStationParam(v: string | null): StationId {
  return v && (["rect", "para", "tri", "trap", "circle"] as const).includes(v as StationId) ? (v as StationId) : "rect";
}
