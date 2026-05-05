"""`python manage.py seed` — borra todo y carga datos desde los CSVs de dataGenerator.

Busca los CSVs en ../../dataGenerator/neo4j_csv/ relativo al BASE_DIR del proyecto.
Si no existen, los genera ejecutando generate_neo4j_csv.py.
Usa UNWIND para cargar en batches compatibles con Neo4j Aura.
"""
import csv
import os
import subprocess
import sys
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand

from apps.core.lib.db import close_driver, run_auto, run_write

CSV_DIR = Path(settings.BASE_DIR).parent / 'dataGenerator' / 'neo4j_csv'
GENERATOR = Path(settings.BASE_DIR).parent / 'dataGenerator' / 'generate_neo4j_csv.py'

BATCH = 500


def _read_csv(name):
    path = CSV_DIR / name
    if not path.exists():
        return []
    with open(path, newline='', encoding='utf-8') as f:
        return list(csv.DictReader(f))


def _unwind_write(cypher_tpl, rows, batch=BATCH, stdout=None, auto=False):
    runner = run_auto if auto else run_write
    total = 0
    for i in range(0, len(rows), batch):
        chunk = rows[i:i + batch]
        runner(cypher_tpl, {'rows': chunk})
        total += len(chunk)
    if stdout:
        stdout.write(f'  {total} filas procesadas')
    return total


