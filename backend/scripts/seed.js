'use strict';
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const neo4j = require('neo4j-driver');

const URI  = process.env.NEO4J_URI;
const USER = process.env.NEO4J_USERNAME;
const PASS = process.env.NEO4J_PASSWORD;
const DB   = process.env.NEO4J_DATABASE;

// Datos del seed (espejo de frontend/seed.js)
const nodes = [
  { id: 'n1', labels: ['Usuario'], props: { userId: 'n1', nombre: 'Nicolás Concuá', email: 'nconcua@uvg.edu.gt', titular: 'Backend Developer en Datatec', habilidades: ['Python','Neo4j','Cypher','Docker'], abierto_a_trabajo: true, fecha_registro: '2023-01-15', conexiones_count: 142 }},
  { id: 'n2', labels: ['Usuario','Admin'], props: { userId: 'n2', nombre: 'Esteban Cárcamo', email: 'ecarcamo@uvg.edu.gt', titular: 'Database Architect & Platform Admin', habilidades: ['PostgreSQL','Cypher','Kubernetes'], abierto_a_trabajo: false, fecha_registro: '2022-08-03', conexiones_count: 287, nivel_acceso: 'superadmin', puede_moderar: true, fecha_asignacion: '2023-02-10', asignado_por: 'Mario Barrientos', activo: true }},
  { id: 'n3', labels: ['Usuario'], props: { userId: 'n3', nombre: 'Ernesto Ascencio', email: 'eascencio@uvg.edu.gt', titular: 'Data Engineer en Cloudly', habilidades: ['Spark','Cypher','SQL','Python'], abierto_a_trabajo: true, fecha_registro: '2023-03-20', conexiones_count: 96 }},
  { id: 'n4', labels: ['Usuario'], props: { userId: 'n4', nombre: 'María López', email: 'mlopez@correo.com', titular: 'Frontend Developer', habilidades: ['React','TypeScript','CSS'], abierto_a_trabajo: false, fecha_registro: '2024-05-11', conexiones_count: 53 }},
  { id: 'n5', labels: ['Usuario'], props: { userId: 'n5', nombre: 'Diego Ramírez', email: 'dramirez@correo.com', titular: 'Recruiter Senior', habilidades: ['Reclutamiento','LinkedIn Recruiter'], abierto_a_trabajo: false, fecha_registro: '2022-11-30', conexiones_count: 412 }},
  { id: 'n6', labels: ['Usuario'], props: { userId: 'n6', nombre: 'Ana Pérez', email: 'aperez@correo.com', titular: 'UX Designer', habilidades: ['Figma','Research','Prototyping'], abierto_a_trabajo: true, fecha_registro: '2024-01-22', conexiones_count: 78 }},
  { id: 'n7', labels: ['Empresa'], props: { empresaId: 'n7', nombre: 'Datatec', industria: 'Tecnología', pais: 'Guatemala', verificada: true, empleados_count: 320, fecha_fundacion: '2010-04-12' }},
  { id: 'n8', labels: ['Empresa'], props: { empresaId: 'n8', nombre: 'Cloudly', industria: 'Cloud Services', pais: 'México', verificada: true, empleados_count: 1200, fecha_fundacion: '2015-09-01' }},
  { id: 'n9', labels: ['Empresa'], props: { empresaId: 'n9', nombre: 'PixelForge', industria: 'Diseño', pais: 'Guatemala', verificada: false, empleados_count: 45, fecha_fundacion: '2019-06-18' }},
  { id: 'n10', labels: ['Publicacion'], props: { postId: 'n10', contenido: 'Acabamos de migrar nuestro grafo de relaciones a Neo4j. Ganamos 4x en queries de recomendación.', fecha_publicacion: '2026-04-10', likes_count: 38, tags: ['neo4j','grafos','backend'], es_oferta: false }},
  { id: 'n11', labels: ['Publicacion'], props: { postId: 'n11', contenido: 'Buscamos Data Engineer con experiencia en Spark + Cypher. Modalidad híbrida en GT.', fecha_publicacion: '2026-04-15', likes_count: 12, tags: ['empleo','data'], es_oferta: true }},
  { id: 'n12', labels: ['Publicacion'], props: { postId: 'n12', contenido: 'Tres aprendizajes después de 6 meses haciendo research en producto.', fecha_publicacion: '2026-04-18', likes_count: 64, tags: ['ux','research'], es_oferta: false }},
  { id: 'n13', labels: ['Empleo'], props: { empleoId: 'n13', titulo: 'Backend Developer Sr.', salario_min: 1800.00, salario_max: 2600.00, modalidad: 'híbrido', activo: true, fecha_publicacion: '2026-03-28' }},
  { id: 'n14', labels: ['Empleo'], props: { empleoId: 'n14', titulo: 'Data Engineer', salario_min: 2200.00, salario_max: 3200.00, modalidad: 'remoto', activo: true, fecha_publicacion: '2026-04-02' }},
  { id: 'n15', labels: ['Empleo'], props: { empleoId: 'n15', titulo: 'UX Designer Jr.', salario_min: 900.00, salario_max: 1400.00, modalidad: 'presencial', activo: false, fecha_publicacion: '2026-02-15' }},
  { id: 'n16', labels: ['Educacion'], props: { educacionId: 'n16', institucion: 'Universidad del Valle de Guatemala', carrera: 'Ingeniería en Ciencias de la Computación', grado: 'Licenciatura', pais: 'Guatemala', acreditada: true }},
  { id: 'n17', labels: ['Educacion'], props: { educacionId: 'n17', institucion: 'Tec de Monterrey', carrera: 'Maestría en Ciencia de Datos', grado: 'Maestría', pais: 'México', acreditada: true }},
];

