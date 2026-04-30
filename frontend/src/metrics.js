import { flattenAttributes, diffAttributes } from "./traces.js";

// Validate that JSONL lines contain metrics data
export function isMetricsFile(lines) {
  return lines.some((line) => Array.isArray(line.resourceMetrics));
}

// Parse OTLP JSON metrics into a list of metric snapshots (one per JSONL line).
export function parseMetricsFromJsonl(lines) {
  const snapshots = [];

  for (const line of lines) {
    if (!line.resourceMetrics) continue;
    for (const rm of line.resourceMetrics) {
      const resource = flattenAttributes(rm.resource?.attributes || []);
      const metrics = [];

      for (const sm of rm.scopeMetrics || []) {
        const scopeName = sm.scope?.name || "";
        for (const m of sm.metrics || []) {
          const dataPoints = extractDataPoints(m);
          metrics.push({
            name: m.name,
            description: m.description || "",
            unit: m.unit || "",
            type: getMetricType(m),
            scopeName,
            dataPoints,
          });
        }
      }

      if (metrics.length > 0) {
        // Use first datapoint timestamp if available
        let ts = null;
        for (const m of metrics) {
          if (m.dataPoints.length > 0 && m.dataPoints[0].timeUnixNano) {
            ts = m.dataPoints[0].timeUnixNano;
            break;
          }
        }
        snapshots.push({
          id: `${resource["service.name"] || "unknown"}-${snapshots.length}`,
          serviceName: resource["service.name"] || "unknown",
          resource,
          metrics: metrics.sort((a, b) => a.name.localeCompare(b.name)),
          metricCount: metrics.length,
          timestamp: ts,
        });
      }
    }
  }

  return snapshots;
}

function getMetricType(m) {
  if (m.gauge) return "gauge";
  if (m.sum) return "sum";
  if (m.histogram) return "histogram";
  if (m.summary) return "summary";
  return "unknown";
}

function extractDataPoints(m) {
  const raw = m.gauge?.dataPoints || m.sum?.dataPoints || m.histogram?.dataPoints || m.summary?.dataPoints || [];
  return raw.map((dp) => ({
    attributes: flattenAttributes(dp.attributes || []),
    timeUnixNano: dp.timeUnixNano || null,
    value: dp.asDouble ?? dp.asInt ?? dp.count ?? null,
    bucketCounts: dp.bucketCounts || null,
    explicitBounds: dp.explicitBounds || null,
  }));
}

export function metricLabel(snapshot) {
  const time = snapshot.timestamp
    ? new Date(Number(BigInt(snapshot.timestamp) / 1000000n)).toLocaleTimeString()
    : "?";
  return `${snapshot.serviceName} (${snapshot.metricCount} metrics) @ ${time}`;
}

// Diff two metric snapshots
export function diffMetrics(snapA, snapB) {
  if (!snapA && !snapB) return { left: [], right: [] };
  if (!snapA)
    return { left: [], right: snapB.metrics.map((m) => ({ metric: m, diffType: "added", attrDiff: null })) };
  if (!snapB)
    return { left: snapA.metrics.map((m) => ({ metric: m, diffType: "removed", attrDiff: null })), right: [] };

  const left = [];
  const right = [];
  const matchedB = new Set();

  for (const mA of snapA.metrics) {
    let matched = null;
    for (let i = 0; i < snapB.metrics.length; i++) {
      if (matchedB.has(i)) continue;
      if (snapB.metrics[i].name === mA.name) {
        matched = i;
        break;
      }
    }

    if (matched !== null) {
      matchedB.add(matched);
      const mB = snapB.metrics[matched];
      const aAttrs = metricToAttrs(mA);
      const bAttrs = metricToAttrs(mB);
      const attrDiff = diffAttributes(aAttrs, bAttrs);
      const hasChanges = attrDiff.changed.length > 0 || attrDiff.added.length > 0 || attrDiff.removed.length > 0;
      const diffType = hasChanges ? "changed" : "same";
      left.push({ metric: mA, diffType, attrDiff });
      right.push({ metric: mB, diffType, attrDiff });
    } else {
      left.push({ metric: mA, diffType: "removed", attrDiff: null });
    }
  }

  for (let i = 0; i < snapB.metrics.length; i++) {
    if (!matchedB.has(i)) {
      right.push({ metric: snapB.metrics[i], diffType: "added", attrDiff: null });
    }
  }

  return { left, right };
}

// Flatten metric info into a key-value map for diffing
function metricToAttrs(m) {
  const attrs = {
    type: m.type,
    unit: m.unit,
    description: m.description,
  };
  for (let i = 0; i < m.dataPoints.length; i++) {
    const dp = m.dataPoints[i];
    const prefix = m.dataPoints.length === 1 ? "" : `[${i}].`;
    if (dp.value !== null) attrs[`${prefix}value`] = String(dp.value);
    for (const [k, v] of Object.entries(dp.attributes)) {
      attrs[`${prefix}attr.${k}`] = String(v);
    }
  }
  return attrs;
}
