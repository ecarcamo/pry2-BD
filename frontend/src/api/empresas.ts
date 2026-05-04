import { api } from './client'
import type { ApiResult } from '../types/api'

export const empresasApi = {
  list: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : ''
    return api.get<ApiResult>(`/empresas/${qs}`)
  },
  get: (id: string) => api.get<ApiResult>(`/empresas/${id}/`),
  create: (body: Record<string, unknown>) => api.post<ApiResult>('/empresas/', body),
  update: (id: string, set: Record<string, unknown>, remove?: string[]) =>
    api.patch<ApiResult>(`/empresas/${id}/`, { set, remove: remove ?? [] }),
  bulkUpdate: (filter: Record<string, unknown>, set: Record<string, unknown>, remove?: string[]) =>
    api.post<ApiResult>('/empresas/bulk-update/', { filter, set, remove: remove ?? [] }),
  delete: (id: string) => api.delete<void>(`/empresas/${id}/`),
}
