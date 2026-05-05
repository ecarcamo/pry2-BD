"""Endpoints de salud, passthrough Cypher, grafo sample, seed y carga CSV."""
import csv as csv_module
import io

from django.conf import settings
from rest_framework import status
from rest_framework.decorators import api_view, parser_classes
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response

from .lib.cypher_build import safe_label, safe_prop, safe_rel_type
from .lib.db import run_read, run_write, run_auto, verify_connectivity


@api_view(['GET'])
def ping(_request):
    try:
        verify_connectivity()
    except Exception as exc:
        return Response(
            {'status': 'error', 'detail': str(exc)},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )
    return Response({
        'status': 'pong',
        'neo4j': 'ok',
        'database': settings.NEO4J_DATABASE,
        'instance': settings.AURA_INSTANCENAME,
    })


@api_view(['POST'])
def cypher_passthrough(request):
    body = request.data or {}
    query = body.get('query')
    params = body.get('params') or {}
    mode = body.get('mode', 'read')

    if not isinstance(query, str) or not query.strip():
        return Response({'detail': 'query requerido'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        if mode == 'auto':
            result = run_auto(query, params)
        elif mode == 'write':
            result = run_write(query, params)
        else:
            result = run_read(query, params)
    except Exception as exc:
        return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    return Response(result)


@api_view(['GET'])
def grafo_sample(request):
    """Devuelve un sample del grafo real garantizando relaciones visibles.

    Estrategia: toma N nodos semilla y expande 1 hop → todos los vecinos
    directos se incluyen, por lo que TODAS las relaciones retornadas tienen
    ambos extremos en el resultado.

    GET /api/grafo/sample/?limit=150&label=<Label>
    """
    qp = request.query_params
    allowed_labels = {'Usuario', 'Empresa', 'Publicacion', 'Empleo', 'Educacion', 'Admin', 'Reclutador'}

    try:
        limit = max(10, min(10000, int(qp.get('limit', 150))))
    except (TypeError, ValueError):
        limit = 150

    label_filter = qp.get('label', '').strip()
    fetch_all = limit >= 10000

    nodes_map: dict = {}
    rels_list: list = []

    try:
        # ── Traer nodos ───────────────────────────────────────────────────
        if label_filter and label_filter in allowed_labels:
            node_cypher = f"MATCH (n:{label_filter}) RETURN n" + ("" if fetch_all else " LIMIT $limit")
        else:
            node_cypher = "MATCH (n) RETURN n" + ("" if fetch_all else " LIMIT $limit")

        node_result = run_read(node_cypher, {} if fetch_all else {'limit': limit})
        node_cols = node_result.get('columns', [])
        for row in node_result.get('rows', []):
            n = dict(zip(node_cols, row)).get('n')
            if isinstance(n, dict) and n.get('elementId'):
                nodes_map[n['elementId']] = {
                    'id': n['elementId'],
                    'labels': n.get('labels', []),
                    'props': n.get('props', {}),
                }

        # ── Traer relaciones ──────────────────────────────────────────────
        if label_filter and label_filter in allowed_labels:
            rel_cypher = f"MATCH (a:{label_filter})-[r]->(b) RETURN a, r, b" + ("" if fetch_all else " LIMIT $limit")
        else:
            rel_cypher = "MATCH (a)-[r]->(b) RETURN a, r, b" + ("" if fetch_all else " LIMIT $limit")

        rel_result = run_read(rel_cypher, {} if fetch_all else {'limit': limit * 3})
        rel_cols = rel_result.get('columns', [])
        for row in rel_result.get('rows', []):
            row_dict = dict(zip(rel_cols, row))
            r = row_dict.get('r')
            if isinstance(r, dict) and r.get('elementId'):
                rels_list.append({
                    'id': r['elementId'],
                    'type': r.get('type', ''),
                    'from': r.get('from', ''),
                    'to': r.get('to', ''),
                    'props': r.get('props', {}),
                })

    except Exception as exc:
        return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    nodes_list = list(nodes_map.values())
    node_ids_set = {n['id'] for n in nodes_list}
    rels_filtered = [r for r in rels_list if r['from'] in node_ids_set and r['to'] in node_ids_set]

    return Response({'nodes': nodes_list, 'rels': rels_filtered})


@api_view(['POST'])
def admin_seed(request):
    """POST /api/admin/seed/ — ejecuta el seed desde CSVs y devuelve conteos."""
    from django.core import management
    out = io.StringIO()
    try:
        management.call_command('seed', stdout=out)
    except Exception as exc:
        return Response({'detail': str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    return Response({'status': 'ok', 'log': out.getvalue()})


# ─── Carga CSV (rúbrica: "carga de datos nuevos por medio de un archivo CSV") ──

ALLOWED_NODE_LABELS = {'Usuario', 'Empresa', 'Publicacion', 'Empleo', 'Educacion'}
LIST_PROPS = {'habilidades', 'tags'}
BOOL_PROPS = {
    'abierto_a_trabajo', 'verificada', 'activo', 'es_oferta', 'acreditada',
    'aceptada', 'notificado', 'editado', 'con_comentario', 'graduado',
    'urgente', 'remunerado', 'notificaciones', 'desde_empresa', 'anonimo',
    'confirmada', 'actual',
}
INT_PROPS = {'conexiones_count', 'empleados_count', 'likes_count'}
FLOAT_PROPS = {'salario_min', 'salario_max', 'salario'}
DATE_PROPS = {
    'fecha_registro', 'fecha_publicacion', 'fecha_fundacion',
    'fecha_conexion', 'fecha', 'fecha_postulacion', 'fecha_inicio',
    'fecha_fin', 'fecha_graduacion', 'fecha_seguimiento',
}


def _coerce(key, val):
    """Convierte el valor del CSV al tipo Python apropiado según la propiedad."""
    if val is None:
        return None
    sval = str(val)
    if key in LIST_PROPS:
        return [s.strip() for s in sval.split(';') if s.strip()]
    if key in BOOL_PROPS:
        return sval.strip().lower() == 'true'
    if key in INT_PROPS:
        try:
            return int(sval) if sval else 0
        except (TypeError, ValueError):
            return 0
    if key in FLOAT_PROPS:
        try:
            return float(sval) if sval else 0.0
        except (TypeError, ValueError):
            return 0.0
    return sval


def _parse_csv(upload):
    try:
        text = upload.read().decode('utf-8-sig')
    except UnicodeDecodeError:
        raise ValueError('El CSV debe estar en UTF-8')
    reader = csv_module.DictReader(io.StringIO(text))
    rows = []
    for raw in reader:
        clean = {}
        for k, v in raw.items():
            if k is None:
                continue
            clean[k] = _coerce(k, v)
        rows.append(clean)
    return rows, reader.fieldnames or []


@api_view(['POST'])
@parser_classes([MultiPartParser, FormParser])
def load_csv_nodes(request):
    """POST /api/load-csv/nodes/ — sube un CSV y crea nodos.

    multipart/form-data:
      file:  archivo CSV con header (la 1ra columna debe ser el id del nodo)
      label: una de Usuario, Empresa, Publicacion, Empleo, Educacion
    """
    upload = request.FILES.get('file')
    label_raw = (request.data.get('label') or '').strip()

    if not upload:
        return Response({'detail': 'file requerido'}, status=status.HTTP_400_BAD_REQUEST)
    if label_raw not in ALLOWED_NODE_LABELS:
        return Response(
            {'detail': f'label inválida (permitidas: {sorted(ALLOWED_NODE_LABELS)})'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        rows, headers = _parse_csv(upload)
    except ValueError as exc:
        return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    if not rows:
        return Response({'detail': 'CSV vacío'}, status=status.HTTP_400_BAD_REQUEST)

    label = safe_label(label_raw)
    date_props_in_csv = [p for p in DATE_PROPS if p in headers]
    date_set = ', '.join(
        f"n.{p} = CASE WHEN n.{p} IS NOT NULL AND n.{p} <> '' "
        f"THEN date(n.{p}) ELSE null END"
        for p in date_props_in_csv
    )

    cypher = f"UNWIND $rows AS row CREATE (n:{label}) SET n = row"
    if date_set:
        cypher += f" WITH n SET {date_set}"
    cypher += " RETURN count(n) AS creados"

    try:
        result = run_write(cypher, {'rows': rows})
    except Exception as exc:
        return Response({'detail': str(exc), 'cypher': cypher}, status=status.HTTP_400_BAD_REQUEST)

    creados = result.get('rows', [[0]])[0][0] if result.get('rows') else 0
    return Response({
        'creados': creados,
        'label': label_raw,
        'columnas': headers,
        'cypher': cypher,
    })


@api_view(['POST'])
@parser_classes([MultiPartParser, FormParser])
def load_csv_rels(request):
    """POST /api/load-csv/rels/ — sube un CSV y crea relaciones entre nodos existentes.

    multipart/form-data:
      file:           CSV con header. Las primeras 2 columnas son los IDs
                      de los extremos (en cualquier orden). El resto son props.
      from_label:     label del nodo origen (ej. Usuario)
      from_id_field:  propiedad-id del origen en el grafo (ej. usuario_id)
      from_id_column: nombre de la columna en el CSV con el id del origen
      to_label:       label del nodo destino
      to_id_field:    propiedad-id del destino
      to_id_column:   nombre de la columna en el CSV con el id del destino
      type:           tipo de relación (ej. SIGUE_A)
    """
    upload = request.FILES.get('file')
    body = request.data
    required = ['from_label', 'from_id_field', 'from_id_column',
                'to_label', 'to_id_field', 'to_id_column', 'type']
    missing = [k for k in required if not (body.get(k) or '').strip()]
    if not upload:
        missing.insert(0, 'file')
    if missing:
        return Response({'detail': f'Faltan: {", ".join(missing)}'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        from_label = safe_label(body['from_label'].strip())
        to_label = safe_label(body['to_label'].strip())
        rel_type = safe_rel_type(body['type'].strip())
        from_id_field = safe_prop(body['from_id_field'].strip())
        to_id_field = safe_prop(body['to_id_field'].strip())
    except (ValueError, KeyError) as exc:
        return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    from_id_col = body['from_id_column'].strip()
    to_id_col = body['to_id_column'].strip()

    try:
        rows, headers = _parse_csv(upload)
    except ValueError as exc:
        return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    if not rows:
        return Response({'detail': 'CSV vacío'}, status=status.HTTP_400_BAD_REQUEST)
    if from_id_col not in headers or to_id_col not in headers:
        return Response(
            {'detail': f'Columnas {from_id_col!r} o {to_id_col!r} no están en el CSV. Disponibles: {headers}'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    prop_keys = [h for h in headers if h not in (from_id_col, to_id_col)]
    date_props_in_csv = [p for p in DATE_PROPS if p in prop_keys]

    norm_rows = []
    for r in rows:
        props = {}
        for k in prop_keys:
            v = r.get(k)
            if k in date_props_in_csv:
                props[k] = str(v) if v not in (None, '') else None
            else:
                props[k] = v
        norm_rows.append({
            '_from': r.get(from_id_col),
            '_to': r.get(to_id_col),
            'props': props,
        })

    date_set = ', '.join(
        f"r.{p} = CASE WHEN row.props.{p} IS NOT NULL AND row.props.{p} <> '' "
        f"THEN date(row.props.{p}) ELSE null END"
        for p in date_props_in_csv
    )

    cypher = (
        "UNWIND $rows AS row "
        f"MATCH (a:{from_label} {{{from_id_field}: row._from}}), "
        f"(b:{to_label} {{{to_id_field}: row._to}}) "
        f"MERGE (a)-[r:{rel_type}]->(b) "
        "SET r += row.props"
    )
    if date_set:
        cypher += f" SET {date_set}"
    cypher += " RETURN count(r) AS creadas"

    try:
        result = run_write(cypher, {'rows': norm_rows})
    except Exception as exc:
        return Response({'detail': str(exc), 'cypher': cypher}, status=status.HTTP_400_BAD_REQUEST)

    creadas = result.get('rows', [[0]])[0][0] if result.get('rows') else 0
    return Response({
        'creadas': creadas,
        'tipo': rel_type,
        'columnas': headers,
        'cypher': cypher,
    })
