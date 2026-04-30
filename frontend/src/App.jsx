import { useState, useRef } from "react";
import { isTracesFile, parseTracesFromJsonl, diffTraces, traceLabel } from "./traces.js";
import { isMetricsFile, parseMetricsFromJsonl, diffMetrics, metricLabel } from "./metrics.js";
import { isLogsFile, parseLogsFromJsonl, diffLogs, logBatchLabel } from "./logs.js";
import SpanRow from "./SpanRow.jsx";
import MetricRow from "./MetricRow.jsx";
import LogRow from "./LogRow.jsx";
import "./App.css";

const TABS = [
  { key: "traces", label: "Traces", validate: isTracesFile, parse: parseTracesFromJsonl, labelFn: traceLabel, diff: diffTraces, itemKey: "trace" },
  { key: "metrics", label: "Metrics", validate: isMetricsFile, parse: parseMetricsFromJsonl, labelFn: metricLabel, diff: diffMetrics, itemKey: "metric" },
  { key: "logs", label: "Logs", validate: isLogsFile, parse: parseLogsFromJsonl, labelFn: logBatchLabel, diff: diffLogs, itemKey: "log" },
];

function Dash0Logo() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 105 20" height="20" width="105">
      <path fill="white" d="M7.04688 16.9685C5.17773 18.8328 2.64258 19.8799 0 19.8799V0C2.64258 0 5.17773 1.04736 7.04688 2.91138C8.91602 4.77539 9.96484 7.30371 9.96484 9.93994C9.96484 12.5762 8.91602 15.1045 7.04688 16.9685ZM38.6367 12.8672C38.6367 17.092 41.084 20 45.2383 20C46.916 20 48.4551 19.2593 49.2539 18.0522V19.7805H52.6094V0.027832H49.2539V7.6272C48.4551 6.50244 46.998 5.73413 45.1836 5.73413C41.084 5.73413 38.6367 8.64209 38.6367 12.8672ZM49.4727 12.8672C49.4727 15.4185 47.9883 17.092 45.7324 17.092C43.4766 17.092 41.9922 15.4185 41.9922 12.8672C41.9922 10.3157 43.4766 8.64209 45.7324 8.64209C47.9883 8.64209 49.4727 10.3157 49.4727 12.8672ZM59.2539 5.73413C62.7754 5.73413 65.25 7.7644 65.25 10.8918V15.1716H68.2051C68.3418 16.4885 69.3594 17.3115 70.8711 17.3115C71.5762 17.3115 72.1562 17.1238 72.543 16.8232C72.8809 16.5613 73.0723 16.2136 73.0723 15.8301C73.0723 14.5386 71.7305 14.3086 70.1758 14.042C68.0312 13.6741 65.4805 13.2366 65.4805 9.84937C65.4805 7.43506 67.5996 5.73413 70.459 5.73413C73.7051 5.73413 75.9316 7.51733 76.0703 10.2061H72.9902C72.7969 8.9165 71.6152 8.25806 70.541 8.25806C70.2051 8.25806 69.9004 8.30078 69.6348 8.38232C69.4102 8.45166 69.2148 8.54932 69.0527 8.67285C68.7207 8.92578 68.5332 9.2876 68.5332 9.7395C68.5332 10.9619 69.8203 11.1345 71.3418 11.3386C73.543 11.6338 76.2344 11.9949 76.2344 15.6929C76.2344 18.2991 74.1172 20 70.8711 20C67.8828 20 65.7891 18.5198 65.25 16.1023V19.7805H61.9219V17.7229C61.3457 19.0947 59.75 20 57.7695 20C55.0195 20 53.1484 18.2441 53.1484 15.8574C53.1484 13.1689 55.2402 11.4954 58.3477 11.4954H60.9043C61.5918 11.4954 61.9219 11.1113 61.9219 10.5625C61.9219 10.4824 61.918 10.4038 61.9102 10.3267C61.9043 10.2534 61.8945 10.1814 61.8809 10.1108C61.8574 9.99316 61.8262 9.87964 61.7852 9.77051L61.7676 9.72168L61.6816 9.5332L61.6484 9.47266L61.5762 9.35596C61.1328 8.67993 60.2754 8.25806 59.0898 8.25806C57.3027 8.25806 56.2285 9.38281 56.1738 10.6174H53.1484C53.3145 7.87402 55.6523 5.73413 59.2539 5.73413ZM58.5664 17.5034C60.6855 17.5034 61.9219 16.022 61.9219 13.937V13.7175H58.8145C58.0859 13.7175 57.4785 13.9243 57.0586 14.2869C56.6543 14.6355 56.4219 15.1284 56.4219 15.7202C56.4219 16.7903 57.3027 17.5034 58.5664 17.5034ZM76.5898 19.7805V0.027832H79.9453V8.09351C80.7148 6.58472 82.3105 5.73413 84.291 5.73413C87.3984 5.73413 89.4336 7.98389 89.4336 11.2209V19.7805H86.0781V11.9343C86.0781 10.0413 84.8965 8.72461 83.1621 8.72461C81.293 8.72461 79.9453 10.2061 79.9453 12.2361V19.7805H76.5898ZM89.9551 10.8369C89.9551 16.7078 92.1289 20 96.9141 20H98.0137C102.799 20 105 16.7078 105 10.8369V9.52002C105 3.64917 102.799 0.356934 98.0137 0.356934H96.9141C92.1289 0.356934 89.9551 3.64917 89.9551 9.52002V10.8369ZM97.8496 16.845H97.0781C94.9062 16.845 93.5859 15.1716 93.5859 11.7971V8.55981C93.5859 5.15796 94.9062 3.48462 97.0781 3.48462H97.8496C100.021 3.48462 101.369 5.15796 101.369 8.55981V11.7971C101.369 15.1716 100.021 16.845 97.8496 16.845ZM20.5 20C26.0234 20 30.5 15.5229 30.5 10C30.5 4.47705 26.0234 0 20.5 0C14.9766 0 10.5 4.47705 10.5 10C10.5 15.5229 14.9766 20 20.5 20Z" clipRule="evenodd" fillRule="evenodd" />
    </svg>
  );
}

