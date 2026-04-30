"""Endpoints REST para relaciones del dominio (rúbrica 6).

Cada relación crea con `properties` ≥3 según el modelo de [proyecto_grafo.md].
Ruta genérica `/api/relaciones/` permite cualquier (label, idField) tipado.
"""
from datetime import date

from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from apps.core.lib.cypher_build import safe_label, safe_prop, safe_rel_type
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
def empleos_historial(request):
    body = request.data or {}
    require_fields(body, ['userId', 'empresaId', 'cargo'])
    props = {
        'cargo': body['cargo'],
        'fecha_inicio': body.get('fecha_inicio') or _today(),
        'actual': bool(body.get('actual', True)),
    }
    cypher = (
        "MATCH (u:Usuario {userId: $userId}), (e:Empresa {empresaId: $empresaId}) "
        "CREATE (u)-[r:ESTAR_EN $props]->(e) "
        "RETURN u, type(r), e"
    )
    return _create_rel(cypher, {
        'userId': body['userId'], 'empresaId': body['empresaId'], 'props': props,
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
