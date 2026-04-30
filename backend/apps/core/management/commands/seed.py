"""`python manage.py seed` — borra todo y carga el seed (espejo de frontend/seed.js)."""
from django.core.management.base import BaseCommand

from apps.core.lib.db import close_driver, run_write

NODES = [
    {'id': 'n1', 'labels': ['Usuario'], 'props': {
        'userId': 'n1', 'nombre': 'Nicolás Concuá', 'email': 'nconcua@uvg.edu.gt',
        'titular': 'Backend Developer en Datatec',
        'habilidades': ['Python', 'Neo4j', 'Cypher', 'Docker'],
        'abierto_a_trabajo': True, 'fecha_registro': '2023-01-15', 'conexiones_count': 142,
    }},
    {'id': 'n2', 'labels': ['Usuario', 'Admin'], 'props': {
        'userId': 'n2', 'nombre': 'Esteban Cárcamo', 'email': 'ecarcamo@uvg.edu.gt',
        'titular': 'Database Architect & Platform Admin',
        'habilidades': ['PostgreSQL', 'Cypher', 'Kubernetes'],
        'abierto_a_trabajo': False, 'fecha_registro': '2022-08-03', 'conexiones_count': 287,
        'nivel_acceso': 'superadmin', 'puede_moderar': True,
        'fecha_asignacion': '2023-02-10', 'asignado_por': 'Mario Barrientos', 'activo': True,
    }},
    {'id': 'n3', 'labels': ['Usuario'], 'props': {
        'userId': 'n3', 'nombre': 'Ernesto Ascencio', 'email': 'eascencio@uvg.edu.gt',
        'titular': 'Data Engineer en Cloudly',
        'habilidades': ['Spark', 'Cypher', 'SQL', 'Python'],
        'abierto_a_trabajo': True, 'fecha_registro': '2023-03-20', 'conexiones_count': 96,
    }},
    {'id': 'n4', 'labels': ['Usuario'], 'props': {
        'userId': 'n4', 'nombre': 'María López', 'email': 'mlopez@correo.com',
        'titular': 'Frontend Developer',
        'habilidades': ['React', 'TypeScript', 'CSS'],
        'abierto_a_trabajo': False, 'fecha_registro': '2024-05-11', 'conexiones_count': 53,
    }},
    {'id': 'n5', 'labels': ['Usuario'], 'props': {
        'userId': 'n5', 'nombre': 'Diego Ramírez', 'email': 'dramirez@correo.com',
        'titular': 'Recruiter Senior',
        'habilidades': ['Reclutamiento', 'LinkedIn Recruiter'],
        'abierto_a_trabajo': False, 'fecha_registro': '2022-11-30', 'conexiones_count': 412,
    }},
    {'id': 'n6', 'labels': ['Usuario'], 'props': {
        'userId': 'n6', 'nombre': 'Ana Pérez', 'email': 'aperez@correo.com',
        'titular': 'UX Designer',
        'habilidades': ['Figma', 'Research', 'Prototyping'],
        'abierto_a_trabajo': True, 'fecha_registro': '2024-01-22', 'conexiones_count': 78,
    }},
    {'id': 'n7', 'labels': ['Empresa'], 'props': {
        'empresaId': 'n7', 'nombre': 'Datatec', 'industria': 'Tecnología', 'pais': 'Guatemala',
        'verificada': True, 'empleados_count': 320, 'fecha_fundacion': '2010-04-12',
    }},
    {'id': 'n8', 'labels': ['Empresa'], 'props': {
        'empresaId': 'n8', 'nombre': 'Cloudly', 'industria': 'Cloud Services', 'pais': 'México',
        'verificada': True, 'empleados_count': 1200, 'fecha_fundacion': '2015-09-01',
    }},
    {'id': 'n9', 'labels': ['Empresa'], 'props': {
        'empresaId': 'n9', 'nombre': 'PixelForge', 'industria': 'Diseño', 'pais': 'Guatemala',
        'verificada': False, 'empleados_count': 45, 'fecha_fundacion': '2019-06-18',
    }},
    {'id': 'n10', 'labels': ['Publicacion'], 'props': {
        'postId': 'n10',
        'contenido': 'Acabamos de migrar nuestro grafo de relaciones a Neo4j. Ganamos 4x en queries de recomendación.',
        'fecha_publicacion': '2026-04-10', 'likes_count': 38,
        'tags': ['neo4j', 'grafos', 'backend'], 'es_oferta': False,
    }},
    {'id': 'n11', 'labels': ['Publicacion'], 'props': {
        'postId': 'n11',
        'contenido': 'Buscamos Data Engineer con experiencia en Spark + Cypher. Modalidad híbrida en GT.',
        'fecha_publicacion': '2026-04-15', 'likes_count': 12,
        'tags': ['empleo', 'data'], 'es_oferta': True,
    }},
    {'id': 'n12', 'labels': ['Publicacion'], 'props': {
        'postId': 'n12',
        'contenido': 'Tres aprendizajes después de 6 meses haciendo research en producto.',
        'fecha_publicacion': '2026-04-18', 'likes_count': 64,
        'tags': ['ux', 'research'], 'es_oferta': False,
    }},
    {'id': 'n13', 'labels': ['Empleo'], 'props': {
        'empleoId': 'n13', 'titulo': 'Backend Developer Sr.',
        'salario_min': 1800.00, 'salario_max': 2600.00,
        'modalidad': 'híbrido', 'activo': True, 'fecha_publicacion': '2026-03-28',
    }},
    {'id': 'n14', 'labels': ['Empleo'], 'props': {
        'empleoId': 'n14', 'titulo': 'Data Engineer',
        'salario_min': 2200.00, 'salario_max': 3200.00,
        'modalidad': 'remoto', 'activo': True, 'fecha_publicacion': '2026-04-02',
    }},
    {'id': 'n15', 'labels': ['Empleo'], 'props': {
        'empleoId': 'n15', 'titulo': 'UX Designer Jr.',
        'salario_min': 900.00, 'salario_max': 1400.00,
        'modalidad': 'presencial', 'activo': False, 'fecha_publicacion': '2026-02-15',
    }},
    {'id': 'n16', 'labels': ['Educacion'], 'props': {
        'educacionId': 'n16',
        'institucion': 'Universidad del Valle de Guatemala',
        'carrera': 'Ingeniería en Ciencias de la Computación',
        'grado': 'Licenciatura', 'pais': 'Guatemala', 'acreditada': True,
    }},
    {'id': 'n17', 'labels': ['Educacion'], 'props': {
        'educacionId': 'n17', 'institucion': 'Tec de Monterrey',
        'carrera': 'Maestría en Ciencia de Datos',
        'grado': 'Maestría', 'pais': 'México', 'acreditada': True,
    }},
]

