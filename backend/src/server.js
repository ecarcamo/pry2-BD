'use strict';
require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const { close } = require('./neo4j');

const app  = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Routes
app.use('/',           require('./routes/health'));
app.use('/usuarios',   require('./routes/usuarios'));
app.use('/empresas',   require('./routes/empresas'));
app.use('/publicaciones', require('./routes/publicaciones'));
app.use('/empleos',    require('./routes/empleos'));
app.use('/educacion',  require('./routes/educacion'));
app.use('/',           require('./routes/relaciones'));
app.use('/consultas',  require('./routes/consultas'));
app.use('/cypher',     require('./routes/cypher'));

app.listen(PORT, () => {
  console.log(`NeoLab backend escuchando en http://localhost:${PORT}`);
});

process.on('SIGINT',  async () => { await close(); process.exit(0); });
process.on('SIGTERM', async () => { await close(); process.exit(0); });
