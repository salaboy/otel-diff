// Validate that JSONL lines contain trace data
export function isTracesFile(lines) {
  return lines.some((line) => Array.isArray(line.resourceSpans));
}

// Parse OTLP JSON traces into a flat list of normalized traces,
// each containing a tree of spans.

export function parseTracesFromJsonl(lines) {
  const spansById = new Map(); // traceId -> Map<spanId, span>

  for (const line of lines) {
    if (!line.resourceSpans) continue;
    for (const rs of line.resourceSpans) {
      const resource = flattenAttributes(rs.resource?.attributes || []);
      for (const ss of rs.scopeSpans || []) {
        const scopeName = ss.scope?.name || "";
        for (const span of ss.spans || []) {
          const traceId = span.traceId;
          if (!spansById.has(traceId)) spansById.set(traceId, new Map());
          const normalized = {
            traceId,
            spanId: span.spanId,
            parentSpanId: span.parentSpanId || null,
            name: span.name,
            kind: spanKindLabel(span.kind),
            startTimeNano: BigInt(span.startTimeUnixNano),
            endTimeNano: BigInt(span.endTimeUnixNano),
            attributes: flattenAttributes(span.attributes || []),
            resource,
            scopeName,
            status: span.status || {},
            children: [],
          };
          normalized.durationMs = Number(
            (normalized.endTimeNano - normalized.startTimeNano) / 1000000n
          );
          spansById.get(traceId).set(span.spanId, normalized);
        }
      }
    }
  }

  const traces = [];
  for (const [traceId, spans] of spansById) {
    // Build tree
    let root = null;
    for (const span of spans.values()) {
      if (span.parentSpanId && spans.has(span.parentSpanId)) {
        spans.get(span.parentSpanId).children.push(span);
      } else {
        root = span;
      }
    }
    // Sort children by start time
    const sortChildren = (node) => {
      node.children.sort((a, b) =>
        a.startTimeNano < b.startTimeNano
          ? -1
          : a.startTimeNano > b.startTimeNano
            ? 1
            : 0
      );
      node.children.forEach(sortChildren);
    };
    if (root) {
      sortChildren(root);
      traces.push({
        traceId,
        root,
        spanCount: spans.size,
        serviceName: root.resource["service.name"] || "unknown",
        rootName: root.name,
        durationMs: root.durationMs,
        startTimeNano: root.startTimeNano,
      });
    }
  }

  traces.sort((a, b) =>
    a.startTimeNano < b.startTimeNano
      ? -1
      : a.startTimeNano > b.startTimeNano
        ? 1
        : 0
  );
  return traces;
}

export function flattenAttributes(attrs) {
  const result = {};
  for (const attr of attrs) {
    const val = attr.value;
    if (val.stringValue !== undefined) result[attr.key] = val.stringValue;
    else if (val.intValue !== undefined) result[attr.key] = val.intValue;
    else if (val.doubleValue !== undefined) result[attr.key] = val.doubleValue;
    else if (val.boolValue !== undefined)
      result[attr.key] = String(val.boolValue);
    else result[attr.key] = JSON.stringify(val);
  }
  return result;
}

function spanKindLabel(kind) {
  switch (kind) {
    case 1:
      return "INTERNAL";
    case 2:
      return "SERVER";
    case 3:
      return "CLIENT";
    case 4:
      return "PRODUCER";
    case 5:
      return "CONSUMER";
    default:
      return "UNSPECIFIED";
  }
}

// Diff two span trees. Returns a flat list of { span, depth, diffType }
// for each side. diffType: "same" | "added" | "removed" | "changed"

export function diffTraces(traceA, traceB) {
  if (!traceA && !traceB) return { left: [], right: [] };
  if (!traceA)
    return { left: [], right: flattenTree(traceB.root, 0, "added") };
  if (!traceB)
    return { left: flattenTree(traceA.root, 0, "removed"), right: [] };

  const left = [];
  const right = [];
  diffNode(traceA.root, traceB.root, 0, left, right);
  return { left, right };
}

function diffNode(spanA, spanB, depth, left, right) {
  if (!spanA && !spanB) return;

  if (!spanA) {
    right.push(...flattenTree(spanB, depth, "added"));
    return;
  }
  if (!spanB) {
    left.push(...flattenTree(spanA, depth, "removed"));
    return;
  }

  const attrDiff = diffAttributes(spanA.attributes, spanB.attributes);
  const nameChanged = spanA.name !== spanB.name;
  const kindChanged = spanA.kind !== spanB.kind;
  const hasChanges =
    nameChanged || kindChanged || attrDiff.changed.length > 0 ||
    attrDiff.added.length > 0 || attrDiff.removed.length > 0;

  const diffType = hasChanges ? "changed" : "same";
  left.push({ span: spanA, depth, diffType, attrDiff: attrDiff, side: "left" });
  right.push({ span: spanB, depth, diffType, attrDiff: attrDiff, side: "right" });

  // Match children by name
  const matchedB = new Set();
  const pairs = [];

  for (const childA of spanA.children) {
    let bestMatch = null;
    for (let i = 0; i < spanB.children.length; i++) {
      if (matchedB.has(i)) continue;
      if (spanB.children[i].name === childA.name) {
        bestMatch = i;
        break;
      }
    }
    if (bestMatch !== null) {
      matchedB.add(bestMatch);
      pairs.push([childA, spanB.children[bestMatch]]);
    } else {
      pairs.push([childA, null]);
    }
  }
  for (let i = 0; i < spanB.children.length; i++) {
    if (!matchedB.has(i)) {
      pairs.push([null, spanB.children[i]]);
    }
  }

  for (const [cA, cB] of pairs) {
    diffNode(cA, cB, depth + 1, left, right);
  }
}

function flattenTree(span, depth, diffType) {
  const result = [{ span, depth, diffType, attrDiff: null, side: null }];
  for (const child of span.children) {
    result.push(...flattenTree(child, depth + 1, diffType));
  }
  return result;
}

export function diffAttributes(attrsA, attrsB) {
  const allKeys = new Set([...Object.keys(attrsA), ...Object.keys(attrsB)]);
  const added = [];
  const removed = [];
  const changed = [];
  const same = [];

  for (const key of allKeys) {
    const inA = key in attrsA;
    const inB = key in attrsB;
    if (inA && !inB) removed.push({ key, value: attrsA[key] });
    else if (!inA && inB) added.push({ key, value: attrsB[key] });
    else if (String(attrsA[key]) !== String(attrsB[key]))
      changed.push({ key, valueA: attrsA[key], valueB: attrsB[key] });
    else same.push({ key, value: attrsA[key] });
  }

  return { added, removed, changed, same };
}

export function traceLabel(trace) {
  const time = new Date(
    Number(trace.startTimeNano / 1000000n)
  ).toLocaleTimeString();
  return `${trace.rootName} — ${trace.serviceName} (${trace.spanCount} spans, ${trace.durationMs}ms) @ ${time}`;
}
