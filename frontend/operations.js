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
RETURN u.nombre AS nombre, u.titular AS titular, u.habilidades AS habilidades`
      },
      {
        title: 'Consultar múltiples nodos',
        subtitle: 'Usuarios abiertos a trabajo',
        query:
`MATCH (u:Usuario)
WHERE u.abierto_a_trabajo = true
RETURN u.nombre AS nombre, u.titular AS titular, u.conexiones_count AS conexiones
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
RETURN u.nombre, u.telefono`
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
RETURN u.nombre, u.titular`
      },
      {
        title: 'Actualizar propiedad de múltiples nodos',
        subtitle: '+10 conexiones a todos los usuarios',
        query:
`MATCH (u:Usuario)
SET u.conexiones_count = u.conexiones_count + 10
RETURN u.nombre, u.conexiones_count
ORDER BY u.conexiones_count DESC`
      },
      {
        title: 'Eliminar propiedad de 1 nodo',
        subtitle: 'REMOVE de la propiedad telefono',
        query:
`MATCH (u:Usuario {email: 'nconcua@uvg.edu.gt'})
REMOVE u.telefono
RETURN u.nombre, keys(u) AS propiedades`
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
        title: 'CREATE relación entre 2 nodos existentes',
        subtitle: 'CONECTADO_CON con 3 propiedades',
        endpoint: {
          call: 'conectar',
          body: { userIdA: 'n1', userIdB: 'n4',
                  fecha_conexion: '2026-04-26', nivel: '1er', aceptada: true },
        },
        query:
`MATCH (a:Usuario {email: 'nconcua@uvg.edu.gt'}),
      (b:Usuario {email: 'mlopez@correo.com'})
CREATE (a)-[r:CONECTADO_CON {
  fecha_conexion: '2026-04-26',
  nivel: '1er',
  aceptada: true
}]->(b)
RETURN a.nombre, type(r), b.nombre`
      },
    ],
  },

  {
    section: '5. Gestión de relaciones',
    items: [
      {
        title: 'Agregar propiedad a 1 relación',
        subtitle: 'SET nota en POSTULO_A',
        query:
`MATCH (u:Usuario {email:'nconcua@uvg.edu.gt'})-[r:POSTULO_A]->(e:Empleo)
SET r.nota = 'Candidato priorizado por reclutador'
RETURN u.nombre, e.titulo, r.estado, r.nota`
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
        subtitle: 'Cambiar estado de postulación',
        query:
`MATCH (u:Usuario {email:'nconcua@uvg.edu.gt'})-[r:POSTULO_A]->(e:Empleo)
SET r.estado = 'revisado'
RETURN u.nombre, e.titulo, r.estado`
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
        subtitle: 'REMOVE r.nota en POSTULO_A',
        query:
`MATCH (u:Usuario {email:'nconcua@uvg.edu.gt'})-[r:POSTULO_A]->(e:Empleo)
REMOVE r.nota
RETURN u.nombre, e.titulo, keys(r) AS props`
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
        subtitle: 'DELETE de un DIO_LIKE específico',
        query:
`MATCH (u:Usuario)-[r:DIO_LIKE]->(p:Publicacion)
WHERE u.email = 'mlopez@correo.com'
DELETE r
RETURN count(r) AS eliminadas`
      },
      {
        title: 'Eliminar múltiples relaciones',
        subtitle: 'Borrar todos los DIO_LIKE',
        query:
`MATCH ()-[r:DIO_LIKE]->()
DELETE r
RETURN count(r) AS eliminadas`
      },
      {
        title: 'Eliminar 1 nodo (DETACH DELETE)',
        subtitle: 'Borra una Publicacion y sus relaciones',
        query:
`MATCH (p:Publicacion)
WHERE p.tags = ['ux','research']
DETACH DELETE p`
      },
      {
        title: 'Eliminar múltiples nodos (DETACH DELETE)',
        subtitle: 'Empleos inactivos',
        query:
`MATCH (e:Empleo)
WHERE e.activo = false
DETACH DELETE e`
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
RETURN u.nombre AS usuario,
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
       collect(u.nombre) AS candidatos
ORDER BY cantidad DESC`
  },
  {
    who: 'Ernesto',
    label: 'Q6 · Quién publicó qué (autoría)',
    query:
`MATCH (u:Usuario)-[:PUBLICO]->(p:Publicacion)
RETURN u.nombre AS autor,
       p.contenido AS publicacion,
       p.likes_count AS likes,
       p.tags AS tags
ORDER BY likes DESC`
  },
];
