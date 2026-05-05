"""Endpoints REST para `:Usuario`.

Convención DRF — un endpoint por recurso, métodos HTTP para distinguir verbos:
  GET    /usuarios/            -> lista
  POST   /usuarios/            -> crea (rúbrica 1, 3)
  GET    /usuarios/<id>/       -> detalle
  PATCH  /usuarios/<id>/       -> actualiza props (rúbrica 5, 1 nodo)
  DELETE /usuarios/<id>/       -> borra
  POST   /usuarios/admin/      -> crea con :Usuario:Admin (rúbrica 2)
  POST   /usuarios/bulk-update -> patch masivo (rúbrica 5, varios nodos)

Convención de IDs: la propiedad canónica es `usuario_id` (igual al seed/CSV).
Los endpoints también aceptan `userId` en el body por compatibilidad con clientes legacy.
"""
import uuid
from datetime import date

from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from apps.core.lib.cypher_build import (
    build_filter_clause,
    build_remove_clause,
    build_set_clause,
)
from apps.core.lib.db import run_read, run_write
from apps.core.lib.validate import require_fields

ALLOWED_ORDER = {'conexiones_count', 'nombre', 'fecha_registro'}


def _today():
    return date.today().isoformat()


def _envelope(result, cypher):
    """`{columns, rows, stats, meta:{cypher}}`."""
    return {**result, 'meta': {'cypher': cypher.strip()}}


def _pick_id(body, *, default=None):
    """Acepta `usuario_id` o `userId` en el payload (compat frontend)."""
    return body.get('usuario_id') or body.get('userId') or default


@api_view(['GET', 'POST'])
def collection(request):
    if request.method == 'POST':
        return _crear(request)
    return _listar(request)


@api_view(['GET', 'PATCH', 'DELETE'])
def detail(request, user_id):
    if request.method == 'PATCH':
        return _actualizar(request, user_id)
    if request.method == 'DELETE':
        return _eliminar(user_id)
    return _obtener(user_id)


def _crear(request):
    body = request.data or {}
    require_fields(body, ['nombre', 'email'])
    props = {
        'usuario_id': _pick_id(body, default=str(uuid.uuid4())),
        'nombre': body['nombre'],
        'email': body['email'],
        'titular': body.get('titular', ''),
        'habilidades': body.get('habilidades', []),
        'abierto_a_trabajo': bool(body.get('abierto_a_trabajo', False)),
        'fecha_registro': body.get('fecha_registro') or _today(),
        'conexiones_count': int(body.get('conexiones_count', 0) or 0),
    }
    cypher = "CREATE (u:Usuario $props) RETURN u"
    result = run_write(cypher, {'props': props})
    return Response(_envelope(result, cypher), status=status.HTTP_201_CREATED)


@api_view(['POST'])
def crear_admin(request):
    body = request.data or {}
    require_fields(body, ['nombre', 'email'])
    props = {
        'usuario_id': _pick_id(body, default=str(uuid.uuid4())),
        'nombre': body['nombre'],
        'email': body['email'],
        'titular': body.get('titular', ''),
        'habilidades': body.get('habilidades', []),
        'abierto_a_trabajo': bool(body.get('abierto_a_trabajo', False)),
        'fecha_registro': body.get('fecha_registro') or _today(),
        'conexiones_count': int(body.get('conexiones_count', 0) or 0),
        'nivel_acceso': body.get('nivel_acceso', 'moderador'),
        'puede_moderar': bool(body.get('puede_moderar', True)),
        'fecha_asignacion': body.get('fecha_asignacion') or _today(),
        'asignado_por': body.get('asignado_por', ''),
        'activo': bool(body.get('activo', True)),
    }
    cypher = "CREATE (u:Usuario:Admin $props) RETURN u"
    result = run_write(cypher, {'props': props})
    return Response(_envelope(result, cypher), status=status.HTTP_201_CREATED)


def _listar(request):
    qp = request.query_params
    filters, params = [], {}
    if qp.get('abierto_a_trabajo') is not None:
        filters.append('u.abierto_a_trabajo = $abierto_a_trabajo')
        params['abierto_a_trabajo'] = qp.get('abierto_a_trabajo') == 'true'
    if qp.get('pais'):
        filters.append('u.pais = $pais')
        params['pais'] = qp.get('pais')
    where = ('WHERE ' + ' AND '.join(filters)) if filters else ''
    order_by = qp.get('orderBy', 'conexiones_count')
    if order_by not in ALLOWED_ORDER:
        order_by = 'conexiones_count'
    direction = 'ASC' if qp.get('dir', 'DESC').upper() == 'ASC' else 'DESC'
    try:
        limit = max(1, min(200, int(qp.get('limit', 20))))
    except (TypeError, ValueError):
        limit = 20
    cypher = (
        f"MATCH (u:Usuario) {where} "
        f"RETURN u ORDER BY u.{order_by} {direction} LIMIT {limit}"
    )
    result = run_read(cypher, params)
    return Response(_envelope(result, cypher))


def _obtener(user_id):
    cypher = "MATCH (u:Usuario {usuario_id: $usuario_id}) RETURN u"
    result = run_read(cypher, {'usuario_id': user_id})
    return Response(_envelope(result, cypher))


def _actualizar(request, user_id):
    body = request.data or {}
    set_dict = body.get('set') or {}
    remove_list = body.get('remove') or []
    set_cl = build_set_clause(set_dict, alias='u')
    rem_cl = build_remove_clause(remove_list, alias='u')
    if not set_cl and not rem_cl:
        return Response({'detail': 'Nada que actualizar'}, status=status.HTTP_400_BAD_REQUEST)
    cypher = f"MATCH (u:Usuario {{usuario_id: $usuario_id}}) {set_cl} {rem_cl} RETURN u"
    result = run_write(cypher, {'usuario_id': user_id, 'set': set_dict})
    return Response(_envelope(result, cypher))


@api_view(['POST'])
def actualizar_bulk(request):
    body = request.data or {}
    filter_dict = body.get('filter') or {}
    set_dict = body.get('set') or {}
    remove_list = body.get('remove') or []
    set_cl = build_set_clause(set_dict, alias='u')
    rem_cl = build_remove_clause(remove_list, alias='u')
    if not set_cl and not rem_cl:
        return Response({'detail': 'Nada que actualizar'}, status=status.HTTP_400_BAD_REQUEST)
    where_cl = build_filter_clause(filter_dict, alias='u', param_name='filter')
    cypher = f"MATCH (u:Usuario) {where_cl} {set_cl} {rem_cl} RETURN u"
    result = run_write(cypher, {'set': set_dict, 'filter': filter_dict})
    return Response(_envelope(result, cypher))


def _eliminar(user_id):
    cypher = "MATCH (u:Usuario {usuario_id: $usuario_id}) DETACH DELETE u"
    run_write(cypher, {'usuario_id': user_id})
    return Response(status=status.HTTP_204_NO_CONTENT)
