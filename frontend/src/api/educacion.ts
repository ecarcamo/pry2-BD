import { api } from './client'
import type { ApiResult } from '../types/api'

export const educacionApi = {
  list: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : ''
    return api.get<ApiResult>(`/educacion/${qs}`)
  },
  get: (id: string) => api.get<ApiResult>(`/educacion/${id}/`),
  create: (body: Record<string, unknown>) => api.post<ApiResult>('/educacion/', body),
  update: (id: string, set: Record<string, unknown>, remove?: string[]) =>
    api.patch<ApiResult>(`/educacion/${id}/`, { set, remove: remove ?? [] }),
  delete: (id: string) => api.delete<void>(`/educacion/${id}/`),
}
