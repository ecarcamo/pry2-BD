import { api } from './client'
import type { ApiResult } from '../types/api'

export const usuariosApi = {
  list: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : ''
    return api.get<ApiResult>(`/usuarios/${qs}`)
  },
  get: (id: string) => api.get<ApiResult>(`/usuarios/${id}/`),
  create: (body: Record<string, unknown>) => api.post<ApiResult>('/usuarios/', body),
  createAdmin: (body: Record<string, unknown>) => api.post<ApiResult>('/usuarios/admin/', body),
  update: (id: string, set: Record<string, unknown>, remove?: string[]) =>
    api.patch<ApiResult>(`/usuarios/${id}/`, { set, remove: remove ?? [] }),
  bulkUpdate: (filter: Record<string, unknown>, set: Record<string, unknown>, remove?: string[]) =>
    api.post<ApiResult>('/usuarios/bulk-update/', { filter, set, remove: remove ?? [] }),
  delete: (id: string) => api.delete<void>(`/usuarios/${id}/`),
}
