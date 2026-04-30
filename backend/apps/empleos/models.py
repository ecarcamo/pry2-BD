"""Modelo del grafo: Empleo."""
from neomodel import (
    BooleanProperty,
    DateProperty,
    FloatProperty,
    StringProperty,
    StructuredNode,
)


class Empleo(StructuredNode):
    __label__ = 'Empleo'

    empleoId = StringProperty(unique_index=True, required=True)
    titulo = StringProperty(required=True)
    salario_min = FloatProperty(default=0.0)
    salario_max = FloatProperty(default=0.0)
    modalidad = StringProperty(default='presencial')
    activo = BooleanProperty(default=True)
    fecha_publicacion = DateProperty()
