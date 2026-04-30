import { useState, useEffect } from "react";

export default function LogRow({ entry, side, forceExpand }) {
  const [expanded, setExpanded] = useState(false);
  const { record, diffType, attrDiff } = entry;

  useEffect(() => {
    if (forceExpand === true) setExpanded(true);
    if (forceExpand === false) setExpanded(false);
  }, [forceExpand]);

  const time = record.timeUnixNano
    ? new Date(Number(BigInt(record.timeUnixNano) / 1000000n)).toLocaleTimeString()
    : "?";

  return (
    <div className={`span-node diff-${diffType}`}>
      <div
        className="span-row"
        onClick={() => setExpanded(!expanded)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") setExpanded(!expanded);
        }}
      >
        <span className="span-toggle">{expanded ? "▼" : "▶"}</span>
        <div className="span-info">
          <div className="span-name">{record.body || "—"}</div>
          <div className="span-meta">
            <span className={`severity severity-${record.severityText.toLowerCase()}`}>
              {record.severityText || record.severityNumber}
            </span>
            {" · "}{record.scopeName || "default"}
          </div>
        </div>
        <span className="span-duration">{time}</span>
      </div>
      {expanded && (
        <div className="span-attrs" style={{ paddingLeft: 40 }}>
          {attrDiff
            ? renderDiffAttrs(attrDiff, side)
            : renderPlainAttrs(record)}
        </div>
      )}
    </div>
  );
}

function renderPlainAttrs(record) {
  const rows = [];
  rows.push(
    <div className="attr-row" key="severity">
      <span className="attr-key">severity:</span>
      <span className="attr-value">{record.severityText || record.severityNumber}</span>
    </div>
  );
  if (record.traceId) {
    rows.push(
      <div className="attr-row" key="traceId">
        <span className="attr-key">traceId:</span>
        <span className="attr-value">{record.traceId}</span>
      </div>
    );
  }
  if (record.spanId) {
    rows.push(
      <div className="attr-row" key="spanId">
        <span className="attr-key">spanId:</span>
        <span className="attr-value">{record.spanId}</span>
      </div>
    );
  }
  for (const [k, v] of Object.entries(record.attributes)) {
    rows.push(
      <div className="attr-row" key={k}>
        <span className="attr-key">{k}:</span>
        <span className="attr-value">{String(v)}</span>
      </div>
    );
  }
  return rows.length > 0 ? rows : <div className="attr-row"><span className="attr-key">no attributes</span></div>;
}

function renderDiffAttrs(attrDiff, side) {
  const rows = [];

  for (const { key, value } of attrDiff.same) {
    rows.push(
      <div className="attr-row" key={key}>
        <span className="attr-key">{key}:</span>
        <span className="attr-value">{String(value)}</span>
      </div>
    );
  }

  for (const { key, valueA, valueB } of attrDiff.changed) {
    rows.push(
      <div className="attr-row" key={key}>
        <span className="attr-key">{key}:</span>
        <span className="attr-value attr-diff-changed">
          {side === "left" ? String(valueA) : String(valueB)}
        </span>
      </div>
    );
  }

  if (side === "left") {
    for (const { key, value } of attrDiff.removed) {
      rows.push(
        <div className="attr-row" key={key}>
          <span className="attr-key">{key}:</span>
          <span className="attr-value attr-diff-removed">{String(value)}</span>
        </div>
      );
    }
  } else {
    for (const { key, value } of attrDiff.added) {
      rows.push(
        <div className="attr-row" key={key}>
          <span className="attr-key">{key}:</span>
          <span className="attr-value attr-diff-added">{String(value)}</span>
        </div>
      );
    }
  }

  return rows.length > 0 ? rows : <div className="attr-row"><span className="attr-key">no attributes</span></div>;
}