RELS = [
    {'from': 'n1', 'to': 'n2', 'type': 'CONECTADO_CON', 'props': {'fecha_conexion': '2023-02-01', 'nivel': '1er', 'aceptada': True}},
    {'from': 'n1', 'to': 'n3', 'type': 'CONECTADO_CON', 'props': {'fecha_conexion': '2023-04-12', 'nivel': '1er', 'aceptada': True}},
    {'from': 'n2', 'to': 'n3', 'type': 'CONECTADO_CON', 'props': {'fecha_conexion': '2023-05-18', 'nivel': '1er', 'aceptada': True}},
    {'from': 'n4', 'to': 'n6', 'type': 'CONECTADO_CON', 'props': {'fecha_conexion': '2024-06-02', 'nivel': '1er', 'aceptada': True}},
    {'from': 'n5', 'to': 'n1', 'type': 'CONECTADO_CON', 'props': {'fecha_conexion': '2024-08-22', 'nivel': '2do', 'aceptada': False}},
    {'from': 'n1', 'to': 'n10', 'type': 'PUBLICO', 'props': {'fecha': '2026-04-10', 'anonimo': False, 'desde_empresa': False}},
    {'from': 'n5', 'to': 'n11', 'type': 'PUBLICO', 'props': {'fecha': '2026-04-15', 'anonimo': False, 'desde_empresa': True}},
    {'from': 'n6', 'to': 'n12', 'type': 'PUBLICO', 'props': {'fecha': '2026-04-18', 'anonimo': False, 'desde_empresa': False}},
    {'from': 'n2', 'to': 'n10', 'type': 'DIO_LIKE', 'props': {'fecha': '2026-04-11', 'tipo_reaccion': 'celebro', 'notificado': True}},
    {'from': 'n3', 'to': 'n10', 'type': 'DIO_LIKE', 'props': {'fecha': '2026-04-11', 'tipo_reaccion': 'me_gusta', 'notificado': True}},
    {'from': 'n4', 'to': 'n12', 'type': 'DIO_LIKE', 'props': {'fecha': '2026-04-19', 'tipo_reaccion': 'apoyo', 'notificado': False}},
    {'from': 'n3', 'to': 'n10', 'type': 'COMENTO', 'props': {'contenido': '¡Qué buen caso de uso! ¿Probaron APOC?', 'fecha': '2026-04-12', 'editado': False}},
    {'from': 'n6', 'to': 'n12', 'type': 'COMENTO', 'props': {'contenido': 'Gran resumen, gracias por compartir.', 'fecha': '2026-04-19', 'editado': True}},
    {'from': 'n2', 'to': 'n10', 'type': 'COMPARTIO', 'props': {'fecha': '2026-04-12', 'con_comentario': True, 'visibilidad': 'pública'}},
    {'from': 'n1', 'to': 'n16', 'type': 'ESTUDIO_EN', 'props': {'fecha_inicio': '2020-01-15', 'fecha_graduacion': '2024-12-10', 'graduado': True}},
    {'from': 'n2', 'to': 'n16', 'type': 'ESTUDIO_EN', 'props': {'fecha_inicio': '2018-01-15', 'fecha_graduacion': '2022-12-10', 'graduado': True}},
    {'from': 'n3', 'to': 'n17', 'type': 'ESTUDIO_EN', 'props': {'fecha_inicio': '2024-08-01', 'fecha_graduacion': '2026-06-30', 'graduado': False}},
    {'from': 'n1', 'to': 'n13', 'type': 'POSTULO_A', 'props': {'fecha_postulacion': '2026-04-01', 'estado': 'pendiente', 'carta_presentacion': True}},
    {'from': 'n3', 'to': 'n14', 'type': 'POSTULO_A', 'props': {'fecha_postulacion': '2026-04-05', 'estado': 'revisado', 'carta_presentacion': False}},
    {'from': 'n6', 'to': 'n15', 'type': 'POSTULO_A', 'props': {'fecha_postulacion': '2026-02-20', 'estado': 'rechazado', 'carta_presentacion': True}},
    {'from': 'n7', 'to': 'n13', 'type': 'OFERTA', 'props': {'fecha_publicacion': '2026-03-28', 'urgente': True, 'remunerado': True}},
    {'from': 'n8', 'to': 'n14', 'type': 'OFERTA', 'props': {'fecha_publicacion': '2026-04-02', 'urgente': False, 'remunerado': True}},
    {'from': 'n9', 'to': 'n15', 'type': 'OFERTA', 'props': {'fecha_publicacion': '2026-02-15', 'urgente': False, 'remunerado': False}},
    {'from': 'n1', 'to': 'n8', 'type': 'SIGUE_A', 'props': {'fecha_seguimiento': '2024-09-10', 'notificaciones': True, 'motivo': 'posible empleador'}},
    {'from': 'n3', 'to': 'n8', 'type': 'SIGUE_A', 'props': {'fecha_seguimiento': '2024-10-01', 'notificaciones': True, 'motivo': 'trabajo actual'}},
    {'from': 'n6', 'to': 'n9', 'type': 'SIGUE_A', 'props': {'fecha_seguimiento': '2025-01-15', 'notificaciones': False, 'motivo': 'interés general'}},
    {'from': 'n4', 'to': 'n7', 'type': 'SIGUE_A', 'props': {'fecha_seguimiento': '2024-12-03', 'notificaciones': True, 'motivo': 'networking'}},
    {'from': 'n1', 'to': 'n7', 'type': 'ESTAR_EN', 'props': {'cargo': 'Backend Developer', 'fecha_inicio': '2024-01-15', 'actual': True}},
    {'from': 'n3', 'to': 'n8', 'type': 'ESTAR_EN', 'props': {'cargo': 'Data Engineer', 'fecha_inicio': '2024-08-01', 'actual': True}},
    {'from': 'n2', 'to': 'n7', 'type': 'ESTAR_EN', 'props': {'cargo': 'Database Architect', 'fecha_inicio': '2022-09-01', 'actual': False}},
    {'from': 'n10', 'to': 'n2', 'type': 'MENCIONA', 'props': {'fecha': '2026-04-10', 'tipo': 'colaborador', 'confirmada': True}},
    {'from': 'n11', 'to': 'n3', 'type': 'MENCIONA', 'props': {'fecha': '2026-04-15', 'tipo': 'etiqueta', 'confirmada': False}},
]

