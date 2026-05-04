"""Endpoints de salud y passthrough Cypher."""
from django.conf import settings
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

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
