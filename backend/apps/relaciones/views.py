"""Endpoints REST para relaciones del dominio (rúbrica 6).

Cada relación crea con `properties` ≥3 según el modelo de [proyecto_grafo.md].
Ruta genérica `/api/relaciones/` permite cualquier (label, idField) tipado.

Convención de IDs: snake_case (`usuario_id`, `empresa_id`, `publicacion_id`,
`empleo_id`, `educacion_id`, `experiencia_id`). Los endpoints también aceptan
los nombres camelCase (`userId`, `empresaId`, `postId`, `empleoId`,
`educacionId`, `expId`) por compatibilidad con clientes legacy.
"""
from datetime import date

from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from apps.core.lib.cypher_build import (
    ID_RE,
    build_filter_clause,
    build_remove_clause,
    build_set_clause,
    safe_label,
    safe_prop,
    safe_rel_type,
)
from apps.core.lib.db import run_read, run_write
from apps.core.lib.validate import require_fields, require_min_props
from apps.core.lib.views import envelope


def _today():
    return date.today().isoformat()


def _pick(body, *keys):
    """Devuelve el primer valor no-vacío de los keys dados."""
    for k in keys:
        v = body.get(k)
        if v:
            return v
    return None


def _create_rel(cypher, params):
    result = run_write(cypher, params)
    if not result.get('rows'):
        return Response(
            {'detail': 'Uno de los nodos referenciados no existe', 'cypher': cypher},
            status=status.HTTP_404_NOT_FOUND,
        )
    return Response(envelope(result, cypher), status=status.HTTP_201_CREATED)


@api_view(['POST'])
def conexiones(request):
    """CONECTADO_CON entre dos Usuario."""
    body = request.data or {}
    a = _pick(body, 'usuario_id_a', 'userIdA')
    b = _pick(body, 'usuario_id_b', 'userIdB')
    if not a or not b:
        return Response({'detail': 'usuario_id_a y usuario_id_b son requeridos'}, status=status.HTTP_400_BAD_REQUEST)
    props = {
        'fecha_conexion': body.get('fecha_conexion') or _today(),
        'nivel': body.get('nivel', '1er'),
        'aceptada': bool(body.get('aceptada', True)),
    }
    cypher = (
        "MATCH (a:Usuario {usuario_id: $a}), (b:Usuario {usuario_id: $b}) "
        "CREATE (a)-[r:CONECTADO_CON $props]->(b) "
        "RETURN a, type(r), b"
    )
    return _create_rel(cypher, {'a': a, 'b': b, 'props': props})


@api_view(['POST'])
def likes(request):
    """DIO_LIKE: idempotente vía MERGE (un usuario solo puede reaccionar 1 vez por
    publicación; vuelve a llamar = actualiza la propiedad de la relación). Mantiene
    `p.likes_count` sincronizado con el número real de relaciones DIO_LIKE entrantes.
    """
    body = request.data or {}
    u = _pick(body, 'usuario_id', 'userId')
    p = _pick(body, 'publicacion_id', 'postId')
    if not u or not p:
        return Response({'detail': 'usuario_id y publicacion_id son requeridos'}, status=status.HTTP_400_BAD_REQUEST)
    fecha = body.get('fecha') or _today()
    tipo_reaccion = body.get('tipo_reaccion', 'me_gusta')
    notificado = bool(body.get('notificado', False))
    cypher = (
        "MATCH (u:Usuario {usuario_id: $u}), (p:Publicacion {publicacion_id: $p}) "
        "MERGE (u)-[r:DIO_LIKE]->(p) "
        "SET r.fecha = $fecha, r.tipo_reaccion = $tipo_reaccion, r.notificado = $notificado "
        "WITH p "
        "MATCH (:Usuario)-[lr:DIO_LIKE]->(p) "
        "WITH p, count(lr) AS total "
        "SET p.likes_count = total "
        "RETURN p, total AS likes_count"
    )
    return _create_rel(cypher, {
        'u': u, 'p': p,
        'fecha': fecha, 'tipo_reaccion': tipo_reaccion, 'notificado': notificado,
    })


