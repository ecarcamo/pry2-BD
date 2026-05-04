import { useCallback, useEffect, useState } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import { useStore } from '../store/StoreContext'
import { grafoApi } from '../api/grafo'
import type { GrafoNode, GrafoRel } from '../types/api'
import { XIcon, RefreshIcon } from '../lib/icons'

const LABEL_COLORS: Record<string, string> = {
  Usuario: '#4f8ef7',
  Admin: '#e55',
  Empresa: '#f5a623',
  Publicacion: '#7ed321',
  Empleo: '#9b59b6',
  Educacion: '#1abc9c',
  ExperienciaLaboral: '#e67e22',
}

const LABELS = ['', 'Usuario', 'Empresa', 'Publicacion', 'Empleo', 'Educacion', 'ExperienciaLaboral']

function nodeColor(node: GrafoNode): string {
  for (const l of node.labels) {
    if (LABEL_COLORS[l]) return LABEL_COLORS[l]
  }
  return '#888'
}

function nodeLabel(node: GrafoNode): string {
  const p = node.props
  return (p.nombre as string) ?? (p.titulo as string) ?? (p.contenido as string)?.slice(0, 30) ?? node.labels[0] ?? ''
}

export default function GraphOverlay() {
  const { graphOpen, setGraphOpen } = useStore()
  const [nodes, setNodes] = useState<GrafoNode[]>([])
  const [rels, setRels] = useState<GrafoRel[]>([])
  const [loading, setLoading] = useState(false)
  const [label, setLabel] = useState('')
  const [limit, setLimit] = useState(150)
  const [selected, setSelected] = useState<GrafoNode | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await grafoApi.sample(limit, label || undefined)
      setNodes(data.nodes)
      setRels(data.rels)
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
    }
  }, [limit, label])

  useEffect(() => {
    if (graphOpen) load()
  }, [graphOpen, load])

  if (!graphOpen) return null

  const graphData = {
    nodes: nodes.map(n => ({ id: n.id, labels: n.labels, props: n.props, color: nodeColor(n), name: nodeLabel(n) })),
    links: rels.map(r => ({ source: r.from, target: r.to, label: r.type })),
  }

  return (
    <div className="graph-overlay">
      <div className="graph-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontWeight: 600 }}>Visualizador del grafo</span>
          <select className="input" value={label} onChange={e => setLabel(e.target.value)} style={{ width: 160 }}>
            {LABELS.map(l => <option key={l} value={l}>{l || 'Todos los labels'}</option>)}
          </select>
          <select className="input" value={limit} onChange={e => setLimit(Number(e.target.value))} style={{ width: 90 }}>
            {[50, 100, 150, 200, 300].map(v => <option key={v} value={v}>{v} nodos</option>)}
          </select>
          <button className="btn-ghost" onClick={load} disabled={loading}>
            <RefreshIcon size={14} /> {loading ? 'Cargando…' : 'Recargar'}
          </button>
          <span className="text-mute" style={{ fontSize: 12 }}>
            {nodes.length} nodos · {rels.length} rels
          </span>
        </div>
        <button className="btn-icon" onClick={() => setGraphOpen(false)}>
          <XIcon size={18} />
        </button>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div style={{ flex: 1 }}>
          {loading ? (
            <div className="loading" style={{ paddingTop: 80 }}>Cargando grafo…</div>
          ) : (
            <ForceGraph2D
              graphData={graphData}
              nodeLabel="name"
              nodeColor="color"
              nodeRelSize={5}
              linkLabel="label"
              linkDirectionalArrowLength={4}
              linkDirectionalArrowRelPos={1}
              linkCurvature={0.1}
              onNodeClick={(node: Record<string, unknown>) => {
                const n = nodes.find(x => x.id === (node as { id: string }).id)
                setSelected(n ?? null)
              }}
              backgroundColor="var(--surface)"
            />
          )}
        </div>

        {selected && (
          <div className="graph-sidebar">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <strong>Nodo seleccionado</strong>
              <button className="btn-icon" onClick={() => setSelected(null)}><XIcon size={14} /></button>
            </div>
            <div className="node-labels">
              {selected.labels.map(l => (
                <span key={l} className="tag" style={{ background: LABEL_COLORS[l] ?? '#888', color: '#fff' }}>{l}</span>
              ))}
            </div>
            <div className="node-props">
              {Object.entries(selected.props).map(([k, v]) => (
                <div key={k} className="prop-row">
                  <span className="prop-key">{k}</span>
                  <span className="prop-val">{typeof v === 'object' ? JSON.stringify(v) : String(v ?? '')}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="graph-legend">
        {Object.entries(LABEL_COLORS).map(([l, c]) => (
          <span key={l} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: c, display: 'inline-block' }} />
            {l}
          </span>
        ))}
      </div>
    </div>
  )
}