ID_FIELD = {
    'Usuario': 'userId', 'Empresa': 'empresaId', 'Publicacion': 'postId',
    'Empleo': 'empleoId', 'Educacion': 'educacionId',
}


class Command(BaseCommand):
    help = 'Borra el grafo y carga el seed (mismos datos que frontend/seed.js).'

    def handle(self, *_args, **_opts):
        try:
            self.stdout.write('Borrando datos existentes...')
            run_write('MATCH (n) DETACH DELETE n')

            self.stdout.write(f'Creando {len(NODES)} nodos...')
            for node in NODES:
                labels = ':'.join(node['labels'])
                run_write(f'CREATE (n:{labels} $props)', {'props': node['props']})

            label_map = {n['id']: n['labels'][0] for n in NODES}
            self.stdout.write(f'Creando {len(RELS)} relaciones...')
            for rel in RELS:
                from_label = label_map[rel['from']]
                to_label = label_map[rel['to']]
                from_field = ID_FIELD[from_label]
                to_field = ID_FIELD[to_label]
                cypher = (
                    f"MATCH (a:{from_label} {{{from_field}: $fromId}}), "
                    f"(b:{to_label} {{{to_field}: $toId}}) "
                    f"CREATE (a)-[r:{rel['type']} $props]->(b)"
                )
                run_write(cypher, {'fromId': rel['from'], 'toId': rel['to'], 'props': rel['props']})

            self.stdout.write(self.style.SUCCESS('Seed completado.'))
        finally:
            close_driver()