@api_view(['POST'])
def comentarios(request):
    body = request.data or {}
    u = _pick(body, 'usuario_id', 'userId')
    p = _pick(body, 'publicacion_id', 'postId')
    require_fields(body, ['contenido'])
    if not u or not p:
        return Response({'detail': 'usuario_id y publicacion_id son requeridos'}, status=status.HTTP_400_BAD_REQUEST)
    props = {
        'contenido': body['contenido'],
        'fecha': body.get('fecha') or _today(),
        'editado': bool(body.get('editado', False)),
    }
    cypher = (
        "MATCH (u:Usuario {usuario_id: $u}), (p:Publicacion {publicacion_id: $p}) "
        "CREATE (u)-[r:COMENTO $props]->(p) "
        "RETURN u, type(r), p"
    )
    return _create_rel(cypher, {'u': u, 'p': p, 'props': props})


@api_view(['POST'])
def compartidos(request):
    body = request.data or {}
    u = _pick(body, 'usuario_id', 'userId')
    p = _pick(body, 'publicacion_id', 'postId')
    if not u or not p:
        return Response({'detail': 'usuario_id y publicacion_id son requeridos'}, status=status.HTTP_400_BAD_REQUEST)
    props = {
        'fecha': body.get('fecha') or _today(),
        'con_comentario': bool(body.get('con_comentario', False)),
        'visibilidad': body.get('visibilidad', 'pública'),
    }
    cypher = (
        "MATCH (u:Usuario {usuario_id: $u}), (p:Publicacion {publicacion_id: $p}) "
        "CREATE (u)-[r:COMPARTIO $props]->(p) "
        "RETURN u, type(r), p"
    )
    return _create_rel(cypher, {'u': u, 'p': p, 'props': props})


@api_view(['POST'])
def postulaciones(request):
    body = request.data or {}
    u = _pick(body, 'usuario_id', 'userId')
    j = _pick(body, 'empleo_id', 'empleoId')
    if not u or not j:
        return Response({'detail': 'usuario_id y empleo_id son requeridos'}, status=status.HTTP_400_BAD_REQUEST)
    props = {
        'fecha_postulacion': body.get('fecha_postulacion') or _today(),
        'estado': body.get('estado', 'pendiente'),
        'carta_presentacion': bool(body.get('carta_presentacion', False)),
    }
    cypher = (
        "MATCH (u:Usuario {usuario_id: $u}), (j:Empleo {empleo_id: $j}) "
        "CREATE (u)-[r:POSTULO_A $props]->(j) "
        "RETURN u, type(r), j"
    )
    return _create_rel(cypher, {'u': u, 'j': j, 'props': props})


@api_view(['POST'])
def seguimientos(request):
    body = request.data or {}
    u = _pick(body, 'usuario_id', 'userId')
    e = _pick(body, 'empresa_id', 'empresaId')
    if not u or not e:
        return Response({'detail': 'usuario_id y empresa_id son requeridos'}, status=status.HTTP_400_BAD_REQUEST)
    props = {
        'fecha_seguimiento': body.get('fecha_seguimiento') or _today(),
        'notificaciones': bool(body.get('notificaciones', True)),
        'motivo': body.get('motivo', ''),
    }
    cypher = (
        "MATCH (u:Usuario {usuario_id: $u}), (e:Empresa {empresa_id: $e}) "
        "CREATE (u)-[r:SIGUE_A $props]->(e) "
        "RETURN u, type(r), e"
    )
    return _create_rel(cypher, {'u': u, 'e': e, 'props': props})


@api_view(['POST'])
def estar_en(request):
    """ESTAR_EN: Usuario → Empresa (experiencia laboral del usuario)."""
    body = request.data or {}
    u = _pick(body, 'usuario_id', 'userId')
    e = _pick(body, 'empresa_id', 'empresaId')
    if not u or not e:
        return Response({'detail': 'usuario_id y empresa_id son requeridos'}, status=status.HTTP_400_BAD_REQUEST)
    props = {
        'cargo':        body.get('cargo', 'Software Engineer'),
        'fecha_inicio': body.get('fecha_inicio') or _today(),
        'actual':       bool(body.get('actual', True)),
    }
    cypher = (
        "MATCH (u:Usuario {usuario_id: $u}), (e:Empresa {empresa_id: $e}) "
        "CREATE (u)-[r:ESTAR_EN $props]->(e) "
        "RETURN u, type(r), e"
    )
    return _create_rel(cypher, {'u': u, 'e': e, 'props': props})


