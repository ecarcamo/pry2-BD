"""Builders seguros para componer Cypher con identificadores dinámicos."""
import re

ID_RE = re.compile(r'^[A-Za-z_][A-Za-z0-9_]*$')
ALLOWED_OPS = {'=', '<>', '<', '<=', '>', '>=', 'CONTAINS', 'STARTS WITH', 'IN'}


def safe_label(value):
    if not isinstance(value, str) or not ID_RE.match(value):
        raise ValueError(f"Label inválido: {value!r}")
    return value


def safe_rel_type(value):
    if not isinstance(value, str) or not ID_RE.match(value):
        raise ValueError(f"Tipo de relación inválido: {value!r}")
    return value


def safe_prop(value):
    if not isinstance(value, str) or not ID_RE.match(value):
        raise ValueError(f"Propiedad inválida: {value!r}")
    return value


def build_set_clause(set_dict, alias='n'):
    if not set_dict:
        return ''
    parts = [f"{alias}.{safe_prop(k)} = $set.{k}" for k in set_dict.keys()]
    return 'SET ' + ', '.join(parts)


def build_remove_clause(remove_list, alias='n'):
    if not remove_list:
        return ''
    return 'REMOVE ' + ', '.join(f"{alias}.{safe_prop(k)}" for k in remove_list)


def build_where_clause(where_list, param_alias='w', node_alias='n'):
    """`where_list` = [{prop, op, value}, ...] -> (clause, params)."""
    if not where_list:
        return '', {}
    parts, params = [], {}
    for i, cond in enumerate(where_list):
        op = (cond.get('op') or '=').upper()
        if op not in ALLOWED_OPS:
            raise ValueError(f"Operador no permitido: {cond.get('op')}")
        key = f"{param_alias}_{i}"
        parts.append(f"{node_alias}.{safe_prop(cond['prop'])} {op} ${key}")
        params[key] = cond.get('value')
    return 'WHERE ' + ' AND '.join(parts), params


def build_filter_clause(filter_dict, alias='n', param_name='filter'):
    """`{k: v}` literal -> 'WHERE n.k = $filter.k AND ...'."""
    if not filter_dict:
        return ''
    parts = [f"{alias}.{safe_prop(k)} = ${param_name}.{k}" for k in filter_dict.keys()]
    return 'WHERE ' + ' AND '.join(parts)
