import { api } from './client'
import type { ApiResult } from '../types/api'

export const publicacionesApi = {
  list: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : ''
    return api.get<ApiResult>(`/publicaciones/${qs}`)
  },
  get: (id: string) => api.get<ApiResult>(`/publicaciones/${id}/`),
  create: (body: Record<string, unknown>) => api.post<ApiResult>('/publicaciones/', body),
  update: (id: string, set: Record<string, unknown>, remove?: string[]) =>
    api.patch<ApiResult>(`/publicaciones/${id}/`, { set, remove: remove ?? [] }),
  delete: (id: string) => api.delete<void>(`/publicaciones/${id}/`),
}