@api_view(['POST'])
def estudios(request):
    body = request.data or {}
    u = _pick(body, 'usuario_id', 'userId')
    ed = _pick(body, 'educacion_id', 'educacionId')
    if not u or not ed:
        return Response({'detail': 'usuario_id y educacion_id son requeridos'}, status=status.HTTP_400_BAD_REQUEST)
    props = {
        'fecha_inicio': body.get('fecha_inicio') or _today(),
        'fecha_graduacion': body.get('fecha_graduacion', ''),
        'graduado': bool(body.get('graduado', False)),
    }
    cypher = (
        "MATCH (u:Usuario {usuario_id: $u}), (ed:Educacion {educacion_id: $ed}) "
        "CREATE (u)-[r:ESTUDIO_EN $props]->(ed) "
        "RETURN u, type(r), ed"
    )
    return _create_rel(cypher, {'u': u, 'ed': ed, 'props': props})


@api_view(['POST'])
def menciones(request):
    body = request.data or {}
    p = _pick(body, 'publicacion_id', 'postId')
    u = _pick(body, 'usuario_id', 'userId')
    if not p or not u:
        return Response({'detail': 'publicacion_id y usuario_id son requeridos'}, status=status.HTTP_400_BAD_REQUEST)
    props = {
        'fecha': body.get('fecha') or _today(),
        'tipo': body.get('tipo', 'etiqueta'),
        'confirmada': bool(body.get('confirmada', False)),
    }
    cypher = (
        "MATCH (p:Publicacion {publicacion_id: $p}), (u:Usuario {usuario_id: $u}) "
        "CREATE (p)-[r:MENCIONA_A $props]->(u) "
        "RETURN p, type(r), u"
    )
    return _create_rel(cypher, {'p': p, 'u': u, 'props': props})


@api_view(['POST'])
def relacion_generica(request):
    """POST /api/relaciones/generica/ — `{from:{label,idField,idValue}, to:..., type, properties}`."""
    body = request.data or {}
    require_fields(body, ['from', 'to', 'type', 'properties'])
    fr = body['from']
    to = body['to']
    require_min_props(body['properties'], 3)

    from_label = safe_label(fr['label'])
    to_label = safe_label(to['label'])
    rel_type = safe_rel_type(body['type'])
    from_id_field = safe_prop(fr['idField'])
    to_id_field = safe_prop(to['idField'])

    cypher = (
        f"MATCH (a:{from_label} {{{from_id_field}: $fromId}}), "
        f"(b:{to_label} {{{to_id_field}: $toId}}) "
        f"CREATE (a)-[r:{rel_type} $props]->(b) "
        "RETURN a, type(r), b"
    )
    result = run_write(cypher, {
        'fromId': fr['idValue'],
        'toId': to['idValue'],
        'props': body['properties'],
    })
    return Response(envelope(result, cypher), status=status.HTTP_201_CREATED)


@api_view(['PATCH'])
def patch_relacion(request):
    """PATCH /api/relaciones/patch/ — actualiza props de 1 relación.

    Body: {from:{label,idField,idValue}, to:{label,idField,idValue}, type, set:{}, remove:[]}
    """
    body = request.data or {}
    require_fields(body, ['from', 'to', 'type'])
    fr = body['from']
    to = body['to']
    set_dict = body.get('set') or {}
    remove_list = body.get('remove') or []

    from_label = safe_label(fr['label'])
    to_label = safe_label(to['label'])
    rel_type = safe_rel_type(body['type'])
    from_id_field = safe_prop(fr['idField'])
    to_id_field = safe_prop(to['idField'])

    set_cl = build_set_clause(set_dict, alias='r')
    rem_cl = build_remove_clause(remove_list, alias='r')
    if not set_cl and not rem_cl:
        return Response({'detail': 'Nada que actualizar'}, status=status.HTTP_400_BAD_REQUEST)

    cypher = (
        f"MATCH (a:{from_label} {{{from_id_field}: $fromId}})"
        f"-[r:{rel_type}]->"
        f"(b:{to_label} {{{to_id_field}: $toId}}) "
        f"{set_cl} {rem_cl} RETURN r"
    )
    result = run_write(cypher, {
        'fromId': fr['idValue'],
        'toId': to['idValue'],
        'set': set_dict,
    })
    return Response(envelope(result, cypher))


