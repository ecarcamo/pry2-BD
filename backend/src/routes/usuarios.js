'use strict';
const { Router } = require('express');
const { v4: uuidv4 } = require('uuid');
const { runRead, runWrite } = require('../neo4j');
const { buildSetClause, buildRemoveClause, buildWhereClause } = require('../lib/cypher-build');
const { requireFields } = require('../lib/validate');

const router = Router();

const ok = (res, data, meta) => res.json({ ok: true, ...data, ...(meta ? { meta } : {}) });
const fail = (res, err, status = 400) => res.status(status).json({ ok: false, error: err.message || err });

// POST /usuarios — 1 label, ≥5 props (rúbrica 1 y 3)
router.post('/', async (req, res) => {
  try {
    requireFields(req.body, ['nombre', 'email']);
    const userId = req.body.userId || uuidv4();
    const props = {
      userId,
      nombre: req.body.nombre,
      email: req.body.email,
      titular: req.body.titular || '',
      habilidades: req.body.habilidades || [],
      abierto_a_trabajo: req.body.abierto_a_trabajo ?? false,
      fecha_registro: req.body.fecha_registro || new Date().toISOString().slice(0, 10),
      conexiones_count: req.body.conexiones_count ?? 0,
    };
    const cypher = `CREATE (u:Usuario $props) RETURN u`;
    const result = await runWrite(cypher, { props });
    ok(res, result, { cypher });
  } catch (err) { fail(res, err); }
});

// POST /usuarios/admin — 2 labels (rúbrica 2)
router.post('/admin', async (req, res) => {
  try {
    requireFields(req.body, ['nombre', 'email']);
    const userId = req.body.userId || uuidv4();
    const props = {
      userId,
      nombre: req.body.nombre,
      email: req.body.email,
      titular: req.body.titular || '',
      habilidades: req.body.habilidades || [],
      abierto_a_trabajo: req.body.abierto_a_trabajo ?? false,
      fecha_registro: req.body.fecha_registro || new Date().toISOString().slice(0, 10),
      conexiones_count: req.body.conexiones_count ?? 0,
      nivel_acceso: req.body.nivel_acceso || 'moderador',
      puede_moderar: req.body.puede_moderar ?? true,
      fecha_asignacion: req.body.fecha_asignacion || new Date().toISOString().slice(0, 10),
      asignado_por: req.body.asignado_por || '',
      activo: req.body.activo ?? true,
    };
    const cypher = `CREATE (u:Usuario:Admin $props) RETURN u`;
    const result = await runWrite(cypher, { props });
    ok(res, result, { cypher });
  } catch (err) { fail(res, err); }
});

// GET /usuarios — lista con filtros opcionales (rúbrica 4)
router.get('/', async (req, res) => {
  try {
    const { abierto_a_trabajo, pais, limit = 20, orderBy = 'conexiones_count', dir = 'DESC' } = req.query;
    const filters = [];
    if (abierto_a_trabajo !== undefined) filters.push(`u.abierto_a_trabajo = ${abierto_a_trabajo === 'true'}`);
    if (pais) filters.push(`u.pais = '${pais.replace(/'/g, "\\'")}'`);
    const where = filters.length ? 'WHERE ' + filters.join(' AND ') : '';
    const safeOrder = ['conexiones_count', 'nombre', 'fecha_registro'].includes(orderBy) ? orderBy : 'conexiones_count';
    const safeDir = dir.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    const cypher = `MATCH (u:Usuario) ${where} RETURN u ORDER BY u.${safeOrder} ${safeDir} LIMIT ${parseInt(limit, 10) || 20}`;
    const result = await runRead(cypher);
    ok(res, result, { cypher });
  } catch (err) { fail(res, err); }
});

// GET /usuarios/:userId — un nodo (rúbrica 4)
router.get('/:userId', async (req, res) => {
  try {
    const cypher = `MATCH (u:Usuario {userId: $userId}) RETURN u`;
    const result = await runRead(cypher, { userId: req.params.userId });
    ok(res, result, { cypher });
  } catch (err) { fail(res, err); }
});

// PATCH /usuarios/propiedades/bulk — múltiples nodos (rúbrica 5)
router.patch('/propiedades/bulk', async (req, res) => {
  try {
    const { filter = {}, set = {}, remove = [] } = req.body;
    const setCl  = buildSetClause(set, 'u');
    const remCl  = buildRemoveClause(remove, 'u');
    if (!setCl && !remCl) return fail(res, new Error('Nada que actualizar'));
    const filterParts = Object.entries(filter).map(([k, v]) => `u.${k} = $filter.${k}`).join(' AND ');
    const where = filterParts ? `WHERE ${filterParts}` : '';
    const cypher = `MATCH (u:Usuario) ${where} ${setCl} ${remCl} RETURN u`;
    const result = await runWrite(cypher, { set, filter });
    ok(res, result, { cypher });
  } catch (err) { fail(res, err); }
});

// PATCH /usuarios/:userId/propiedades — 1 nodo (rúbrica 5)
router.patch('/:userId/propiedades', async (req, res) => {
  try {
    const { set = {}, remove = [] } = req.body;
    const setCl = buildSetClause(set, 'u');
    const remCl = buildRemoveClause(remove, 'u');
    if (!setCl && !remCl) return fail(res, new Error('Nada que actualizar'));
    const cypher = `MATCH (u:Usuario {userId: $userId}) ${setCl} ${remCl} RETURN u`;
    const result = await runWrite(cypher, { userId: req.params.userId, set });
    ok(res, result, { cypher });
  } catch (err) { fail(res, err); }
});

// DELETE /usuarios/:userId
router.delete('/:userId', async (req, res) => {
  try {
    const cypher = `MATCH (u:Usuario {userId: $userId}) DETACH DELETE u`;
    const result = await runWrite(cypher, { userId: req.params.userId });
    ok(res, result, { cypher });
  } catch (err) { fail(res, err); }
});

module.exports = router;
