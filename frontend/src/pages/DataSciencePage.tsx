import { Fragment, useEffect, useRef, useState } from 'react'
import { datascienceApi } from '../api/datascience'
import { rowsToObjects } from '../lib/format'
import { useStore } from '../store/StoreContext'
import { ActivityIcon, AwardIcon, RouteIcon, ZapIcon } from '../lib/icons'
import type { ApiResult } from '../types/api'

type DSTab = 'influencers' | 'recomendaciones' | 'grados'

interface InfluencerRow {
  usuario_id: string
  nombre: string
  titular: string
  conexiones: number
  likes_recibidos: number
  menciones: number
  publicaciones: number
  score_influencia: number
}

interface RecomRow {
  usuario_id: string
  nombre: string
  titular: string
  conexiones_en_comun: number
  jaccard: number
}

interface GradosRow {
  nombres: string[]
  ids: string[]
  grados: number
}

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map(s => s[0]?.toUpperCase() ?? '').join('') || '?'
}

function ScoreBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 140 }}>
      <div style={{ flex: 1, height: 5, background: 'var(--bg)', borderRadius: 3, overflow: 'hidden', border: '1px solid var(--border-soft)' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: 'var(--accent)', borderRadius: 3, transition: 'width 0.5s ease' }} />
      </div>
      <span style={{ fontSize: 12, color: 'var(--accent-hi)', fontFamily: 'var(--mono)', minWidth: 44, textAlign: 'right', fontWeight: 600 }}>
        {value.toFixed(1)}
      </span>
    </div>
  )
}

const MEDALS = ['🥇', '🥈', '🥉']

const TAB_LABELS: Record<DSTab, string> = {
  influencers: 'Ranking de Influencia',
  recomendaciones: 'Recomendaciones',
  grados: 'Grados de Separación',
}

const ALGO_INFO: Record<DSTab, { algo: string; icon: React.ReactNode; desc: string; formula?: string }> = {
  influencers: {
    algo: 'PageRank Personalizado',
    icon: <AwardIcon size={16} />,
    desc: 'Puntaje de influencia ponderado sobre conexiones, publicaciones, likes y menciones.',
    formula: 'Score = conexiones×2 + likes×0.5 + menciones×3 + publicaciones×1',
  },
  recomendaciones: {
    algo: 'Jaccard Similarity',
    icon: <ActivityIcon size={16} />,
    desc: 'Sugerencias de conexión basadas en vecinos comunes en la red profesional.',
    formula: 'J(A,B) = |A ∩ B| / |A ∪ B|',
  },
  grados: {
    algo: 'BFS Shortest Path',
    icon: <RouteIcon size={16} />,
    desc: 'Camino más corto entre dos usuarios usando búsqueda en anchura sobre la red.',
    formula: 'shortestPath((a)-[:CONECTADO_CON*..15]-(b))',
  },
}

