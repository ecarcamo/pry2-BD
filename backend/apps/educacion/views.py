"""Endpoints REST para `:Educacion`. ID canónico: `educacion_id`."""
import uuid

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


def _pick_id(body, *, default=None):
    return body.get('educacion_id') or body.get('educacionId') or default


@api_view(['GET', 'POST'])
def collection(request):
    if request.method == 'POST':
        return _crear(request)
    return _listar(request)


@api_view(['GET', 'PATCH', 'DELETE'])
def detail(request, educacion_id):
    if request.method == 'PATCH':
        return _actualizar(request, educacion_id)
    if request.method == 'DELETE':
        run_write("MATCH (ed:Educacion {educacion_id: $id}) DETACH DELETE ed", {'id': educacion_id})
        return Response(status=status.HTTP_204_NO_CONTENT)
    return _obtener(educacion_id)


def _crear(request):
    body = request.data or {}
    require_fields(body, ['institucion', 'carrera', 'grado', 'pais'])
    props = {
        'educacion_id': _pick_id(body, default=str(uuid.uuid4())),
        'institucion': body['institucion'],
        'carrera': body['carrera'],
        'grado': body['grado'],
        'pais': body['pais'],
        'acreditada': bool(body.get('acreditada', False)),
    }
    cypher = "CREATE (ed:Educacion $props) RETURN ed"
    result = run_write(cypher, {'props': props})
    return Response(envelope(result, cypher), status=status.HTTP_201_CREATED)


def _listar(request):
    qp = request.query_params
    filters, params = [], {}
    if qp.get('pais'):
        filters.append('ed.pais = $pais')
        params['pais'] = qp.get('pais')
    if qp.get('acreditada') is not None:
        filters.append('ed.acreditada = $acreditada')
        params['acreditada'] = qp.get('acreditada') == 'true'
    where = ('WHERE ' + ' AND '.join(filters)) if filters else ''
    try:
        limit = max(1, min(200, int(qp.get('limit', 20))))
    except (TypeError, ValueError):
        limit = 20
    cypher = f"MATCH (ed:Educacion) {where} RETURN ed LIMIT {limit}"
    result = run_read(cypher, params)
    return Response(envelope(result, cypher))


def _obtener(educacion_id):
    cypher = "MATCH (ed:Educacion {educacion_id: $educacion_id}) RETURN ed"
    result = run_read(cypher, {'educacion_id': educacion_id})
    return Response(envelope(result, cypher))


def _actualizar(request, educacion_id):
    body = request.data or {}
    result, cypher = patch_props(
        'Educacion', 'ed', 'educacion_id', educacion_id,
        body.get('set') or {}, body.get('remove') or [],
    )
    if result is None:
        return empty_update_response()
    return Response(envelope(result, cypher))


@api_view(['POST'])
def actualizar_bulk(request):
    body = request.data or {}
    result, cypher = patch_bulk(
        'Educacion', 'ed',
        body.get('filter') or {}, body.get('set') or {}, body.get('remove') or [],
    )
    if result is None:
        return empty_update_response()
    return Response(envelope(result, cypher))
