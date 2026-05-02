"""Modelo del grafo: ExperienciaLaboral."""
from neomodel import (
    BooleanProperty,
    FloatProperty,
    StringProperty,
    StructuredNode,
)


class ExperienciaLaboral(StructuredNode):
    __label__ = 'ExperienciaLaboral'

    expId       = StringProperty(unique_index=True, required=True)
    cargo       = StringProperty(required=True)
    salario     = FloatProperty(default=0.0)
    descripcion = StringProperty(default='')
    activo      = BooleanProperty(default=True)
