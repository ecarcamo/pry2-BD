# Importar datos a Neo4j Aura

## Requisitos
- Python 3.x
- Acceso a la instancia Neo4j Aura del proyecto
- Credenciales de conexión (URI, usuario, contraseña)

---

## Paso 1 — Clonar el repositorio

```bash
git clone https://github.com/ecarcamo/pry2-BD.git
cd pry2-BD
```

---

## Paso 2 — Generar los CSVs

```bash
cd dataGenerator
python3 generate_neo4j_csv.py
```

Esto genera la carpeta `neo4j_csv/` con 16 archivos:

| Archivo | Contenido | Filas |
|---|---|---|
| `usuarios.csv` | Nodos Usuario + Admin | 2,000 |
| `empresas.csv` | Nodos Empresa | 500 |
| `publicaciones.csv` | Nodos Publicacion | 1,500 |
| `empleos.csv` | Nodos Empleo | 600 |
| `educaciones.csv` | Nodos Educacion | 400 |
| `rel_conectado_con.csv` | CONECTADO_CON | 5,000 |
| `rel_publico.csv` | PUBLICO | 1,500 |
| `rel_dio_like.csv` | DIO_LIKE | 6,000 |
| `rel_comento.csv` | COMENTO | 3,000 |
| `rel_compartio.csv` | COMPARTIO | 2,500 |
| `rel_estudio_en.csv` | ESTUDIO_EN | 3,000 |
| `rel_postulo_a.csv` | POSTULO_A | 3,000 |
| `rel_oferta.csv` | OFERTA | 600 |
| `rel_sigue_a.csv` | SIGUE_A | 4,000 |
| `rel_estar_en.csv` | ESTAR_EN | 2,500 |
| `rel_menciona.csv` | MENCIONA | 1,500 |

**Total: 5,000 nodos distintos — 35,600 relaciones**

---

## Paso 3 — Abrir Neo4j Browser

