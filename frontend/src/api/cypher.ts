import { api } from './client'
import type { ApiResult } from '../types/api'

export const cypherApi = {
  run: (query: string, params: Record<string, unknown> = {}, mode: 'read' | 'write' | 'auto' = 'auto') =>
    api.post<ApiResult>('/cypher/', { query, params, mode }),
}
