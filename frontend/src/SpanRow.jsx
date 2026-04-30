import { useState, useEffect } from "react";

export default function SpanRow({ entry, side, forceExpand }) {
  const [expanded, setExpanded] = useState(false);
  const { span, depth, diffType, attrDiff } = entry;

  useEffect(() => {
    if (forceExpand === true) setExpanded(true);
    if (forceExpand === false) setExpanded(false);
  }, [forceExpand]);

  const indent = depth * 20;
  const attrs = span.attributes;
  const attrKeys = Object.keys(attrs);

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
        <span className="span-indent" style={{ width: indent }} />
        <span className="span-toggle">{expanded ? "▼" : "▶"}</span>
        <div className="span-info">
          <div className="span-name">{span.name}</div>
          <div className="span-meta">
            {span.kind} · {span.scopeName}
          </div>
        </div>
        <span className="span-duration">{span.durationMs}ms</span>
      </div>
      {expanded && (
        <div className="span-attrs" style={{ paddingLeft: indent + 40 }}>
          {attrDiff
            ? renderDiffAttrs(attrDiff, side)
            : attrKeys.map((key) => (
                <div className="attr-row" key={key}>
                  <span className="attr-key">{key}:</span>
                  <span className="attr-value">{String(attrs[key])}</span>
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