1. Ir a [console.neo4j.io](https://console.neo4j.io)
2. Seleccionar la instancia **pry2-BD**
3. Clic en **Open** → **Query**

---

## Paso 4 — Limpiar la instancia (si ya tiene datos)

Correr en orden en el Query box:

```cypher
MATCH ()-[r]->() DELETE r;
```
```cypher
MATCH (n) DELETE n;
```
```cypher
DROP CONSTRAINT usuario_id IF EXISTS;
DROP CONSTRAINT empresa_id IF EXISTS;
DROP CONSTRAINT pub_id IF EXISTS;
DROP CONSTRAINT empleo_id IF EXISTS;
DROP CONSTRAINT educacion_id IF EXISTS;
```

Verificar que quedó vacío:
```cypher
MATCH (n) RETURN count(n);
```
Debe retornar `0`.

---

## Paso 5 — Crear constraints

```cypher
CREATE CONSTRAINT usuario_id   IF NOT EXISTS FOR (n:Usuario)    REQUIRE n.usuario_id      IS UNIQUE;
CREATE CONSTRAINT empresa_id   IF NOT EXISTS FOR (n:Empresa)    REQUIRE n.empresa_id      IS UNIQUE;
CREATE CONSTRAINT pub_id       IF NOT EXISTS FOR (n:Publicacion) REQUIRE n.publicacion_id  IS UNIQUE;
CREATE CONSTRAINT empleo_id    IF NOT EXISTS FOR (n:Empleo)     REQUIRE n.empleo_id       IS UNIQUE;
CREATE CONSTRAINT educacion_id IF NOT EXISTS FOR (n:Educacion)  REQUIRE n.educacion_id    IS UNIQUE;
```

---

## Paso 6 — Importar nodos

Correr cada bloque por separado.

**Usuarios**
```cypher
LOAD CSV WITH HEADERS FROM 'https://raw.githubusercontent.com/ecarcamo/pry2-BD/main/dataGenerator/neo4j_csv/usuarios.csv' AS row
CALL {
  WITH row
  CREATE (u:Usuario {
    usuario_id:        row.usuario_id,
    nombre:            row.nombre,
    email:             row.email,
    titular:           row.titular,
    habilidades:       split(row.habilidades, ';'),
    abierto_a_trabajo: row.abierto_a_trabajo = 'true',
    fecha_registro:    date(row.fecha_registro),
    conexiones_count:  toInteger(row.conexiones_count)
  })
  WITH u, row WHERE row.is_admin = 'true'
  SET u:Admin,
      u.nivel_acceso     = row.nivel_acceso,
      u.puede_moderar    = row.puede_moderar = 'true',
      u.fecha_asignacion = date(row.fecha_asignacion),
      u.asignado_por     = row.asignado_por,
      u.activo           = row.admin_activo = 'true'
} IN TRANSACTIONS OF 500 ROWS;
```

**Empresas**
```cypher
LOAD CSV WITH HEADERS FROM 'https://raw.githubusercontent.com/ecarcamo/pry2-BD/main/dataGenerator/neo4j_csv/empresas.csv' AS row
CALL {
  WITH row
  CREATE (:Empresa {
    empresa_id:      row.empresa_id,
    nombre:          row.nombre,
    industria:       row.industria,
    pais:            row.pais,
    verificada:      row.verificada = 'true',
    empleados_count: toInteger(row.empleados_count),
    fecha_fundacion: date(row.fecha_fundacion)
  })
} IN TRANSACTIONS OF 500 ROWS;
```

**Publicaciones**
```cypher
LOAD CSV WITH HEADERS FROM 'https://raw.githubusercontent.com/ecarcamo/pry2-BD/main/dataGenerator/neo4j_csv/publicaciones.csv' AS row
CALL {
  WITH row
  CREATE (:Publicacion {
    publicacion_id:    row.publicacion_id,
    contenido:         row.contenido,
    fecha_publicacion: date(row.fecha_publicacion),
    likes_count:       toInteger(row.likes_count),
    tags:              split(row.tags, ';'),
    es_oferta:         row.es_oferta = 'true'
  })
} IN TRANSACTIONS OF 500 ROWS;
```

**Empleos**
```cypher
LOAD CSV WITH HEADERS FROM 'https://raw.githubusercontent.com/ecarcamo/pry2-BD/main/dataGenerator/neo4j_csv/empleos.csv' AS row
CALL {
  WITH row
  CREATE (:Empleo {
    empleo_id:         row.empleo_id,
    titulo:            row.titulo,
    salario_min:       toFloat(row.salario_min),
    salario_max:       toFloat(row.salario_max),
    modalidad:         row.modalidad,
    activo:            row.activo = 'true',
    fecha_publicacion: date(row.fecha_publicacion)
  })
} IN TRANSACTIONS OF 500 ROWS;
```

**Educaciones**
```cypher
LOAD CSV WITH HEADERS FROM 'https://raw.githubusercontent.com/ecarcamo/pry2-BD/main/dataGenerator/neo4j_csv/educaciones.csv' AS row
CALL {
  WITH row
  CREATE (:Educacion {
    educacion_id: row.educacion_id,
    institucion:  row.institucion,
    carrera:      row.carrera,
    grado:        row.grado,
    pais:         row.pais,
    acreditada:   row.acreditada = 'true'
  })
} IN TRANSACTIONS OF 500 ROWS;
```

---

## Paso 7 — Importar relaciones

Correr cada bloque por separado.

**CONECTADO_CON**
```cypher
LOAD CSV WITH HEADERS FROM 'https://raw.githubusercontent.com/ecarcamo/pry2-BD/main/dataGenerator/neo4j_csv/rel_conectado_con.csv' AS row
CALL {
  WITH row
  MATCH (a:Usuario {usuario_id: row.from_usuario_id})
  MATCH (b:Usuario {usuario_id: row.to_usuario_id})
  MERGE (a)-[r:CONECTADO_CON]->(b)
  SET r.fecha_conexion = date(row.fecha_conexion), r.nivel = row.nivel, r.aceptada = row.aceptada = 'true'
} IN TRANSACTIONS OF 500 ROWS;
```

**PUBLICO**
```cypher
LOAD CSV WITH HEADERS FROM 'https://raw.githubusercontent.com/ecarcamo/pry2-BD/main/dataGenerator/neo4j_csv/rel_publico.csv' AS row
CALL {
  WITH row
  MATCH (u:Usuario {usuario_id: row.usuario_id})
  MATCH (p:Publicacion {publicacion_id: row.publicacion_id})
  MERGE (u)-[r:PUBLICO]->(p)
  SET r.fecha = date(row.fecha), r.anonimo = row.anonimo = 'true', r.desde_empresa = row.desde_empresa = 'true'
} IN TRANSACTIONS OF 500 ROWS;
```

**DIO_LIKE**
```cypher
LOAD CSV WITH HEADERS FROM 'https://raw.githubusercontent.com/ecarcamo/pry2-BD/main/dataGenerator/neo4j_csv/rel_dio_like.csv' AS row
CALL {
  WITH row
  MATCH (u:Usuario {usuario_id: row.usuario_id})
  MATCH (p:Publicacion {publicacion_id: row.publicacion_id})
  MERGE (u)-[r:DIO_LIKE]->(p)
  SET r.fecha = date(row.fecha), r.tipo_reaccion = row.tipo_reaccion, r.notificado = row.notificado = 'true'
} IN TRANSACTIONS OF 500 ROWS;
```

**COMENTO**
```cypher
LOAD CSV WITH HEADERS FROM 'https://raw.githubusercontent.com/ecarcamo/pry2-BD/main/dataGenerator/neo4j_csv/rel_comento.csv' AS row
CALL {
  WITH row
  MATCH (u:Usuario {usuario_id: row.usuario_id})
  MATCH (p:Publicacion {publicacion_id: row.publicacion_id})
  MERGE (u)-[r:COMENTO]->(p)
  SET r.contenido = row.contenido, r.fecha = date(row.fecha), r.editado = row.editado = 'true'
} IN TRANSACTIONS OF 500 ROWS;
```

**COMPARTIO**
```cypher
LOAD CSV WITH HEADERS FROM 'https://raw.githubusercontent.com/ecarcamo/pry2-BD/main/dataGenerator/neo4j_csv/rel_compartio.csv' AS row
CALL {
  WITH row
  MATCH (u:Usuario {usuario_id: row.usuario_id})
  MATCH (p:Publicacion {publicacion_id: row.publicacion_id})
  MERGE (u)-[r:COMPARTIO]->(p)
  SET r.fecha = date(row.fecha), r.con_comentario = row.con_comentario = 'true', r.visibilidad = row.visibilidad
} IN TRANSACTIONS OF 500 ROWS;
```

**ESTUDIO_EN**
```cypher
LOAD CSV WITH HEADERS FROM 'https://raw.githubusercontent.com/ecarcamo/pry2-BD/main/dataGenerator/neo4j_csv/rel_estudio_en.csv' AS row
CALL {
  WITH row
  MATCH (u:Usuario {usuario_id: row.usuario_id})
  MATCH (e:Educacion {educacion_id: row.educacion_id})
  MERGE (u)-[r:ESTUDIO_EN]->(e)
  SET r.fecha_inicio = date(row.fecha_inicio),
      r.fecha_graduacion = CASE WHEN row.fecha_graduacion <> '' THEN date(row.fecha_graduacion) ELSE null END,
      r.graduado = row.graduado = 'true'
} IN TRANSACTIONS OF 500 ROWS;
```

**POSTULO_A**
```cypher
LOAD CSV WITH HEADERS FROM 'https://raw.githubusercontent.com/ecarcamo/pry2-BD/main/dataGenerator/neo4j_csv/rel_postulo_a.csv' AS row
CALL {
  WITH row
  MATCH (u:Usuario {usuario_id: row.usuario_id})
  MATCH (j:Empleo {empleo_id: row.empleo_id})
  MERGE (u)-[r:POSTULO_A]->(j)
  SET r.fecha_postulacion = date(row.fecha_postulacion), r.estado = row.estado, r.carta_presentacion = row.carta_presentacion = 'true'
} IN TRANSACTIONS OF 500 ROWS;
```

**OFERTA**
```cypher
LOAD CSV WITH HEADERS FROM 'https://raw.githubusercontent.com/ecarcamo/pry2-BD/main/dataGenerator/neo4j_csv/rel_oferta.csv' AS row
CALL {
  WITH row
  MATCH (e:Empresa {empresa_id: row.empresa_id})
  MATCH (j:Empleo {empleo_id: row.empleo_id})
  MERGE (e)-[r:OFERTA]->(j)
  SET r.fecha_publicacion = date(row.fecha_publicacion), r.urgente = row.urgente = 'true', r.remunerado = row.remunerado = 'true'
} IN TRANSACTIONS OF 500 ROWS;
```

**SIGUE_A**
```cypher
LOAD CSV WITH HEADERS FROM 'https://raw.githubusercontent.com/ecarcamo/pry2-BD/main/dataGenerator/neo4j_csv/rel_sigue_a.csv' AS row
CALL {
  WITH row
  MATCH (u:Usuario {usuario_id: row.usuario_id})
  MATCH (e:Empresa {empresa_id: row.empresa_id})
  MERGE (u)-[r:SIGUE_A]->(e)
  SET r.fecha_seguimiento = date(row.fecha_seguimiento), r.notificaciones = row.notificaciones = 'true', r.motivo = row.motivo
} IN TRANSACTIONS OF 500 ROWS;
```

**ESTAR_EN**
```cypher
LOAD CSV WITH HEADERS FROM 'https://raw.githubusercontent.com/ecarcamo/pry2-BD/main/dataGenerator/neo4j_csv/rel_estar_en.csv' AS row
CALL {
  WITH row
  MATCH (u:Usuario {usuario_id: row.usuario_id})
  MATCH (e:Empresa {empresa_id: row.empresa_id})
  MERGE (u)-[r:ESTAR_EN]->(e)
  SET r.cargo = row.cargo, r.fecha_inicio = date(row.fecha_inicio), r.actual = row.actual = 'true'
} IN TRANSACTIONS OF 500 ROWS;
```

**MENCIONA**
```cypher
LOAD CSV WITH HEADERS FROM 'https://raw.githubusercontent.com/ecarcamo/pry2-BD/main/dataGenerator/neo4j_csv/rel_menciona.csv' AS row
CALL {
  WITH row
  MATCH (p:Publicacion {publicacion_id: row.publicacion_id})
  MATCH (u:Usuario {usuario_id: row.usuario_id})
  MERGE (p)-[r:MENCIONA]->(u)
  SET r.fecha = date(row.fecha), r.tipo = row.tipo, r.confirmada = row.confirmada = 'true'
} IN TRANSACTIONS OF 500 ROWS;
```

---

## Paso 8 — Verificar

```cypher
MATCH (n) RETURN labels(n)[0] AS label, count(n) AS total ORDER BY total DESC;
```

Resultado esperado:

| label | total |
|---|---|
| Usuario | 2,000 |
| Publicacion | 1,500 |
| Empleo | 600 |
| Empresa | 500 |
| Educacion | 400 |

```cypher
MATCH ()-[r]->() RETURN type(r) AS tipo, count(r) AS total ORDER BY total DESC;
```

---

## Notas

- Los CSVs se leen directamente desde GitHub — no es necesario subirlos manualmente a Aura.
- Si regenerás los CSVs con `generate_neo4j_csv.py` y hacés push, los cambios se reflejan automáticamente en el siguiente import.
- Usar `MERGE` en relaciones garantiza que no se dupliquen si el import se corre más de una vez.
- Los nodos usan `CREATE` con constraints de unicidad — si ya existen fallarán con error, por eso es importante limpiar primero (Paso 4).
