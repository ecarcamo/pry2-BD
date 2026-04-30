"""Endpoints REST para `:Publicacion`.

POST crea Publicacion + relación :PUBLICO desde el `userId` autor.
"""
import uuid
from datetime import date

from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from apps.core.lib.db import run_read, run_write
from apps.core.lib.validate import require_fields
from apps.core.lib.views import (
    empty_update_response,
    envelope,
    patch_bulk,
    patch_props,
)


def _today():
    return date.today().isoformat()


@api_view(['GET', 'POST'])
def collection(request):
    if request.method == 'POST':
        return _crear(request)
    return _listar(request)


@api_view(['GET', 'PATCH'])
def detail(request, post_id):
    if request.method == 'PATCH':
        return _actualizar(request, post_id)
    return _obtener(post_id)


def _crear(request):
    body = request.data or {}
    require_fields(body, ['userId', 'contenido'])
    props = {
        'postId': body.get('postId') or str(uuid.uuid4()),
        'contenido': body['contenido'],
        'fecha_publicacion': body.get('fecha_publicacion') or _today(),
        'likes_count': int(body.get('likes_count', 0) or 0),
        'tags': body.get('tags', []),
        'es_oferta': bool(body.get('es_oferta', False)),
    }
    rel_props_in = body.get('relProps') or {}
    rel_props = {
        'fecha': rel_props_in.get('fecha') or props['fecha_publicacion'],
        'anonimo': bool(rel_props_in.get('anonimo', False)),
        'desde_empresa': bool(rel_props_in.get('desde_empresa', False)),
    }
    cypher = (
        "MATCH (u:Usuario {userId: $userId}) "
        "CREATE (p:Publicacion $props) "
        "CREATE (u)-[r:PUBLICO $relProps]->(p) "
        "RETURN u, p, r"
    )
    result = run_write(cypher, {'userId': body['userId'], 'props': props, 'relProps': rel_props})
    return Response(envelope(result, cypher), status=status.HTTP_201_CREATED)


def _listar(request):
    qp = request.query_params
    filters, params = [], {}
    if qp.get('tag'):
        filters.append('$tag IN p.tags')
        params['tag'] = qp.get('tag')
    if qp.get('minLikes'):
        try:
            params['minLikes'] = int(qp.get('minLikes'))
            filters.append('p.likes_count >= $minLikes')
        except ValueError:
            pass
    if qp.get('desde'):
        filters.append('p.fecha_publicacion >= $desde')
        params['desde'] = qp.get('desde')
    where = ('WHERE ' + ' AND '.join(filters)) if filters else ''
    try:
        limit = max(1, min(200, int(qp.get('limit', 20))))
    except (TypeError, ValueError):
        limit = 20
    cypher = (
        f"MATCH (p:Publicacion) {where} "
        f"RETURN p ORDER BY p.fecha_publicacion DESC LIMIT {limit}"
    )
    result = run_read(cypher, params)
    return Response(envelope(result, cypher))


def _obtener(post_id):
    cypher = "MATCH (u:Usuario)-[:PUBLICO]->(p:Publicacion {postId: $postId}) RETURN u, p"
    result = run_read(cypher, {'postId': post_id})
    return Response(envelope(result, cypher))


def _actualizar(request, post_id):
    body = request.data or {}
    result, cypher = patch_props(
        'Publicacion', 'p', 'postId', post_id,
        body.get('set') or {}, body.get('remove') or [],
    )
    if result is None:
        return empty_update_response()
    return Response(envelope(result, cypher))


@api_view(['POST'])
def actualizar_bulk(request):
    body = request.data or {}
    result, cypher = patch_bulk(
        'Publicacion', 'p',
        body.get('filter') or {}, body.get('set') or {}, body.get('remove') or [],
    )
    if result is None:
        return empty_update_response()
    return Response(envelope(result, cypher))
