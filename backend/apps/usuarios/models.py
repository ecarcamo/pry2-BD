"""Modelo del grafo: Usuario (y variante con label adicional Admin).

Documenta el shape del nodo `:Usuario` para neomodel. La creación/lectura
real se sigue haciendo con Cypher directo desde las views (para devolver
columnas/filas/stats compatibles con el frontend), pero estos modelos
sirven como fuente de verdad del esquema y permiten usar neomodel cuando
no se necesita serialización tabular.
"""
from neomodel import (
    ArrayProperty,
    BooleanProperty,
    DateProperty,
    IntegerProperty,
    Relationship,
    RelationshipFrom,
    RelationshipTo,
    StringProperty,
    StructuredNode,
    UniqueIdProperty,
)


class Usuario(StructuredNode):
    """Nodo `:Usuario`."""

    __label__ = 'Usuario'

    userId = StringProperty(unique_index=True, required=True)
    nombre = StringProperty(required=True)
    email = StringProperty(unique_index=True, required=True)
    titular = StringProperty(default='')
    habilidades = ArrayProperty(StringProperty(), default=list)
    abierto_a_trabajo = BooleanProperty(default=False)
    fecha_registro = DateProperty()
    conexiones_count = IntegerProperty(default=0)

    # Relaciones salientes
    conectado_con = Relationship('Usuario', 'CONECTADO_CON')
    publico = RelationshipTo('apps.publicaciones.models.Publicacion', 'PUBLICO')
    dio_like = RelationshipTo('apps.publicaciones.models.Publicacion', 'DIO_LIKE')
    comento = RelationshipTo('apps.publicaciones.models.Publicacion', 'COMENTO')
    compartio = RelationshipTo('apps.publicaciones.models.Publicacion', 'COMPARTIO')
    postulo_a = RelationshipTo('apps.empleos.models.Empleo', 'POSTULO_A')
    sigue_a = RelationshipTo('apps.empresas.models.Empresa', 'SIGUE_A')
    estar_en = RelationshipTo('apps.empresas.models.Empresa', 'ESTAR_EN')
    estudio_en = RelationshipTo('apps.educacion.models.Educacion', 'ESTUDIO_EN')

    # Relaciones entrantes (declaradas para navegación)
    mencionado_en = RelationshipFrom('apps.publicaciones.models.Publicacion', 'MENCIONA')


class Admin(Usuario):
    """Variante con label adicional `:Admin` (rúbrica: 2+ labels)."""

    __label__ = 'Admin'

    nivel_acceso = StringProperty(default='moderador')
    puede_moderar = BooleanProperty(default=True)
    fecha_asignacion = DateProperty()
    asignado_por = StringProperty(default='')
    activo = BooleanProperty(default=True)
