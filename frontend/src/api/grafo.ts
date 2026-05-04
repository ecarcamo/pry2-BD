import { api } from './client'
import type { GrafoSample } from '../types/api'

export const grafoApi = {
  sample: (limit = 200, label?: string) => {
    const params = new URLSearchParams({ limit: String(limit) })
    if (label) params.set('label', label)
    return api.get<GrafoSample>(`/grafo/sample/?${params}`)
  },
}