class Command(BaseCommand):
    help = 'Borra el grafo y carga los datos desde dataGenerator/neo4j_csv/'

    def handle(self, *_args, **_opts):
        try:
            if not CSV_DIR.exists() or not any(CSV_DIR.iterdir()):
                self.stdout.write('CSVs no encontrados — generando...')
                result = subprocess.run(
                    [sys.executable, str(GENERATOR)],
                    capture_output=True, text=True,
                    cwd=str(GENERATOR.parent),
                )
                if result.returncode != 0:
                    self.stderr.write(result.stderr)
                    raise RuntimeError('Falló generate_neo4j_csv.py')
                self.stdout.write(result.stdout)

            self.stdout.write('Borrando datos existentes...')
            run_write('MATCH (n) DETACH DELETE n')

            # ── Nodos ──────────────────────────────────────────────────────
            self.stdout.write('Cargando Usuarios...')
            rows = _read_csv('usuarios.csv')
            _unwind_write(
                """
UNWIND $rows AS row
CREATE (u:Usuario {
  usuario_id:        row.usuario_id,
  nombre:            row.nombre,
  email:             row.email,
  titular:           row.titular,
  habilidades:       split(row.habilidades, ';'),
  abierto_a_trabajo: row.abierto_a_trabajo = 'true',
  fecha_registro:    date(row.fecha_registro),
  conexiones_count:  toInteger(row.conexiones_count)
})
""",
                rows, stdout=self.stdout,
            )
            admin_rows = [r for r in rows if r.get('is_admin') == 'true']
            if admin_rows:
                _unwind_write(
                    """
UNWIND $rows AS row
MATCH (u:Usuario {usuario_id: row.usuario_id})
SET u:Admin,
    u.nivel_acceso     = row.nivel_acceso,
    u.puede_moderar    = row.puede_moderar = 'true',
    u.fecha_asignacion = date(row.fecha_asignacion),
    u.asignado_por     = row.asignado_por,
    u.activo           = row.admin_activo = 'true'
""",
                    admin_rows, stdout=self.stdout,
                )

            self.stdout.write('Cargando Empresas...')
            rows = _read_csv('empresas.csv')
            _unwind_write(
                """
UNWIND $rows AS row
CREATE (:Empresa {
  empresa_id:      row.empresa_id,
  nombre:          row.nombre,
  industria:       row.industria,
  pais:            row.pais,
  verificada:      row.verificada = 'true',
  empleados_count: toInteger(row.empleados_count),
  fecha_fundacion: date(row.fecha_fundacion)
})
""",
                rows, stdout=self.stdout,
            )

            self.stdout.write('Cargando Publicaciones...')
            rows = _read_csv('publicaciones.csv')
            _unwind_write(
                """
UNWIND $rows AS row
CREATE (:Publicacion {
  publicacion_id:    row.publicacion_id,
  contenido:         row.contenido,
  fecha_publicacion: date(row.fecha_publicacion),
  likes_count:       toInteger(row.likes_count),
  tags:              split(row.tags, ';'),
  es_oferta:         row.es_oferta = 'true'
})
""",
                rows, stdout=self.stdout,
            )

            self.stdout.write('Cargando Empleos...')
            rows = _read_csv('empleos.csv')
            _unwind_write(
                """
UNWIND $rows AS row
CREATE (:Empleo {
  empleo_id:         row.empleo_id,
  titulo:            row.titulo,
  salario_min:       toFloat(row.salario_min),
  salario_max:       toFloat(row.salario_max),
  modalidad:         row.modalidad,
  activo:            row.activo = 'true',
  fecha_publicacion: date(row.fecha_publicacion)
})
""",
                rows, stdout=self.stdout,
            )

            self.stdout.write('Cargando Educaciones...')
            rows = _read_csv('educaciones.csv')
            _unwind_write(
                """
UNWIND $rows AS row
CREATE (:Educacion {
  educacion_id: row.educacion_id,
  institucion:  row.institucion,
  carrera:      row.carrera,
  grado:        row.grado,
  pais:         row.pais,
  acreditada:   row.acreditada = 'true'
})
""",
                rows, stdout=self.stdout,
            )

            # ── Relaciones ─────────────────────────────────────────────────
            self.stdout.write('Cargando CONECTADO_CON...')
            rows = _read_csv('rel_conectado_con.csv')
            _unwind_write(
                """
UNWIND $rows AS row
MATCH (a:Usuario {usuario_id: row.from_usuario_id})
MATCH (b:Usuario {usuario_id: row.to_usuario_id})
MERGE (a)-[r:CONECTADO_CON]->(b)
SET r.fecha_conexion = date(row.fecha_conexion),
    r.nivel          = row.nivel,
    r.aceptada       = row.aceptada = 'true'
""",
                rows, stdout=self.stdout,
            )

            self.stdout.write('Cargando PUBLICO...')
            rows = _read_csv('rel_publico.csv')
            _unwind_write(
                """
UNWIND $rows AS row
MATCH (u:Usuario     {usuario_id:     row.usuario_id})
MATCH (p:Publicacion {publicacion_id: row.publicacion_id})
MERGE (u)-[r:PUBLICO]->(p)
SET r.fecha         = date(row.fecha),
    r.anonimo       = row.anonimo       = 'true',
    r.desde_empresa = row.desde_empresa = 'true'
""",
                rows, stdout=self.stdout,
            )

            self.stdout.write('Cargando DIO_LIKE...')
            rows = _read_csv('rel_dio_like.csv')
            _unwind_write(
                """
UNWIND $rows AS row
MATCH (u:Usuario     {usuario_id:     row.usuario_id})
MATCH (p:Publicacion {publicacion_id: row.publicacion_id})
MERGE (u)-[r:DIO_LIKE]->(p)
SET r.fecha         = date(row.fecha),
    r.tipo_reaccion = row.tipo_reaccion,
    r.notificado    = row.notificado = 'true'
""",
                rows, stdout=self.stdout,
            )

            self.stdout.write('Cargando COMENTO...')
            rows = _read_csv('rel_comento.csv')
            _unwind_write(
                """
UNWIND $rows AS row
MATCH (u:Usuario     {usuario_id:     row.usuario_id})
MATCH (p:Publicacion {publicacion_id: row.publicacion_id})
MERGE (u)-[r:COMENTO]->(p)
SET r.contenido = row.contenido,
    r.fecha     = date(row.fecha),
    r.editado   = row.editado = 'true'
""",
                rows, stdout=self.stdout,
            )

            self.stdout.write('Cargando COMPARTIO...')
            rows = _read_csv('rel_compartio.csv')
            _unwind_write(
                """
UNWIND $rows AS row
MATCH (u:Usuario     {usuario_id:     row.usuario_id})
MATCH (p:Publicacion {publicacion_id: row.publicacion_id})
MERGE (u)-[r:COMPARTIO]->(p)
SET r.fecha          = date(row.fecha),
    r.con_comentario = row.con_comentario = 'true',
    r.visibilidad    = row.visibilidad
""",
                rows, stdout=self.stdout,
            )

            self.stdout.write('Cargando ESTUDIO_EN...')
            rows = _read_csv('rel_estudio_en.csv')
            _unwind_write(
                """
UNWIND $rows AS row
MATCH (u:Usuario   {usuario_id:   row.usuario_id})
MATCH (e:Educacion {educacion_id: row.educacion_id})
MERGE (u)-[r:ESTUDIO_EN]->(e)
SET r.fecha_inicio     = date(row.fecha_inicio),
    r.fecha_graduacion = CASE WHEN row.fecha_graduacion <> '' THEN date(row.fecha_graduacion) ELSE null END,
    r.graduado         = row.graduado = 'true'
""",
                rows, stdout=self.stdout,
            )

            self.stdout.write('Cargando POSTULO_A...')
            rows = _read_csv('rel_postulo_a.csv')
            _unwind_write(
                """
UNWIND $rows AS row
MATCH (u:Usuario {usuario_id: row.usuario_id})
MATCH (j:Empleo  {empleo_id:  row.empleo_id})
MERGE (u)-[r:POSTULO_A]->(j)
SET r.fecha_postulacion  = date(row.fecha_postulacion),
    r.estado             = row.estado,
    r.carta_presentacion = row.carta_presentacion = 'true'
""",
                rows, stdout=self.stdout,
            )

            self.stdout.write('Cargando OFERTA...')
            rows = _read_csv('rel_oferta.csv')
            _unwind_write(
                """
UNWIND $rows AS row
MATCH (e:Empresa {empresa_id: row.empresa_id})
MATCH (j:Empleo  {empleo_id:  row.empleo_id})
MERGE (e)-[r:OFERTA]->(j)
SET r.fecha_publicacion = date(row.fecha_publicacion),
    r.urgente           = row.urgente    = 'true',
    r.remunerado        = row.remunerado = 'true'
""",
                rows, stdout=self.stdout,
            )

            self.stdout.write('Cargando SIGUE_A...')
            rows = _read_csv('rel_sigue_a.csv')
            _unwind_write(
                """
UNWIND $rows AS row
MATCH (u:Usuario {usuario_id: row.usuario_id})
MATCH (e:Empresa {empresa_id: row.empresa_id})
MERGE (u)-[r:SIGUE_A]->(e)
SET r.fecha_seguimiento = date(row.fecha_seguimiento),
    r.notificaciones    = row.notificaciones = 'true',
    r.motivo            = row.motivo
""",
                rows, stdout=self.stdout,
            )

            self.stdout.write('Cargando ESTUVO_EN...')
            rows = _read_csv('rel_estar_en.csv')
            _unwind_write(
                """
UNWIND $rows AS row
MATCH (u:Usuario {usuario_id: row.usuario_id})
MATCH (e:Empresa {empresa_id: row.empresa_id})
MERGE (u)-[r:ESTUVO_EN]->(e)
SET r.cargo       = row.cargo,
    r.fecha_inicio = date(row.fecha_inicio),
    r.actual       = row.actual = 'true'
""",
                rows, stdout=self.stdout,
            )

            self.stdout.write('Cargando MENCIONA...')
            rows = _read_csv('rel_menciona.csv')
            _unwind_write(
                """
UNWIND $rows AS row
MATCH (p:Publicacion {publicacion_id: row.publicacion_id})
MATCH (u:Usuario     {usuario_id:     row.usuario_id})
MERGE (p)-[r:MENCIONA]->(u)
SET r.fecha      = date(row.fecha),
    r.tipo       = row.tipo,
    r.confirmada = row.confirmada = 'true'
""",
                rows, stdout=self.stdout,
            )

            self.stdout.write(self.style.SUCCESS('Seed completado exitosamente.'))
        finally:
            close_driver()
