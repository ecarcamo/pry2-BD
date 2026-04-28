'use strict';
const { Router } = require('express');
const { v4: uuidv4 } = require('uuid');
const { runRead, runWrite } = require('../neo4j');
const { buildSetClause, buildRemoveClause } = require('../lib/cypher-build');
const { requireFields } = require('../lib/validate');

const router = Router();
const ok   = (res, data, meta) => res.json({ ok: true, ...data, ...(meta ? { meta } : {}) });
const fail = (res, err, status = 400) => res.status(status).json({ ok: false, error: err.message || err });

router.post('/', async (req, res) => {
  try {
    requireFields(req.body, ['institucion', 'carrera', 'grado', 'pais']);
    const educacionId = req.body.educacionId || uuidv4();
    const props = {
      educacionId,
      institucion: req.body.institucion,
      carrera: req.body.carrera,
      grado: req.body.grado,
      pais: req.body.pais,
      acreditada: req.body.acreditada ?? false,
    };
    const cypher = `CREATE (ed:Educacion $props) RETURN ed`;
    const result = await runWrite(cypher, { props });
    ok(res, result, { cypher });
  } catch (err) { fail(res, err); }
});

router.get('/', async (req, res) => {
  try {
    const { pais, acreditada, limit = 20 } = req.query;
    const filters = [];
    if (pais) filters.push(`ed.pais = '${pais.replace(/'/g, "\\'")}'`);
    if (acreditada !== undefined) filters.push(`ed.acreditada = ${acreditada === 'true'}`);
    const where = filters.length ? 'WHERE ' + filters.join(' AND ') : '';
    const cypher = `MATCH (ed:Educacion) ${where} RETURN ed LIMIT ${parseInt(limit, 10) || 20}`;
    const result = await runRead(cypher);
    ok(res, result, { cypher });
  } catch (err) { fail(res, err); }
});

router.get('/:educacionId', async (req, res) => {
  try {
    const cypher = `MATCH (ed:Educacion {educacionId: $educacionId}) RETURN ed`;
    const result = await runRead(cypher, { educacionId: req.params.educacionId });
    ok(res, result, { cypher });
  } catch (err) { fail(res, err); }
});

router.patch('/propiedades/bulk', async (req, res) => {
  try {
    const { filter = {}, set = {}, remove = [] } = req.body;
    const setCl = buildSetClause(set, 'ed');
    const remCl = buildRemoveClause(remove, 'ed');
    if (!setCl && !remCl) return fail(res, new Error('Nada que actualizar'));
    const filterParts = Object.entries(filter).map(([k]) => `ed.${k} = $filter.${k}`).join(' AND ');
    const where = filterParts ? `WHERE ${filterParts}` : '';
    const cypher = `MATCH (ed:Educacion) ${where} ${setCl} ${remCl} RETURN ed`;
    const result = await runWrite(cypher, { set, filter });
    ok(res, result, { cypher });
  } catch (err) { fail(res, err); }
});

router.patch('/:educacionId/propiedades', async (req, res) => {
  try {
    const { set = {}, remove = [] } = req.body;
    const setCl = buildSetClause(set, 'ed');
    const remCl = buildRemoveClause(remove, 'ed');
    if (!setCl && !remCl) return fail(res, new Error('Nada que actualizar'));
    const cypher = `MATCH (ed:Educacion {educacionId: $educacionId}) ${setCl} ${remCl} RETURN ed`;
    const result = await runWrite(cypher, { educacionId: req.params.educacionId, set });
    ok(res, result, { cypher });
  } catch (err) { fail(res, err); }
});

module.exports = router;