@api_view(['POST'])
def patch_relacion_bulk(request):
    """POST /api/relaciones/bulk-patch/ — actualiza props de múltiples relaciones.

    Body: {from_label, to_label, type, filter:{prop:value,...}, set:{}, remove:[]}
    """
    body = request.data or {}
    require_fields(body, ['from_label', 'to_label', 'type'])
    set_dict = body.get('set') or {}
    remove_list = body.get('remove') or []
    filter_dict = body.get('filter') or {}

    from_label = safe_label(body['from_label'])
    to_label = safe_label(body['to_label'])
    rel_type = safe_rel_type(body['type'])

    set_cl = build_set_clause(set_dict, alias='r')
    rem_cl = build_remove_clause(remove_list, alias='r')
    if not set_cl and not rem_cl:
        return Response({'detail': 'Nada que actualizar'}, status=status.HTTP_400_BAD_REQUEST)

    where_cl = build_filter_clause(filter_dict, alias='r', param_name='filter') if filter_dict else ''

    cypher = (
        f"MATCH (a:{from_label})-[r:{rel_type}]->(b:{to_label}) "
        f"{where_cl} {set_cl} {rem_cl} RETURN r"
    )
    result = run_write(cypher, {'set': set_dict, 'filter': filter_dict})
    return Response(envelope(result, cypher))


@api_view(['DELETE'])
def delete_relacion(request):
    """DELETE /api/relaciones/delete/ — elimina 1 relación.

    Query params: from_label, from_id_field, from_id_value, to_label, to_id_field, to_id_value, type
    """
    qp = request.query_params
    try:
        from_label = safe_label(qp['from_label'])
        to_label = safe_label(qp['to_label'])
        rel_type = safe_rel_type(qp['type'])
        from_id_field = safe_prop(qp['from_id_field'])
        to_id_field = safe_prop(qp['to_id_field'])
    except (KeyError, ValueError) as exc:
        return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    cypher = (
        f"MATCH (a:{from_label} {{{from_id_field}: $fromId}})"
        f"-[r:{rel_type}]->"
        f"(b:{to_label} {{{to_id_field}: $toId}}) "
        "WITH r, id(r) AS rid DELETE r RETURN count(rid) AS deleted"
    )
    result = run_write(cypher, {
        'fromId': qp.get('from_id_value', ''),
        'toId': qp.get('to_id_value', ''),
    })
    return Response(envelope(result, cypher))


@api_view(['POST'])
def delete_relacion_bulk(request):
    """POST /api/relaciones/bulk-delete/ — elimina múltiples relaciones.

    Body: {from_label, to_label, type, filter:{prop:value,...}}
    """
    body = request.data or {}
    require_fields(body, ['from_label', 'to_label', 'type'])
    filter_dict = body.get('filter') or {}

    from_label = safe_label(body['from_label'])
    to_label = safe_label(body['to_label'])
    rel_type = safe_rel_type(body['type'])

    where_cl = build_filter_clause(filter_dict, alias='r', param_name='filter') if filter_dict else ''

    cypher = (
        f"MATCH (a:{from_label})-[r:{rel_type}]->(b:{to_label}) "
        f"{where_cl} WITH r, id(r) AS rid DELETE r RETURN count(rid) AS deleted"
    )
    result = run_write(cypher, {'filter': filter_dict})
    return Response(envelope(result, cypher))


@api_view(['GET'])
def mis_relaciones(request):
    """GET /api/relaciones/mias/?usuario_id=<id>&type=POSTULO_A&idField=empleo_id

    Devuelve lista de IDs destino para que el frontend sepa qué relaciones ya existen.
    Acepta `usuario_id` o `userId` en el query string.
    """
    qp = request.query_params
    user_id = (qp.get('usuario_id') or qp.get('userId') or '').strip()
    rel_type = qp.get('type', '').strip()
    id_field = qp.get('idField', '').strip()

    if not user_id or not rel_type or not id_field:
        return Response({'ids': []})

    safe_type = safe_rel_type(rel_type)
    safe_field = safe_prop(id_field)

    cypher = (
        f"MATCH (u:Usuario {{usuario_id: $uid}})-[:{safe_type}]->(b) "
        f"RETURN b.{safe_field} AS id"
    )
    try:
        result = run_read(cypher, {'uid': user_id})
        ids = [row[0] for row in result.get('rows', []) if row[0]]
    except Exception:
        ids = []

    return Response({'ids': ids})


