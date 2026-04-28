'use strict';

const ID_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;
const ALLOWED_OPS = new Set(['=', '<>', '<', '<=', '>', '>=', 'CONTAINS', 'STARTS WITH', 'IN']);

function safeLabel(s) {
  if (!ID_RE.test(s)) throw new Error(`Label inválido: ${s}`);
  return s;
}

function safeRelType(s) {
  if (!ID_RE.test(s)) throw new Error(`Tipo de relación inválido: ${s}`);
  return s;
}

function safeProp(s) {
  if (!ID_RE.test(s)) throw new Error(`Propiedad inválida: ${s}`);
  return s;
}

// Genera: SET alias.prop1 = $set.prop1, alias.prop2 = $set.prop2
function buildSetClause(set, alias = 'n') {
  if (!set || !Object.keys(set).length) return '';
  const parts = Object.keys(set).map(k => `${alias}.${safeProp(k)} = $set.${k}`);
  return 'SET ' + parts.join(', ');
}

// Genera: REMOVE alias.prop1, alias.prop2
function buildRemoveClause(remove, alias = 'n') {
  if (!remove || !remove.length) return '';
  return 'REMOVE ' + remove.map(k => `${alias}.${safeProp(k)}`).join(', ');
}

// where = [{prop, op, value}]
function buildWhereClause(where, paramAlias = 'w', nodeAlias = 'n') {
  if (!where || !where.length) return { clause: '', params: {} };
  const parts = [];
  const params = {};
  where.forEach((cond, i) => {
    const op = cond.op || '=';
    if (!ALLOWED_OPS.has(op.toUpperCase())) throw new Error(`Operador no permitido: ${op}`);
    const key = `${paramAlias}_${i}`;
    parts.push(`${nodeAlias}.${safeProp(cond.prop)} ${op} $${key}`);
    params[key] = cond.value;
  });
  return { clause: 'WHERE ' + parts.join(' AND '), params };
}

module.exports = { safeLabel, safeRelType, safeProp, buildSetClause, buildRemoveClause, buildWhereClause };
