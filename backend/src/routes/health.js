'use strict';
const { Router } = require('express');
const { verifyConnectivity } = require('../neo4j');

const router = Router();

router.get('/ping', async (_req, res) => {
  try {
    await verifyConnectivity();
    res.json({
      ok: true,
      status: 'pong',
      neo4j: 'ok',
      database: process.env.NEO4J_DATABASE,
      instance: process.env.AURA_INSTANCENAME,
    });
  } catch (err) {
    res.status(503).json({ ok: false, status: 'error', error: err.message });
  }
});

module.exports = router;
