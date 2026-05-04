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
        limit = max(10, min(400, int(qp.get('limit', 150))))
    except (TypeError, ValueError):
        limit = 150

    label_filter = qp.get('label', '').strip()
    seed_limit = max(10, limit // 3)   # semillas → sus vecinos llenan el resto

    # ── query único: semillas + 1-hop expansion ────────────────────────────
    if label_filter and label_filter in allowed_labels:
        cypher = f"""
MATCH (seed:{label_filter})
WITH seed LIMIT $seed_limit
OPTIONAL MATCH (seed)-[r]->(nb)
WITH seed, r, nb LIMIT $rel_limit
RETURN seed AS n, null AS rel, null AS nb2
UNION
MATCH (seed:{label_filter})
WITH seed LIMIT $seed_limit
MATCH (seed)-[r]->(nb)
WITH seed, r, nb LIMIT $rel_limit
RETURN nb AS n, r AS rel, seed AS nb2
"""
    else:
        cypher = f"""
MATCH (seed)
WITH seed LIMIT $seed_limit
OPTIONAL MATCH (seed)-[r]->(nb)
WITH seed, r, nb LIMIT $rel_limit
RETURN seed AS n, null AS rel, null AS nb2
UNION
MATCH (seed)
WITH seed LIMIT $seed_limit
MATCH (seed)-[r]->(nb)
WITH seed, r, nb LIMIT $rel_limit
RETURN nb AS n, r AS rel, seed AS nb2
"""

    # Usamos un query más simple y robusto: traer relaciones con sus nodos directamente
    if label_filter and label_filter in allowed_labels:
        rel_cypher = f"""
MATCH (a:{label_filter})-[r]->(b)
RETURN a, r, b
LIMIT $limit
"""
    else:
        rel_cypher = """
MATCH (a)-[r]->(b)
RETURN a, r, b
LIMIT $limit
"""

    try:
        result = run_read(rel_cypher, {'limit': limit * 2})
    except Exception as exc:
        return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    nodes_map: dict = {}
    rels_list: list = []

    cols = result.get('columns', [])
    for row in result.get('rows', []):
        row_dict = dict(zip(cols, row))
        a = row_dict.get('a')
        r = row_dict.get('r')
        b = row_dict.get('b')

        if isinstance(a, dict) and a.get('elementId'):
            nodes_map[a['elementId']] = {
                'id': a['elementId'],
                'labels': a.get('labels', []),
                'props': a.get('props', {}),
            }
        if isinstance(b, dict) and b.get('elementId'):
            nodes_map[b['elementId']] = {
                'id': b['elementId'],
                'labels': b.get('labels', []),
                'props': b.get('props', {}),
            }
        if isinstance(r, dict) and r.get('elementId'):
            rels_list.append({
                'id': r['elementId'],
                'type': r.get('type', ''),
                'from': r.get('from', ''),
                'to': r.get('to', ''),
                'props': r.get('props', {}),
            })

    # Limitar nodos totales al límite pedido
    nodes_list = list(nodes_map.values())[:limit]
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
