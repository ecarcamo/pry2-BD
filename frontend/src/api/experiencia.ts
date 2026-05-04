import { api } from './client'
import type { ApiResult } from '../types/api'

export const experienciaApi = {
  list: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : ''
    return api.get<ApiResult>(`/experiencia/${qs}`)
  },
  get: (id: string) => api.get<ApiResult>(`/experiencia/${id}/`),
  create: (body: Record<string, unknown>) => api.post<ApiResult>('/experiencia/', body),
  update: (id: string, set: Record<string, unknown>, remove?: string[]) =>
    api.patch<ApiResult>(`/experiencia/${id}/`, { set, remove: remove ?? [] }),
  delete: (id: string) => api.delete<void>(`/experiencia/${id}/`),
}