@api_view(['POST'])
def delete_nodos_bulk(request):
    """POST /api/relaciones/bulk-delete-nodos/ — elimina múltiples nodos.

    Body: {label, filter:{prop:value,...}}
    """
    body = request.data or {}
    require_fields(body, ['label'])
    filter_dict = body.get('filter') or {}

    label = safe_label(body['label'])

    where_cl = build_filter_clause(filter_dict, alias='n', param_name='filter') if filter_dict else ''

    cypher = (
        f"MATCH (n:{label}) {where_cl} "
        "WITH n, id(n) AS nid DETACH DELETE n RETURN count(nid) AS deleted"
    )
    result = run_write(cypher, {'filter': filter_dict})
    return Response(envelope(result, cypher))


@api_view(['PATCH'])
def patch_nodo(request):
    """PATCH /api/relaciones/patch-nodo/ — agrega/actualiza/elimina props de 1 nodo
    (label genérico).

    Body: {label, id_field, id_value, set:{}, remove:[]}
    """
    body = request.data or {}
    require_fields(body, ['label', 'id_field', 'id_value'])
    set_dict = body.get('set') or {}
    remove_list = body.get('remove') or []

    label = safe_label(body['label'])
    id_field = safe_prop(body['id_field'])

    set_cl = build_set_clause(set_dict, alias='n')
    rem_cl = build_remove_clause(remove_list, alias='n')
    if not set_cl and not rem_cl:
        return Response({'detail': 'Nada que actualizar'}, status=status.HTTP_400_BAD_REQUEST)

    cypher = (
        f"MATCH (n:{label} {{{id_field}: $id_value}}) "
        f"{set_cl} {rem_cl} RETURN n"
    )
    result = run_write(cypher, {'id_value': body['id_value'], 'set': set_dict})
    return Response(envelope(result, cypher))


@api_view(['POST'])
def query_nodos(request):
    """POST /api/relaciones/query-nodos/ — consulta nodos de un label con
    filtro opcional y devuelve sus propiedades.

    Body: {label, filter:{prop:value,...}, limit?, order_by?, dir?}
    """
    body = request.data or {}
    require_fields(body, ['label'])
    filter_dict = body.get('filter') or {}
    try:
        limit = max(1, min(200, int(body.get('limit', 25))))
    except (TypeError, ValueError):
        limit = 25

    label = safe_label(body['label'])
    where_cl = build_filter_clause(filter_dict, alias='n', param_name='filter') if filter_dict else ''

    order_clause = ''
    order_by = body.get('order_by')
    if order_by and ID_RE.match(order_by):
        direction = 'ASC' if str(body.get('dir', 'DESC')).upper() == 'ASC' else 'DESC'
        order_clause = f"ORDER BY n.{order_by} {direction}"

    cypher = f"MATCH (n:{label}) {where_cl} RETURN n {order_clause} LIMIT {limit}"
    result = run_read(cypher, {'filter': filter_dict})
    return Response(envelope(result, cypher))


@api_view(['POST'])
def patch_nodos_bulk(request):
    """POST /api/relaciones/bulk-patch-nodos/ — agrega/actualiza/elimina props
    de múltiples nodos (label genérico) con filtro opcional.

    Body: {label, filter:{prop:value,...}, set:{}, remove:[]}
    """
    body = request.data or {}
    require_fields(body, ['label'])
    filter_dict = body.get('filter') or {}
    set_dict = body.get('set') or {}
    remove_list = body.get('remove') or []

    label = safe_label(body['label'])

    set_cl = build_set_clause(set_dict, alias='n')
    rem_cl = build_remove_clause(remove_list, alias='n')
    if not set_cl and not rem_cl:
        return Response({'detail': 'Nada que actualizar'}, status=status.HTTP_400_BAD_REQUEST)

    where_cl = build_filter_clause(filter_dict, alias='n', param_name='filter') if filter_dict else ''

    cypher = (
        f"MATCH (n:{label}) {where_cl} {set_cl} {rem_cl} RETURN n"
    )
    result = run_write(cypher, {'set': set_dict, 'filter': filter_dict})
    return Response(envelope(result, cypher))
