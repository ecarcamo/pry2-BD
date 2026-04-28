/* ============================================================
   seed.js — Datos iniciales del grafo según modelo del proyecto
   5 labels: Usuario, Empresa, Publicacion, Empleo, Educacion
   + Admin como doble etiqueta sobre Usuario
   11 tipos de relaciones
   ============================================================ */

window.SEED = (function () {
  // ----- Schema de propiedades para mostrar tipos en inspector -----
  const SCHEMA = {
    Usuario: {
      nombre: 'String', email: 'String', titular: 'String',
      habilidades: 'List<String>', abierto_a_trabajo: 'Boolean',
      fecha_registro: 'Date', conexiones_count: 'Integer',
    },
    Admin: {
      nivel_acceso: 'String', puede_moderar: 'Boolean',
      fecha_asignacion: 'Date', asignado_por: 'String', activo: 'Boolean',
    },
    Empresa: {
      nombre: 'String', industria: 'String', pais: 'String',
      verificada: 'Boolean', empleados_count: 'Integer',
      fecha_fundacion: 'Date',
    },
    Publicacion: {
      contenido: 'String', fecha_publicacion: 'Date',
      likes_count: 'Integer', tags: 'List<String>', es_oferta: 'Boolean',
    },
    Empleo: {
      titulo: 'String', salario_min: 'Float', salario_max: 'Float',
      modalidad: 'String', activo: 'Boolean', fecha_publicacion: 'Date',
    },
    Educacion: {
      institucion: 'String', carrera: 'String', grado: 'String',
      pais: 'String', acreditada: 'Boolean',
    },
  };

  const REL_SCHEMA = {
    CONECTADO_CON: { fecha_conexion: 'Date', nivel: 'String', aceptada: 'Boolean' },
    PUBLICO:       { fecha: 'Date', anonimo: 'Boolean', desde_empresa: 'Boolean' },
    DIO_LIKE:      { fecha: 'Date', tipo_reaccion: 'String', notificado: 'Boolean' },
    COMENTO:       { contenido: 'String', fecha: 'Date', editado: 'Boolean' },
    COMPARTIO:     { fecha: 'Date', con_comentario: 'Boolean', visibilidad: 'String' },
    ESTUDIO_EN:    { fecha_inicio: 'Date', fecha_graduacion: 'Date', graduado: 'Boolean' },
    POSTULO_A:     { fecha_postulacion: 'Date', estado: 'String', carta_presentacion: 'Boolean' },
    OFERTA:        { fecha_publicacion: 'Date', urgente: 'Boolean', remunerado: 'Boolean' },
    SIGUE_A:       { fecha_seguimiento: 'Date', notificaciones: 'Boolean', motivo: 'String' },
    ESTAR_EN:      { cargo: 'String', fecha_inicio: 'Date', actual: 'Boolean' },
    MENCIONA:      { fecha: 'Date', tipo: 'String', confirmada: 'Boolean' },
  };

  // ----- Helpers -----
  const D = (s) => s; // fechas como string ISO

  // Nodos con IDs estables tipo n0..nN
  const nodes = [
    // Usuarios
    { id: 'n1', labels: ['Usuario'], props: {
      nombre: 'Nicolás Concuá', email: 'nconcua@uvg.edu.gt',
      titular: 'Backend Developer en Datatec',
      habilidades: ['Python','Neo4j','Cypher','Docker'],
      abierto_a_trabajo: true,
      fecha_registro: D('2023-01-15'),
      conexiones_count: 142,
    }},
    { id: 'n2', labels: ['Usuario','Admin'], props: {
      nombre: 'Esteban Cárcamo', email: 'ecarcamo@uvg.edu.gt',
      titular: 'Database Architect & Platform Admin',
      habilidades: ['PostgreSQL','Cypher','Kubernetes'],
      abierto_a_trabajo: false,
      fecha_registro: D('2022-08-03'),
      conexiones_count: 287,
      // Admin
      nivel_acceso: 'superadmin',
      puede_moderar: true,
      fecha_asignacion: D('2023-02-10'),
      asignado_por: 'Mario Barrientos',
      activo: true,
    }},
    { id: 'n3', labels: ['Usuario'], props: {
      nombre: 'Ernesto Ascencio', email: 'eascencio@uvg.edu.gt',
      titular: 'Data Engineer en Cloudly',
      habilidades: ['Spark','Cypher','SQL','Python'],
      abierto_a_trabajo: true,
      fecha_registro: D('2023-03-20'),
      conexiones_count: 96,
    }},
    { id: 'n4', labels: ['Usuario'], props: {
      nombre: 'María López', email: 'mlopez@correo.com',
      titular: 'Frontend Developer',
      habilidades: ['React','TypeScript','CSS'],
      abierto_a_trabajo: false,
      fecha_registro: D('2024-05-11'),
      conexiones_count: 53,
    }},
    { id: 'n5', labels: ['Usuario'], props: {
      nombre: 'Diego Ramírez', email: 'dramirez@correo.com',
      titular: 'Recruiter Senior',
      habilidades: ['Reclutamiento','LinkedIn Recruiter'],
      abierto_a_trabajo: false,
      fecha_registro: D('2022-11-30'),
      conexiones_count: 412,
    }},
    { id: 'n6', labels: ['Usuario'], props: {
      nombre: 'Ana Pérez', email: 'aperez@correo.com',
      titular: 'UX Designer',
      habilidades: ['Figma','Research','Prototyping'],
      abierto_a_trabajo: true,
      fecha_registro: D('2024-01-22'),
      conexiones_count: 78,
    }},

    // Empresas
    { id: 'n7', labels: ['Empresa'], props: {
      nombre: 'Datatec', industria: 'Tecnología', pais: 'Guatemala',
      verificada: true, empleados_count: 320,
      fecha_fundacion: D('2010-04-12'),
    }},
    { id: 'n8', labels: ['Empresa'], props: {
      nombre: 'Cloudly', industria: 'Cloud Services', pais: 'México',
      verificada: true, empleados_count: 1200,
      fecha_fundacion: D('2015-09-01'),
    }},
    { id: 'n9', labels: ['Empresa'], props: {
      nombre: 'PixelForge', industria: 'Diseño', pais: 'Guatemala',
      verificada: false, empleados_count: 45,
      fecha_fundacion: D('2019-06-18'),
    }},

    // Publicaciones
    { id: 'n10', labels: ['Publicacion'], props: {
      contenido: 'Acabamos de migrar nuestro grafo de relaciones a Neo4j. Ganamos 4x en queries de recomendación.',
      fecha_publicacion: D('2026-04-10'),
      likes_count: 38,
      tags: ['neo4j','grafos','backend'],
      es_oferta: false,
    }},
    { id: 'n11', labels: ['Publicacion'], props: {
      contenido: 'Buscamos Data Engineer con experiencia en Spark + Cypher. Modalidad híbrida en GT.',
      fecha_publicacion: D('2026-04-15'),
      likes_count: 12,
      tags: ['empleo','data'],
      es_oferta: true,
    }},
    { id: 'n12', labels: ['Publicacion'], props: {
      contenido: 'Tres aprendizajes después de 6 meses haciendo research en producto.',
      fecha_publicacion: D('2026-04-18'),
      likes_count: 64,
      tags: ['ux','research'],
      es_oferta: false,
    }},

    // Empleos
    { id: 'n13', labels: ['Empleo'], props: {
      titulo: 'Backend Developer Sr.', salario_min: 1800.00, salario_max: 2600.00,
      modalidad: 'híbrido', activo: true,
      fecha_publicacion: D('2026-03-28'),
    }},
    { id: 'n14', labels: ['Empleo'], props: {
      titulo: 'Data Engineer', salario_min: 2200.00, salario_max: 3200.00,
      modalidad: 'remoto', activo: true,
      fecha_publicacion: D('2026-04-02'),
    }},
    { id: 'n15', labels: ['Empleo'], props: {
      titulo: 'UX Designer Jr.', salario_min: 900.00, salario_max: 1400.00,
      modalidad: 'presencial', activo: false,
      fecha_publicacion: D('2026-02-15'),
    }},

    // Educación
    { id: 'n16', labels: ['Educacion'], props: {
      institucion: 'Universidad del Valle de Guatemala',
      carrera: 'Ingeniería en Ciencias de la Computación',
      grado: 'Licenciatura', pais: 'Guatemala', acreditada: true,
    }},
    { id: 'n17', labels: ['Educacion'], props: {
      institucion: 'Tec de Monterrey',
      carrera: 'Maestría en Ciencia de Datos',
      grado: 'Maestría', pais: 'México', acreditada: true,
    }},
  ];

  const rels = [
    // CONECTADO_CON (Usuario→Usuario)
    { id: 'r1', type: 'CONECTADO_CON', from: 'n1', to: 'n2', props: {
      fecha_conexion: D('2023-02-01'), nivel: '1er', aceptada: true } },
    { id: 'r2', type: 'CONECTADO_CON', from: 'n1', to: 'n3', props: {
      fecha_conexion: D('2023-04-12'), nivel: '1er', aceptada: true } },
    { id: 'r3', type: 'CONECTADO_CON', from: 'n2', to: 'n3', props: {
      fecha_conexion: D('2023-05-18'), nivel: '1er', aceptada: true } },
    { id: 'r4', type: 'CONECTADO_CON', from: 'n4', to: 'n6', props: {
      fecha_conexion: D('2024-06-02'), nivel: '1er', aceptada: true } },
    { id: 'r5', type: 'CONECTADO_CON', from: 'n5', to: 'n1', props: {
      fecha_conexion: D('2024-08-22'), nivel: '2do', aceptada: false } },

    // PUBLICO (Usuario→Publicacion)
    { id: 'r6', type: 'PUBLICO', from: 'n1', to: 'n10', props: {
      fecha: D('2026-04-10'), anonimo: false, desde_empresa: false } },
    { id: 'r7', type: 'PUBLICO', from: 'n5', to: 'n11', props: {
      fecha: D('2026-04-15'), anonimo: false, desde_empresa: true } },
    { id: 'r8', type: 'PUBLICO', from: 'n6', to: 'n12', props: {
      fecha: D('2026-04-18'), anonimo: false, desde_empresa: false } },

    // DIO_LIKE (Usuario→Publicacion)
    { id: 'r9',  type: 'DIO_LIKE', from: 'n2', to: 'n10', props: {
      fecha: D('2026-04-11'), tipo_reaccion: 'celebro', notificado: true } },
    { id: 'r10', type: 'DIO_LIKE', from: 'n3', to: 'n10', props: {
      fecha: D('2026-04-11'), tipo_reaccion: 'me_gusta', notificado: true } },
    { id: 'r11', type: 'DIO_LIKE', from: 'n4', to: 'n12', props: {
      fecha: D('2026-04-19'), tipo_reaccion: 'apoyo', notificado: false } },

    // COMENTO
    { id: 'r12', type: 'COMENTO', from: 'n3', to: 'n10', props: {
      contenido: '¡Qué buen caso de uso! ¿Probaron APOC?',
      fecha: D('2026-04-12'), editado: false } },
    { id: 'r13', type: 'COMENTO', from: 'n6', to: 'n12', props: {
      contenido: 'Gran resumen, gracias por compartir.',
      fecha: D('2026-04-19'), editado: true } },

    // COMPARTIO
    { id: 'r14', type: 'COMPARTIO', from: 'n2', to: 'n10', props: {
      fecha: D('2026-04-12'), con_comentario: true, visibilidad: 'pública' } },

    // ESTUDIO_EN
    { id: 'r15', type: 'ESTUDIO_EN', from: 'n1', to: 'n16', props: {
      fecha_inicio: D('2020-01-15'), fecha_graduacion: D('2024-12-10'), graduado: true } },
    { id: 'r16', type: 'ESTUDIO_EN', from: 'n2', to: 'n16', props: {
      fecha_inicio: D('2018-01-15'), fecha_graduacion: D('2022-12-10'), graduado: true } },
    { id: 'r17', type: 'ESTUDIO_EN', from: 'n3', to: 'n17', props: {
      fecha_inicio: D('2024-08-01'), fecha_graduacion: D('2026-06-30'), graduado: false } },

    // POSTULO_A
    { id: 'r18', type: 'POSTULO_A', from: 'n1', to: 'n13', props: {
      fecha_postulacion: D('2026-04-01'), estado: 'pendiente', carta_presentacion: true } },
    { id: 'r19', type: 'POSTULO_A', from: 'n3', to: 'n14', props: {
      fecha_postulacion: D('2026-04-05'), estado: 'revisado', carta_presentacion: false } },
    { id: 'r20', type: 'POSTULO_A', from: 'n6', to: 'n15', props: {
      fecha_postulacion: D('2026-02-20'), estado: 'rechazado', carta_presentacion: true } },

    // OFERTA (Empresa→Empleo)
    { id: 'r21', type: 'OFERTA', from: 'n7', to: 'n13', props: {
      fecha_publicacion: D('2026-03-28'), urgente: true,  remunerado: true } },
    { id: 'r22', type: 'OFERTA', from: 'n8', to: 'n14', props: {
      fecha_publicacion: D('2026-04-02'), urgente: false, remunerado: true } },
    { id: 'r23', type: 'OFERTA', from: 'n9', to: 'n15', props: {
      fecha_publicacion: D('2026-02-15'), urgente: false, remunerado: false } },

    // SIGUE_A (Usuario→Empresa)
    { id: 'r24', type: 'SIGUE_A', from: 'n1', to: 'n8', props: {
      fecha_seguimiento: D('2024-09-10'), notificaciones: true,  motivo: 'posible empleador' } },
    { id: 'r25', type: 'SIGUE_A', from: 'n3', to: 'n8', props: {
      fecha_seguimiento: D('2024-10-01'), notificaciones: true,  motivo: 'trabajo actual' } },
    { id: 'r26', type: 'SIGUE_A', from: 'n6', to: 'n9', props: {
      fecha_seguimiento: D('2025-01-15'), notificaciones: false, motivo: 'interés general' } },
    { id: 'r27', type: 'SIGUE_A', from: 'n4', to: 'n7', props: {
      fecha_seguimiento: D('2024-12-03'), notificaciones: true,  motivo: 'networking' } },

    // ESTAR_EN
    { id: 'r28', type: 'ESTAR_EN', from: 'n1', to: 'n7', props: {
      cargo: 'Backend Developer', fecha_inicio: D('2024-01-15'), actual: true } },
    { id: 'r29', type: 'ESTAR_EN', from: 'n3', to: 'n8', props: {
      cargo: 'Data Engineer', fecha_inicio: D('2024-08-01'), actual: true } },
    { id: 'r30', type: 'ESTAR_EN', from: 'n2', to: 'n7', props: {
      cargo: 'Database Architect', fecha_inicio: D('2022-09-01'), actual: false } },

    // MENCIONA (Publicacion→Usuario)
    { id: 'r31', type: 'MENCIONA', from: 'n10', to: 'n2', props: {
      fecha: D('2026-04-10'), tipo: 'colaborador', confirmada: true } },
    { id: 'r32', type: 'MENCIONA', from: 'n11', to: 'n3', props: {
      fecha: D('2026-04-15'), tipo: 'etiqueta',     confirmada: false } },
  ];

  return { nodes, rels, SCHEMA, REL_SCHEMA };
})();
