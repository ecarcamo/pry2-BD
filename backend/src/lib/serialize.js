'use strict';
const neo4j = require('neo4j-driver');

function toPlain(value) {
  if (value === null || value === undefined) return value;
  if (neo4j.isInt(value)) return value.toNumber();
  if (value instanceof neo4j.types.Node) {
    return {
      elementId: value.elementId,
      labels: value.labels,
      props: toPlain(value.properties),
    };
  }
  if (value instanceof neo4j.types.Relationship) {
    return {
      elementId: value.elementId,
      type: value.type,
      from: value.startNodeElementId,
      to: value.endNodeElementId,
      props: toPlain(value.properties),
    };
  }
  if (value instanceof neo4j.types.Path) {
    return {
      segments: value.segments.map(s => ({
        start: toPlain(s.start),
        rel: toPlain(s.relationship),
        end: toPlain(s.end),
      })),
    };
  }
  if (Array.isArray(value)) return value.map(toPlain);
  if (typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = toPlain(v);
    return out;
  }
  return value;
}

function recordsToRows(records, summary) {
  if (!records || records.length === 0) {
    return { columns: [], rows: [], stats: extractStats(summary) };
  }
  const columns = records[0].keys;
  const rows = records.map(r => columns.map(k => toPlain(r.get(k))));
  return { columns, rows, stats: extractStats(summary) };
}

function extractStats(summary) {
  if (!summary || !summary.counters) return {};
  const raw = summary.counters._stats || {};
  return {
    nodesCreated:  raw.nodesCreated || 0,
    nodesDeleted:  raw.nodesDeleted || 0,
    relsCreated:   raw.relationshipsCreated || 0,
    relsDeleted:   raw.relationshipsDeleted || 0,
    labelsAdded:   raw.labelsAdded || 0,
    labelsRemoved: raw.labelsRemoved || 0,
    propsSet:      raw.propertiesSet || 0,
  };
}

module.exports = { toPlain, recordsToRows, extractStats };
