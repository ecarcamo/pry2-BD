import { api } from './client'

export const adminApi = {
  seed: () => api.post<{ status: string; log: string }>('/admin/seed/', {}),
}
