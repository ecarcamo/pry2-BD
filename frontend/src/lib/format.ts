export function initials(name?: string): string {
  if (!name) return '·'
  return name.split(' ').filter(Boolean).slice(0, 2).map(s => s[0].toUpperCase()).join('')
}

export function fmtDate(s?: string): string {
  if (!s) return ''
  const d = new Date(s)
  if (isNaN(d.getTime())) return s
  return d.toLocaleDateString('es-GT', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function timeAgo(s?: string): string {
  if (!s) return ''
  const d = new Date(s)
  if (isNaN(d.getTime())) return s
  const ms = Date.now() - d.getTime()
  const days = Math.floor(ms / 86400000)
  if (days < 0) return fmtDate(s)
  if (days < 1) return 'hoy'
  if (days < 7) return `hace ${days}d`
  if (days < 30) return `hace ${days}d`
  if (days < 365) return `hace ${Math.floor(days / 30)}m`
  return `hace ${Math.floor(days / 365)}a`
}

export function nodeId(props: Record<string, unknown>): string {
  return (
    (props.userId as string) ??
    (props.usuario_id as string) ??
    (props.empresaId as string) ??
    (props.empresa_id as string) ??
    (props.postId as string) ??
    (props.publicacion_id as string) ??
    (props.empleoId as string) ??
    (props.empleo_id as string) ??
    (props.educacionId as string) ??
    (props.educacion_id as string) ??
    (props.expId as string) ??
    (props.exp_id as string) ??
    ''
  )
}

export function rowsToObjects<T = Record<string, unknown>>(
  columns: string[],
  rows: unknown[][]
): T[] {
  return rows.map(row => {
    const obj: Record<string, unknown> = {}
    columns.forEach((col, i) => { obj[col] = row[i] })
    return obj as T
  })
}

export function extractNodes(result: { columns: string[]; rows: unknown[][] }) {
  return result.rows.flatMap(row =>
    row.filter(
      (v): v is { elementId: string; labels: string[]; props: Record<string, unknown> } =>
        typeof v === 'object' && v !== null && 'elementId' in v && 'labels' in v
    )
  )
}
