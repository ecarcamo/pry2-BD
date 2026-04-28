'use strict';
require('dotenv').config();
const neo4j = require('neo4j-driver');
const { toPlain, recordsToRows } = require('./lib/serialize');

const URI  = process.env.NEO4J_URI;
const USER = process.env.NEO4J_USERNAME;
const PASS = process.env.NEO4J_PASSWORD;
const DB   = process.env.NEO4J_DATABASE;

let _driver = null;

function getDriver() {
  if (!_driver) {
    _driver = neo4j.driver(URI, neo4j.auth.basic(USER, PASS));
  }
  return _driver;
}

async function runRead(cypher, params = {}) {
  const session = getDriver().session({ database: DB, defaultAccessMode: neo4j.session.READ });
  try {
    const result = await session.run(cypher, params);
    return recordsToRows(result.records, result.summary);
  } finally {
    await session.close();
  }
}

async function runWrite(cypher, params = {}) {
  const session = getDriver().session({ database: DB, defaultAccessMode: neo4j.session.WRITE });
  try {
    const result = await session.run(cypher, params);
    return recordsToRows(result.records, result.summary);
  } finally {
    await session.close();
  }
}

async function verifyConnectivity() {
  await getDriver().verifyConnectivity();
}

async function close() {
  if (_driver) {
    await _driver.close();
    _driver = null;
  }
}

module.exports = { getDriver, runRead, runWrite, verifyConnectivity, close, DB };
