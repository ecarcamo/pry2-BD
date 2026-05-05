export interface Usuario {
  elementId: string
  labels: string[]
  props: {
    userId?: string
    usuario_id?: string
    nombre: string
    email: string
    titular?: string
    habilidades?: string[]
    abierto_a_trabajo?: boolean
    fecha_registro?: string
    conexiones_count?: number
    nivel_acceso?: string
    puede_moderar?: boolean
    activo?: boolean
  }
}

export interface Empresa {
  elementId: string
  labels: string[]
  props: {
    empresaId?: string
    empresa_id?: string
    nombre: string
    industria?: string
    pais?: string
    verificada?: boolean
    empleados_count?: number
    fecha_fundacion?: string
  }
}

export interface Publicacion {
  elementId: string
  labels: string[]
  props: {
    postId?: string
    publicacion_id?: string
    contenido: string
    fecha_publicacion?: string
    likes_count?: number
    tags?: string[]
    es_oferta?: boolean
    autor_nombre?: string
    autor_id?: string
  }
}

export interface Empleo {
  elementId: string
  labels: string[]
  props: {
    empleoId?: string
    empleo_id?: string
    titulo: string
    salario_min?: number
    salario_max?: number
    modalidad?: string
    activo?: boolean
    fecha_publicacion?: string
  }
}

export interface Educacion {
  elementId: string
  labels: string[]
  props: {
    educacionId?: string
    educacion_id?: string
    institucion: string
    carrera?: string
    grado?: string
    pais?: string
    acreditada?: boolean
  }
}

export interface ExperienciaLaboral {
  elementId: string
  labels: string[]
  props: {
    expId?: string
    exp_id?: string
    cargo: string
    salario?: number
    descripcion?: string
    activo?: boolean
  }
}

export interface ApiResult {
  columns: string[]
  rows: unknown[][]
  stats: {
    nodesCreated?: number
    nodesDeleted?: number
    relsCreated?: number
    relsDeleted?: number
    propsSet?: number
  }
  meta?: { cypher: string }
}

export interface GrafoNode {
  id: string
  labels: string[]
  props: Record<string, unknown>
}

export interface GrafoRel {
  id: string
  type: string
  from: string
  to: string
  props: Record<string, unknown>
}

export interface GrafoSample {
  nodes: GrafoNode[]
  rels: GrafoRel[]
}