const rels = [
  { from: 'n1', to: 'n2',  type: 'CONECTADO_CON', props: { fecha_conexion: '2023-02-01', nivel: '1er', aceptada: true }},
  { from: 'n1', to: 'n3',  type: 'CONECTADO_CON', props: { fecha_conexion: '2023-04-12', nivel: '1er', aceptada: true }},
  { from: 'n2', to: 'n3',  type: 'CONECTADO_CON', props: { fecha_conexion: '2023-05-18', nivel: '1er', aceptada: true }},
  { from: 'n4', to: 'n6',  type: 'CONECTADO_CON', props: { fecha_conexion: '2024-06-02', nivel: '1er', aceptada: true }},
  { from: 'n5', to: 'n1',  type: 'CONECTADO_CON', props: { fecha_conexion: '2024-08-22', nivel: '2do', aceptada: false }},
  { from: 'n1', to: 'n10', type: 'PUBLICO',        props: { fecha: '2026-04-10', anonimo: false, desde_empresa: false }},
  { from: 'n5', to: 'n11', type: 'PUBLICO',        props: { fecha: '2026-04-15', anonimo: false, desde_empresa: true }},
  { from: 'n6', to: 'n12', type: 'PUBLICO',        props: { fecha: '2026-04-18', anonimo: false, desde_empresa: false }},
  { from: 'n2', to: 'n10', type: 'DIO_LIKE',       props: { fecha: '2026-04-11', tipo_reaccion: 'celebro', notificado: true }},
  { from: 'n3', to: 'n10', type: 'DIO_LIKE',       props: { fecha: '2026-04-11', tipo_reaccion: 'me_gusta', notificado: true }},
  { from: 'n4', to: 'n12', type: 'DIO_LIKE',       props: { fecha: '2026-04-19', tipo_reaccion: 'apoyo', notificado: false }},
  { from: 'n3', to: 'n10', type: 'COMENTO',        props: { contenido: '¡Qué buen caso de uso! ¿Probaron APOC?', fecha: '2026-04-12', editado: false }},
  { from: 'n6', to: 'n12', type: 'COMENTO',        props: { contenido: 'Gran resumen, gracias por compartir.', fecha: '2026-04-19', editado: true }},
  { from: 'n2', to: 'n10', type: 'COMPARTIO',      props: { fecha: '2026-04-12', con_comentario: true, visibilidad: 'pública' }},
  { from: 'n1', to: 'n16', type: 'ESTUDIO_EN',     props: { fecha_inicio: '2020-01-15', fecha_graduacion: '2024-12-10', graduado: true }},
  { from: 'n2', to: 'n16', type: 'ESTUDIO_EN',     props: { fecha_inicio: '2018-01-15', fecha_graduacion: '2022-12-10', graduado: true }},
  { from: 'n3', to: 'n17', type: 'ESTUDIO_EN',     props: { fecha_inicio: '2024-08-01', fecha_graduacion: '2026-06-30', graduado: false }},
  { from: 'n1', to: 'n13', type: 'POSTULO_A',      props: { fecha_postulacion: '2026-04-01', estado: 'pendiente', carta_presentacion: true }},
  { from: 'n3', to: 'n14', type: 'POSTULO_A',      props: { fecha_postulacion: '2026-04-05', estado: 'revisado', carta_presentacion: false }},
  { from: 'n6', to: 'n15', type: 'POSTULO_A',      props: { fecha_postulacion: '2026-02-20', estado: 'rechazado', carta_presentacion: true }},
  { from: 'n7', to: 'n13', type: 'OFERTA',         props: { fecha_publicacion: '2026-03-28', urgente: true, remunerado: true }},
  { from: 'n8', to: 'n14', type: 'OFERTA',         props: { fecha_publicacion: '2026-04-02', urgente: false, remunerado: true }},
  { from: 'n9', to: 'n15', type: 'OFERTA',         props: { fecha_publicacion: '2026-02-15', urgente: false, remunerado: false }},
  { from: 'n1', to: 'n8',  type: 'SIGUE_A',        props: { fecha_seguimiento: '2024-09-10', notificaciones: true,  motivo: 'posible empleador' }},
  { from: 'n3', to: 'n8',  type: 'SIGUE_A',        props: { fecha_seguimiento: '2024-10-01', notificaciones: true,  motivo: 'trabajo actual' }},
  { from: 'n6', to: 'n9',  type: 'SIGUE_A',        props: { fecha_seguimiento: '2025-01-15', notificaciones: false, motivo: 'interés general' }},
  { from: 'n4', to: 'n7',  type: 'SIGUE_A',        props: { fecha_seguimiento: '2024-12-03', notificaciones: true,  motivo: 'networking' }},
  { from: 'n1', to: 'n7',  type: 'ESTAR_EN',       props: { cargo: 'Backend Developer', fecha_inicio: '2024-01-15', actual: true }},
  { from: 'n3', to: 'n8',  type: 'ESTAR_EN',       props: { cargo: 'Data Engineer', fecha_inicio: '2024-08-01', actual: true }},
  { from: 'n2', to: 'n7',  type: 'ESTAR_EN',       props: { cargo: 'Database Architect', fecha_inicio: '2022-09-01', actual: false }},
  { from: 'n10', to: 'n2', type: 'MENCIONA',       props: { fecha: '2026-04-10', tipo: 'colaborador', confirmada: true }},
  { from: 'n11', to: 'n3', type: 'MENCIONA',       props: { fecha: '2026-04-15', tipo: 'etiqueta', confirmada: false }},
];

