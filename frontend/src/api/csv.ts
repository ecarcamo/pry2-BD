import { api } from './client'

export interface LoadCsvNodesResult {
  creados: number
  label: string
  columnas: string[]
  cypher: string
}

export interface LoadCsvRelsResult {
  creadas: number
  tipo: string
  columnas: string[]
  cypher: string
}

export const csvApi = {
  loadNodes: (file: File, label: string) => {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('label', label)
    return api.postForm<LoadCsvNodesResult>('/load-csv/nodes/', fd)
  },

  loadRels: (file: File, params: {
    from_label: string
    from_id_field: string
    from_id_column: string
    to_label: string
    to_id_field: string
    to_id_column: string
    type: string
  }) => {
    const fd = new FormData()
    fd.append('file', file)
    Object.entries(params).forEach(([k, v]) => fd.append(k, v))
    return api.postForm<LoadCsvRelsResult>('/load-csv/rels/', fd)
  },
}