function App() {
  const [activeTab, setActiveTab] = useState("traces");
  const [error, setError] = useState(null);

  // Per-tab state: { [tabKey]: { leftItems, rightItems, leftIdx, rightIdx, leftFileName, rightFileName } }
  const [tabState, setTabState] = useState(() => {
    const s = {};
    for (const tab of TABS) {
      s[tab.key] = { leftItems: [], rightItems: [], leftIdx: null, rightIdx: null, leftFileName: null, rightFileName: null };
    }
    return s;
  });

  const [forceExpand, setForceExpand] = useState(null);
  const [expandCounter, setExpandCounter] = useState(0);
  const leftFileRef = useRef(null);
  const rightFileRef = useRef(null);

  const tab = TABS.find((t) => t.key === activeTab);
  const ts = tabState[activeTab];

  function updateTabState(key, patch) {
    setTabState((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  }

  function loadFile(file, side) {
    if (!file) return;
    setError(null);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target.result;
      let lines;
      try {
        lines = text.split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l));
      } catch {
        setError("Invalid JSON in file");
        return;
      }

      if (!tab.validate(lines)) {
        setError(`This file does not contain ${tab.label.toLowerCase()} data. Expected ${tab.key === "traces" ? "resourceSpans" : tab.key === "metrics" ? "resourceMetrics" : "resourceLogs"} entries.`);
        return;
      }

      const parsed = tab.parse(lines);
      if (parsed.length === 0) {
        setError(`No ${tab.label.toLowerCase()} found in file`);
        return;
      }

      if (side === "left") {
        updateTabState(activeTab, { leftItems: parsed, leftIdx: 0, leftFileName: file.name });
      } else {
        updateTabState(activeTab, { rightItems: parsed, rightIdx: 0, rightFileName: file.name });
      }
    };
    reader.readAsText(file);
  }

  function handleSwap() {
    updateTabState(activeTab, {
      leftItems: ts.rightItems,
      rightItems: ts.leftItems,
      leftIdx: ts.rightIdx,
      rightIdx: ts.leftIdx,
      leftFileName: ts.rightFileName,
      rightFileName: ts.leftFileName,
    });
  }

  function handleReset() {
    updateTabState(activeTab, { leftItems: [], rightItems: [], leftIdx: null, rightIdx: null, leftFileName: null, rightFileName: null });
    setForceExpand(null);
    setError(null);
    if (leftFileRef.current) leftFileRef.current.value = "";
    if (rightFileRef.current) rightFileRef.current.value = "";
  }

  function handleExpandAll() {
    setForceExpand(true);
    setExpandCounter((c) => c + 1);
  }
  function handleCollapseAll() {
    setForceExpand(false);
    setExpandCounter((c) => c + 1);
  }

  const itemA = ts.leftIdx !== null ? ts.leftItems[ts.leftIdx] : null;
  const itemB = ts.rightIdx !== null ? ts.rightItems[ts.rightIdx] : null;
  const { left, right } = tab.diff(itemA, itemB);

  const hasFiles = ts.leftItems.length > 0 || ts.rightItems.length > 0;
  const hasDiff = itemA || itemB;

  function renderRow(entry, i, side) {
    if (activeTab === "traces") {
      return <SpanRow key={`${expandCounter}-${i}`} entry={entry} side={side} forceExpand={forceExpand} />;
    }
    if (activeTab === "metrics") {
      return <MetricRow key={`${expandCounter}-${i}`} entry={entry} side={side} forceExpand={forceExpand} />;
    }
    return <LogRow key={`${expandCounter}-${i}`} entry={entry} side={side} forceExpand={forceExpand} />;
  }

  function panelHeader(item) {
    if (!item) return "No selection";
    if (activeTab === "traces") return `${item.traceId.slice(0, 16)}...`;
    return `${item.serviceName} — ${activeTab === "metrics" ? item.metricCount + " metrics" : item.recordCount + " records"}`;
  }

  return (
    <div className="app">
      <div className="header">
        <div className="header-top">
          <div className="logo">
            <Dash0Logo />
            <span className="logo-divider" />
            <span className="logo-subtitle">OpenTelemetry Diff</span>
          </div>
        </div>

        <div className="tabs">
          {TABS.map((t) => (
            <button
              key={t.key}
              className={`tab ${activeTab === t.key ? "tab-active" : ""}`}
              onClick={() => { setActiveTab(t.key); setError(null); setForceExpand(null); }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="trace-selector">
          <div className="file-group">
            <span className="file-group-label">Left</span>
            <input
              ref={leftFileRef}
              type="file"
              accept=".jsonl,.json"
              onChange={(e) => loadFile(e.target.files[0], "left")}
              style={{ display: "none" }}
            />
            <button className="file-btn" onClick={() => { leftFileRef.current.value = ""; leftFileRef.current.click(); }}>
              {ts.leftFileName || "Load file..."}
            </button>
            {ts.leftItems.length > 0 && (
              <select
                value={ts.leftIdx ?? ""}
                onChange={(e) => updateTabState(activeTab, { leftIdx: e.target.value === "" ? null : Number(e.target.value) })}
              >
                <option value="">-- select --</option>
                {ts.leftItems.map((item, i) => (
                  <option key={i} value={i}>{tab.labelFn(item)}</option>
                ))}
              </select>
            )}
          </div>

          <div className="file-group">
            <span className="file-group-label">Right</span>
            <input
              ref={rightFileRef}
              type="file"
              accept=".jsonl,.json"
              onChange={(e) => loadFile(e.target.files[0], "right")}
              style={{ display: "none" }}
            />
            <button className="file-btn" onClick={() => { rightFileRef.current.value = ""; rightFileRef.current.click(); }}>
              {ts.rightFileName || "Load file..."}
            </button>
            {ts.rightItems.length > 0 && (
              <select
                value={ts.rightIdx ?? ""}
                onChange={(e) => updateTabState(activeTab, { rightIdx: e.target.value === "" ? null : Number(e.target.value) })}
              >
                <option value="">-- select --</option>
                {ts.rightItems.map((item, i) => (
                  <option key={i} value={i}>{tab.labelFn(item)}</option>
                ))}
              </select>
            )}
          </div>

          <div className="toolbar">
            {hasFiles && (
              <>
                <button className="toolbar-btn" onClick={handleSwap} title="Swap left and right">
                  <span className="btn-icon">&#8644;</span> Swap
                </button>
                <button className="toolbar-btn" onClick={handleExpandAll} title="Expand all">
                  <span className="btn-icon">&#9661;</span> Expand
                </button>
                <button className="toolbar-btn" onClick={handleCollapseAll} title="Collapse all">
                  <span className="btn-icon">&#9651;</span> Collapse
                </button>
                <button className="toolbar-btn" onClick={handleReset} title="Reset">
                  <span className="btn-icon">&#10005;</span> Reset
                </button>
              </>
            )}
          </div>

          <div className="legend">
            <span className="legend-item">
              <span className="legend-swatch added" />
              Added
            </span>
            <span className="legend-item">
              <span className="legend-swatch removed" />
              Removed
            </span>
            <span className="legend-item">
              <span className="legend-swatch changed" />
              Changed
            </span>
          </div>
        </div>

        {error && <div className="error-banner">{error}</div>}
      </div>

      {!hasFiles ? (
        <div className="empty-state">
          Load two {tab.label.toLowerCase()} files to get started
        </div>
      ) : !hasDiff ? (
        <div className="empty-state">Select an item from each file to compare</div>
      ) : (
        <div className="diff-container">
          <div className="diff-panel">
            <div className="diff-panel-header">{panelHeader(itemA)}</div>
            <div className="span-tree">
              {left.map((entry, i) => renderRow(entry, i, "left"))}
            </div>
          </div>
          <div className="diff-panel">
            <div className="diff-panel-header">{panelHeader(itemB)}</div>
            <div className="span-tree">
              {right.map((entry, i) => renderRow(entry, i, "right"))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
