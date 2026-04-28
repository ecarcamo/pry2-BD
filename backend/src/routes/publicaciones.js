'use strict';
const { Router } = require('express');
const { v4: uuidv4 } = require('uuid');
const { runRead, runWrite } = require('../neo4j');
const { buildSetClause, buildRemoveClause } = require('../lib/cypher-build');
const { requireFields } = require('../lib/validate');

const router = Router();
const ok   = (res, data, meta) => res.json({ ok: true, ...data, ...(meta ? { meta } : {}) });
const fail = (res, err, status = 400) => res.status(status).json({ ok: false, error: err.message || err });

// POST /publicaciones — crea Publicacion + relación PUBLICO en una transacción
router.post('/', async (req, res) => {
  try {
    requireFields(req.body, ['userId', 'contenido']);
    const postId = req.body.postId || uuidv4();
    const props = {
      postId,
      contenido: req.body.contenido,
      fecha_publicacion: req.body.fecha_publicacion || new Date().toISOString().slice(0, 10),
      likes_count: req.body.likes_count ?? 0,
      tags: req.body.tags || [],
      es_oferta: req.body.es_oferta ?? false,
    };
    const relProps = {
      fecha: req.body.relProps?.fecha || props.fecha_publicacion,
      anonimo: req.body.relProps?.anonimo ?? false,
      desde_empresa: req.body.relProps?.desde_empresa ?? false,
    };
    const cypher = `
      MATCH (u:Usuario {userId: $userId})
      CREATE (p:Publicacion $props)
      CREATE (u)-[r:PUBLICO $relProps]->(p)
      RETURN u, p, r`;
    const result = await runWrite(cypher, { userId: req.body.userId, props, relProps });
    ok(res, result, { cypher: cypher.trim() });
  } catch (err) { fail(res, err); }
});

router.get('/', async (req, res) => {
  try {
    const { tag, minLikes, desde, limit = 20 } = req.query;
    const filters = [];
    if (tag) filters.push(`'${tag.replace(/'/g, "\\'")}' IN p.tags`);
    if (minLikes) filters.push(`p.likes_count >= ${parseInt(minLikes, 10)}`);
    if (desde) filters.push(`p.fecha_publicacion >= '${desde.replace(/'/g, "\\'")}'`);
    const where = filters.length ? 'WHERE ' + filters.join(' AND ') : '';
    const cypher = `MATCH (p:Publicacion) ${where} RETURN p ORDER BY p.fecha_publicacion DESC LIMIT ${parseInt(limit, 10) || 20}`;
    const result = await runRead(cypher);
    ok(res, result, { cypher });
  } catch (err) { fail(res, err); }
});

router.get('/:postId', async (req, res) => {
  try {
    const cypher = `MATCH (u:Usuario)-[:PUBLICO]->(p:Publicacion {postId: $postId}) RETURN u, p`;
    const result = await runRead(cypher, { postId: req.params.postId });
    ok(res, result, { cypher });
  } catch (err) { fail(res, err); }
});

router.patch('/propiedades/bulk', async (req, res) => {
  try {
    const { filter = {}, set = {}, remove = [] } = req.body;
    const setCl = buildSetClause(set, 'p');
    const remCl = buildRemoveClause(remove, 'p');
    if (!setCl && !remCl) return fail(res, new Error('Nada que actualizar'));
    const filterParts = Object.entries(filter).map(([k]) => `p.${k} = $filter.${k}`).join(' AND ');
    const where = filterParts ? `WHERE ${filterParts}` : '';
    const cypher = `MATCH (p:Publicacion) ${where} ${setCl} ${remCl} RETURN p`;
    const result = await runWrite(cypher, { set, filter });
    ok(res, result, { cypher });
  } catch (err) { fail(res, err); }
});

router.patch('/:postId/propiedades', async (req, res) => {
  try {
    const { set = {}, remove = [] } = req.body;
    const setCl = buildSetClause(set, 'p');
    const remCl = buildRemoveClause(remove, 'p');
    if (!setCl && !remCl) return fail(res, new Error('Nada que actualizar'));
    const cypher = `MATCH (p:Publicacion {postId: $postId}) ${setCl} ${remCl} RETURN p`;
    const result = await runWrite(cypher, { postId: req.params.postId, set });
    ok(res, result, { cypher });
  } catch (err) { fail(res, err); }
});

module.exports = router;
