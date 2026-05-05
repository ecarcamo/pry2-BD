"""Endpoints de salud, passthrough Cypher, grafo sample y seed."""
from django.conf import settings
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .lib.db import run_read, run_write, run_auto, verify_connectivity
from .lib.serialize import to_plain


@api_view(['GET'])
def ping(_request):
    try:
        verify_connectivity()
    except Exception as exc:
        return Response(
            {'status': 'error', 'detail': str(exc)},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )
    return Response({
        'status': 'pong',
        'neo4j': 'ok',
        'database': settings.NEO4J_DATABASE,
        'instance': settings.AURA_INSTANCENAME,
    })


@api_view(['POST'])
def cypher_passthrough(request):
    body = request.data or {}
    query = body.get('query')
    params = body.get('params') or {}
    mode = body.get('mode', 'read')

    if not isinstance(query, str) or not query.strip():
        return Response({'detail': 'query requerido'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        if mode == 'auto':
            result = run_auto(query, params)
        elif mode == 'write':
            result = run_write(query, params)
        else:
            result = run_read(query, params)
    except Exception as exc:
        return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    return Response(result)


@api_view(['GET'])
def grafo_sample(request):
    """Devuelve un sample del grafo real garantizando relaciones visibles.

    Estrategia: toma N nodos semilla y expande 1 hop → todos los vecinos
    directos se incluyen, por lo que TODAS las relaciones retornadas tienen
    ambos extremos en el resultado.

    GET /api/grafo/sample/?limit=150&label=<Label>
    """
    qp = request.query_params
    allowed_labels = {'Usuario', 'Empresa', 'Publicacion', 'Empleo', 'Educacion', 'ExperienciaLaboral'}

    try:
        limit = max(10, min(10000, int(qp.get('limit', 150))))
    except (TypeError, ValueError):
        limit = 150

    label_filter = qp.get('label', '').strip()
    fetch_all = limit >= 10000

    nodes_map: dict = {}
    rels_list: list = []

    try:
        # ── Traer nodos ───────────────────────────────────────────────────
        if label_filter and label_filter in allowed_labels:
            node_cypher = f"MATCH (n:{label_filter}) RETURN n" + ("" if fetch_all else " LIMIT $limit")
        else:
            node_cypher = "MATCH (n) RETURN n" + ("" if fetch_all else " LIMIT $limit")

        node_result = run_read(node_cypher, {} if fetch_all else {'limit': limit})
        node_cols = node_result.get('columns', [])
        for row in node_result.get('rows', []):
            n = dict(zip(node_cols, row)).get('n')
            if isinstance(n, dict) and n.get('elementId'):
                nodes_map[n['elementId']] = {
                    'id': n['elementId'],
                    'labels': n.get('labels', []),
                    'props': n.get('props', {}),
                }

        # ── Traer relaciones ──────────────────────────────────────────────
        if label_filter and label_filter in allowed_labels:
            rel_cypher = f"MATCH (a:{label_filter})-[r]->(b) RETURN a, r, b" + ("" if fetch_all else " LIMIT $limit")
        else:
            rel_cypher = "MATCH (a)-[r]->(b) RETURN a, r, b" + ("" if fetch_all else " LIMIT $limit")

        rel_result = run_read(rel_cypher, {} if fetch_all else {'limit': limit * 3})
        rel_cols = rel_result.get('columns', [])
        for row in rel_result.get('rows', []):
            row_dict = dict(zip(rel_cols, row))
            r = row_dict.get('r')
            if isinstance(r, dict) and r.get('elementId'):
                rels_list.append({
                    'id': r['elementId'],
                    'type': r.get('type', ''),
                    'from': r.get('from', ''),
                    'to': r.get('to', ''),
                    'props': r.get('props', {}),
                })

    except Exception as exc:
        return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    nodes_list = list(nodes_map.values())
    node_ids_set = {n['id'] for n in nodes_list}
    rels_filtered = [r for r in rels_list if r['from'] in node_ids_set and r['to'] in node_ids_set]

    return Response({'nodes': nodes_list, 'rels': rels_filtered})


@api_view(['POST'])
def admin_seed(request):
    """POST /api/admin/seed/ — ejecuta el seed desde CSVs y devuelve conteos."""
    from django.core import management
    import io
    out = io.StringIO()
    try:
        management.call_command('seed', stdout=out)
    except Exception as exc:
        return Response({'detail': str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    return Response({'status': 'ok', 'log': out.getvalue()})
