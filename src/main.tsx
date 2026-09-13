import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { loadContent } from "./content/loader";
import "./styles/global.css";

// 内容层在启动时整体校验；任何一处不合法直接报错，避免带着坏数据进课堂。
try {
  const content = loadContent();
  for (const w of content.warnings) console.warn("[content]", w);
} catch (e) {
  document.getElementById("root")!.innerHTML = `<pre style="padding:2rem;white-space:pre-wrap;color:#b42318">${
    (e as Error).message
  }</pre>`;
  throw e;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
