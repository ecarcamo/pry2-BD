'use strict';
const { Router } = require('express');
const { runWrite } = require('../neo4j');
const { safeLabel, safeRelType } = require('../lib/cypher-build');
const { requireFields, requireMinProps } = require('../lib/validate');

const router = Router();
const ok   = (res, data, meta) => res.json({ ok: true, ...data, ...(meta ? { meta } : {}) });
const fail = (res, err, status = 400) => res.status(status).json({ ok: false, error: err.message || err });

// POST /conexiones — CONECTADO_CON (rúbrica 6)
router.post('/conexiones', async (req, res) => {
  try {
    requireFields(req.body, ['userIdA', 'userIdB']);
    const props = {
      fecha_conexion: req.body.fecha_conexion || new Date().toISOString().slice(0, 10),
      nivel: req.body.nivel || '1er',
      aceptada: req.body.aceptada ?? true,
    };
    const cypher = `
      MATCH (a:Usuario {userId: $userIdA}), (b:Usuario {userId: $userIdB})
      CREATE (a)-[r:CONECTADO_CON $props]->(b)
      RETURN a, type(r), b`;
    const result = await runWrite(cypher, { userIdA: req.body.userIdA, userIdB: req.body.userIdB, props });
    ok(res, result, { cypher: cypher.trim() });
  } catch (err) { fail(res, err); }
});

// POST /likes — DIO_LIKE
router.post('/likes', async (req, res) => {
  try {
    requireFields(req.body, ['userId', 'postId']);
    const props = {
      fecha: req.body.fecha || new Date().toISOString().slice(0, 10),
      tipo_reaccion: req.body.tipo_reaccion || 'me_gusta',
      notificado: req.body.notificado ?? false,
    };
    const cypher = `
      MATCH (u:Usuario {userId: $userId}), (p:Publicacion {postId: $postId})
      CREATE (u)-[r:DIO_LIKE $props]->(p)
      RETURN u, type(r), p`;
    const result = await runWrite(cypher, { userId: req.body.userId, postId: req.body.postId, props });
    ok(res, result, { cypher: cypher.trim() });
  } catch (err) { fail(res, err); }
});

// POST /comentarios — COMENTO
router.post('/comentarios', async (req, res) => {
  try {
    requireFields(req.body, ['userId', 'postId', 'contenido']);
    const props = {
      contenido: req.body.contenido,
      fecha: req.body.fecha || new Date().toISOString().slice(0, 10),
      editado: req.body.editado ?? false,
    };
    const cypher = `
      MATCH (u:Usuario {userId: $userId}), (p:Publicacion {postId: $postId})
      CREATE (u)-[r:COMENTO $props]->(p)
      RETURN u, type(r), p`;
    const result = await runWrite(cypher, { userId: req.body.userId, postId: req.body.postId, props });
    ok(res, result, { cypher: cypher.trim() });
  } catch (err) { fail(res, err); }
});

// POST /compartidos — COMPARTIO
router.post('/compartidos', async (req, res) => {
  try {
    requireFields(req.body, ['userId', 'postId']);
    const props = {
      fecha: req.body.fecha || new Date().toISOString().slice(0, 10),
      con_comentario: req.body.con_comentario ?? false,
      visibilidad: req.body.visibilidad || 'pública',
    };
    const cypher = `
      MATCH (u:Usuario {userId: $userId}), (p:Publicacion {postId: $postId})
      CREATE (u)-[r:COMPARTIO $props]->(p)
      RETURN u, type(r), p`;
    const result = await runWrite(cypher, { userId: req.body.userId, postId: req.body.postId, props });
    ok(res, result, { cypher: cypher.trim() });
  } catch (err) { fail(res, err); }
});

// POST /postulaciones — POSTULO_A
router.post('/postulaciones', async (req, res) => {
  try {
    requireFields(req.body, ['userId', 'empleoId']);
    const props = {
      fecha_postulacion: req.body.fecha_postulacion || new Date().toISOString().slice(0, 10),
      estado: req.body.estado || 'pendiente',
      carta_presentacion: req.body.carta_presentacion ?? false,
    };
    const cypher = `
      MATCH (u:Usuario {userId: $userId}), (j:Empleo {empleoId: $empleoId})
      CREATE (u)-[r:POSTULO_A $props]->(j)
      RETURN u, type(r), j`;
    const result = await runWrite(cypher, { userId: req.body.userId, empleoId: req.body.empleoId, props });
    ok(res, result, { cypher: cypher.trim() });
  } catch (err) { fail(res, err); }
});

