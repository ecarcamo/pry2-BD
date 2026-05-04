import { api } from './client'
import type { ApiResult } from '../types/api'

export const datascienceApi = {
  influencers: (limit = 10) =>
    api.get<ApiResult>(`/datascience/influencers/?limit=${limit}`),
  recomendaciones: (userId: string) =>
    api.get<ApiResult>(`/datascience/recomendaciones/${userId}/`),
  gradosSeparacion: (from: string, to: string) =>
    api.get<ApiResult>(`/datascience/grados-separacion/?from=${from}&to=${to}`),
}
