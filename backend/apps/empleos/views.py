"""Endpoints REST para `:Empleo`. POST crea Empleo + :OFERTA desde la empresa."""
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
def detail(request, empleo_id):
    if request.method == 'PATCH':
        return _actualizar(request, empleo_id)
    return _obtener(empleo_id)


def _crear(request):
    body = request.data or {}
    require_fields(body, ['empresaId', 'titulo'])
    props = {
        'empleoId': body.get('empleoId') or str(uuid.uuid4()),
        'titulo': body['titulo'],
        'salario_min': float(body.get('salario_min', 0) or 0),
        'salario_max': float(body.get('salario_max', 0) or 0),
        'modalidad': body.get('modalidad', 'presencial'),
        'activo': bool(body.get('activo', True)),
        'fecha_publicacion': body.get('fecha_publicacion') or _today(),
    }
    rel_props_in = body.get('relProps') or {}
    rel_props = {
        'fecha_publicacion': props['fecha_publicacion'],
        'urgente': bool(rel_props_in.get('urgente', False)),
        'remunerado': bool(rel_props_in.get('remunerado', True)),
    }
    cypher = (
        "MATCH (emp:Empresa {empresaId: $empresaId}) "
        "CREATE (j:Empleo $props) "
        "CREATE (emp)-[r:OFERTA $relProps]->(j) "
        "RETURN emp, j, r"
    )
    result = run_write(cypher, {
        'empresaId': body['empresaId'],
        'props': props,
        'relProps': rel_props,
    })
    return Response(envelope(result, cypher), status=status.HTTP_201_CREATED)


def _listar(request):
    qp = request.query_params
    filters, params = [], {}
    if qp.get('activo') is not None:
        filters.append('j.activo = $activo')
        params['activo'] = qp.get('activo') == 'true'
    if qp.get('modalidad'):
        filters.append('j.modalidad = $modalidad')
        params['modalidad'] = qp.get('modalidad')
    if qp.get('salarioMin'):
        try:
            params['salarioMin'] = float(qp.get('salarioMin'))
            filters.append('j.salario_min >= $salarioMin')
        except ValueError:
            pass
    where = ('WHERE ' + ' AND '.join(filters)) if filters else ''
    try:
        limit = max(1, min(200, int(qp.get('limit', 20))))
    except (TypeError, ValueError):
        limit = 20
    cypher = (
        f"MATCH (j:Empleo) {where} "
        f"RETURN j ORDER BY j.fecha_publicacion DESC LIMIT {limit}"
    )
    result = run_read(cypher, params)
    return Response(envelope(result, cypher))


def _obtener(empleo_id):
    cypher = "MATCH (j:Empleo {empleoId: $empleoId}) RETURN j"
    result = run_read(cypher, {'empleoId': empleo_id})
    return Response(envelope(result, cypher))


def _actualizar(request, empleo_id):
    body = request.data or {}
    result, cypher = patch_props(
        'Empleo', 'j', 'empleoId', empleo_id,
        body.get('set') or {}, body.get('remove') or [],
    )
    if result is None:
        return empty_update_response()
    return Response(envelope(result, cypher))


@api_view(['POST'])
def actualizar_bulk(request):
    body = request.data or {}
    result, cypher = patch_bulk(
        'Empleo', 'j',
        body.get('filter') or {}, body.get('set') or {}, body.get('remove') or [],
    )
    if result is None:
        return empty_update_response()
    return Response(envelope(result, cypher))