// POST /seguimientos — SIGUE_A
router.post('/seguimientos', async (req, res) => {
  try {
    requireFields(req.body, ['userId', 'empresaId']);
    const props = {
      fecha_seguimiento: req.body.fecha_seguimiento || new Date().toISOString().slice(0, 10),
      notificaciones: req.body.notificaciones ?? true,
      motivo: req.body.motivo || '',
    };
    const cypher = `
      MATCH (u:Usuario {userId: $userId}), (e:Empresa {empresaId: $empresaId})
      CREATE (u)-[r:SIGUE_A $props]->(e)
      RETURN u, type(r), e`;
    const result = await runWrite(cypher, { userId: req.body.userId, empresaId: req.body.empresaId, props });
    ok(res, result, { cypher: cypher.trim() });
  } catch (err) { fail(res, err); }
});

// POST /empleos-historial — ESTAR_EN
router.post('/empleos-historial', async (req, res) => {
  try {
    requireFields(req.body, ['userId', 'empresaId', 'cargo']);
    const props = {
      cargo: req.body.cargo,
      fecha_inicio: req.body.fecha_inicio || new Date().toISOString().slice(0, 10),
      actual: req.body.actual ?? true,
    };
    const cypher = `
      MATCH (u:Usuario {userId: $userId}), (e:Empresa {empresaId: $empresaId})
      CREATE (u)-[r:ESTAR_EN $props]->(e)
      RETURN u, type(r), e`;
    const result = await runWrite(cypher, { userId: req.body.userId, empresaId: req.body.empresaId, props });
    ok(res, result, { cypher: cypher.trim() });
  } catch (err) { fail(res, err); }
});

// POST /estudios — ESTUDIO_EN
router.post('/estudios', async (req, res) => {
  try {
    requireFields(req.body, ['userId', 'educacionId']);
    const props = {
      fecha_inicio: req.body.fecha_inicio || new Date().toISOString().slice(0, 10),
      fecha_graduacion: req.body.fecha_graduacion || '',
      graduado: req.body.graduado ?? false,
    };
    const cypher = `
      MATCH (u:Usuario {userId: $userId}), (ed:Educacion {educacionId: $educacionId})
      CREATE (u)-[r:ESTUDIO_EN $props]->(ed)
      RETURN u, type(r), ed`;
    const result = await runWrite(cypher, { userId: req.body.userId, educacionId: req.body.educacionId, props });
    ok(res, result, { cypher: cypher.trim() });
  } catch (err) { fail(res, err); }
});

// POST /menciones — MENCIONA
router.post('/menciones', async (req, res) => {
  try {
    requireFields(req.body, ['postId', 'userId']);
    const props = {
      fecha: req.body.fecha || new Date().toISOString().slice(0, 10),
      tipo: req.body.tipo || 'etiqueta',
      confirmada: req.body.confirmada ?? false,
    };
    const cypher = `
      MATCH (p:Publicacion {postId: $postId}), (u:Usuario {userId: $userId})
      CREATE (p)-[r:MENCIONA $props]->(u)
      RETURN p, type(r), u`;
    const result = await runWrite(cypher, { postId: req.body.postId, userId: req.body.userId, props });
    ok(res, result, { cypher: cypher.trim() });
  } catch (err) { fail(res, err); }
});

// POST /relaciones — genérico tipado
router.post('/relaciones', async (req, res) => {
  try {
    const { from, to, type, properties } = req.body;
    requireFields(req.body, ['from', 'to', 'type', 'properties']);
    requireMinProps(properties, 3);
    const fromLabel = safeLabel(from.label);
    const toLabel   = safeLabel(to.label);
    const relType   = safeRelType(type);
    const cypher = `
      MATCH (a:${fromLabel} {${from.idField}: $fromId}), (b:${toLabel} {${to.idField}: $toId})
      CREATE (a)-[r:${relType} $props]->(b)
      RETURN a, type(r), b`;
    const result = await runWrite(cypher, { fromId: from.idValue, toId: to.idValue, props: properties });
    ok(res, result, { cypher: cypher.trim() });
  } catch (err) { fail(res, err); }
});

module.exports = router;
