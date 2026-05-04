import { api } from './client'
import type { ApiResult } from '../types/api'

export const consultasApi = {
  topConexiones: (limit = 5) =>
    api.get<ApiResult>(`/consultas/usuarios-top-conexiones/?limit=${limit}`),
  empresasSeguidas: () => api.get<ApiResult>('/consultas/empresas-seguidas/'),
  empleosActivos: () => api.get<ApiResult>('/consultas/empleos-activos/'),
  publicacionesStats: () => api.get<ApiResult>('/consultas/publicaciones-stats/'),
  postulacionesPorEstado: () => api.get<ApiResult>('/consultas/postulaciones-por-estado/'),
  autoriaPublicaciones: () => api.get<ApiResult>('/consultas/autoria-publicaciones/'),
  conteoPorLabel: () => api.get<ApiResult>('/consultas/conteo-por-label/'),
  agregacion: (body: {
    label: string
    where?: { prop: string; value: unknown }[]
    groupBy?: string
    agg: 'count' | 'avg' | 'sum' | 'min' | 'max'
    field?: string
  }) => api.post<ApiResult>('/consultas/agregacion/', body),
}
