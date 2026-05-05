import { api } from './client'
import type { ApiResult } from '../types/api'

export const relacionesApi = {
  conectar: (userIdA: string, userIdB: string, nivel = '1er', aceptada = true) =>
    api.post<ApiResult>('/relaciones/conexiones/', { userIdA, userIdB, nivel, aceptada }),

  like: (userId: string, postId: string, tipo_reaccion = 'me_gusta') =>
    api.post<ApiResult>('/relaciones/likes/', { userId, postId, tipo_reaccion }),

  comentar: (userId: string, postId: string, contenido: string) =>
    api.post<ApiResult>('/relaciones/comentarios/', { userId, postId, contenido }),

  compartir: (userId: string, postId: string, visibilidad = 'pública') =>
    api.post<ApiResult>('/relaciones/compartidos/', { userId, postId, visibilidad }),

  postular: (userId: string, empleoId: string, carta_presentacion = false) =>
    api.post<ApiResult>('/relaciones/postulaciones/', { userId, empleoId, carta_presentacion }),

  seguir: (userId: string, empresaId: string, motivo = 'interés general') =>
    api.post<ApiResult>('/relaciones/seguimientos/', { userId, empresaId, motivo }),

  estarEn: (userId: string, empresaId: string, cargo: string, fecha_inicio?: string, actual = true) =>
    api.post<ApiResult>('/relaciones/estar-en/', { userId, empresaId, cargo, fecha_inicio, actual }),

  estudiar: (userId: string, educacionId: string, fecha_inicio: string) =>
    api.post<ApiResult>('/relaciones/estudios/', { userId, educacionId, fecha_inicio }),

  mencionar: (postId: string, userId: string, tipo = 'etiqueta') =>
    api.post<ApiResult>('/relaciones/menciones/', { postId, userId, tipo }),

  generica: (body: {
    from: { label: string; idField: string; idValue: string }
    to: { label: string; idField: string; idValue: string }
    type: string
    properties: Record<string, unknown>
  }) => api.post<ApiResult>('/relaciones/generica/', body),

  patchRelacion: (body: {
    from: { label: string; idField: string; idValue: string }
    to: { label: string; idField: string; idValue: string }
    type: string
    set?: Record<string, unknown>
    remove?: string[]
  }) => api.patch<ApiResult>('/relaciones/patch/', body),

  bulkPatchRelacion: (body: {
    from_label: string
    to_label: string
    type: string
    filter?: Record<string, unknown>
    set?: Record<string, unknown>
    remove?: string[]
  }) => api.post<ApiResult>('/relaciones/bulk-patch/', body),

  deleteRelacion: (params: {
    from_label: string; from_id_field: string; from_id_value: string
    to_label: string; to_id_field: string; to_id_value: string
    type: string
  }) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString()
    return api.delete<ApiResult>(`/relaciones/delete/?${qs}`)
  },

  bulkDeleteRelacion: (body: {
    from_label: string; to_label: string; type: string; filter?: Record<string, unknown>
  }) => api.post<ApiResult>('/relaciones/bulk-delete/', body),

  bulkDeleteNodos: (body: { label: string; filter?: Record<string, unknown> }) =>
    api.post<ApiResult>('/relaciones/bulk-delete-nodos/', body),

  misRelaciones: (userId: string, type: string, idField: string): Promise<{ ids: string[] }> =>
    api.get(`/relaciones/mias/?userId=${encodeURIComponent(userId)}&type=${encodeURIComponent(type)}&idField=${encodeURIComponent(idField)}`),
}
