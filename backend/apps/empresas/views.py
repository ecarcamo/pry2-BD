"""Endpoints REST para `:Empresa`. ID canónico: `empresa_id`."""
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


def _pick_id(body, *, default=None):
    return body.get('empresa_id') or body.get('empresaId') or default


@api_view(['GET', 'POST'])
def collection(request):
    if request.method == 'POST':
        return _crear(request)
    return _listar(request)


@api_view(['GET', 'PATCH', 'DELETE'])
def detail(request, empresa_id):
    if request.method == 'PATCH':
        return _actualizar(request, empresa_id)
    if request.method == 'DELETE':
        run_write("MATCH (e:Empresa {empresa_id: $id}) DETACH DELETE e", {'id': empresa_id})
        return Response(status=status.HTTP_204_NO_CONTENT)
    return _obtener(empresa_id)


def _crear(request):
    body = request.data or {}
    require_fields(body, ['nombre', 'industria', 'pais'])
    props = {
        'empresa_id': _pick_id(body, default=str(uuid.uuid4())),
        'nombre': body['nombre'],
        'industria': body['industria'],
        'pais': body['pais'],
        'verificada': bool(body.get('verificada', False)),
        'empleados_count': int(body.get('empleados_count', 0) or 0),
        'fecha_fundacion': body.get('fecha_fundacion') or _today(),
    }
    cypher = "CREATE (e:Empresa $props) RETURN e"
    result = run_write(cypher, {'props': props})
    return Response(envelope(result, cypher), status=status.HTTP_201_CREATED)


def _listar(request):
    qp = request.query_params
    filters, params = [], {}
    if qp.get('verificada') is not None:
        filters.append('e.verificada = $verificada')
        params['verificada'] = qp.get('verificada') == 'true'
    if qp.get('pais'):
        filters.append('e.pais = $pais')
        params['pais'] = qp.get('pais')
    where = ('WHERE ' + ' AND '.join(filters)) if filters else ''
    try:
        limit = max(1, min(200, int(qp.get('limit', 20))))
    except (TypeError, ValueError):
        limit = 20
    cypher = f"MATCH (e:Empresa) {where} RETURN e LIMIT {limit}"
    result = run_read(cypher, params)
    return Response(envelope(result, cypher))


def _obtener(empresa_id):
    cypher = "MATCH (e:Empresa {empresa_id: $empresa_id}) RETURN e"
    result = run_read(cypher, {'empresa_id': empresa_id})
    return Response(envelope(result, cypher))


def _actualizar(request, empresa_id):
    body = request.data or {}
    result, cypher = patch_props(
        'Empresa', 'e', 'empresa_id', empresa_id,
        body.get('set') or {}, body.get('remove') or [],
    )
    if result is None:
        return empty_update_response()
    return Response(envelope(result, cypher))


@api_view(['POST'])
def actualizar_bulk(request):
    body = request.data or {}
    result, cypher = patch_bulk(
        'Empresa', 'e',
        body.get('filter') or {}, body.get('set') or {}, body.get('remove') or [],
    )
    if result is None:
        return empty_update_response()
    return Response(envelope(result, cypher))
