"""Endpoints REST para :ExperienciaLaboral."""
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


@api_view(['GET', 'POST'])
def collection(request):
    if request.method == 'POST':
        return _crear(request)
    return _listar(request)


@api_view(['GET', 'PATCH', 'DELETE'])
def detail(request, exp_id):
    if request.method == 'PATCH':
        return _actualizar(request, exp_id)
    if request.method == 'DELETE':
        return _eliminar(exp_id)
    return _obtener(exp_id)


def _crear(request):
    body = request.data or {}
    require_fields(body, ['cargo'])
    props = {
        'expId':       body.get('expId') or str(uuid.uuid4()),
        'cargo':       body['cargo'],
        'salario':     float(body.get('salario', 0.0)),
        'descripcion': body.get('descripcion', ''),
        'activo':      bool(body.get('activo', True)),
    }
    cypher = "CREATE (exp:ExperienciaLaboral $props) RETURN exp"
    result = run_write(cypher, {'props': props})
    return Response(envelope(result, cypher), status=status.HTTP_201_CREATED)


def _listar(request):
    qp = request.query_params
    filters, params = [], {}
    if qp.get('activo') is not None:
        filters.append('exp.activo = $activo')
        params['activo'] = qp.get('activo') == 'true'
    if qp.get('cargo'):
        filters.append('toLower(exp.cargo) CONTAINS toLower($cargo)')
        params['cargo'] = qp.get('cargo')
    where = ('WHERE ' + ' AND '.join(filters)) if filters else ''
    try:
        limit = max(1, min(200, int(qp.get('limit', 20))))
    except (TypeError, ValueError):
        limit = 20
    cypher = f"MATCH (exp:ExperienciaLaboral) {where} RETURN exp LIMIT {limit}"
    result = run_read(cypher, params)
    return Response(envelope(result, cypher))


def _obtener(exp_id):
    cypher = "MATCH (exp:ExperienciaLaboral {expId: $expId}) RETURN exp"
    result = run_read(cypher, {'expId': exp_id})
    return Response(envelope(result, cypher))


def _actualizar(request, exp_id):
    body = request.data or {}
    result, cypher = patch_props(
        'ExperienciaLaboral', 'exp', 'expId', exp_id,
        body.get('set') or {}, body.get('remove') or [],
    )
    if result is None:
        return empty_update_response()
    return Response(envelope(result, cypher))


def _eliminar(exp_id):
    cypher = "MATCH (exp:ExperienciaLaboral {expId: $expId}) DETACH DELETE exp"
    run_write(cypher, {'expId': exp_id})
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['POST'])
def actualizar_bulk(request):
    body = request.data or {}
    result, cypher = patch_bulk(
        'ExperienciaLaboral', 'exp',
        body.get('filter') or {}, body.get('set') or {}, body.get('remove') or [],
    )
    if result is None:
        return empty_update_response()
    return Response(envelope(result, cypher))
