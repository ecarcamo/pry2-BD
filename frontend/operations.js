/* ============================================================
   operations.jsx — Catálogo de operaciones one-click de la rúbrica.
   Cada item lleva el query Cypher que ejecuta la operación contra
   nuestro motor en memoria, y se loggea como cualquier query.
   ============================================================ */

window.OPERATIONS = [
  {
    section: '1. Creación de nodos',
    items: [
      {
        title: 'Nodo con 1 label',
        subtitle: 'CREATE de un Usuario simple',
        endpoint: {
          call: 'usuarios.create',
          body: { nombre: 'Sofía Méndez', email: 'smendez@correo.com', titular: 'QA Engineer',
                  habilidades: ['Cypress','Selenium'], abierto_a_trabajo: true,
                  fecha_registro: '2026-04-26', conexiones_count: 0 },
        },
        query:
`CREATE (u:Usuario {
  nombre: 'Sofía Méndez',
  email: 'smendez@correo.com',
  titular: 'QA Engineer',
  habilidades: ['Cypress','Selenium'],
  abierto_a_trabajo: true,
  fecha_registro: '2026-04-26',
  conexiones_count: 0
})
RETURN u`
      },
      {
        title: 'Nodo con 2+ labels (MERGE)',
        subtitle: 'Usuario que también es :Admin (doble etiqueta)',
        endpoint: {
          call: 'usuarios.createAdmin',
          body: { nombre: 'Carla Ruano', email: 'cruano@correo.com', titular: 'Moderadora de Contenido',
                  habilidades: ['Moderación','Políticas'], abierto_a_trabajo: false,
                  fecha_registro: '2026-04-26', conexiones_count: 5,
                  nivel_acceso: 'moderador', puede_moderar: true,
                  fecha_asignacion: '2026-04-26', asignado_por: 'Esteban Cárcamo', activo: true },
        },
        query:
`MERGE (u:Usuario:Admin {
  nombre: 'Carla Ruano',
  email: 'cruano@correo.com',
  titular: 'Moderadora de Contenido',
  habilidades: ['Moderación','Políticas'],
  abierto_a_trabajo: false,
  fecha_registro: '2026-04-26',
  conexiones_count: 5,
  nivel_acceso: 'moderador',
  puede_moderar: true,
  fecha_asignacion: '2026-04-26',
  asignado_por: 'Esteban Cárcamo',
  activo: true
})
RETURN u`
      },
      {
        title: 'Nodo con ≥5 propiedades',
        subtitle: 'Empresa con todas sus propiedades',
        endpoint: {
          call: 'empresas.create',
          body: { nombre: 'NeoVentures', industria: 'Fintech', pais: 'Costa Rica',
                  verificada: true, empleados_count: 80, fecha_fundacion: '2021-03-12' },
        },
        query:
`CREATE (e:Empresa {
  nombre: 'NeoVentures',
  industria: 'Fintech',
  pais: 'Costa Rica',
  verificada: true,
  empleados_count: 80,
  fecha_fundacion: '2021-03-12'
})
RETURN e`
      },
      {
        title: 'Nodo ExperienciaLaboral (nodo intermedio)',
        subtitle: 'Registro de experiencia laboral con 5 propiedades',
        endpoint: {
          call: 'experiencia.create',
          body: { cargo: 'Full Stack Developer', salario: 2500.0,
                  descripcion: 'Desarrollo web end-to-end con React y Django',
                  activo: true },
        },
        query:
`CREATE (exp:ExperienciaLaboral {
  expId: randomUUID(),
  cargo: 'Full Stack Developer',
  salario: 2500.0,
  descripcion: 'Desarrollo web end-to-end con React y Django',
  activo: true
})
RETURN exp`
      },
    ],
  },

  {
    section: '2. Visualización / consultas',
    items: [
      {
        title: 'Consultar 1 nodo (filtro por propiedad)',
        subtitle: 'Buscar un Usuario por email',
        query:
`MATCH (u:Usuario {email: 'nconcua@uvg.edu.gt'})
RETURN coalesce(u.nombre, u.email) AS nombre, u.titular AS titular, u.habilidades AS habilidades`
      },
      {
        title: 'Consultar múltiples nodos',
        subtitle: 'Usuarios abiertos a trabajo',
        query:
`MATCH (u:Usuario)
WHERE u.abierto_a_trabajo = true
RETURN coalesce(u.nombre, u.email) AS nombre, u.titular AS titular, u.conexiones_count AS conexiones
ORDER BY conexiones DESC`
      },
      {
        title: 'Consulta agregada — count',
        subtitle: 'Total de nodos por label',
        query:
`MATCH (n)
RETURN labels(n) AS etiquetas, count(*) AS total
ORDER BY total DESC`
      },
      {
        title: 'Consulta agregada — avg',
        subtitle: 'Salario máximo promedio por modalidad',
        query:
`MATCH (e:Empleo)
RETURN e.modalidad AS modalidad,
       avg(e.salario_max) AS salario_max_prom,
       count(*) AS vacantes`
      },
    ],
  },

  {
    section: '3. Gestión de propiedades en nodos',
    items: [
      {
        title: 'Agregar propiedad a 1 nodo',
        subtitle: 'SET telefono en Nicolás',
        query:
`MATCH (u:Usuario {email: 'nconcua@uvg.edu.gt'})
SET u.telefono = '+502 5555-1234'
RETURN coalesce(u.nombre, u.email) AS nombre, u.telefono`
      },
      {
        title: 'Agregar propiedad a múltiples nodos',
        subtitle: 'Marcar todos los Empleos con disponibles=true',
        query:
`MATCH (e:Empleo)
WHERE e.activo = true
SET e.disponible = true
RETURN e.titulo, e.disponible`
      },
      {
        title: 'Actualizar propiedad de 1 nodo',
        subtitle: 'Cambiar titular de Ernesto',
        query:
`MATCH (u:Usuario {email: 'eascencio@uvg.edu.gt'})
SET u.titular = 'Senior Data Engineer en Cloudly'
RETURN coalesce(u.nombre, u.email) AS nombre, u.titular`
      },
      {
        title: 'Actualizar propiedad de múltiples nodos',
        subtitle: '+10 conexiones a todos los usuarios',
        query:
`MATCH (u:Usuario)
SET u.conexiones_count = u.conexiones_count + 10
RETURN coalesce(u.nombre, u.email) AS nombre, u.conexiones_count
ORDER BY u.conexiones_count DESC`
      },
      {
        title: 'Eliminar propiedad de 1 nodo',
        subtitle: 'REMOVE de la propiedad telefono',
        query:
`MATCH (u:Usuario {email: 'nconcua@uvg.edu.gt'})
REMOVE u.telefono
RETURN coalesce(u.nombre, u.email) AS nombre, keys(u) AS propiedades`
      },
      {
        title: 'Eliminar propiedad de múltiples nodos',
        subtitle: 'Quitar disponible de todos los Empleos',
        query:
`MATCH (e:Empleo)
REMOVE e.disponible
RETURN e.titulo, keys(e) AS propiedades`
      },
    ],
  },

  {
    section: '4. Relaciones con propiedades',
    items: [
      {
        title: 'CONECTADO_CON — usuarios',
        subtitle: 'Toma 2 usuarios cualquiera · 3 propiedades',
        query:
`MATCH (a:Usuario), (b:Usuario)
WHERE elementId(a) <> elementId(b)
  AND NOT (a)-[:CONECTADO_CON]->(b)
WITH a, b LIMIT 1
CREATE (a)-[r:CONECTADO_CON {
  fecha_conexion: '2026-05-03',
  nivel: '1er',
  aceptada: true
}]->(b)
RETURN coalesce(a.nombre, a.email) AS origen, type(r) AS relacion, coalesce(b.nombre, b.email) AS destino`
      },
      {
        title: 'SIGUE_A — Usuario → Empresa',
        subtitle: 'Toma 1 usuario y 1 empresa cualquiera · 3 propiedades',
        query:
`MATCH (u:Usuario), (e:Empresa)
WHERE NOT (u)-[:SIGUE_A]->(e)
WITH u, e LIMIT 1
CREATE (u)-[r:SIGUE_A {
  fecha_seguimiento: '2026-05-03',
  notificaciones: true,
  motivo: 'interés profesional'
}]->(e)
RETURN coalesce(u.nombre, u.email) AS usuario, type(r) AS relacion, e.nombre AS empresa`
      },
      {
        title: 'POSTULO_A — Usuario → Empleo',
        subtitle: 'Toma 1 usuario y 1 empleo activo · 3 propiedades',
        query:
`MATCH (u:Usuario), (j:Empleo)
WHERE j.activo = true
  AND NOT (u)-[:POSTULO_A]->(j)
WITH u, j LIMIT 1
CREATE (u)-[r:POSTULO_A {
  fecha_postulacion: '2026-05-03',
  estado: 'pendiente',
  carta_presentacion: true
}]->(j)
RETURN coalesce(u.nombre, u.email) AS usuario, type(r) AS relacion, j.titulo AS empleo`
      },
      {
        title: 'COMENTO — Usuario → Publicacion',
        subtitle: 'Toma 1 usuario y 1 publicación · 3 propiedades',
        query:
`MATCH (u:Usuario), (p:Publicacion)
WHERE NOT (u)-[:COMENTO]->(p)
WITH u, p LIMIT 1
CREATE (u)-[r:COMENTO {
  contenido: 'Muy interesante esta publicación.',
  fecha: '2026-05-03',
  editado: false
}]->(p)
RETURN coalesce(u.nombre, u.email) AS usuario, type(r) AS relacion, p.contenido[..40] AS publicacion`
      },
      {
        title: 'Crear relación manual',
        subtitle: 'Formulario: elige nodos, tipo y propiedades dinámicamente',
        special: 'crear-relacion-form',
      },
    ],
  },

  {
    section: '5. Gestión de relaciones',
    items: [
      {
        title: 'Agregar propiedad a 1 relación',
        subtitle: 'SET nota en una POSTULO_A cualquiera',
        query:
`MATCH (u:Usuario)-[r:POSTULO_A]->(e:Empleo)
WITH u, r, e LIMIT 1
SET r.nota = 'Candidato priorizado por reclutador'
RETURN coalesce(u.nombre, u.email) AS usuario, e.titulo, r.estado, r.nota`
      },
      {
        title: 'Agregar propiedad a múltiples relaciones',
        subtitle: 'Todas las OFERTA → fuente="portal"',
        query:
`MATCH (emp:Empresa)-[r:OFERTA]->(j:Empleo)
SET r.fuente = 'portal_interno'
RETURN emp.nombre, j.titulo, r.fuente`
      },
      {
        title: 'Actualizar propiedad de 1 relación',
        subtitle: 'Cambiar estado de una POSTULO_A cualquiera',
        query:
`MATCH (u:Usuario)-[r:POSTULO_A]->(e:Empleo)
WITH u, r, e LIMIT 1
SET r.estado = 'revisado'
RETURN coalesce(u.nombre, u.email) AS usuario, e.titulo, r.estado`
      },
      {
        title: 'Actualizar propiedad de múltiples relaciones',
        subtitle: 'Marcar todos los DIO_LIKE como notificados',
        query:
`MATCH ()-[r:DIO_LIKE]->()
SET r.notificado = true
RETURN count(r) AS likes_actualizados`
      },
      {
        title: 'Eliminar propiedad de 1 relación',
        subtitle: 'REMOVE r.nota de una POSTULO_A cualquiera',
        query:
`MATCH (u:Usuario)-[r:POSTULO_A]->(e:Empleo)
WITH u, r, e LIMIT 1
REMOVE r.nota
RETURN coalesce(u.nombre, u.email) AS usuario, e.titulo, keys(r) AS props`
      },
      {
        title: 'Eliminar propiedad de múltiples relaciones',
        subtitle: 'Quitar fuente de todas las OFERTA',
        query:
`MATCH (emp:Empresa)-[r:OFERTA]->(j:Empleo)
REMOVE r.fuente
RETURN emp.nombre, j.titulo, keys(r) AS props`
      },
    ],
  },

  {
    section: '6. Eliminación',
    items: [
      {
        title: 'Eliminar 1 relación',
        subtitle: 'DELETE de 1 DIO_LIKE cualquiera (LIMIT 1)',
        query:
`MATCH (u:Usuario)-[r:DIO_LIKE]->(p:Publicacion)
WITH u, r, p LIMIT 1
DELETE r
RETURN count(r) AS eliminadas`
      },
      {
        title: 'Eliminar múltiples relaciones',
        subtitle: 'Borrar todos los DIO_LIKE restantes',
        query:
`MATCH ()-[r:DIO_LIKE]->()
WITH collect(r) AS rels, count(r) AS total
FOREACH (r IN rels | DELETE r)
RETURN total AS eliminadas`
      },
      {
        title: 'Eliminar 1 nodo (HTTP DELETE)',
        subtitle: 'DELETE /publicaciones/n12/ — endpoint REST tipado',
        endpoint: {
          call: 'publicaciones.delete',
          body: 'n12',
        },
        query:
`MATCH (p:Publicacion {postId: 'n12'})
DETACH DELETE p`,
      },
      {
        title: 'Eliminar múltiples nodos (DETACH DELETE)',
        subtitle: 'Borra todos los Empleos inactivos vía Cypher',
        query:
`MATCH (e:Empleo)
WHERE e.activo = false
WITH collect(e) AS nodos, count(e) AS total
FOREACH (e IN nodos | DETACH DELETE e)
RETURN total AS eliminados`
      },
    ],
  },

  {
    section: '7. Reset',
    items: [
      {
        title: 'Restablecer base de datos',
        subtitle: 'Vuelve al estado inicial del seed',
        special: 'reset',
      },
      {
        title: 'Limpiar base de datos (Aura)',
        subtitle: 'Borra relaciones, nodos y constraints en Neo4j Aura',
        special: 'clean-db',
      },
      {
        title: 'Importar datos desde GitHub (Aura)',
        subtitle: 'Constraints + 5 nodos + 11 relaciones vía LOAD CSV',
        special: 'import-db',
      },
    ],
  },
];

