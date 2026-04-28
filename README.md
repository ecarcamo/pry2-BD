# NeoLab · Red social profesional en Neo4j

Proyecto del curso **Bases de Datos 2** — Universidad del Valle de Guatemala.  
Modela una red social tipo LinkedIn como grafo en **Neo4j Aura**, con un backend REST en **Node.js + Express** y una consola visual en React.

---

## Integrantes

| Nombre | Carnet |
|---|---|
| Nicolás Concuá | — |
| Esteban Cárcamo | — |
| Ernesto Ascencio | — |

---

## Arquitectura

```
pry2/
├── backend/          # API REST — Node.js + Express + neo4j-driver
│   ├── src/
│   │   ├── server.js          # Punto de entrada, middleware, rutas
│   │   ├── neo4j.js           # Singleton del driver, runRead/runWrite
│   │   ├── routes/            # Un archivo por recurso del dominio
│   │   │   ├── health.js      # GET /ping
│   │   │   ├── usuarios.js    # CRUD + /admin (2 labels)
│   │   │   ├── empresas.js
│   │   │   ├── publicaciones.js
│   │   │   ├── empleos.js
│   │   │   ├── educacion.js
│   │   │   ├── relaciones.js  # CONECTADO_CON, DIO_LIKE, POSTULO_A, etc.
│   │   │   ├── consultas.js   # Q1–Q6 + agregación ad-hoc
│   │   │   └── cypher.js      # POST /cypher (passthrough para la consola)
│   │   └── lib/
│   │       ├── serialize.js   # Node/Relationship → JSON plano
│   │       ├── cypher-build.js  # Construcción segura de cláusulas
│   │       └── validate.js
│   └── scripts/
│       └── seed.js            # Carga el dataset inicial en Aura
└── frontend/         # Consola visual — React (CDN) + Babel standalone
    ├── NeoLab.html
    ├── api.js         # Cliente fetch → backend (window.API)
    ├── shell.jsx      # App principal, log de queries, consola Cypher
    ├── app.jsx        # Visualización del grafo + Inspector de nodos
    ├── operations.js  # Catálogo de operaciones de la rúbrica
    ├── cypher.js      # Motor Cypher en memoria (fallback offline)
    └── seed.js        # Dataset para el motor local
```

---

## Modelo de dominio

**5 labels:** `Usuario`, `Empresa`, `Publicacion`, `Empleo`, `Educacion`  
**Label adicional:** `Admin` (sobre `Usuario`)  
**11 tipos de relaciones:** `CONECTADO_CON`, `PUBLICO`, `DIO_LIKE`, `COMENTO`, `COMPARTIO`, `ESTUDIO_EN`, `POSTULO_A`, `OFERTA`, `SIGUE_A`, `ESTAR_EN`, `MENCIONA`

---

## Requisitos

- **Node.js** 18+
- Acceso a una instancia de **Neo4j Aura** (credenciales en `backend/.env`)

---

## Configuración

Crea el archivo `backend/.env` basándote en `backend/.env.example`:

```env
NEO4J_URI=neo4j+s://<instance-id>.databases.neo4j.io
NEO4J_USERNAME=<usuario>
NEO4J_PASSWORD=<contraseña>
NEO4J_DATABASE=<nombre-db>
AURA_INSTANCEID=<instance-id>
AURA_INSTANCENAME=<nombre-instancia>
PORT=4000
```

Instala las dependencias del backend:

```bash
cd backend
npm install
```

---

## Ejecución

### Opción 1 — script único (recomendado)

Desde la raíz del proyecto:

```bash
./start.sh
```

Levanta el backend en `:4000` y sirve el frontend en `:5500`.  
Presiona `Ctrl+C` para detener ambos.

### Opción 2 — manual

```bash
# Backend
cd backend && npm start

# Frontend (en otra terminal)
cd frontend && python3 -m http.server 5500
# Luego abrir http://localhost:5500/NeoLab.html
```

### Cargar el dataset inicial en Aura

```bash
cd backend && npm run seed
```

---

## Endpoints principales

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/ping` | Estado de conexión con Aura |
| `POST` | `/usuarios` | Crear usuario (1 label, ≥7 props) |
| `POST` | `/usuarios/admin` | Crear usuario con doble label `:Usuario:Admin` |
| `POST` | `/empresas` | Crear empresa (≥6 props) |
| `POST` | `/publicaciones` | Crear publicación + relación `PUBLICO` |
| `POST` | `/empleos` | Crear empleo + relación `OFERTA` |
| `POST` | `/educacion` | Crear institución educativa |
| `GET` | `/usuarios?abierto_a_trabajo=true` | Filtrar nodos |
| `PATCH` | `/usuarios/:id/propiedades` | SET/REMOVE props en 1 nodo |
| `PATCH` | `/usuarios/propiedades/bulk` | SET/REMOVE props en múltiples nodos |
| `POST` | `/conexiones` | Crear relación `CONECTADO_CON` |
| `POST` | `/likes` | Crear relación `DIO_LIKE` |
| `POST` | `/postulaciones` | Crear relación `POSTULO_A` |
| `POST` | `/relaciones` | Crear cualquier relación de forma genérica |
| `GET` | `/consultas/usuarios-top-conexiones` | Q1 — Top usuarios |
| `GET` | `/consultas/empresas-seguidas` | Q2 — Seguidores por empresa |
| `GET` | `/consultas/empleos-activos` | Q3 — Vacantes con rango salarial |
| `GET` | `/consultas/publicaciones-stats` | Q4 — Estadísticas de likes |
| `GET` | `/consultas/postulaciones-por-estado` | Q5 — Postulaciones agrupadas |
| `GET` | `/consultas/autoria-publicaciones` | Q6 — Autoría con likes |
| `POST` | `/cypher` | Passthrough Cypher para la consola |

---

## Modo offline

Si el backend no está disponible, el frontend detecta automáticamente la falta de conexión (indicador gris en la topbar) y cae al motor Cypher simulado en memoria (`cypher.js` + `seed.js`). Todas las operaciones de la rúbrica funcionan sin red.
