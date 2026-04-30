"""Modelo del grafo: Empresa."""
from neomodel import (
    BooleanProperty,
    DateProperty,
    IntegerProperty,
    RelationshipTo,
    StringProperty,
    StructuredNode,
)


class Empresa(StructuredNode):
    __label__ = 'Empresa'

    empresaId = StringProperty(unique_index=True, required=True)
    nombre = StringProperty(required=True)
    industria = StringProperty(required=True)
    pais = StringProperty(required=True)
    verificada = BooleanProperty(default=False)
    empleados_count = IntegerProperty(default=0)
    fecha_fundacion = DateProperty()

    oferta = RelationshipTo('apps.empleos.models.Empleo', 'OFERTA')
