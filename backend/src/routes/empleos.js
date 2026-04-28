'use strict';
const { Router } = require('express');
const { v4: uuidv4 } = require('uuid');
const { runRead, runWrite } = require('../neo4j');
const { buildSetClause, buildRemoveClause } = require('../lib/cypher-build');
const { requireFields } = require('../lib/validate');

const router = Router();
const ok   = (res, data, meta) => res.json({ ok: true, ...data, ...(meta ? { meta } : {}) });
const fail = (res, err, status = 400) => res.status(status).json({ ok: false, error: err.message || err });

// POST /empleos — crea Empleo + relación OFERTA
router.post('/', async (req, res) => {
  try {
    requireFields(req.body, ['empresaId', 'titulo']);
    const empleoId = req.body.empleoId || uuidv4();
    const props = {
      empleoId,
      titulo: req.body.titulo,
      salario_min: req.body.salario_min ?? 0,
      salario_max: req.body.salario_max ?? 0,
      modalidad: req.body.modalidad || 'presencial',
      activo: req.body.activo ?? true,
      fecha_publicacion: req.body.fecha_publicacion || new Date().toISOString().slice(0, 10),
    };
    const relProps = {
      fecha_publicacion: props.fecha_publicacion,
      urgente: req.body.relProps?.urgente ?? false,
      remunerado: req.body.relProps?.remunerado ?? true,
    };
    const cypher = `
      MATCH (emp:Empresa {empresaId: $empresaId})
      CREATE (j:Empleo $props)
      CREATE (emp)-[r:OFERTA $relProps]->(j)
      RETURN emp, j, r`;
    const result = await runWrite(cypher, { empresaId: req.body.empresaId, props, relProps });
    ok(res, result, { cypher: cypher.trim() });
  } catch (err) { fail(res, err); }
});

router.get('/', async (req, res) => {
  try {
    const { activo, modalidad, salarioMin, limit = 20 } = req.query;
    const filters = [];
    if (activo !== undefined) filters.push(`j.activo = ${activo === 'true'}`);
    if (modalidad) filters.push(`j.modalidad = '${modalidad.replace(/'/g, "\\'")}'`);
    if (salarioMin) filters.push(`j.salario_min >= ${parseFloat(salarioMin)}`);
    const where = filters.length ? 'WHERE ' + filters.join(' AND ') : '';
    const cypher = `MATCH (j:Empleo) ${where} RETURN j ORDER BY j.fecha_publicacion DESC LIMIT ${parseInt(limit, 10) || 20}`;
    const result = await runRead(cypher);
    ok(res, result, { cypher });
  } catch (err) { fail(res, err); }
});

router.get('/:empleoId', async (req, res) => {
  try {
    const cypher = `MATCH (j:Empleo {empleoId: $empleoId}) RETURN j`;
    const result = await runRead(cypher, { empleoId: req.params.empleoId });
    ok(res, result, { cypher });
  } catch (err) { fail(res, err); }
});

router.patch('/propiedades/bulk', async (req, res) => {
  try {
    const { filter = {}, set = {}, remove = [] } = req.body;
    const setCl = buildSetClause(set, 'j');
    const remCl = buildRemoveClause(remove, 'j');
    if (!setCl && !remCl) return fail(res, new Error('Nada que actualizar'));
    const filterParts = Object.entries(filter).map(([k]) => `j.${k} = $filter.${k}`).join(' AND ');
    const where = filterParts ? `WHERE ${filterParts}` : '';
    const cypher = `MATCH (j:Empleo) ${where} ${setCl} ${remCl} RETURN j`;
    const result = await runWrite(cypher, { set, filter });
    ok(res, result, { cypher });
  } catch (err) { fail(res, err); }
});

router.patch('/:empleoId/propiedades', async (req, res) => {
  try {
    const { set = {}, remove = [] } = req.body;
    const setCl = buildSetClause(set, 'j');
    const remCl = buildRemoveClause(remove, 'j');
    if (!setCl && !remCl) return fail(res, new Error('Nada que actualizar'));
    const cypher = `MATCH (j:Empleo {empleoId: $empleoId}) ${setCl} ${remCl} RETURN j`;
    const result = await runWrite(cypher, { empleoId: req.params.empleoId, set });
    ok(res, result, { cypher });
  } catch (err) { fail(res, err); }
});

module.exports = router;