export default function DataSciencePage() {
  const { me } = useStore()
  const [activeTab, setActiveTab] = useState<DSTab>('influencers')

  // Influencers
  const [limit, setLimit] = useState(10)
  const [infResult, setInfResult] = useState<ApiResult | null>(null)
  const [infLoading, setInfLoading] = useState(false)
  const [infError, setInfError] = useState<string | null>(null)
  const [infCypherOpen, setInfCypherOpen] = useState(false)

  // Recomendaciones
  const [recUserId, setRecUserId] = useState('')
  const [recResult, setRecResult] = useState<ApiResult | null>(null)
  const [recLoading, setRecLoading] = useState(false)
  const [recError, setRecError] = useState<string | null>(null)
  const [recCypherOpen, setRecCypherOpen] = useState(false)
  const recUserIdSet = useRef(false)

  // Grados
  const [fromId, setFromId] = useState('')
  const [toId, setToId] = useState('')
  const [gradosResult, setGradosResult] = useState<ApiResult | null>(null)
  const [gradosLoading, setGradosLoading] = useState(false)
  const [gradosError, setGradosError] = useState<string | null>(null)
  const [gradosCypherOpen, setGradosCypherOpen] = useState(false)

  useEffect(() => {
    if (me?.props.usuario_id && !recUserIdSet.current) {
      setRecUserId(me.props.usuario_id)
      recUserIdSet.current = true
    }
  }, [me])

  async function runInfluencers() {
    setInfLoading(true); setInfError(null); setInfCypherOpen(false)
    try { setInfResult(await datascienceApi.influencers(limit)) }
    catch (e) { setInfError(String(e)) }
    finally { setInfLoading(false) }
  }

  async function runRecomendaciones() {
    if (!recUserId.trim()) return
    setRecLoading(true); setRecError(null); setRecCypherOpen(false)
    try { setRecResult(await datascienceApi.recomendaciones(recUserId.trim())) }
    catch (e) { setRecError(String(e)) }
    finally { setRecLoading(false) }
  }

  async function runGrados() {
    if (!fromId.trim() || !toId.trim()) return
    setGradosLoading(true); setGradosError(null); setGradosCypherOpen(false)
    try { setGradosResult(await datascienceApi.gradosSeparacion(fromId.trim(), toId.trim())) }
    catch (e) { setGradosError(String(e)) }
    finally { setGradosLoading(false) }
  }

  const infRows = infResult ? rowsToObjects<InfluencerRow>(infResult.columns, infResult.rows) : []
  const maxScore = infRows.reduce((m, r) => Math.max(m, r.score_influencia), 0)
  const recRows = recResult ? rowsToObjects<RecomRow>(recResult.columns, recResult.rows) : []
  const gradosRows = gradosResult ? rowsToObjects<GradosRow>(gradosResult.columns, gradosResult.rows) : []
  const gradosPath = gradosRows[0]
  const pathNames: string[] = Array.isArray(gradosPath?.nombres) ? gradosPath.nombres : []

  const info = ALGO_INFO[activeTab]

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 6 }}>
        <ActivityIcon size={20} />
        <h2>Data Science</h2>
        <span className="chip accent" style={{ marginLeft: 'auto', fontSize: 11 }}>3 algoritmos</span>
      </div>
      <p className="text-mute" style={{ marginBottom: 20, fontSize: 14 }}>
        Algoritmos de grafo sobre la red profesional: PageRank, Jaccard Similarity y BFS Shortest Path.
      </p>

      {/* Tabs */}
      <div className="tabs">
        {(Object.keys(TAB_LABELS) as DSTab[]).map(t => (
          <button key={t} className={`tab ${activeTab === t ? 'active' : ''}`} onClick={() => setActiveTab(t)}>
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {/* Algorithm info card */}
      <div className="card" style={{ marginTop: 0, borderTop: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0, paddingBottom: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, paddingBottom: 16, borderBottom: '1px solid var(--border-soft)' }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8, border: '1px solid var(--accent)',
            background: 'var(--accent-bg)', display: 'grid', placeItems: 'center',
            color: 'var(--accent-hi)', flexShrink: 0,
          }}>
            {info.icon}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
              <span style={{ fontWeight: 600, fontSize: 14.5 }}>{TAB_LABELS[activeTab]}</span>
              <span className="chip accent" style={{ fontSize: 11 }}>{info.algo}</span>
            </div>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-mute)' }}>{info.desc}</p>
            {info.formula && (
              <code style={{ display: 'inline-block', marginTop: 5, fontSize: 11.5, fontFamily: 'var(--mono)', color: 'var(--accent-hi)', background: 'var(--accent-bg)', padding: '2px 8px', borderRadius: 4 }}>
                {info.formula}
              </code>
            )}
          </div>
        </div>

        {/* Controls */}
        <div style={{ padding: '16px 0' }}>
          {activeTab === 'influencers' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <label style={{ fontSize: 13, color: 'var(--text-mute)', whiteSpace: 'nowrap' }}>Mostrar top</label>
              <select className="select" style={{ width: 80 }} value={limit} onChange={e => setLimit(Number(e.target.value))}>
                {[5, 10, 15, 20].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
              <span style={{ fontSize: 13, color: 'var(--text-mute)' }}>usuarios</span>
              <button className="btn-primary" onClick={runInfluencers} disabled={infLoading} style={{ marginLeft: 8 }}>
                <ZapIcon size={13} /> {infLoading ? 'Calculando…' : 'Calcular ranking'}
              </button>
            </div>
          )}

          {activeTab === 'recomendaciones' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <input
                className="input"
                style={{ flex: 1, maxWidth: 320 }}
                placeholder="ID de usuario (ej: u_0001)"
                value={recUserId}
                onChange={e => setRecUserId(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && runRecomendaciones()}
              />
              <button className="btn-primary" onClick={runRecomendaciones} disabled={recLoading || !recUserId.trim()}>
                <ZapIcon size={13} /> {recLoading ? 'Buscando…' : 'Buscar recomendaciones'}
              </button>
              {me?.props.usuario_id && (
                <button className="btn-ghost btn-sm" onClick={() => setRecUserId(me.props.usuario_id!)}>
                  Usar mi ID
                </button>
              )}
            </div>
          )}

          {activeTab === 'grados' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <input
                className="input"
                style={{ flex: 1, minWidth: 140, maxWidth: 220 }}
                placeholder="Desde (ID usuario)"
                value={fromId}
                onChange={e => setFromId(e.target.value)}
              />
              <span style={{ color: 'var(--accent-hi)', fontSize: 18, fontWeight: 300 }}>→</span>
              <input
                className="input"
                style={{ flex: 1, minWidth: 140, maxWidth: 220 }}
                placeholder="Hasta (ID usuario)"
                value={toId}
                onChange={e => setToId(e.target.value)}
              />
              <button className="btn-primary" onClick={runGrados} disabled={gradosLoading || !fromId.trim() || !toId.trim()}>
                <ZapIcon size={13} /> {gradosLoading ? 'Calculando…' : 'Calcular ruta'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      {activeTab === 'influencers' && (infError || infRows.length > 0) && (
        <div className="card" style={{ marginTop: 14 }}>
          {infError && <div className="result-error">{infError}</div>}
          {infRows.length > 0 && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-mute)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Top {infRows.length} influencers
                </span>
                {infResult?.meta?.cypher && (
                  <button className="btn-ghost btn-sm" onClick={() => setInfCypherOpen(v => !v)} style={{ fontSize: 11 }}>
                    {infCypherOpen ? 'Ocultar' : 'Ver'} Cypher
                  </button>
                )}
              </div>
              {infCypherOpen && infResult?.meta?.cypher && (
                <pre className="cypher-preview" style={{ marginBottom: 12 }}>{infResult.meta.cypher.trim()}</pre>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {infRows.map((r, i) => (
                  <div key={r.usuario_id} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 12px', background: 'var(--bg-2)',
                    borderRadius: 8, border: '1px solid var(--border-soft)',
                  }}>
                    <span style={{
                      fontSize: i < 3 ? 18 : 12, width: 30, textAlign: 'center',
                      color: 'var(--text-dim)', flexShrink: 0, fontWeight: i >= 3 ? 600 : 400,
                      fontFamily: i >= 3 ? 'var(--mono)' : 'inherit',
                    }}>
                      {i < 3 ? MEDALS[i] : `#${i + 1}`}
                    </span>
                    <div style={{
                      width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                      background: 'var(--card-hi)', border: '1px solid var(--border)',
                      display: 'grid', placeItems: 'center', fontWeight: 600, fontSize: 12,
                    }}>
                      {initials(r.nombre)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{r.nombre}</div>
                      {r.titular && <div style={{ fontSize: 12, color: 'var(--text-mute)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.titular}</div>}
                    </div>
                    <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                      <span className="chip" title="Conexiones" style={{ fontSize: 11 }}>{r.conexiones} cx</span>
                      <span className="chip" title="Likes recibidos" style={{ fontSize: 11 }}>{r.likes_recibidos} ♥</span>
                      <span className="chip" title="Menciones" style={{ fontSize: 11 }}>{r.menciones} @</span>
                    </div>
                    <ScoreBar value={r.score_influencia} max={maxScore} />
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'recomendaciones' && (recError || recResult) && (
        <div className="card" style={{ marginTop: 14 }}>
          {recError && <div className="result-error">{recError}</div>}
          {recResult && recRows.length === 0 && !recError && (
            <div className="empty">No se encontraron recomendaciones para este usuario.</div>
          )}
          {recRows.length > 0 && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-mute)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {recRows.length} recomendación{recRows.length !== 1 ? 'es' : ''}
                </span>
                {recResult?.meta?.cypher && (
                  <button className="btn-ghost btn-sm" onClick={() => setRecCypherOpen(v => !v)} style={{ fontSize: 11 }}>
                    {recCypherOpen ? 'Ocultar' : 'Ver'} Cypher
                  </button>
                )}
              </div>
              {recCypherOpen && recResult?.meta?.cypher && (
                <pre className="cypher-preview" style={{ marginBottom: 12 }}>{recResult.meta.cypher.trim()}</pre>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {recRows.map(r => (
                  <div key={r.usuario_id} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 14px', background: 'var(--bg-2)',
                    borderRadius: 8, border: '1px solid var(--border-soft)',
                  }}>
                    <div style={{
                      width: 42, height: 42, borderRadius: '50%', flexShrink: 0,
                      background: 'var(--card-hi)', border: '1px solid var(--border)',
                      display: 'grid', placeItems: 'center', fontWeight: 600, fontSize: 14,
                    }}>
                      {initials(r.nombre)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{r.nombre}</div>
                      {r.titular && <div style={{ fontSize: 12.5, color: 'var(--text-mute)', marginTop: 1 }}>{r.titular}</div>}
                      <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 3 }}>
                        {r.conexiones_en_comun} conexión{r.conexiones_en_comun !== 1 ? 'es' : ''} en común
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                      <span className="chip accent" style={{ fontSize: 11.5 }}>
                        J = {r.jaccard.toFixed(3)}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--mono)' }}>
                        {r.usuario_id}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'grados' && (gradosError || gradosResult) && (
        <div className="card" style={{ marginTop: 14 }}>
          {gradosError && <div className="result-error">{gradosError}</div>}
          {gradosResult && gradosRows.length === 0 && !gradosError && (
            <div className="empty">No se encontró ruta entre estos usuarios (máx. 15 saltos).</div>
          )}
          {gradosPath && pathNames.length > 0 && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-mute)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Ruta encontrada
                  </span>
                  <span className="chip accent" style={{ fontSize: 13, padding: '3px 12px' }}>
                    {gradosPath.grados} grado{gradosPath.grados !== 1 ? 's' : ''} de separación
                  </span>
                </div>
                {gradosResult?.meta?.cypher && (
                  <button className="btn-ghost btn-sm" onClick={() => setGradosCypherOpen(v => !v)} style={{ fontSize: 11 }}>
                    {gradosCypherOpen ? 'Ocultar' : 'Ver'} Cypher
                  </button>
                )}
              </div>
              {gradosCypherOpen && gradosResult?.meta?.cypher && (
                <pre className="cypher-preview" style={{ marginBottom: 16 }}>{gradosResult.meta.cypher.trim()}</pre>
              )}

              {/* Path chain visualization */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexWrap: 'wrap', gap: 0, padding: '12px 0 20px',
              }}>
                {pathNames.map((name, i) => (
                  <Fragment key={i}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                      <div style={{
                        width: 46, height: 46, borderRadius: '50%',
                        background: (i === 0 || i === pathNames.length - 1) ? 'var(--accent-bg)' : 'var(--card-hi)',
                        border: `2px solid ${(i === 0 || i === pathNames.length - 1) ? 'var(--accent)' : 'var(--border)'}`,
                        display: 'grid', placeItems: 'center',
                        fontWeight: 700, fontSize: 13,
                        color: (i === 0 || i === pathNames.length - 1) ? 'var(--accent-hi)' : 'var(--text)',
                        flexShrink: 0,
                      }}>
                        {initials(name)}
                      </div>
                      <span style={{
                        fontSize: 11.5, color: (i === 0 || i === pathNames.length - 1) ? 'var(--text)' : 'var(--text-mute)',
                        maxWidth: 72, textAlign: 'center', lineHeight: 1.3,
                        fontWeight: (i === 0 || i === pathNames.length - 1) ? 600 : 400,
                      }}>
                        {name}
                      </span>
                    </div>
                    {i < pathNames.length - 1 && (
                      <div style={{
                        padding: '0 6px', marginBottom: 22,
                        color: 'var(--accent)', fontSize: 16, flexShrink: 0,
                      }}>
                        →
                      </div>
                    )}
                  </Fragment>
                ))}
              </div>

              {/* IDs row */}
              <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 4 }}>
                {Array.isArray(gradosPath.ids) && gradosPath.ids.map((id, i) => (
                  <span key={i} className="chip" style={{ fontSize: 11, fontFamily: 'var(--mono)' }}>{id}</span>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
