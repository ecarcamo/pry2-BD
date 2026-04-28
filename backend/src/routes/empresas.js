'use strict';
const { Router } = require('express');
const { v4: uuidv4 } = require('uuid');
const { runRead, runWrite } = require('../neo4j');
const { buildSetClause, buildRemoveClause } = require('../lib/cypher-build');
const { requireFields } = require('../lib/validate');

const router = Router();
const ok   = (res, data, meta) => res.json({ ok: true, ...data, ...(meta ? { meta } : {}) });
const fail = (res, err, status = 400) => res.status(status).json({ ok: false, error: err.message || err });

// POST /empresas — ≥5 props (rúbrica 3)
router.post('/', async (req, res) => {
  try {
    requireFields(req.body, ['nombre', 'industria', 'pais']);
    const empresaId = req.body.empresaId || uuidv4();
    const props = {
      empresaId,
      nombre: req.body.nombre,
      industria: req.body.industria,
      pais: req.body.pais,
      verificada: req.body.verificada ?? false,
      empleados_count: req.body.empleados_count ?? 0,
      fecha_fundacion: req.body.fecha_fundacion || new Date().toISOString().slice(0, 10),
    };
    const cypher = `CREATE (e:Empresa $props) RETURN e`;
    const result = await runWrite(cypher, { props });
    ok(res, result, { cypher });
  } catch (err) { fail(res, err); }
});

router.get('/', async (req, res) => {
  try {
    const { verificada, pais, limit = 20 } = req.query;
    const filters = [];
    if (verificada !== undefined) filters.push(`e.verificada = ${verificada === 'true'}`);
    if (pais) filters.push(`e.pais = '${pais.replace(/'/g, "\\'")}'`);
    const where = filters.length ? 'WHERE ' + filters.join(' AND ') : '';
    const cypher = `MATCH (e:Empresa) ${where} RETURN e LIMIT ${parseInt(limit, 10) || 20}`;
    const result = await runRead(cypher);
    ok(res, result, { cypher });
  } catch (err) { fail(res, err); }
});

router.get('/:empresaId', async (req, res) => {
  try {
    const cypher = `MATCH (e:Empresa {empresaId: $empresaId}) RETURN e`;
    const result = await runRead(cypher, { empresaId: req.params.empresaId });
    ok(res, result, { cypher });
  } catch (err) { fail(res, err); }
});

router.patch('/propiedades/bulk', async (req, res) => {
  try {
    const { filter = {}, set = {}, remove = [] } = req.body;
    const setCl = buildSetClause(set, 'e');
    const remCl = buildRemoveClause(remove, 'e');
    if (!setCl && !remCl) return fail(res, new Error('Nada que actualizar'));
    const filterParts = Object.entries(filter).map(([k]) => `e.${k} = $filter.${k}`).join(' AND ');
    const where = filterParts ? `WHERE ${filterParts}` : '';
    const cypher = `MATCH (e:Empresa) ${where} ${setCl} ${remCl} RETURN e`;
    const result = await runWrite(cypher, { set, filter });
    ok(res, result, { cypher });
  } catch (err) { fail(res, err); }
});

router.patch('/:empresaId/propiedades', async (req, res) => {
  try {
    const { set = {}, remove = [] } = req.body;
    const setCl = buildSetClause(set, 'e');
    const remCl = buildRemoveClause(remove, 'e');
    if (!setCl && !remCl) return fail(res, new Error('Nada que actualizar'));
    const cypher = `MATCH (e:Empresa {empresaId: $empresaId}) ${setCl} ${remCl} RETURN e`;
    const result = await runWrite(cypher, { empresaId: req.params.empresaId, set });
    ok(res, result, { cypher });
  } catch (err) { fail(res, err); }
});

module.exports = router;
