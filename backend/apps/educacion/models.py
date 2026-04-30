"""Modelo del grafo: Educacion."""
from neomodel import (
    BooleanProperty,
    StringProperty,
    StructuredNode,
)


class Educacion(StructuredNode):
    __label__ = 'Educacion'

    educacionId = StringProperty(unique_index=True, required=True)
    institucion = StringProperty(required=True)
    carrera = StringProperty(required=True)
    grado = StringProperty(required=True)
    pais = StringProperty(required=True)
    acreditada = BooleanProperty(default=False)
