"""Endpoints REST para relaciones del dominio (rúbrica 6).

Cada relación crea con `properties` ≥3 según el modelo de [proyecto_grafo.md].
Ruta genérica `/api/relaciones/` permite cualquier (label, idField) tipado.
"""
from datetime import date

from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from apps.core.lib.cypher_build import (
    build_filter_clause,
    build_remove_clause,
    build_set_clause,
    safe_label,
    safe_prop,
    safe_rel_type,
)
from apps.core.lib.db import run_write
from apps.core.lib.validate import require_fields, require_min_props
from apps.core.lib.views import envelope


def _today():
    return date.today().isoformat()


def _create_rel(cypher, params):
    result = run_write(cypher, params)
    return Response(envelope(result, cypher), status=status.HTTP_201_CREATED)


@api_view(['POST'])
def conexiones(request):
    """CONECTADO_CON entre dos Usuario."""
    body = request.data or {}
    require_fields(body, ['userIdA', 'userIdB'])
    props = {
        'fecha_conexion': body.get('fecha_conexion') or _today(),
        'nivel': body.get('nivel', '1er'),
        'aceptada': bool(body.get('aceptada', True)),
    }
    cypher = (
        "MATCH (a:Usuario {userId: $userIdA}), (b:Usuario {userId: $userIdB}) "
        "CREATE (a)-[r:CONECTADO_CON $props]->(b) "
        "RETURN a, type(r), b"
    )
    return _create_rel(cypher, {
        'userIdA': body['userIdA'], 'userIdB': body['userIdB'], 'props': props,
    })


@api_view(['POST'])
def likes(request):
    body = request.data or {}
    require_fields(body, ['userId', 'postId'])
    props = {
        'fecha': body.get('fecha') or _today(),
        'tipo_reaccion': body.get('tipo_reaccion', 'me_gusta'),
        'notificado': bool(body.get('notificado', False)),
    }
    cypher = (
        "MATCH (u:Usuario {userId: $userId}), (p:Publicacion {postId: $postId}) "
        "CREATE (u)-[r:DIO_LIKE $props]->(p) "
        "RETURN u, type(r), p"
    )
    return _create_rel(cypher, {
        'userId': body['userId'], 'postId': body['postId'], 'props': props,
    })


@api_view(['POST'])
def comentarios(request):
    body = request.data or {}
    require_fields(body, ['userId', 'postId', 'contenido'])
    props = {
        'contenido': body['contenido'],
        'fecha': body.get('fecha') or _today(),
        'editado': bool(body.get('editado', False)),
    }
    cypher = (
        "MATCH (u:Usuario {userId: $userId}), (p:Publicacion {postId: $postId}) "
        "CREATE (u)-[r:COMENTO $props]->(p) "
        "RETURN u, type(r), p"
    )
    return _create_rel(cypher, {
        'userId': body['userId'], 'postId': body['postId'], 'props': props,
    })


@api_view(['POST'])
def compartidos(request):
    body = request.data or {}
    require_fields(body, ['userId', 'postId'])
    props = {
        'fecha': body.get('fecha') or _today(),
        'con_comentario': bool(body.get('con_comentario', False)),
        'visibilidad': body.get('visibilidad', 'pública'),
    }
    cypher = (
        "MATCH (u:Usuario {userId: $userId}), (p:Publicacion {postId: $postId}) "
        "CREATE (u)-[r:COMPARTIO $props]->(p) "
        "RETURN u, type(r), p"
    )
    return _create_rel(cypher, {
        'userId': body['userId'], 'postId': body['postId'], 'props': props,
    })


@api_view(['POST'])
def postulaciones(request):
    body = request.data or {}
    require_fields(body, ['userId', 'empleoId'])
    props = {
        'fecha_postulacion': body.get('fecha_postulacion') or _today(),
        'estado': body.get('estado', 'pendiente'),
        'carta_presentacion': bool(body.get('carta_presentacion', False)),
    }
    cypher = (
        "MATCH (u:Usuario {userId: $userId}), (j:Empleo {empleoId: $empleoId}) "
        "CREATE (u)-[r:POSTULO_A $props]->(j) "
        "RETURN u, type(r), j"
    )
    return _create_rel(cypher, {
        'userId': body['userId'], 'empleoId': body['empleoId'], 'props': props,
    })


