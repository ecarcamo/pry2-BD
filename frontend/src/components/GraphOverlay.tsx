import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import { useStore } from '../store/StoreContext'
import { grafoApi } from '../api/grafo'
import type { GrafoNode } from '../types/api'
import { XIcon, RefreshIcon } from '../lib/icons'

// Paleta más rica y distinguible
const LABEL_META: Record<string, { color: string; border: string; textColor: string }> = {
  Usuario:     { color: '#3b82f6', border: '#93c5fd', textColor: '#dbeafe' },
  Admin:       { color: '#ef4444', border: '#fca5a5', textColor: '#fee2e2' },
  Reclutador:  { color: '#a78bfa', border: '#c4b5fd', textColor: '#ede9fe' },
  Empresa:     { color: '#f59e0b', border: '#fcd34d', textColor: '#fef3c7' },
  Publicacion: { color: '#10b981', border: '#6ee7b7', textColor: '#d1fae5' },
  Empleo:      { color: '#8b5cf6', border: '#c4b5fd', textColor: '#ede9fe' },
  Educacion:   { color: '#06b6d4', border: '#67e8f9', textColor: '#cffafe' },
}

const REL_COLORS: Record<string, string> = {
  CONECTADO_CON: '#3b82f6',
  PUBLICO:       '#10b981',
  DIO_LIKE:      '#ef4444',
  COMENTO:       '#f59e0b',
  COMPARTIO:     '#8b5cf6',
  SIGUE_A:       '#f97316',
  POSTULO_A:     '#06b6d4',
  OFERTA:        '#f59e0b',
  ESTUDIO_EN:    '#06b6d4',
  ESTAR_EN:      '#f97316',
  MENCIONA_A:    '#10b981',
}

const DEFAULT_META = { color: '#6b7280', border: '#9ca3af', textColor: '#f3f4f6' }
const CANVAS_BG = '#1a1d27'

const LABELS = ['', 'Usuario', 'Empresa', 'Publicacion', 'Empleo', 'Educacion', 'Admin', 'Reclutador']

function nodeMeta(labels: string[]) {
  // Admin/Reclutador tienen prioridad visual
  if (labels.includes('Admin')) return LABEL_META['Admin']
  if (labels.includes('Reclutador')) return LABEL_META['Reclutador']
  for (const l of labels) {
    if (LABEL_META[l]) return LABEL_META[l]
  }
  return DEFAULT_META
}

function nodeLabel(props: Record<string, unknown>): string {
  const s =
    (props.nombre as string) ??
    (props.titulo as string) ??
    (props.contenido as string)?.slice(0, 24) ??
    ''
  return s.length > 18 ? s.slice(0, 16) + '…' : s
}

function relColor(type: string): string {
  return REL_COLORS[type] ?? '#4b5563'
}