// Map from seed id to label for building MATCH patterns
const labelMap = {};
nodes.forEach(n => { labelMap[n.id] = n.labels[0]; });
const idFieldMap = {
  Usuario: 'userId', Empresa: 'empresaId', Publicacion: 'postId',
  Empleo: 'empleoId', Educacion: 'educacionId',
};

async function main() {
  const driver = neo4j.driver(URI, neo4j.auth.basic(USER, PASS));
  const session = driver.session({ database: DB });
  try {
    console.log('Borrando datos existentes...');
    await session.run('MATCH (n) DETACH DELETE n');

    console.log(`Creando ${nodes.length} nodos...`);
    for (const node of nodes) {
      const labels = node.labels.join(':');
      await session.run(`CREATE (n:${labels} $props)`, { props: node.props });
    }

    console.log(`Creando ${rels.length} relaciones...`);
    for (const rel of rels) {
      const fromLabel = labelMap[rel.from];
      const toLabel   = labelMap[rel.to];
      const fromField = idFieldMap[fromLabel];
      const toField   = idFieldMap[toLabel];
      await session.run(
        `MATCH (a:${fromLabel} {${fromField}: $fromId}), (b:${toLabel} {${toField}: $toId})
         CREATE (a)-[r:${rel.type} $props]->(b)`,
        { fromId: rel.from, toId: rel.to, props: rel.props }
      );
    }

    console.log('Seed completado exitosamente.');
  } finally {
    await session.close();
    await driver.close();
  }
}

main().catch(err => { console.error('Error en seed:', err.message); process.exit(1); });