@api_view(['POST'])
def seguimientos(request):
    body = request.data or {}
    require_fields(body, ['userId', 'empresaId'])
    props = {
        'fecha_seguimiento': body.get('fecha_seguimiento') or _today(),
        'notificaciones': bool(body.get('notificaciones', True)),
        'motivo': body.get('motivo', ''),
    }
    cypher = (
        "MATCH (u:Usuario {userId: $userId}), (e:Empresa {empresaId: $empresaId}) "
        "CREATE (u)-[r:SIGUE_A $props]->(e) "
        "RETURN u, type(r), e"
    )
    return _create_rel(cypher, {
        'userId': body['userId'], 'empresaId': body['empresaId'], 'props': props,
    })


@api_view(['POST'])
def trabajo_en(request):
    """TRABAJO_EN: Usuario → ExperienciaLaboral."""
    body = request.data or {}
    require_fields(body, ['userId', 'expId'])
    props = {
        'fecha_inicio': body.get('fecha_inicio') or _today(),
        'fecha_fin':    body.get('fecha_fin', ''),
        'verificado':   bool(body.get('verificado', False)),
    }
    cypher = (
        "MATCH (u:Usuario {userId: $userId}), "
        "(exp:ExperienciaLaboral {expId: $expId}) "
        "CREATE (u)-[r:TRABAJO_EN $props]->(exp) "
        "RETURN u, type(r), exp"
    )
    return _create_rel(cypher, {
        'userId': body['userId'], 'expId': body['expId'], 'props': props,
    })


@api_view(['POST'])
def experiencia_en(request):
    """EXPERIENCIA_EN: ExperienciaLaboral → Empresa."""
    body = request.data or {}
    require_fields(body, ['expId', 'empresaId'])
    props = {
        'departamento':  body.get('departamento', ''),
        'tipo_contrato': body.get('tipo_contrato', 'tiempo_completo'),
        'modalidad':     body.get('modalidad', 'presencial'),
    }
    cypher = (
        "MATCH (exp:ExperienciaLaboral {expId: $expId}), "
        "(e:Empresa {empresaId: $empresaId}) "
        "CREATE (exp)-[r:EXPERIENCIA_EN $props]->(e) "
        "RETURN exp, type(r), e"
    )
    return _create_rel(cypher, {
        'expId': body['expId'], 'empresaId': body['empresaId'], 'props': props,
    })


@api_view(['POST'])
def estudios(request):
    body = request.data or {}
    require_fields(body, ['userId', 'educacionId'])
    props = {
        'fecha_inicio': body.get('fecha_inicio') or _today(),
        'fecha_graduacion': body.get('fecha_graduacion', ''),
        'graduado': bool(body.get('graduado', False)),
    }
    cypher = (
        "MATCH (u:Usuario {userId: $userId}), (ed:Educacion {educacionId: $educacionId}) "
        "CREATE (u)-[r:ESTUDIO_EN $props]->(ed) "
        "RETURN u, type(r), ed"
    )
    return _create_rel(cypher, {
        'userId': body['userId'], 'educacionId': body['educacionId'], 'props': props,
    })


@api_view(['POST'])
def menciones(request):
    body = request.data or {}
    require_fields(body, ['postId', 'userId'])
    props = {
        'fecha': body.get('fecha') or _today(),
        'tipo': body.get('tipo', 'etiqueta'),
        'confirmada': bool(body.get('confirmada', False)),
    }
    cypher = (
        "MATCH (p:Publicacion {postId: $postId}), (u:Usuario {userId: $userId}) "
        "CREATE (p)-[r:MENCIONA $props]->(u) "
        "RETURN p, type(r), u"
    )
    return _create_rel(cypher, {
        'postId': body['postId'], 'userId': body['userId'], 'props': props,
    })


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
