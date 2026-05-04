import { useState } from 'react'
import { consultasApi } from '../api/consultas'
import { rowsToObjects } from '../lib/format'
import { BarChartIcon, ZapIcon } from '../lib/icons'
import type { ApiResult } from '../types/api'

interface QueryCard {
  id: string
  titulo: string
  descripcion: string
  run: () => Promise<ApiResult>
  integrante: string
}

const QUERIES: QueryCard[] = [
  {
    id: 'q1', titulo: 'Top usuarios por conexiones', integrante: 'Nicolás Concuá',
    descripcion: 'Los 5 usuarios con más conexiones registradas.',
    run: () => consultasApi.topConexiones(5),
  },
  {
    id: 'q2', titulo: 'Empresas más seguidas', integrante: 'Esteban Cárcamo',
    descripcion: 'Empresas ordenadas por número de seguidores.',
    run: () => consultasApi.empresasSeguidas(),
  },
  {
    id: 'q3', titulo: 'Empleos activos con salario', integrante: 'Ernesto Ascencio',
    descripcion: 'Vacantes activas con empresa, modalidad y rango salarial.',
    run: () => consultasApi.empleosActivos(),
  },
  {
    id: 'q4', titulo: 'Estadísticas de publicaciones', integrante: 'Nicolás Concuá',
    descripcion: 'Promedio, máximo y total de likes en publicaciones.',
    run: () => consultasApi.publicacionesStats(),
  },
  {
    id: 'q5', titulo: 'Postulaciones por estado', integrante: 'Esteban Cárcamo',
    descripcion: 'Cuántas postulaciones hay en cada estado (pendiente, revisado, etc.).',
    run: () => consultasApi.postulacionesPorEstado(),
  },
  {
    id: 'q6', titulo: 'Autoría de publicaciones', integrante: 'Ernesto Ascencio',
    descripcion: 'Publicaciones con su autor y cantidad de likes, ordenadas por likes.',
    run: () => consultasApi.autoriaPublicaciones(),
  },
]

interface QueryState {
  loading: boolean
  result: ApiResult | null
  error: string | null
}

export default function ConsultasPage() {
  const [states, setStates] = useState<Record<string, QueryState>>({})

  async function runQuery(q: QueryCard) {
    setStates(s => ({ ...s, [q.id]: { loading: true, result: null, error: null } }))
    try {
      const res = await q.run()
      setStates(s => ({ ...s, [q.id]: { loading: false, result: res, error: null } }))
    } catch (e) {
      setStates(s => ({ ...s, [q.id]: { loading: false, result: null, error: String(e) } }))
    }
  }

  return (
    <div className="page consultas-page">
      <div className="page-header">
        <BarChartIcon size={20} />
        <h2>Consultas Cypher (Rúbrica)</h2>
      </div>
      <p className="text-mute" style={{ marginBottom: 24 }}>
        6 consultas predefinidas — 2 por integrante. Cada resultado muestra la query Cypher ejecutada.
      </p>

      <div className="consultas-grid">
        {QUERIES.map(q => {
          const st = states[q.id]
          const rows = st?.result ? rowsToObjects(st.result.columns, st.result.rows.slice(0, 10)) : []

          return (
            <div key={q.id} className="card consulta-card">
              <div className="consulta-header">
                <div>
                  <div className="consulta-title">{q.titulo}</div>
                  <div className="consulta-meta">{q.descripcion}</div>
                  <div className="consulta-integrante">👤 {q.integrante}</div>
                </div>
                <button className="btn-primary" onClick={() => runQuery(q)} disabled={st?.loading}>
                  <ZapIcon size={14} /> {st?.loading ? '…' : 'Ejecutar'}
                </button>
              </div>

              {st?.result?.meta?.cypher && (
                <pre className="cypher-preview">{st.result.meta.cypher.trim()}</pre>
              )}

              {st?.error && <div className="result-error">{st.error}</div>}

              {rows.length > 0 && (
                <div className="result-table-wrap">
                  <table className="result-table">
                    <thead>
                      <tr>{st!.result!.columns.map(c => <th key={c}>{c}</th>)}</tr>
                    </thead>
                    <tbody>
                      {rows.map((row, i) => (
                        <tr key={i}>
                          {st!.result!.columns.map(c => (
                            <td key={c}>{
                              typeof row[c] === 'object'
                                ? JSON.stringify(row[c])
                                : String(row[c] ?? '')
                            }</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
