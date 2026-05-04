"""Wrapper sobre el driver oficial neo4j para queries arbitrarias.

neomodel se usa para los modelos del grafo, pero aquí queremos ejecutar
Cypher directo y devolver columnas/filas/stats igual que el backend Node viejo.
Mantenemos un único driver para toda la app.
"""
from threading import Lock

from django.conf import settings
from neo4j import GraphDatabase, basic_auth

from .serialize import records_to_rows

_driver = None
_lock = Lock()


def get_driver():
    global _driver
    if _driver is None:
        with _lock:
            if _driver is None:
                _driver = GraphDatabase.driver(
                    settings.NEO4J_URI,
                    auth=basic_auth(settings.NEO4J_USERNAME, settings.NEO4J_PASSWORD),
                )
    return _driver


def run_query(cypher, params=None, mode='read'):
    params = params or {}
    driver = get_driver()
    with driver.session(database=settings.NEO4J_DATABASE) as session:
        runner = session.execute_read if mode == 'read' else session.execute_write

        def _work(tx):
            result = tx.run(cypher, **params)
            records = list(result)
            summary = result.consume()
            return records, summary

        records, summary = runner(_work)
    return records_to_rows(records, summary)


def run_read(cypher, params=None):
    return run_query(cypher, params, mode='read')


def run_write(cypher, params=None):
    return run_query(cypher, params, mode='write')


def run_auto(cypher, params=None):
    """Auto-commit (implicit) transaction — required for CALL { } IN TRANSACTIONS."""
    params = params or {}
    driver = get_driver()
    with driver.session(database=settings.NEO4J_DATABASE) as session:
        result = session.run(cypher, **params)
        records = list(result)
        summary = result.consume()
    return records_to_rows(records, summary)


def verify_connectivity():
    get_driver().verify_connectivity()


def close_driver():
    global _driver
    if _driver is not None:
        _driver.close()
        _driver = None
