"""Helpers para views — envelope estándar y handlers genéricos."""
from rest_framework import status
from rest_framework.response import Response

from .cypher_build import (
    build_filter_clause,
    build_remove_clause,
    build_set_clause,
)
from .db import run_write


def envelope(result, cypher):
    """`{columns, rows, stats, meta:{cypher}}`."""
    return {**result, 'meta': {'cypher': cypher.strip()}}


def patch_props(label, alias, id_field, id_value, set_dict, remove_list):
    set_cl = build_set_clause(set_dict, alias=alias)
    rem_cl = build_remove_clause(remove_list, alias=alias)
    if not set_cl and not rem_cl:
        return None, None
    cypher = (
        f"MATCH ({alias}:{label} {{{id_field}: ${id_field}}}) "
        f"{set_cl} {rem_cl} RETURN {alias}"
    )
    params = {id_field: id_value, 'set': set_dict}
    result = run_write(cypher, params)
    return result, cypher


def patch_bulk(label, alias, filter_dict, set_dict, remove_list):
    set_cl = build_set_clause(set_dict, alias=alias)
    rem_cl = build_remove_clause(remove_list, alias=alias)
    if not set_cl and not rem_cl:
        return None, None
    where_cl = build_filter_clause(filter_dict, alias=alias, param_name='filter')
    cypher = f"MATCH ({alias}:{label}) {where_cl} {set_cl} {rem_cl} RETURN {alias}"
    result = run_write(cypher, {'set': set_dict, 'filter': filter_dict})
    return result, cypher


def empty_update_response():
    return Response({'detail': 'Nada que actualizar'}, status=status.HTTP_400_BAD_REQUEST)
