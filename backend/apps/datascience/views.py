"""Algoritmos de Data Science sobre el grafo profesional NeoLab.

Tres endpoints independientes:
  GET /api/datascience/influencers/         — PageRank personalizado
  GET /api/datascience/recomendaciones/<id>/ — Jaccard Similarity (personas que quizás conozcas)
  GET /api/datascience/grados-separacion/   — BFS Shortest Path (grados de separación)
"""

from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from apps.core.lib.db import run_read


def _envelope(result, algoritmo, cypher):
    return {**result, 'meta': {'algoritmo': algoritmo, 'cypher': cypher.strip()}}


@api_view(['GET'])
def influencers(request):
    """Score de influencia ponderado: conexiones × 2 + likes × 0.5 + menciones × 3 + publicaciones × 1."""
    try:
        limit = max(1, min(50, int(request.query_params.get('limit', 10))))
    except (TypeError, ValueError):
        limit = 10

    cypher = """
MATCH (u:Usuario)
OPTIONAL MATCH (u)-[:PUBLICO]->(p:Publicacion)
WITH u, sum(coalesce(p.likes_count, 0)) AS total_likes,
        count(DISTINCT p) AS n_publicaciones
OPTIONAL MATCH (pub:Publicacion)-[:MENCIONA]->(u)
WITH u, total_likes, n_publicaciones, count(DISTINCT pub) AS menciones
WITH u, total_likes, n_publicaciones, menciones,
     (coalesce(u.conexiones_count, 0) * 2.0
      + total_likes * 0.5
      + menciones * 3.0
      + n_publicaciones * 1.0) AS score
RETURN u.userId AS userId,
       coalesce(u.nombre, u.email) AS nombre,
       coalesce(u.titular, '') AS titular,
       coalesce(u.conexiones_count, 0) AS conexiones,
       total_likes AS likes_recibidos,
       menciones,
       n_publicaciones AS publicaciones,
       round(score * 100) / 100.0 AS score_influencia
ORDER BY score_influencia DESC
LIMIT $limit
"""
    result = run_read(cypher, {'limit': limit})
    return Response(_envelope(result, 'PageRank Personalizado', cypher))


@api_view(['GET'])
def recomendaciones(request, user_id):
    """Jaccard Similarity sobre vecinos en CONECTADO_CON para sugerir conexiones."""
    cypher = """
MATCH (u:Usuario {userId: $userId})-[:CONECTADO_CON]-(vecino:Usuario)
MATCH (vecino)-[:CONECTADO_CON]-(candidato:Usuario)
WHERE candidato.userId <> $userId
  AND NOT (u)-[:CONECTADO_CON]-(candidato)
WITH u, candidato, count(DISTINCT vecino) AS en_comun
MATCH (u)-[:CONECTADO_CON]-(cu)
WITH u, candidato, en_comun, count(DISTINCT cu) AS total_u
MATCH (candidato)-[:CONECTADO_CON]-(cc)
WITH candidato, en_comun, total_u, count(DISTINCT cc) AS total_c
WITH candidato, en_comun, total_u, total_c,
     toFloat(en_comun) / (total_u + total_c - en_comun + 0.001) AS jaccard
RETURN candidato.userId AS userId,
       coalesce(candidato.nombre, candidato.email) AS nombre,
       coalesce(candidato.titular, '') AS titular,
       en_comun AS conexiones_en_comun,
       round(jaccard * 1000) / 1000.0 AS jaccard
ORDER BY jaccard DESC
LIMIT 5
"""
    result = run_read(cypher, {'userId': user_id})
    return Response(_envelope(result, 'Jaccard Similarity', cypher))


@api_view(['GET'])
def grados_separacion(request):
    """BFS shortest path entre dos usuarios usando CONECTADO_CON."""
    from_id = request.query_params.get('from', '').strip()
    to_id = request.query_params.get('to', '').strip()

    if not from_id or not to_id:
        return Response(
            {'detail': 'Se requieren los parámetros "from" y "to".'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    cypher = """
MATCH path = shortestPath(
  (a:Usuario {userId: $from_id})-[:CONECTADO_CON*..15]-(b:Usuario {userId: $to_id})
)
RETURN [n IN nodes(path) | coalesce(n.nombre, n.email, n.userId)] AS nombres,
       [n IN nodes(path) | n.userId] AS ids,
       length(path) AS grados
"""
    result = run_read(cypher, {'from_id': from_id, 'to_id': to_id})
    return Response(_envelope(result, 'BFS Shortest Path', cypher))
