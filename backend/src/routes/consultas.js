'use strict';
const { Router } = require('express');
const { runRead } = require('../neo4j');

const router = Router();
const ok   = (res, data, meta) => res.json({ ok: true, ...data, ...(meta ? { meta } : {}) });
const fail = (res, err, status = 400) => res.status(status).json({ ok: false, error: err.message || err });

// Q1 — Top usuarios por conexiones
router.get('/usuarios-top-conexiones', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 5;
    const cypher = `
      MATCH (u:Usuario)
      RETURN u.nombre AS usuario, u.titular AS titular, u.conexiones_count AS conexiones
      ORDER BY conexiones DESC LIMIT ${limit}`;
    const result = await runRead(cypher);
    ok(res, result, { cypher: cypher.trim() });
  } catch (err) { fail(res, err); }
});

// Q2 — Empresas con conteo de seguidores
router.get('/empresas-seguidas', async (req, res) => {
  try {
    const cypher = `
      MATCH (u:Usuario)-[s:SIGUE_A]->(e:Empresa)
      RETURN e.nombre AS empresa, e.industria AS industria, count(u) AS seguidores
      ORDER BY seguidores DESC`;
    const result = await runRead(cypher);
    ok(res, result, { cypher: cypher.trim() });
  } catch (err) { fail(res, err); }
});

// Q3 — Vacantes activas con rango salarial
router.get('/empleos-activos', async (req, res) => {
  try {
    const cypher = `
      MATCH (emp:Empresa)-[o:OFERTA]->(j:Empleo)
      WHERE j.activo = true
      RETURN emp.nombre AS empresa, j.titulo AS puesto, j.modalidad AS modalidad,
             j.salario_min AS min, j.salario_max AS max
      ORDER BY max DESC`;
    const result = await runRead(cypher);
    ok(res, result, { cypher: cypher.trim() });
  } catch (err) { fail(res, err); }
});

// Q4 — Estadísticas de likes
router.get('/publicaciones-stats', async (req, res) => {
  try {
    const cypher = `
      MATCH (p:Publicacion)
      RETURN avg(p.likes_count) AS promedio_likes, max(p.likes_count) AS max_likes,
             count(p) AS total_publicaciones`;
    const result = await runRead(cypher);
    ok(res, result, { cypher: cypher.trim() });
  } catch (err) { fail(res, err); }
});

// Q5 — Postulaciones por estado
router.get('/postulaciones-por-estado', async (req, res) => {
  try {
    const cypher = `
      MATCH (u:Usuario)-[r:POSTULO_A]->(j:Empleo)
      RETURN r.estado AS estado, count(*) AS cantidad, collect(u.nombre) AS candidatos
      ORDER BY cantidad DESC`;
    const result = await runRead(cypher);
    ok(res, result, { cypher: cypher.trim() });
  } catch (err) { fail(res, err); }
});

// Q6 — Autoría de publicaciones
router.get('/autoria-publicaciones', async (req, res) => {
  try {
    const cypher = `
      MATCH (u:Usuario)-[:PUBLICO]->(p:Publicacion)
      RETURN u.nombre AS autor, p.contenido AS publicacion, p.likes_count AS likes, p.tags AS tags
      ORDER BY likes DESC`;
    const result = await runRead(cypher);
    ok(res, result, { cypher: cypher.trim() });
  } catch (err) { fail(res, err); }
});

// Conteo por label — útil para el header del frontend
router.get('/conteo-por-label', async (req, res) => {
  try {
    const cypher = `MATCH (n) RETURN labels(n) AS etiquetas, count(*) AS total ORDER BY total DESC`;
    const result = await runRead(cypher);
    ok(res, result, { cypher });
  } catch (err) { fail(res, err); }
});

// Agregación genérica ad-hoc
router.post('/agregacion', async (req, res) => {
  try {
    const { label, where = [], groupBy, agg = 'count', field } = req.body;
    if (!label) return fail(res, new Error('label requerido'));
    const SAFE_ID = /^[A-Za-z_][A-Za-z0-9_]*$/;
    if (!SAFE_ID.test(label)) return fail(res, new Error('label inválido'));
    if (groupBy && !SAFE_ID.test(groupBy)) return fail(res, new Error('groupBy inválido'));
    if (field && !SAFE_ID.test(field)) return fail(res, new Error('field inválido'));
    const ALLOWED_AGGS = new Set(['count', 'avg', 'sum', 'min', 'max']);
    if (!ALLOWED_AGGS.has(agg)) return fail(res, new Error('agg inválido'));

    const filterParts = where.map((c, i) => `n.${c.prop} = $w${i}`);
    const whereCl = filterParts.length ? 'WHERE ' + filterParts.join(' AND ') : '';
    const params = {};
    where.forEach((c, i) => { params[`w${i}`] = c.value; });

    const aggExpr = agg === 'count' ? `count(*)` : `${agg}(n.${field})`;
    const returnCl = groupBy
      ? `n.${groupBy} AS ${groupBy}, ${aggExpr} AS resultado`
      : `${aggExpr} AS resultado`;
    const orderCl = groupBy ? `ORDER BY resultado DESC` : '';

    const cypher = `MATCH (n:${label}) ${whereCl} RETURN ${returnCl} ${orderCl}`;
    const result = await runRead(cypher, params);
    ok(res, result, { cypher: cypher.trim() });
  } catch (err) { fail(res, err); }
});

module.exports = router;
