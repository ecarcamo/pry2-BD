"""Modelo del grafo: Publicacion."""
from neomodel import (
    ArrayProperty,
    BooleanProperty,
    DateProperty,
    IntegerProperty,
    RelationshipTo,
    StringProperty,
    StructuredNode,
)


class Publicacion(StructuredNode):
    __label__ = 'Publicacion'

    postId = StringProperty(unique_index=True, required=True)
    contenido = StringProperty(required=True)
    fecha_publicacion = DateProperty()
    likes_count = IntegerProperty(default=0)
    tags = ArrayProperty(StringProperty(), default=list)
    es_oferta = BooleanProperty(default=False)

    menciona = RelationshipTo('apps.usuarios.models.Usuario', 'MENCIONA')