// 6 consultas Cypher (2 por integrante)
window.PRESET_QUERIES = [
  {
    who: 'Nicolás',
    label: 'Q1 · Top usuarios por conexiones',
    query:
`MATCH (u:Usuario)
RETURN coalesce(u.nombre, u.email) AS usuario,
       u.titular AS titular,
       u.conexiones_count AS conexiones
ORDER BY conexiones DESC
LIMIT 5`
  },
  {
    who: 'Nicolás',
    label: 'Q2 · Empresas seguidas y su industria',
    query:
`MATCH (u:Usuario)-[s:SIGUE_A]->(e:Empresa)
RETURN e.nombre AS empresa,
       e.industria AS industria,
       count(u) AS seguidores
ORDER BY seguidores DESC`
  },
  {
    who: 'Esteban',
    label: 'Q3 · Vacantes activas con rango salarial',
    query:
`MATCH (emp:Empresa)-[o:OFERTA]->(j:Empleo)
WHERE j.activo = true
RETURN emp.nombre AS empresa,
       j.titulo AS puesto,
       j.modalidad AS modalidad,
       j.salario_min AS min,
       j.salario_max AS max
ORDER BY max DESC`
  },
  {
    who: 'Esteban',
    label: 'Q4 · Promedio de likes por publicación',
    query:
`MATCH (p:Publicacion)
RETURN avg(p.likes_count) AS promedio_likes,
       max(p.likes_count) AS max_likes,
       count(p) AS total_publicaciones`
  },
  {
    who: 'Ernesto',
    label: 'Q5 · Postulaciones por estado',
    query:
`MATCH (u:Usuario)-[r:POSTULO_A]->(j:Empleo)
RETURN r.estado AS estado,
       count(*) AS cantidad,
       collect(coalesce(u.nombre, u.email)) AS candidatos
ORDER BY cantidad DESC`
  },
  {
    who: 'Ernesto',
    label: 'Q6 · Quién publicó qué (autoría)',
    query:
`MATCH (u:Usuario)-[:PUBLICO]->(p:Publicacion)
RETURN coalesce(u.nombre, u.email) AS autor,
       p.contenido AS publicacion,
       p.likes_count AS likes,
       p.tags AS tags
ORDER BY likes DESC`
  },
];
