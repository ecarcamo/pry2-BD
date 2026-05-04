import { useState } from 'react'
import { useStore } from '../store/StoreContext'
import { cypherApi } from '../api/cypher'
import { XIcon, CodeIcon, ZapIcon } from '../lib/icons'

const PRESETS = [
  {
    label: 'Usuarios top conexiones',
    query: 'MATCH (u:Usuario) RETURN u.nombre AS nombre, u.conexiones_count AS conexiones ORDER BY conexiones DESC LIMIT 10',
  },
  {
    label: 'Publicaciones recientes',
    query: 'MATCH (u:Usuario)-[:PUBLICO]->(p:Publicacion) RETURN u.nombre AS autor, p.contenido AS contenido, p.likes_count AS likes ORDER BY p.fecha_publicacion DESC LIMIT 10',
  },
  {
    label: 'Empresas más seguidas',
    query: 'MATCH (u:Usuario)-[:SIGUE_A]->(e:Empresa) RETURN e.nombre AS empresa, count(u) AS seguidores ORDER BY seguidores DESC LIMIT 10',
  },
  {
    label: 'Empleos activos',
    query: 'MATCH (emp:Empresa)-[:OFERTA]->(j:Empleo) WHERE j.activo = true RETURN emp.nombre AS empresa, j.titulo AS puesto, j.modalidad AS modalidad LIMIT 10',
  },
  {
    label: 'Conteo por label',
    query: 'MATCH (n) RETURN labels(n) AS etiquetas, count(*) AS total ORDER BY total DESC',
  },
  {
    label: 'Postulaciones por estado',
    query: 'MATCH (u:Usuario)-[r:POSTULO_A]->(j:Empleo) RETURN r.estado AS estado, count(*) AS cantidad ORDER BY cantidad DESC',
  },
]

interface Row {
  ts: string
  query: string
  ok: boolean
  result?: { columns: string[]; rows: unknown[][]; stats: Record<string, number> }
  error?: string
  duration?: number
}

export default function CypherDrawer() {
  const { drawer, setDrawer } = useStore()
  const [query, setQuery] = useState('')
  const [mode, setMode] = useState<'auto' | 'read' | 'write'>('auto')
  const [history, setHistory] = useState<Row[]>([])
  const [running, setRunning] = useState(false)

  async function handleRun() {
    const q = query.trim()
    if (!q) return
    setRunning(true)
    const ts = new Date().toLocaleTimeString('es-GT', { hour12: false })
    const t0 = Date.now()
    try {
      const res = await cypherApi.run(q, {}, mode)
      setHistory(h => [{
        ts, query: q, ok: true,
        result: { columns: res.columns, rows: res.rows, stats: res.stats as Record<string, number> },
        duration: Date.now() - t0,
      }, ...h].slice(0, 30))
    } catch (e) {
      setHistory(h => [{
        ts, query: q, ok: false,
        error: e instanceof Error ? e.message : String(e),
        duration: Date.now() - t0,
      }, ...h].slice(0, 30))
    } finally {
      setRunning(false)
    }
  }

  if (!drawer) return null

  return (
    <div className="drawer-overlay" onClick={e => { if (e.target === e.currentTarget) setDrawer(false) }}>
      <div className="drawer">
        <div className="drawer-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CodeIcon size={16} />
            <span>Consola Cypher</span>
          </div>
          <button className="btn-icon" onClick={() => setDrawer(false)}>
            <XIcon size={16} />
          </button>
        </div>

        <div className="drawer-presets">
          <span className="text-mute" style={{ fontSize: 12 }}>Presets:</span>
          {PRESETS.map(p => (
            <button key={p.label} className="preset-btn" onClick={() => setQuery(p.query)}>
              {p.label}
            </button>
          ))}
        </div>

        <div className="drawer-editor">
          <textarea
            className="cypher-input"
            placeholder="MATCH (n) RETURN n LIMIT 10"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleRun() }}
            rows={5}
          />
          <div className="drawer-controls">
            <select className="input" value={mode} onChange={e => setMode(e.target.value as typeof mode)} style={{ width: 100 }}>
              <option value="auto">auto</option>
              <option value="read">read</option>
              <option value="write">write</option>
            </select>
            <button className="btn-primary" onClick={handleRun} disabled={running}>
              <ZapIcon size={14} /> {running ? 'Ejecutando…' : 'Ejecutar'}
            </button>
          </div>
          <div className="drawer-hint">Ctrl+Enter para ejecutar</div>
        </div>

        <div className="drawer-results">
          {history.map((row, i) => (
            <div key={i} className={`result-block ${row.ok ? 'ok' : 'err'}`}>
              <div className="result-header">
                <span className="result-ts">{row.ts}</span>
                <code className="result-query">{row.query.slice(0, 80)}{row.query.length > 80 ? '…' : ''}</code>
                <span className="result-duration">{row.duration}ms</span>
              </div>
              {row.ok && row.result ? (
                <div className="result-table-wrap">
                  {row.result.columns.length > 0 ? (
                    <table className="result-table">
                      <thead>
                        <tr>{row.result.columns.map(c => <th key={c}>{c}</th>)}</tr>
                      </thead>
                      <tbody>
                        {row.result.rows.slice(0, 20).map((r, ri) => (
                          <tr key={ri}>
                            {r.map((cell, ci) => (
                              <td key={ci}>{typeof cell === 'object' ? JSON.stringify(cell, null, 1) : String(cell ?? '')}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <span className="text-mute">Sin resultados</span>
                  )}
                  {Object.entries(row.result.stats).filter(([, v]) => v).map(([k, v]) => (
                    <span key={k} className="stat-badge">{k}: {v}</span>
                  ))}
                </div>
              ) : (
                <div className="result-error">{row.error}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
