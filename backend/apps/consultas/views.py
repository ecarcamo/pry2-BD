"""Consultas y agregaciones — 6 presets fijos + agregación genérica.

Mapean uno-a-uno con [frontend/operations.js] PRESET_QUERIES.
"""
import re

from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from apps.core.lib.db import run_read

ALLOWED_AGGS = {'count', 'avg', 'sum', 'min', 'max'}
SAFE_ID = re.compile(r'^[A-Za-z_][A-Za-z0-9_]*$')


def _envelope(result, cypher):
    return {**result, 'meta': {'cypher': cypher.strip()}}


@api_view(['GET'])
def usuarios_top_conexiones(request):
    try:
        limit = max(1, min(50, int(request.query_params.get('limit', 5))))
    except (TypeError, ValueError):
        limit = 5
    cypher = (
        "MATCH (u:Usuario) "
        "RETURN u.nombre AS usuario, u.titular AS titular, u.conexiones_count AS conexiones "
        f"ORDER BY conexiones DESC LIMIT {limit}"
    )
    return Response(_envelope(run_read(cypher), cypher))


@api_view(['GET'])
def empresas_seguidas(_request):
    cypher = (
        "MATCH (u:Usuario)-[s:SIGUE_A]->(e:Empresa) "
        "RETURN e.nombre AS empresa, e.industria AS industria, count(u) AS seguidores "
        "ORDER BY seguidores DESC"
    )
    return Response(_envelope(run_read(cypher), cypher))


@api_view(['GET'])
def empleos_activos(_request):
    cypher = (
        "MATCH (emp:Empresa)-[o:OFERTA]->(j:Empleo) "
        "WHERE j.activo = true "
        "RETURN emp.nombre AS empresa, j.titulo AS puesto, j.modalidad AS modalidad, "
        "j.salario_min AS min, j.salario_max AS max "
        "ORDER BY max DESC"
    )
    return Response(_envelope(run_read(cypher), cypher))


@api_view(['GET'])
def publicaciones_stats(_request):
    cypher = (
        "MATCH (p:Publicacion) "
        "RETURN avg(p.likes_count) AS promedio_likes, max(p.likes_count) AS max_likes, "
        "count(p) AS total_publicaciones"
    )
    return Response(_envelope(run_read(cypher), cypher))


@api_view(['GET'])
def postulaciones_por_estado(_request):
    cypher = (
        "MATCH (u:Usuario)-[r:POSTULO_A]->(j:Empleo) "
        "RETURN r.estado AS estado, count(*) AS cantidad, collect(u.nombre) AS candidatos "
        "ORDER BY cantidad DESC"
    )
    return Response(_envelope(run_read(cypher), cypher))


@api_view(['GET'])
def autoria_publicaciones(_request):
    cypher = (
        "MATCH (u:Usuario)-[:PUBLICO]->(p:Publicacion) "
        "RETURN u.nombre AS autor, p.contenido AS publicacion, "
        "p.likes_count AS likes, p.tags AS tags "
        "ORDER BY likes DESC"
    )
    return Response(_envelope(run_read(cypher), cypher))


@api_view(['GET'])
def conteo_por_label(_request):
    cypher = "MATCH (n) RETURN labels(n) AS etiquetas, count(*) AS total ORDER BY total DESC"
    return Response(_envelope(run_read(cypher), cypher))


@api_view(['POST'])
def agregacion(request):
    """`{label, where:[{prop,value}], groupBy?, agg, field?}`."""
    body = request.data or {}
    label = body.get('label')
    if not label or not SAFE_ID.match(label):
        return Response({'detail': 'label requerido y válido'}, status=status.HTTP_400_BAD_REQUEST)
    group_by = body.get('groupBy')
    if group_by and not SAFE_ID.match(group_by):
        return Response({'detail': 'groupBy inválido'}, status=status.HTTP_400_BAD_REQUEST)
    field = body.get('field')
    if field and not SAFE_ID.match(field):
        return Response({'detail': 'field inválido'}, status=status.HTTP_400_BAD_REQUEST)
    agg = body.get('agg', 'count')
    if agg not in ALLOWED_AGGS:
        return Response({'detail': 'agg inválido'}, status=status.HTTP_400_BAD_REQUEST)

    where_list = body.get('where') or []
    parts, params = [], {}
    for i, c in enumerate(where_list):
        prop = c.get('prop')
        if not prop or not SAFE_ID.match(prop):
            return Response({'detail': f"prop inválido en where[{i}]"}, status=status.HTTP_400_BAD_REQUEST)
        parts.append(f"n.{prop} = $w{i}")
        params[f"w{i}"] = c.get('value')
    where_cl = ('WHERE ' + ' AND '.join(parts)) if parts else ''

    agg_expr = 'count(*)' if agg == 'count' else f"{agg}(n.{field})"
    return_cl = (
        f"n.{group_by} AS {group_by}, {agg_expr} AS resultado"
        if group_by else f"{agg_expr} AS resultado"
    )
    order_cl = "ORDER BY resultado DESC" if group_by else ''
    cypher = f"MATCH (n:{label}) {where_cl} RETURN {return_cl} {order_cl}"
    return Response(_envelope(run_read(cypher, params), cypher))
