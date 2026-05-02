"""Modelos de relaciones del grafo (StructuredRel) — documentan props.

Los endpoints crean estas relaciones via Cypher directo. Estos modelos
sirven como fuente de verdad del shape de cada relación.
"""
from neomodel import (
    BooleanProperty,
    DateProperty,
    StringProperty,
    StructuredRel,
)


class ConectadoConRel(StructuredRel):
    fecha_conexion = DateProperty()
    nivel = StringProperty(default='1er')
    aceptada = BooleanProperty(default=True)


class PublicoRel(StructuredRel):
    fecha = DateProperty()
    anonimo = BooleanProperty(default=False)
    desde_empresa = BooleanProperty(default=False)


class DioLikeRel(StructuredRel):
    fecha = DateProperty()
    tipo_reaccion = StringProperty(default='me_gusta')
    notificado = BooleanProperty(default=False)


class ComentoRel(StructuredRel):
    contenido = StringProperty(required=True)
    fecha = DateProperty()
    editado = BooleanProperty(default=False)


class CompartioRel(StructuredRel):
    fecha = DateProperty()
    con_comentario = BooleanProperty(default=False)
    visibilidad = StringProperty(default='pública')


class PostuloARel(StructuredRel):
    fecha_postulacion = DateProperty()
    estado = StringProperty(default='pendiente')
    carta_presentacion = BooleanProperty(default=False)


class SigueARel(StructuredRel):
    fecha_seguimiento = DateProperty()
    notificaciones = BooleanProperty(default=True)
    motivo = StringProperty(default='')


class TrabajoEnRel(StructuredRel):
    fecha_inicio = DateProperty()
    fecha_fin    = DateProperty()
    verificado   = BooleanProperty(default=False)


class ExperienciaEnRel(StructuredRel):
    departamento  = StringProperty(default='')
    tipo_contrato = StringProperty(default='tiempo_completo')
    modalidad     = StringProperty(default='presencial')


class EstudioEnRel(StructuredRel):
    fecha_inicio = DateProperty()
    fecha_graduacion = DateProperty()
    graduado = BooleanProperty(default=False)


class OfertaRel(StructuredRel):
    fecha_publicacion = DateProperty()
    urgente = BooleanProperty(default=False)
    remunerado = BooleanProperty(default=True)


class MencionaRel(StructuredRel):
    fecha = DateProperty()
    tipo = StringProperty(default='etiqueta')
    confirmada = BooleanProperty(default=False)
