'use strict';
const { Router } = require('express');
const { runRead, runWrite } = require('../neo4j');

const router = Router();

// POST /cypher — passthrough para la consola del frontend
router.post('/', async (req, res) => {
  try {
    const { query, params = {}, mode = 'read' } = req.body;
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ ok: false, error: 'query requerido' });
    }
    const run = mode === 'write' ? runWrite : runRead;
    const result = await run(query, params);
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

module.exports = router;