export default function GraphOverlay() {
  const { graphOpen, setGraphOpen } = useStore()
  const [nodes, setNodes] = useState<GrafoNode[]>([])
  const [rels, setRels] = useState<ReturnType<typeof grafoApi.sample> extends Promise<infer R> ? R['rels'] : never>([])
  const [loading, setLoading] = useState(false)
  const [label, setLabel] = useState('')
  const [limit, setLimit] = useState(120)
  const [selected, setSelected] = useState<GrafoNode | null>(null)
  const [showLabels, setShowLabels] = useState(true)
  const canvasContainerRef = useRef<HTMLDivElement>(null)
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 })

  // Mide el contenedor del canvas para pasar width/height explícitos al ForceGraph2D.
  // Sin esto, el canvas toma el ancho del window y empuja al sidebar fuera de pantalla.
  useEffect(() => {
    if (!graphOpen) return
    function updateSize() {
      const el = canvasContainerRef.current
      if (el) setCanvasSize({ width: el.clientWidth, height: el.clientHeight })
    }
    updateSize()
    const ro = new ResizeObserver(updateSize)
    if (canvasContainerRef.current) ro.observe(canvasContainerRef.current)
    return () => ro.disconnect()
  }, [graphOpen, selected])

  const load = useCallback(async () => {
    setLoading(true)
    setSelected(null)
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

  // Memoizar para que react-force-graph no reinicie la simulación en cada render
  // (re-render por setSelected → click "recargaba" la vista).
  const graphData = useMemo(() => ({
    nodes: nodes.map(n => ({
      id: n.id,
      labels: n.labels,
      props: n.props,
      name: nodeLabel(n.props),
      meta: nodeMeta(n.labels),
    })),
    links: rels.map(r => ({
      source: r.from,
      target: r.to,
      type: r.type,
      color: relColor(r.type),
    })),
  }), [nodes, rels])

  type FGNode = (typeof graphData.nodes)[0] & { x?: number; y?: number }
  type FGLink = (typeof graphData.links)[0]

  if (!graphOpen) return null

  function paintNode(node: FGNode, ctx: CanvasRenderingContext2D, globalScale: number) {
    const { x = 0, y = 0, meta, name } = node
    const r = Math.max(4, 7 / Math.sqrt(globalScale))
    const fontSize = Math.max(8, 9 / Math.sqrt(globalScale))

    // Glow
    ctx.shadowColor = meta.color
    ctx.shadowBlur = 8

    // Circle fill
    ctx.beginPath()
    ctx.arc(x, y, r, 0, 2 * Math.PI)
    ctx.fillStyle = meta.color
    ctx.fill()

    // Border ring
    ctx.strokeStyle = meta.border
    ctx.lineWidth = 1.5 / globalScale
    ctx.stroke()

    ctx.shadowBlur = 0

    // Label
    if (showLabels && globalScale > 0.5 && name) {
      ctx.font = `${fontSize}px "Source Sans 3", sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'

      const textW = ctx.measureText(name).width
      const pad = 3 / globalScale
      const bh = fontSize + pad * 2

      // Pill background
      ctx.fillStyle = 'rgba(20,22,32,0.82)'
      ctx.beginPath()
      ctx.roundRect(x - textW / 2 - pad, y + r + 2 / globalScale, textW + pad * 2, bh, 3 / globalScale)
      ctx.fill()

      ctx.fillStyle = meta.textColor
      ctx.fillText(name, x, y + r + 2 / globalScale + pad)
    }
  }

  return (
    <div className="graph-overlay">
      {/* Header */}
      <div className="graph-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 600, fontSize: 14 }}>Visualizador del grafo</span>

          <select
            className="input"
            value={label}
            onChange={e => setLabel(e.target.value)}
            style={{ width: 170, fontSize: 13 }}
          >
            {LABELS.map(l => <option key={l} value={l}>{l || 'Todos los labels'}</option>)}
          </select>

          <select
            className="input"
            value={limit}
            onChange={e => setLimit(Number(e.target.value))}
            style={{ width: 100, fontSize: 13 }}
          >
            {[60, 120, 200, 300].map(v => <option key={v} value={v}>{v} nodos</option>)}
            <option value={10000}>Todos</option>
          </select>

          <button
            className="btn-ghost"
            onClick={() => setShowLabels(s => !s)}
            style={{ fontSize: 12 }}
          >
            {showLabels ? 'Ocultar labels' : 'Mostrar labels'}
          </button>

          <button className="btn-ghost" onClick={load} disabled={loading} style={{ fontSize: 12 }}>
            <RefreshIcon size={13} /> {loading ? 'Cargando…' : 'Recargar'}
          </button>

          <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>
            {nodes.length} nodos · {rels.length} relaciones
          </span>
        </div>

        <button className="btn-icon" onClick={() => setGraphOpen(false)}>
          <XIcon size={18} />
        </button>
      </div>

      {/* Canvas + sidebar */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div ref={canvasContainerRef} style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          {loading ? (
            <div className="loading" style={{ paddingTop: 100 }}>Cargando grafo desde Neo4j…</div>
          ) : (
            <ForceGraph2D
              width={canvasSize.width}
              height={canvasSize.height}
              graphData={graphData}
              nodeCanvasObject={(node, ctx, scale) => paintNode(node as FGNode, ctx, scale)}
              nodeCanvasObjectMode={() => 'replace'}
              nodeRelSize={7}
              linkColor={(link: object) => (link as FGLink).color ?? '#4b5563'}
              linkWidth={1.2}
              linkDirectionalArrowLength={5}
              linkDirectionalArrowRelPos={1}
              linkDirectionalParticles={1}
              linkDirectionalParticleSpeed={0.005}
              linkDirectionalParticleWidth={2}
              linkCurvature={0.15}
              onNodeClick={(node: object) => {
                const fg = node as FGNode
                setSelected({
                  id: fg.id,
                  labels: fg.labels ?? [],
                  props: fg.props ?? {},
                })
              }}
              onNodeHover={(node: object | null) => {
                document.body.style.cursor = node ? 'pointer' : 'default'
              }}
              nodeLabel={(node: object) => {
                const fg = node as FGNode
                const labels = (fg.labels ?? []).join(':')
                return `${labels}: ${fg.name || fg.id}`
              }}
              nodePointerAreaPaint={(node: object, color: string, ctx: CanvasRenderingContext2D) => {
                const { x = 0, y = 0 } = node as FGNode
                ctx.fillStyle = color
                ctx.beginPath()
                ctx.arc(x, y, 14, 0, 2 * Math.PI)
                ctx.fill()
              }}
              backgroundColor={CANVAS_BG}
              cooldownTicks={120}
              d3AlphaDecay={0.02}
              d3VelocityDecay={0.3}
            />
          )}
        </div>

        {/* Node detail panel */}
        {selected && (
          <div className="graph-sidebar">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <strong style={{ fontSize: 13 }}>Nodo seleccionado</strong>
              <button className="btn-icon" onClick={() => setSelected(null)}><XIcon size={14} /></button>
            </div>
            <div className="node-labels" style={{ marginBottom: 12 }}>
              {selected.labels.map(l => {
                const m = LABEL_META[l] ?? DEFAULT_META
                return (
                  <span key={l} style={{
                    background: m.color, color: m.textColor,
                    border: `1px solid ${m.border}`,
                    borderRadius: 5, padding: '2px 8px', fontSize: 11, fontWeight: 600,
                  }}>{l}</span>
                )
              })}
            </div>
            <div className="node-props">
              {Object.entries(selected.props).map(([k, v]) => (
                <div key={k} className="prop-row">
                  <span className="prop-key">{k}</span>
                  <span className="prop-val">
                    {Array.isArray(v)
                      ? (v as string[]).join(', ')
                      : typeof v === 'object'
                        ? JSON.stringify(v)
                        : String(v ?? '')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="graph-legend">
        {Object.entries(LABEL_META).map(([l, m]) => (
          <span key={l} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 }}>
            <span style={{
              width: 10, height: 10, borderRadius: '50%',
              background: m.color, border: `1.5px solid ${m.border}`,
              display: 'inline-block',
            }} />
            {l}
          </span>
        ))}
        <span style={{ marginLeft: 16, color: 'var(--text-dim)', fontSize: 11 }}>
          Click en nodo para ver propiedades · Scroll para zoom · Arrastrar para mover
        </span>
      </div>
    </div>
  )
}
