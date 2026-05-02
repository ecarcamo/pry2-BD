/* ============================================================
   api.js — Cliente fetch para el backend NeoLab (Django + DRF + Neo4j)
   Lee window.API_BASE (default http://localhost:4000/api).
   Convención DRF:
     - URLs con slash final, kebab-case
     - Errores devuelven {detail} o {campo:[...]}
     - Respuesta de operaciones tipadas:
         {columns, rows, stats, meta:{cypher}}
     - 204 en DELETE (sin body)
   ============================================================ */

(function () {
  const BASE = () => (window.API_BASE || 'http://localhost:4000/api');

  function formatError(payload, status) {
    if (!payload) return `Error HTTP ${status}`;
    if (typeof payload === 'string') return payload;
    if (payload.detail) return payload.detail;
    // DRF errores por campo: {field: ["msg", ...]}
    const parts = Object.entries(payload).map(([k, v]) =>
      `${k}: ${Array.isArray(v) ? v.join(', ') : v}`
    );
    return parts.length ? parts.join(' · ') : `Error HTTP ${status}`;
  }

  async function req(method, path, body) {
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    if (body !== undefined) opts.body = JSON.stringify(body);
    const r = await fetch(BASE() + path, opts);
    if (r.status === 204) return null;
    let data = null;
    try { data = await r.json(); } catch { /* sin body */ }
    if (!r.ok) throw new Error(formatError(data, r.status));
    return data;
  }

  const get  = (path)        => req('GET',   path);
  const post = (path, body)  => req('POST',  path, body);
  const patch = (path, body) => req('PATCH', path, body);
  const del  = (path)        => req('DELETE', path);

  const qs = (filters) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') params.append(k, v);
    });
    const s = params.toString();
    return s ? '?' + s : '';
  };

  window.API = {
    ping: () => get('/ping/'),

    usuarios: {
      create:         (props)             => post('/usuarios/', props),
      createAdmin:    (props)             => post('/usuarios/admin/', props),
      list:           (filters = {})      => get('/usuarios/' + qs(filters)),
      get:            (userId)            => get(`/usuarios/${encodeURIComponent(userId)}/`),
      patchProps:     (userId, body)      => patch(`/usuarios/${encodeURIComponent(userId)}/`, body),
      patchPropsBulk: (body)              => post('/usuarios/bulk-update/', body),
      delete:         (userId)            => del(`/usuarios/${encodeURIComponent(userId)}/`),
    },

    empresas: {
      create:         (props)             => post('/empresas/', props),
      list:           (filters = {})      => get('/empresas/' + qs(filters)),
      get:            (empresaId)         => get(`/empresas/${encodeURIComponent(empresaId)}/`),
      patchProps:     (empresaId, body)   => patch(`/empresas/${encodeURIComponent(empresaId)}/`, body),
      patchPropsBulk: (body)              => post('/empresas/bulk-update/', body),
    },

    publicaciones: {
      create:         (body)              => post('/publicaciones/', body),
      list:           (filters = {})      => get('/publicaciones/' + qs(filters)),
      get:            (postId)            => get(`/publicaciones/${encodeURIComponent(postId)}/`),
      patchProps:     (postId, body)      => patch(`/publicaciones/${encodeURIComponent(postId)}/`, body),
      patchPropsBulk: (body)              => post('/publicaciones/bulk-update/', body),
    },

    empleos: {
      create:         (body)              => post('/empleos/', body),
      list:           (filters = {})      => get('/empleos/' + qs(filters)),
      get:            (empleoId)          => get(`/empleos/${encodeURIComponent(empleoId)}/`),
      patchProps:     (empleoId, body)    => patch(`/empleos/${encodeURIComponent(empleoId)}/`, body),
      patchPropsBulk: (body)              => post('/empleos/bulk-update/', body),
    },

    educacion: {
      create:         (props)             => post('/educacion/', props),
      list:           (filters = {})      => get('/educacion/' + qs(filters)),
      get:            (educacionId)       => get(`/educacion/${encodeURIComponent(educacionId)}/`),
      patchProps:     (educacionId, body) => patch(`/educacion/${encodeURIComponent(educacionId)}/`, body),
      patchPropsBulk: (body)              => post('/educacion/bulk-update/', body),
    },

    experiencia: {
      create:         (props)  => post('/experiencia/', props),
      list:           (f = {}) => get('/experiencia/' + qs(f)),
      get:            (expId)  => get(`/experiencia/${encodeURIComponent(expId)}/`),
      patchProps:     (expId, body) => patch(`/experiencia/${encodeURIComponent(expId)}/`, body),
      patchPropsBulk: (body)  => post('/experiencia/bulk-update/', body),
      delete:         (expId)  => del(`/experiencia/${encodeURIComponent(expId)}/`),
    },

    // Relaciones del dominio
    conectar:       (body) => post('/relaciones/conexiones/',    body),
    darLike:        (body) => post('/relaciones/likes/',         body),
    comentar:       (body) => post('/relaciones/comentarios/',   body),
    compartir:      (body) => post('/relaciones/compartidos/',   body),
    postular:       (body) => post('/relaciones/postulaciones/', body),
    seguirEmpresa:  (body) => post('/relaciones/seguimientos/',  body),
    trabajoEn:      (body) => post('/relaciones/trabajo-en/',    body),
    experienciaEn:  (body) => post('/relaciones/experiencia-en/', body),
    estudiarEn:     (body) => post('/relaciones/estudios/',      body),
    mencionar:      (body) => post('/relaciones/menciones/',     body),
    crearRelacion:  (body) => post('/relaciones/generica/',      body),

    consultas: {
      topConexiones:          (params = {}) => get('/consultas/usuarios-top-conexiones/' + qs(params)),
      empresasSeguidas:       ()            => get('/consultas/empresas-seguidas/'),
      empleosActivos:         ()            => get('/consultas/empleos-activos/'),
      publicacionesStats:     ()            => get('/consultas/publicaciones-stats/'),
      postulacionesPorEstado: ()            => get('/consultas/postulaciones-por-estado/'),
      autoriaPublicaciones:   ()            => get('/consultas/autoria-publicaciones/'),
      conteoPorLabel:         ()            => get('/consultas/conteo-por-label/'),
      agregacion:             (body)        => post('/consultas/agregacion/', body),
    },

    rawCypher: (query, params = {}, mode = 'read') =>
      post('/cypher/', { query, params, mode }),
  };

  // Resuelve 'usuarios.create' → window.API.usuarios.create
  window.API._resolve = function (dotPath) {
    return dotPath.split('.').reduce((obj, key) => obj && obj[key], window.API);
  };
})();
