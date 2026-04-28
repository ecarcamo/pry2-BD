'use strict';

function requireFields(body, fields) {
  const missing = fields.filter(f => body[f] === undefined || body[f] === null || body[f] === '');
  if (missing.length) throw new Error(`Campos requeridos faltantes: ${missing.join(', ')}`);
}

function requireMinProps(obj, min, name = 'properties') {
  if (!obj || typeof obj !== 'object' || Object.keys(obj).length < min) {
    throw new Error(`${name} debe tener al menos ${min} propiedades`);
  }
}

module.exports = { requireFields, requireMinProps };
