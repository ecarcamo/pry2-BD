"""Endpoints REST para `:Publicacion`. ID canónico: `publicacion_id`.

POST crea Publicacion + relación :PUBLICO desde el usuario autor.
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


def _pick_post_id(body, *, default=None):
    return body.get('publicacion_id') or body.get('postId') or default


def _pick_user_id(body, *, default=None):
    return body.get('usuario_id') or body.get('userId') or default


@api_view(['GET', 'POST'])
def collection(request):
    if request.method == 'POST':
        return _crear(request)
    return _listar(request)


@api_view(['GET', 'PATCH', 'DELETE'])
def detail(request, post_id):
    if request.method == 'PATCH':
        return _actualizar(request, post_id)
    if request.method == 'DELETE':
        run_write("MATCH (p:Publicacion {publicacion_id: $id}) DETACH DELETE p", {'id': post_id})
        return Response(status=status.HTTP_204_NO_CONTENT)
    return _obtener(post_id)


def _crear(request):
    body = request.data or {}
    user_id = _pick_user_id(body)
    if not user_id:
        return Response(
            {'detail': 'usuario_id (o userId) es requerido'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    require_fields(body, ['contenido'])
    props = {
        'publicacion_id': _pick_post_id(body, default=str(uuid.uuid4())),
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
        "MATCH (u:Usuario {usuario_id: $usuario_id}) "
        "CREATE (p:Publicacion $props) "
        "CREATE (u)-[r:PUBLICO $relProps]->(p) "
        "RETURN u, p, r"
    )
    result = run_write(cypher, {'usuario_id': user_id, 'props': props, 'relProps': rel_props})
    if not result.get('rows'):
        return Response({'detail': f"Usuario '{user_id}' no encontrado"}, status=status.HTTP_404_NOT_FOUND)
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
        filters.append('p.fecha_publicacion >= date($desde)')
        params['desde'] = qp.get('desde')
    where = ('WHERE ' + ' AND '.join(filters)) if filters else ''
    try:
        limit = max(1, min(200, int(qp.get('limit', 20))))
    except (TypeError, ValueError):
        limit = 20
    cypher = (
        f"MATCH (u:Usuario)-[:PUBLICO]->(p:Publicacion) {where} "
        f"RETURN p, u.nombre AS autor_nombre, u.usuario_id AS autor_id "
        f"ORDER BY p.fecha_publicacion DESC, id(p) DESC LIMIT {limit}"
    )
    result = run_read(cypher, params)
    cols = result.get('columns', [])
    rows = result.get('rows', [])
    if cols and rows:
        p_idx = cols.index('p') if 'p' in cols else None
        nombre_idx = cols.index('autor_nombre') if 'autor_nombre' in cols else None
        id_idx = cols.index('autor_id') if 'autor_id' in cols else None
        for row in rows:
            if p_idx is not None and isinstance(row[p_idx], dict):
                props = row[p_idx].get('props') or {}
                if nombre_idx is not None:
                    props['autor_nombre'] = row[nombre_idx]
                if id_idx is not None:
                    props['autor_id'] = row[id_idx]
    return Response(envelope(result, cypher))


def _obtener(post_id):
    cypher = "MATCH (u:Usuario)-[:PUBLICO]->(p:Publicacion {publicacion_id: $publicacion_id}) RETURN u, p"
    result = run_read(cypher, {'publicacion_id': post_id})
    return Response(envelope(result, cypher))


def _actualizar(request, post_id):
    body = request.data or {}
    result, cypher = patch_props(
        'Publicacion', 'p', 'publicacion_id', post_id,
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
