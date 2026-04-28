/* ============================================================
   api.js — Cliente fetch para el backend NeoLab (Express + Neo4j)
   Lee window.API_BASE (default http://localhost:4000).
   ============================================================ */

(function () {
  const BASE = () => (window.API_BASE || 'http://localhost:4000');

  async function req(method, path, body) {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (body !== undefined) opts.body = JSON.stringify(body);
    const r = await fetch(BASE() + path, opts);
    const data = await r.json();
    if (!data.ok) throw new Error(data.error || 'Error desconocido del backend');
    return data;
  }

  const get  = (path)        => req('GET',   path);
  const post = (path, body)  => req('POST',  path, body);
  const patch = (path, body) => req('PATCH', path, body);
  const del  = (path)        => req('DELETE', path);

  window.API = {
    ping: () => get('/ping'),

    usuarios: {
      create:          (props)              => post('/usuarios', props),
      createAdmin:     (props)              => post('/usuarios/admin', props),
      list:            (filters = {})       => get('/usuarios?' + new URLSearchParams(filters)),
      get:             (userId)             => get(`/usuarios/${userId}`),
      patchProps:      (userId, body)       => patch(`/usuarios/${userId}/propiedades`, body),
      patchPropsBulk:  (body)               => patch('/usuarios/propiedades/bulk', body),
      delete:          (userId)             => del(`/usuarios/${userId}`),
    },

    empresas: {
      create:          (props)              => post('/empresas', props),
      list:            (filters = {})       => get('/empresas?' + new URLSearchParams(filters)),
      get:             (empresaId)          => get(`/empresas/${empresaId}`),
      patchProps:      (empresaId, body)    => patch(`/empresas/${empresaId}/propiedades`, body),
      patchPropsBulk:  (body)               => patch('/empresas/propiedades/bulk', body),
    },

    publicaciones: {
      create:          (body)               => post('/publicaciones', body),
      list:            (filters = {})       => get('/publicaciones?' + new URLSearchParams(filters)),
      get:             (postId)             => get(`/publicaciones/${postId}`),
      patchProps:      (postId, body)       => patch(`/publicaciones/${postId}/propiedades`, body),
      patchPropsBulk:  (body)               => patch('/publicaciones/propiedades/bulk', body),
    },

    empleos: {
      create:          (body)               => post('/empleos', body),
      list:            (filters = {})       => get('/empleos?' + new URLSearchParams(filters)),
      get:             (empleoId)           => get(`/empleos/${empleoId}`),
      patchProps:      (empleoId, body)     => patch(`/empleos/${empleoId}/propiedades`, body),
      patchPropsBulk:  (body)               => patch('/empleos/propiedades/bulk', body),
    },

    educacion: {
      create:          (props)              => post('/educacion', props),
      list:            (filters = {})       => get('/educacion?' + new URLSearchParams(filters)),
      get:             (educacionId)        => get(`/educacion/${educacionId}`),
      patchProps:      (educacionId, body)  => patch(`/educacion/${educacionId}/propiedades`, body),
      patchPropsBulk:  (body)               => patch('/educacion/propiedades/bulk', body),
    },

    // Relaciones del dominio
    conectar:      (body) => post('/conexiones',       body),
    darLike:       (body) => post('/likes',             body),
    comentar:      (body) => post('/comentarios',       body),
    compartir:     (body) => post('/compartidos',       body),
    postular:      (body) => post('/postulaciones',     body),
    seguirEmpresa: (body) => post('/seguimientos',      body),
    trabajarEn:    (body) => post('/empleos-historial', body),
    estudiarEn:    (body) => post('/estudios',          body),
    mencionar:     (body) => post('/menciones',         body),
    crearRelacion: (body) => post('/relaciones',        body),

    consultas: {
      topConexiones:         (params = {}) => get('/consultas/usuarios-top-conexiones?' + new URLSearchParams(params)),
      empresasSeguidas:      ()            => get('/consultas/empresas-seguidas'),
      empleosActivos:        ()            => get('/consultas/empleos-activos'),
      publicacionesStats:    ()            => get('/consultas/publicaciones-stats'),
      postulacionesPorEstado:()            => get('/consultas/postulaciones-por-estado'),
      autoriaPublicaciones:  ()            => get('/consultas/autoria-publicaciones'),
      conteoPorLabel:        ()            => get('/consultas/conteo-por-label'),
      agregacion:            (body)        => post('/consultas/agregacion', body),
    },

    rawCypher: (query, params = {}, mode = 'read') => post('/cypher', { query, params, mode }),
  };

  // Resuelve 'usuarios.create' → window.API.usuarios.create
  window.API._resolve = function (dotPath) {
    return dotPath.split('.').reduce((obj, key) => obj && obj[key], window.API);
  };
})();
