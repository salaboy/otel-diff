import { useState, useEffect } from "react";

export default function MetricRow({ entry, side, forceExpand }) {
  const [expanded, setExpanded] = useState(false);
  const { metric, diffType, attrDiff } = entry;

  useEffect(() => {
    if (forceExpand === true) setExpanded(true);
    if (forceExpand === false) setExpanded(false);
  }, [forceExpand]);

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
          <div className="span-name">{metric.name}</div>
          <div className="span-meta">
            {metric.type} · {metric.unit || "unitless"} · {metric.scopeName || "default"}
          </div>
        </div>
        <span className="span-duration">{metric.dataPoints.length} pts</span>
      </div>
      {expanded && (
        <div className="span-attrs" style={{ paddingLeft: 40 }}>
          <div className="attr-row">
            <span className="attr-key">description:</span>
            <span className="attr-value">{metric.description || "—"}</span>
          </div>
          {attrDiff
            ? renderDiffAttrs(attrDiff, side)
            : metric.dataPoints.map((dp, i) => (
                <div key={i}>
                  {dp.value !== null && (
                    <div className="attr-row">
                      <span className="attr-key">{metric.dataPoints.length > 1 ? `[${i}].value` : "value"}:</span>
                      <span className="attr-value">{String(dp.value)}</span>
                    </div>
                  )}
                  {Object.entries(dp.attributes).map(([k, v]) => (
                    <div className="attr-row" key={`${i}-${k}`}>
                      <span className="attr-key">{metric.dataPoints.length > 1 ? `[${i}].${k}` : k}:</span>
                      <span className="attr-value">{String(v)}</span>
                    </div>
                  ))}
                </div>
              ))}
        </div>
      )}
    </div>
  );
}

function renderDiffAttrs(attrDiff, side) {
  const rows = [];

  for (const { key, value } of attrDiff.same) {
    if (key === "description") continue;
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

  return rows.length > 0 ? rows : <div className="attr-row"><span className="attr-key">no data points</span></div>;
}
