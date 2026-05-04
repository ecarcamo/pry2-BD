import { api } from './client'
import type { ApiResult } from '../types/api'

export const empleosApi = {
  list: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : ''
    return api.get<ApiResult>(`/empleos/${qs}`)
  },
  get: (id: string) => api.get<ApiResult>(`/empleos/${id}/`),
  create: (body: Record<string, unknown>) => api.post<ApiResult>('/empleos/', body),
  update: (id: string, set: Record<string, unknown>, remove?: string[]) =>
    api.patch<ApiResult>(`/empleos/${id}/`, { set, remove: remove ?? [] }),
  bulkUpdate: (filter: Record<string, unknown>, set: Record<string, unknown>, remove?: string[]) =>
    api.post<ApiResult>('/empleos/bulk-update/', { filter, set, remove: remove ?? [] }),
  delete: (id: string) => api.delete<void>(`/empleos/${id}/`),
}
