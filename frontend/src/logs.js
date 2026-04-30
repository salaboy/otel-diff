import { flattenAttributes, diffAttributes } from "./traces.js";

// Validate that JSONL lines contain log data
export function isLogsFile(lines) {
  return lines.some((line) => Array.isArray(line.resourceLogs));
}

// Parse OTLP JSON logs into a list of log batches (one per JSONL line).
export function parseLogsFromJsonl(lines) {
  const batches = [];

  for (const line of lines) {
    if (!line.resourceLogs) continue;
    for (const rl of line.resourceLogs) {
      const resource = flattenAttributes(rl.resource?.attributes || []);
      const records = [];

      for (const sl of rl.scopeLogs || []) {
        const scopeName = sl.scope?.name || "";
        for (const lr of sl.logRecords || []) {
          records.push({
            timeUnixNano: lr.timeUnixNano || null,
            severityNumber: lr.severityNumber || 0,
            severityText: lr.severityText || "",
            body: extractBody(lr.body),
            attributes: flattenAttributes(lr.attributes || []),
            scopeName,
            traceId: lr.traceId || null,
            spanId: lr.spanId || null,
          });
        }
      }

      if (records.length > 0) {
        records.sort((a, b) => {
          if (!a.timeUnixNano || !b.timeUnixNano) return 0;
          return a.timeUnixNano < b.timeUnixNano ? -1 : a.timeUnixNano > b.timeUnixNano ? 1 : 0;
        });

        const ts = records[0].timeUnixNano;
        batches.push({
          id: `${resource["service.name"] || "unknown"}-${batches.length}`,
          serviceName: resource["service.name"] || "unknown",
          resource,
          records,
          recordCount: records.length,
          timestamp: ts,
        });
      }
    }
  }

  return batches;
}

function extractBody(body) {
  if (!body) return "";
  if (body.stringValue !== undefined) return body.stringValue;
  return JSON.stringify(body);
}

export function logBatchLabel(batch) {
  const time = batch.timestamp
    ? new Date(Number(BigInt(batch.timestamp) / 1000000n)).toLocaleTimeString()
    : "?";
  return `${batch.serviceName} (${batch.recordCount} records) @ ${time}`;
}

// Diff two log batches by matching records on body text
export function diffLogs(batchA, batchB) {
  if (!batchA && !batchB) return { left: [], right: [] };
  if (!batchA)
    return { left: [], right: batchB.records.map((r) => ({ record: r, diffType: "added", attrDiff: null })) };
  if (!batchB)
    return { left: batchA.records.map((r) => ({ record: r, diffType: "removed", attrDiff: null })), right: [] };

  const left = [];
  const right = [];
  const matchedB = new Set();

  for (const rA of batchA.records) {
    let matched = null;
    for (let i = 0; i < batchB.records.length; i++) {
      if (matchedB.has(i)) continue;
      if (batchB.records[i].body === rA.body) {
        matched = i;
        break;
      }
    }

    if (matched !== null) {
      matchedB.add(matched);
      const rB = batchB.records[matched];
      const aAttrs = logToAttrs(rA);
      const bAttrs = logToAttrs(rB);
      const attrDiff = diffAttributes(aAttrs, bAttrs);
      const hasChanges = attrDiff.changed.length > 0 || attrDiff.added.length > 0 || attrDiff.removed.length > 0;
      const diffType = hasChanges ? "changed" : "same";
      left.push({ record: rA, diffType, attrDiff });
      right.push({ record: rB, diffType, attrDiff });
    } else {
      left.push({ record: rA, diffType: "removed", attrDiff: null });
    }
  }

  for (let i = 0; i < batchB.records.length; i++) {
    if (!matchedB.has(i)) {
      right.push({ record: batchB.records[i], diffType: "added", attrDiff: null });
    }
  }

  return { left, right };
}

function logToAttrs(record) {
  const attrs = {
    severity: record.severityText || String(record.severityNumber),
    scope: record.scopeName,
    ...record.attributes,
  };
  if (record.traceId) attrs.traceId = record.traceId;
  if (record.spanId) attrs.spanId = record.spanId;
  return attrs;
}
