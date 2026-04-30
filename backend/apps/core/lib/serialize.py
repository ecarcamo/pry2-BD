"""Serializa tipos del driver Neo4j a dicts JSON-friendly.

Espeja la versión Node `backend/src/lib/serialize.js`:
  - Integer  -> int
  - Node     -> {elementId, labels, props}
  - Relationship -> {elementId, type, from, to, props}
  - Path     -> {segments}
"""
from datetime import date, datetime, time

from neo4j.graph import Node, Path, Relationship
from neo4j.time import Date as Neo4jDate
from neo4j.time import DateTime as Neo4jDateTime
from neo4j.time import Time as Neo4jTime


def to_plain(value):
    if value is None:
        return None
    if isinstance(value, Node):
        return {
            'elementId': value.element_id,
            'labels': list(value.labels),
            'props': to_plain(dict(value)),
        }
    if isinstance(value, Relationship):
        return {
            'elementId': value.element_id,
            'type': value.type,
            'from': value.start_node.element_id if value.start_node else None,
            'to': value.end_node.element_id if value.end_node else None,
            'props': to_plain(dict(value)),
        }
    if isinstance(value, Path):
        return {
            'segments': [
                {
                    'start': to_plain(seg.start_node),
                    'rel': to_plain(seg.relationship),
                    'end': to_plain(seg.end_node),
                }
                for seg in value
            ]
        }
    if isinstance(value, (Neo4jDate, Neo4jDateTime, Neo4jTime)):
        return value.iso_format()
    if isinstance(value, (date, datetime, time)):
        return value.isoformat()
    if isinstance(value, dict):
        return {k: to_plain(v) for k, v in value.items()}
    if isinstance(value, (list, tuple, set)):
        return [to_plain(v) for v in value]
    return value


def records_to_rows(records, summary=None):
    if not records:
        return {'columns': [], 'rows': [], 'stats': extract_stats(summary)}
    columns = list(records[0].keys())
    rows = [[to_plain(rec[c]) for c in columns] for rec in records]
    return {'columns': columns, 'rows': rows, 'stats': extract_stats(summary)}


def extract_stats(summary):
    if summary is None:
        return {}
    counters = getattr(summary, 'counters', None)
    if counters is None:
        return {}
    return {
        'nodesCreated': getattr(counters, 'nodes_created', 0) or 0,
        'nodesDeleted': getattr(counters, 'nodes_deleted', 0) or 0,
        'relsCreated': getattr(counters, 'relationships_created', 0) or 0,
        'relsDeleted': getattr(counters, 'relationships_deleted', 0) or 0,
        'labelsAdded': getattr(counters, 'labels_added', 0) or 0,
        'labelsRemoved': getattr(counters, 'labels_removed', 0) or 0,
        'propsSet': getattr(counters, 'properties_set', 0) or 0,
    }
