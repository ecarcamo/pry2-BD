import { useEffect, useState, type ReactNode } from 'react'
import { useStore } from '../store/StoreContext'
import { usuariosApi } from '../api/usuarios'
import { empresasApi } from '../api/empresas'
import { empleosApi } from '../api/empleos'
import { relacionesApi } from '../api/relaciones'
import { csvApi } from '../api/csv'
import { consultasApi } from '../api/consultas'
import { extractNodes, nodeId } from '../lib/format'
import { CheckIcon } from '../lib/icons'
import type { ApiResult, Empresa } from '../types/api'

type NodeShape = { elementId: string; labels: string[]; props: Record<string, unknown> }
type RelShape = { elementId: string; type: string; properties: Record<string, unknown> }

function isNode(v: unknown): v is NodeShape {
  return !!v && typeof v === 'object'
    && 'elementId' in v && 'labels' in v && 'props' in v
}

function isRel(v: unknown): v is RelShape {
  return !!v && typeof v === 'object'
    && 'elementId' in v && 'type' in v && 'properties' in v
}

function renderScalar(v: unknown): ReactNode {
  if (v === null || v === undefined) return <span className="cell-null">null</span>
  if (typeof v === 'boolean') return <span className={v ? 'cell-true' : 'cell-false'}>{String(v)}</span>
  if (typeof v === 'number') return <span className="cell-num">{v}</span>
  if (Array.isArray(v)) {
    if (v.length === 0) return <span className="cell-arr-empty">[ ]</span>
    return <span className="cell-arr">{v.map(x => String(x)).join(', ')}</span>
  }
  if (typeof v === 'object') return <code className="cell-json">{JSON.stringify(v)}</code>
  return <span>{String(v)}</span>
}

function PropsList({ props }: { props: Record<string, unknown> }) {
  const entries = Object.entries(props)
  if (entries.length === 0) return <span className="text-mute">(sin propiedades)</span>
  return (
    <dl className="props-list">
      {entries.map(([k, v]) => (
        <div key={k} className="prop-row-kv">
          <dt>{k}</dt>
          <dd>{renderScalar(v)}</dd>
        </div>
      ))}
    </dl>
  )
}

function NodeCell({ node }: { node: NodeShape }) {
  return (
    <div className="node-cell">
      <div className="node-labels">
        {node.labels.map(l => <span key={l} className="label-badge">:{l}</span>)}
      </div>
      <PropsList props={node.props} />
    </div>
  )
}

function RelCell({ rel }: { rel: RelShape }) {
  return (
    <div className="node-cell">
      <div className="node-labels">
        <span className="rel-badge">[:{rel.type}]</span>
      </div>
      <PropsList props={rel.properties} />
    </div>
  )
}

function ResultCell({ cell }: { cell: unknown }) {
  if (isNode(cell)) return <NodeCell node={cell} />
  if (isRel(cell)) return <RelCell rel={cell} />
  return <>{renderScalar(cell)}</>
}

function ResultBox({ result, error }: { result: ApiResult | null; error: string | null }) {
  if (error) return <div className="result-error">{error}</div>
  if (!result) return null
  const stats = result.stats
  const hasStats = Object.values(stats).some(v => v)
  return (
    <div className="op-result">
      <code className="cypher-preview">{result.meta?.cypher?.trim()}</code>
      {hasStats && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
          {Object.entries(stats).filter(([, v]) => v).map(([k, v]) => (
            <span key={k} className="stat-badge">{k}: {v}</span>
          ))}
        </div>
      )}
      {result.rows.length > 0 && (
        <div className="result-table-wrap" style={{ marginTop: 8 }}>
          <table className="result-table">
            <thead><tr>{result.columns.map(c => <th key={c}>{c}</th>)}</tr></thead>
            <tbody>
              {result.rows.slice(0, 5).map((row, i) => (
                <tr key={i}>
                  {row.map((cell, ci) => (
                    <td key={ci}><ResultCell cell={cell} /></td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {result.rows.length > 5 && (
            <p className="text-mute" style={{ fontSize: 11, marginTop: 4 }}>
              … y {result.rows.length - 5} fila(s) más (mostrando 5 de {result.rows.length})
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function OpCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card op-card">
      <h3 className="op-title">{title}</h3>
      {children}
    </div>
  )
}

const NODE_LABELS = ['Usuario', 'Empresa', 'Empleo', 'Publicacion', 'Educacion'] as const
type NodeLabel = (typeof NODE_LABELS)[number]

const ID_FIELD: Record<NodeLabel, string> = {
  Usuario: 'usuario_id',
  Empresa: 'empresa_id',
  Empleo: 'empleo_id',
  Publicacion: 'publicacion_id',
  Educacion: 'educacion_id',
}

const REL_TYPES = [
  'CONECTADO_CON', 'DIO_LIKE', 'COMENTO', 'COMPARTIO',
  'POSTULO_A', 'SIGUE_A', 'ESTAR_EN', 'ESTUDIO_EN',
  'MENCIONA_A', 'OFERTA',
] as const

type RelEndpointsValue = {
  fromLabel: NodeLabel; fromId: string
  toLabel: NodeLabel; toId: string
  type: string
}

type RelBulkValue = {
  fromLabel: NodeLabel; toLabel: NodeLabel; type: string
  filterField: string; filterValue: string
}

type Pair = { key: string; value: string }

function parseValue(raw: string): unknown {
  const v = raw.trim()
  if (v === 'true') return true
  if (v === 'false') return false
  if (v === 'null') return null
  if (v !== '' && !isNaN(Number(v))) return Number(v)
  return raw
}

function pairsToSet(pairs: Pair[]): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const { key, value } of pairs) {
    const k = key.trim()
    if (k) out[k] = parseValue(value)
  }
  return out
}

function PairsEditor({
  pairs, onChange, addLabel = '+ propiedad',
}: { pairs: Pair[]; onChange: (next: Pair[]) => void; addLabel?: string }) {
  const update = (i: number, patch: Partial<Pair>) =>
    onChange(pairs.map((p, j) => (j === i ? { ...p, ...patch } : p)))
  const remove = (i: number) => onChange(pairs.filter((_, j) => j !== i))
  const add = () => onChange([...pairs, { key: '', value: '' }])
  return (
    <div className="pairs-editor">
      {pairs.map((p, i) => (
        <div key={i} className="pair-row">
          <input className="input" placeholder="campo (ej. titular)"
            value={p.key} onChange={e => update(i, { key: e.target.value })} />
          <input className="input" placeholder="valor (true/false/123/texto)"
            value={p.value} onChange={e => update(i, { value: e.target.value })} />
          <button type="button" className="btn-ghost pair-del" onClick={() => remove(i)}>×</button>
        </div>
      ))}
      <button type="button" className="btn-ghost pair-add" onClick={add}>{addLabel}</button>
    </div>
  )
}

function NamesEditor({
  names, onChange, addLabel = '+ propiedad a quitar',
}: { names: string[]; onChange: (next: string[]) => void; addLabel?: string }) {
  const update = (i: number, val: string) => onChange(names.map((n, j) => (j === i ? val : n)))
  const remove = (i: number) => onChange(names.filter((_, j) => j !== i))
  const add = () => onChange([...names, ''])
  return (
    <div className="pairs-editor">
      {names.map((n, i) => (
        <div key={i} className="pair-row pair-row-single">
          <input className="input" placeholder="propiedad (ej. linkedin_url)"
            value={n} onChange={e => update(i, e.target.value)} />
          <button type="button" className="btn-ghost pair-del" onClick={() => remove(i)}>×</button>
        </div>
      ))}
      <button type="button" className="btn-ghost pair-add" onClick={add}>{addLabel}</button>
    </div>
  )
}

function RelEndpoints({
  value, onChange,
}: { value: RelEndpointsValue; onChange: (next: RelEndpointsValue) => void }) {
  const update = <K extends keyof RelEndpointsValue>(k: K, v: RelEndpointsValue[K]) =>
    onChange({ ...value, [k]: v })
  return (
    <div className="form-grid">
      <select className="input" value={value.fromLabel}
        onChange={e => update('fromLabel', e.target.value as NodeLabel)}>
        {NODE_LABELS.map(l => <option key={l} value={l}>{l} (from)</option>)}
      </select>
      <input className="input" placeholder={`from ${ID_FIELD[value.fromLabel]}`}
        value={value.fromId} onChange={e => update('fromId', e.target.value)} />
      <select className="input" value={value.toLabel}
        onChange={e => update('toLabel', e.target.value as NodeLabel)}>
        {NODE_LABELS.map(l => <option key={l} value={l}>{l} (to)</option>)}
      </select>
      <input className="input" placeholder={`to ${ID_FIELD[value.toLabel]}`}
        value={value.toId} onChange={e => update('toId', e.target.value)} />
      <select className="input" value={value.type}
        onChange={e => update('type', e.target.value)}>
        {REL_TYPES.map(t => <option key={t} value={t}>:{t}</option>)}
      </select>
    </div>
  )
}

function RelBulkEndpoints({
  value, onChange,
}: { value: RelBulkValue; onChange: (next: RelBulkValue) => void }) {
  const update = <K extends keyof RelBulkValue>(k: K, v: RelBulkValue[K]) =>
    onChange({ ...value, [k]: v })
  return (
    <div className="form-grid">
      <select className="input" value={value.fromLabel}
        onChange={e => update('fromLabel', e.target.value as NodeLabel)}>
        {NODE_LABELS.map(l => <option key={l} value={l}>{l} (from)</option>)}
      </select>
      <select className="input" value={value.toLabel}
        onChange={e => update('toLabel', e.target.value as NodeLabel)}>
        {NODE_LABELS.map(l => <option key={l} value={l}>{l} (to)</option>)}
      </select>
      <select className="input" value={value.type}
        onChange={e => update('type', e.target.value)}>
        {REL_TYPES.map(t => <option key={t} value={t}>:{t}</option>)}
      </select>
      <input className="input" placeholder="campo filtro (opcional)"
        value={value.filterField} onChange={e => update('filterField', e.target.value)} />
      <input className="input" placeholder="valor filtro (opcional)"
        value={value.filterValue} onChange={e => update('filterValue', e.target.value)} />
    </div>
  )
}

export default function OperacionesPage() {
  const { showToast } = useStore()
  const [result, setResult] = useState<Record<string, { res: ApiResult | null; err: string | null }>>({})

  function setOp(key: string, res: ApiResult | null, err: string | null) {
    setResult(r => ({ ...r, [key]: { res, err } }))
  }

  // ── 1. Crear nodo con 1 label ──────────────────────────────────────────────
  const [newEmpresa, setNewEmpresa] = useState({ nombre: '', industria: 'Tecnología', pais: 'Guatemala' })
  async function crearEmpresa1Label() {
    try {
      const res = await empresasApi.create({ ...newEmpresa, verificada: false, empleados_count: 1 })
      setOp('emp1', res, null)
      showToast('Empresa (1 label) creada', 'ok')
    } catch (e) { setOp('emp1', null, String(e)) }
  }

  // ── 2. Crear nodo con 2+ labels ────────────────────────────────────────────
  const [newAdmin, setNewAdmin] = useState({ nombre: '', email: '', nivel_acceso: 'moderador' })
  async function crearAdmin2Labels() {
    try {
      const res = await usuariosApi.createAdmin({ ...newAdmin, titular: 'Admin', habilidades: [] })
      setOp('admin2', res, null)
      showToast('Usuario:Admin (2 labels) creado', 'ok')
    } catch (e) { setOp('admin2', null, String(e)) }
  }

  // ── 2b. Crear :Usuario:Reclutador ─────────────────────────────────────────
  const [newReclutador, setNewReclutador] = useState({ nombre: '', email: '', empresa_asignada: '' })
  async function crearReclutador2Labels() {
    try {
      const res = await usuariosApi.createReclutador({
        ...newReclutador,
        titular: 'Recruiter',
        habilidades: [],
      })
      setOp('reclu2', res, null)
      showToast('Usuario:Reclutador (2 labels) creado', 'ok')
    } catch (e) { setOp('reclu2', null, String(e)) }
  }

  // ── Carga CSV: nodos ──────────────────────────────────────────────────────
  const [csvNodeFile, setCsvNodeFile] = useState<File | null>(null)
  const [csvNodeLabel, setCsvNodeLabel] = useState('Usuario')
  async function uploadCsvNodes() {
    if (!csvNodeFile) { showToast('Selecciona un archivo CSV', 'err'); return }
    try {
      const r = await csvApi.loadNodes(csvNodeFile, csvNodeLabel)
      setOp('csvN', {
        columns: ['creados', 'label'],
        rows: [[r.creados, r.label]],
        stats: { nodesCreated: r.creados },
        meta: { cypher: r.cypher },
      }, null)
      showToast(`${r.creados} nodos :${r.label} creados desde CSV`, 'ok')
    } catch (e) { setOp('csvN', null, String(e)) }
  }

  // ── Carga CSV: relaciones ─────────────────────────────────────────────────
  const [csvRelFile, setCsvRelFile] = useState<File | null>(null)
  const [csvRelCfg, setCsvRelCfg] = useState({
    from_label: 'Usuario', from_id_field: 'usuario_id', from_id_column: 'usuario_id',
    to_label: 'Empresa', to_id_field: 'empresa_id', to_id_column: 'empresa_id',
    type: 'SIGUE_A',
  })
  async function uploadCsvRels() {
    if (!csvRelFile) { showToast('Selecciona un archivo CSV', 'err'); return }
    try {
      const r = await csvApi.loadRels(csvRelFile, csvRelCfg)
      setOp('csvR', {
        columns: ['creadas', 'tipo'],
        rows: [[r.creadas, r.tipo]],
        stats: { relsCreated: r.creadas },
        meta: { cypher: r.cypher },
      }, null)
      showToast(`${r.creadas} relaciones :${r.tipo} creadas desde CSV`, 'ok')
    } catch (e) { setOp('csvR', null, String(e)) }
  }

  // ── 3. Crear nodo con ≥5 propiedades ──────────────────────────────────────
  // Cargamos un listado de empresas para que el usuario seleccione la que
  // ofertará el empleo (CREATE :Empleo + CREATE [:OFERTA] desde la Empresa).
  const [empresasOpts, setEmpresasOpts] = useState<{ id: string; label: string }[]>([])
  const [newEmpleo, setNewEmpleo] = useState({
    titulo: '', salario_min: '1000', salario_max: '2000',
    modalidad: 'remoto', activo: 'true', empresa_id: '',
  })

  useEffect(() => {
    let cancelled = false
    empresasApi.list({ limit: '100' })
      .then(res => {
        if (cancelled) return
        const nodes = extractNodes(res) as Empresa[]
        const opts = nodes
          .map(n => ({ id: nodeId(n.props), label: n.props.nombre || nodeId(n.props) }))
          .filter(o => o.id)
        setEmpresasOpts(opts)
        // Pre-selecciona la primera empresa si no hay nada elegido
        setNewEmpleo(f => f.empresa_id ? f : { ...f, empresa_id: opts[0]?.id ?? '' })
      })
      .catch(() => { /* sin empresas → el usuario verá el mensaje del select */ })
    return () => { cancelled = true }
  }, [])

  async function crearEmpleo5Props() {
    if (!newEmpleo.empresa_id) {
      setOp('emp5', null, 'Selecciona una empresa que ofertará el empleo')
      return
    }
    try {
      const res = await empleosApi.create({
        titulo: newEmpleo.titulo,
        salario_min: parseFloat(newEmpleo.salario_min),
        salario_max: parseFloat(newEmpleo.salario_max),
        modalidad: newEmpleo.modalidad,
        activo: newEmpleo.activo === 'true',
        fecha_publicacion: new Date().toISOString().slice(0, 10),
        empresa_id: newEmpleo.empresa_id,
      })
      setOp('emp5', res, null)
      showToast('Empleo (6 props) + relación :OFERTA creados', 'ok')
    } catch (e) { setOp('emp5', null, String(e)) }
  }

  // ── 4.1 — Consultar 1 nodo ─────────────────────────────────────────────────
  const [q41, setQ41] = useState<{ label: NodeLabel; id: string }>({
    label: 'Usuario', id: '',
  })
  async function consultarUnNodo() {
    try {
      if (!q41.id.trim()) { setOp('4.1', null, 'Indica el id del nodo'); return }
      const res = await relacionesApi.queryNodos({
        label: q41.label,
        filter: { [ID_FIELD[q41.label]]: q41.id.trim() },
        limit: 1,
      })
      setOp('4.1', res, null)
      showToast(`Consultado nodo :${q41.label}`, 'ok')
    } catch (e) { setOp('4.1', null, String(e)) }
  }

  // ── 4.2 — Consultar muchos nodos con filtro ───────────────────────────────
  const [q42, setQ42] = useState<{ label: NodeLabel; filterField: string; filterValue: string; limit: string }>({
    label: 'Empleo', filterField: 'activo', filterValue: 'true', limit: '20',
  })
  async function consultarMuchosNodos() {
    try {
      const filter = q42.filterField.trim()
        ? { [q42.filterField.trim()]: parseValue(q42.filterValue) }
        : {}
      const limit = Number.isNaN(parseInt(q42.limit)) ? 20 : parseInt(q42.limit)
      const res = await relacionesApi.queryNodos({
        label: q42.label,
        filter,
        limit,
      })
      setOp('4.2', res, null)
      showToast(`Consultados nodos :${q42.label}`, 'ok')
    } catch (e) { setOp('4.2', null, String(e)) }
  }

  // ── 4.3 — Consulta agregada ────────────────────────────────────────────────
  const [q43, setQ43] = useState<{
    label: NodeLabel; agg: 'count' | 'avg' | 'sum' | 'min' | 'max';
    field: string; groupBy: string; filterField: string; filterValue: string;
  }>({
    label: 'Usuario', agg: 'avg', field: 'conexiones_count',
    groupBy: '', filterField: '', filterValue: '',
  })
  async function consultarAgregada() {
    try {
      const where = q43.filterField.trim()
        ? [{ prop: q43.filterField.trim(), value: parseValue(q43.filterValue) }]
        : []
      const res = await consultasApi.agregacion({
        label: q43.label,
        agg: q43.agg,
        field: q43.agg === 'count' ? undefined : q43.field.trim() || undefined,
        groupBy: q43.groupBy.trim() || undefined,
        where,
      })
      setOp('4.3', res, null)
      showToast(`Agregación ${q43.agg} sobre :${q43.label}`, 'ok')
    } catch (e) { setOp('4.3', null, String(e)) }
  }

  // ── 5.1 / 5.3 — Agregar / actualizar 1+ props a 1 nodo (SET) ──────────────
  const [setOneLabel, setSetOneLabel] = useState<NodeLabel>('Usuario')
  const [setOneId, setSetOneId] = useState('')
  const [setOnePairs, setSetOnePairs] = useState<Pair[]>([{ key: 'titular', value: 'Senior Engineer' }])
  async function aplicarSetOne(opKey: '5.1' | '5.3') {
    try {
      const set = pairsToSet(setOnePairs)
      if (Object.keys(set).length === 0) {
        setOp(opKey, null, 'Agrega al menos una propiedad'); return
      }
      const res = await relacionesApi.patchNodo({
        label: setOneLabel,
        id_field: ID_FIELD[setOneLabel],
        id_value: setOneId,
        set,
      })
      setOp(opKey, res, null)
      showToast(`SET ${Object.keys(set).join(', ')} aplicado`, 'ok')
    } catch (e) { setOp(opKey, null, String(e)) }
  }

  // ── 5.2 / 5.4 — Agregar / actualizar 1+ props a múltiples nodos (bulk SET) ─
  const [setBulkLabel, setSetBulkLabel] = useState<NodeLabel>('Empresa')
  const [setBulkFilterField, setSetBulkFilterField] = useState('industria')
  const [setBulkFilterValue, setSetBulkFilterValue] = useState('Tecnología')
  const [setBulkPairs, setSetBulkPairs] = useState<Pair[]>([{ key: 'industria', value: 'Tech & IA' }])
  async function aplicarSetBulk(opKey: '5.2' | '5.4') {
    try {
      const set = pairsToSet(setBulkPairs)
      if (Object.keys(set).length === 0) {
        setOp(opKey, null, 'Agrega al menos una propiedad'); return
      }
      const filter = setBulkFilterField.trim()
        ? { [setBulkFilterField.trim()]: parseValue(setBulkFilterValue) }
        : {}
      const res = await relacionesApi.bulkPatchNodos({
        label: setBulkLabel,
        filter,
        set,
      })
      setOp(opKey, res, null)
      showToast(`Bulk SET aplicado a :${setBulkLabel}`, 'ok')
    } catch (e) { setOp(opKey, null, String(e)) }
  }

  // ── 5.5 — Eliminar 1+ props de 1 nodo (REMOVE) ────────────────────────────
  const [remOneLabel, setRemOneLabel] = useState<NodeLabel>('Usuario')
  const [remOneId, setRemOneId] = useState('')
  const [remOneNames, setRemOneNames] = useState<string[]>(['linkedin_url'])
  async function aplicarRemoveOne() {
    try {
      const remove = remOneNames.map(n => n.trim()).filter(Boolean)
      if (remove.length === 0) {
        setOp('5.5', null, 'Indica al menos una propiedad a eliminar'); return
      }
      const res = await relacionesApi.patchNodo({
        label: remOneLabel,
        id_field: ID_FIELD[remOneLabel],
        id_value: remOneId,
        remove,
      })
      setOp('5.5', res, null)
      showToast(`REMOVE ${remove.join(', ')} aplicado`, 'ok')
    } catch (e) { setOp('5.5', null, String(e)) }
  }

  // ── 5.6 — Eliminar 1+ props de múltiples nodos (bulk REMOVE) ──────────────
  const [remBulkLabel, setRemBulkLabel] = useState<NodeLabel>('Usuario')
  const [remBulkFilterField, setRemBulkFilterField] = useState('')
  const [remBulkFilterValue, setRemBulkFilterValue] = useState('')
  const [remBulkNames, setRemBulkNames] = useState<string[]>(['linkedin_url'])
  async function aplicarRemoveBulk() {
    try {
      const remove = remBulkNames.map(n => n.trim()).filter(Boolean)
      if (remove.length === 0) {
        setOp('5.6', null, 'Indica al menos una propiedad a eliminar'); return
      }
      const filter = remBulkFilterField.trim()
        ? { [remBulkFilterField.trim()]: parseValue(remBulkFilterValue) }
        : {}
      const res = await relacionesApi.bulkPatchNodos({
        label: remBulkLabel,
        filter,
        remove,
      })
      setOp('5.6', res, null)
      showToast(`Bulk REMOVE aplicado a :${remBulkLabel}`, 'ok')
    } catch (e) { setOp('5.6', null, String(e)) }
  }

  // ── 6.1 — CREATE relación genérica (≥3 props) ─────────────────────────────
  const [rel61, setRel61] = useState<RelEndpointsValue>({
    fromLabel: 'Usuario', fromId: '',
    toLabel: 'Publicacion', toId: '',
    type: 'COMENTO',
  })
  const [rel61Pairs, setRel61Pairs] = useState<Pair[]>([
    { key: 'contenido', value: 'Comentario de prueba' },
    { key: 'fecha', value: new Date().toISOString().slice(0, 10) },
    { key: 'editado', value: 'false' },
  ])
  async function crearRelacionGenerica() {
    try {
      const props = pairsToSet(rel61Pairs)
      if (Object.keys(props).length < 3) {
        setOp('6.1', null, 'La rúbrica exige al menos 3 propiedades'); return
      }
      const res = await relacionesApi.generica({
        from: { label: rel61.fromLabel, idField: ID_FIELD[rel61.fromLabel], idValue: rel61.fromId },
        to:   { label: rel61.toLabel,   idField: ID_FIELD[rel61.toLabel],   idValue: rel61.toId },
        type: rel61.type,
        properties: props,
      })
      setOp('6.1', res, null)
      showToast(`Relación :${rel61.type} creada con ${Object.keys(props).length} props`, 'ok')
    } catch (e) { setOp('6.1', null, String(e)) }
  }

  // ── 7.1 / 7.3 — Agregar / actualizar 1+ props a 1 relación (PATCH) ────────
  const [rel71, setRel71] = useState<RelEndpointsValue>({
    fromLabel: 'Usuario', fromId: '',
    toLabel: 'Publicacion', toId: '',
    type: 'DIO_LIKE',
  })
  const [rel71Pairs, setRel71Pairs] = useState<Pair[]>([{ key: 'notificado', value: 'true' }])
  async function aplicarRelSetOne(opKey: '7.1' | '7.3') {
    try {
      const set = pairsToSet(rel71Pairs)
      if (Object.keys(set).length === 0) {
        setOp(opKey, null, 'Agrega al menos una propiedad'); return
      }
      const res = await relacionesApi.patchRelacion({
        from: { label: rel71.fromLabel, idField: ID_FIELD[rel71.fromLabel], idValue: rel71.fromId },
        to:   { label: rel71.toLabel,   idField: ID_FIELD[rel71.toLabel],   idValue: rel71.toId },
        type: rel71.type,
        set,
      })
      setOp(opKey, res, null)
      showToast(`SET sobre [:${rel71.type}] aplicado`, 'ok')
    } catch (e) { setOp(opKey, null, String(e)) }
  }

  // ── 7.2 / 7.4 — bulk SET en relaciones ────────────────────────────────────
  const [rel72, setRel72] = useState<RelBulkValue>({
    fromLabel: 'Usuario', toLabel: 'Publicacion',
    type: 'DIO_LIKE', filterField: '', filterValue: '',
  })
  const [rel72Pairs, setRel72Pairs] = useState<Pair[]>([{ key: 'notificado', value: 'true' }])
  async function aplicarRelSetBulk(opKey: '7.2' | '7.4') {
    try {
      const set = pairsToSet(rel72Pairs)
      if (Object.keys(set).length === 0) {
        setOp(opKey, null, 'Agrega al menos una propiedad'); return
      }
      const filter = rel72.filterField.trim()
        ? { [rel72.filterField.trim()]: parseValue(rel72.filterValue) }
        : {}
      const res = await relacionesApi.bulkPatchRelacion({
        from_label: rel72.fromLabel,
        to_label:   rel72.toLabel,
        type:       rel72.type,
        filter,
        set,
      })
      setOp(opKey, res, null)
      showToast(`Bulk SET sobre [:${rel72.type}] aplicado`, 'ok')
    } catch (e) { setOp(opKey, null, String(e)) }
  }

  // ── 7.5 — Eliminar 1+ props de 1 relación (REMOVE) ────────────────────────
  const [rel75, setRel75] = useState<RelEndpointsValue>({
    fromLabel: 'Usuario', fromId: '',
    toLabel: 'Publicacion', toId: '',
    type: 'DIO_LIKE',
  })
  const [rel75Names, setRel75Names] = useState<string[]>(['notificado'])
  async function aplicarRelRemoveOne() {
    try {
      const remove = rel75Names.map(n => n.trim()).filter(Boolean)
      if (remove.length === 0) {
        setOp('7.5', null, 'Indica al menos una propiedad a eliminar'); return
      }
      const res = await relacionesApi.patchRelacion({
        from: { label: rel75.fromLabel, idField: ID_FIELD[rel75.fromLabel], idValue: rel75.fromId },
        to:   { label: rel75.toLabel,   idField: ID_FIELD[rel75.toLabel],   idValue: rel75.toId },
        type: rel75.type,
        remove,
      })
      setOp('7.5', res, null)
      showToast(`REMOVE sobre [:${rel75.type}] aplicado`, 'ok')
    } catch (e) { setOp('7.5', null, String(e)) }
  }

  // ── 7.6 — bulk REMOVE en relaciones ───────────────────────────────────────
  const [rel76, setRel76] = useState<RelBulkValue>({
    fromLabel: 'Usuario', toLabel: 'Empresa',
    type: 'SIGUE_A', filterField: '', filterValue: '',
  })
  const [rel76Names, setRel76Names] = useState<string[]>(['motivo'])
  async function aplicarRelRemoveBulk() {
    try {
      const remove = rel76Names.map(n => n.trim()).filter(Boolean)
      if (remove.length === 0) {
        setOp('7.6', null, 'Indica al menos una propiedad a eliminar'); return
      }
      const filter = rel76.filterField.trim()
        ? { [rel76.filterField.trim()]: parseValue(rel76.filterValue) }
        : {}
      const res = await relacionesApi.bulkPatchRelacion({
        from_label: rel76.fromLabel,
        to_label:   rel76.toLabel,
        type:       rel76.type,
        filter,
        remove,
      })
      setOp('7.6', res, null)
      showToast(`Bulk REMOVE sobre [:${rel76.type}] aplicado`, 'ok')
    } catch (e) { setOp('7.6', null, String(e)) }
  }

  // ── 8.1 — Eliminar 1 nodo (genérico) ──────────────────────────────────────
  const [del81, setDel81] = useState<{ label: NodeLabel; id: string }>({
    label: 'Usuario', id: '',
  })
  async function eliminarNodoUno() {
    try {
      if (!del81.id.trim()) { setOp('8.1', null, 'Indica el id del nodo'); return }
      const res = await relacionesApi.bulkDeleteNodos({
        label: del81.label,
        filter: { [ID_FIELD[del81.label]]: del81.id.trim() },
      })
      setOp('8.1', res, null)
      showToast(`Nodo :${del81.label} eliminado`, 'ok')
    } catch (e) { setOp('8.1', null, String(e)) }
  }

  // ── 8.2 — Eliminar múltiples nodos (genérico) ─────────────────────────────
  const [del82, setDel82] = useState<{ label: NodeLabel; filterField: string; filterValue: string }>({
    label: 'Empleo', filterField: 'activo', filterValue: 'false',
  })
  async function eliminarNodosBulk() {
    try {
      const filter = del82.filterField.trim()
        ? { [del82.filterField.trim()]: parseValue(del82.filterValue) }
        : {}
      const res = await relacionesApi.bulkDeleteNodos({ label: del82.label, filter })
      setOp('8.2', res, null)
      showToast(`Nodos :${del82.label} eliminados (bulk)`, 'ok')
    } catch (e) { setOp('8.2', null, String(e)) }
  }

  // ── 9.1 — Eliminar 1 relación (genérico) ──────────────────────────────────
  const [del91, setDel91] = useState<RelEndpointsValue>({
    fromLabel: 'Usuario', fromId: '',
    toLabel: 'Publicacion', toId: '',
    type: 'DIO_LIKE',
  })
  async function eliminarRelacionUna() {
    try {
      const res = await relacionesApi.deleteRelacion({
        from_label: del91.fromLabel,
        from_id_field: ID_FIELD[del91.fromLabel],
        from_id_value: del91.fromId,
        to_label: del91.toLabel,
        to_id_field: ID_FIELD[del91.toLabel],
        to_id_value: del91.toId,
        type: del91.type,
      })
      setOp('9.1', res, null)
      showToast(`Relación [:${del91.type}] eliminada`, 'ok')
    } catch (e) { setOp('9.1', null, String(e)) }
  }

  // ── 9.2 — Eliminar múltiples relaciones (genérico) ────────────────────────
  const [del92, setDel92] = useState<RelBulkValue>({
    fromLabel: 'Usuario', toLabel: 'Publicacion',
    type: 'COMENTO', filterField: 'editado', filterValue: 'false',
  })
  async function eliminarRelacionesBulk() {
    try {
      const filter = del92.filterField.trim()
        ? { [del92.filterField.trim()]: parseValue(del92.filterValue) }
        : {}
      const res = await relacionesApi.bulkDeleteRelacion({
        from_label: del92.fromLabel,
        to_label:   del92.toLabel,
        type:       del92.type,
        filter,
      })
      setOp('9.2', res, null)
      showToast(`Relaciones [:${del92.type}] eliminadas (bulk)`, 'ok')
    } catch (e) { setOp('9.2', null, String(e)) }
  }

  return (
    <div className="page ops-page">
      <div className="page-header">
        <CheckIcon size={20} />
        <h2>Operaciones Rúbrica</h2>
      </div>
      <p className="text-mute" style={{ marginBottom: 24 }}>
        Cada operación llama al backend real (Neo4j Aura). El Cypher ejecutado se muestra bajo cada resultado.
      </p>

      <div className="ops-grid">
        <OpCard title="1.1 — Crear nodo con 1 label (:Empresa)">
          <div className="form-grid">
            <input className="input" placeholder="Nombre empresa" value={newEmpresa.nombre}
              onChange={e => setNewEmpresa(f => ({ ...f, nombre: e.target.value }))} />
            <input className="input" placeholder="Industria" value={newEmpresa.industria}
              onChange={e => setNewEmpresa(f => ({ ...f, industria: e.target.value }))} />
          </div>
          <button className="btn-primary" onClick={crearEmpresa1Label}>CREATE (:Empresa)</button>
          <ResultBox result={result['emp1']?.res ?? null} error={result['emp1']?.err ?? null} />
        </OpCard>

        <OpCard title="2.1 — Crear nodo con 2+ labels (:Usuario:Admin)">
          <div className="form-grid">
            <input className="input" placeholder="Nombre" value={newAdmin.nombre}
              onChange={e => setNewAdmin(f => ({ ...f, nombre: e.target.value }))} />
            <input className="input" placeholder="Email" value={newAdmin.email}
              onChange={e => setNewAdmin(f => ({ ...f, email: e.target.value }))} />
            <select className="input" value={newAdmin.nivel_acceso}
              onChange={e => setNewAdmin(f => ({ ...f, nivel_acceso: e.target.value }))}>
              {['moderador', 'admin', 'superadmin', 'editor'].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <button className="btn-primary" onClick={crearAdmin2Labels}>CREATE (:Usuario:Admin)</button>
          <ResultBox result={result['admin2']?.res ?? null} error={result['admin2']?.err ?? null} />
        </OpCard>

        <OpCard title="2.2 — Crear nodo con 2+ labels (:Usuario:Reclutador)">
          <div className="form-grid">
            <input className="input" placeholder="Nombre" value={newReclutador.nombre}
              onChange={e => setNewReclutador(f => ({ ...f, nombre: e.target.value }))} />
            <input className="input" placeholder="Email" value={newReclutador.email}
              onChange={e => setNewReclutador(f => ({ ...f, email: e.target.value }))} />
            <input className="input" placeholder="Empresa asignada (opcional)" value={newReclutador.empresa_asignada}
              onChange={e => setNewReclutador(f => ({ ...f, empresa_asignada: e.target.value }))} />
          </div>
          <button className="btn-primary" onClick={crearReclutador2Labels}>CREATE (:Usuario:Reclutador)</button>
          <ResultBox result={result['reclu2']?.res ?? null} error={result['reclu2']?.err ?? null} />
        </OpCard>

        <OpCard title="3.1 — Crear nodo con ≥5 propiedades (:Empleo)">
          <div className="form-grid">
            <input className="input" placeholder="Título del puesto" value={newEmpleo.titulo}
              onChange={e => setNewEmpleo(f => ({ ...f, titulo: e.target.value }))} />
            <select className="input" value={newEmpleo.empresa_id}
              onChange={e => setNewEmpleo(f => ({ ...f, empresa_id: e.target.value }))}>
              {empresasOpts.length === 0 && <option value="">Cargando empresas…</option>}
              {empresasOpts.map(o => (
                <option key={o.id} value={o.id}>{o.label} ({o.id})</option>
              ))}
            </select>
            <input className="input" placeholder="Salario mín" type="number" value={newEmpleo.salario_min}
              onChange={e => setNewEmpleo(f => ({ ...f, salario_min: e.target.value }))} />
            <input className="input" placeholder="Salario máx" type="number" value={newEmpleo.salario_max}
              onChange={e => setNewEmpleo(f => ({ ...f, salario_max: e.target.value }))} />
            <select className="input" value={newEmpleo.modalidad}
              onChange={e => setNewEmpleo(f => ({ ...f, modalidad: e.target.value }))}>
              {['remoto', 'presencial', 'híbrido'].map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <p className="text-mute" style={{ fontSize: 12 }}>
            Crea (:Empleo {'{'}6 props{'}'}) y la relación (:Empresa)-[:OFERTA]→(:Empleo)
          </p>
          <button className="btn-primary" onClick={crearEmpleo5Props}>CREATE (:Empleo) + [:OFERTA]</button>
          <ResultBox result={result['emp5']?.res ?? null} error={result['emp5']?.err ?? null} />
        </OpCard>

        <OpCard title="4.1 — Consultar 1 nodo (filtro por id)">
          <p className="text-mute" style={{ fontSize: 12, marginBottom: 4 }}>
            Devuelve el nodo y todas sus propiedades. Funciona con cualquier label.
          </p>
          <div className="form-grid">
            <select className="input" value={q41.label}
              onChange={e => setQ41(f => ({ ...f, label: e.target.value as NodeLabel }))}>
              {NODE_LABELS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
            <input className="input" placeholder={ID_FIELD[q41.label]}
              value={q41.id} onChange={e => setQ41(f => ({ ...f, id: e.target.value }))} />
          </div>
          <button className="btn-primary" onClick={consultarUnNodo}>
            MATCH (n:{q41.label} {`{${ID_FIELD[q41.label]}}`}) RETURN n
          </button>
          <ResultBox result={result['4.1']?.res ?? null} error={result['4.1']?.err ?? null} />
        </OpCard>

        <OpCard title="4.2 — Consultar muchos nodos (con filtro)">
          <p className="text-mute" style={{ fontSize: 12, marginBottom: 4 }}>
            Devuelve los nodos del label que cumplan el filtro (sin filtro = todos, hasta el límite).
          </p>
          <div className="form-grid">
            <select className="input" value={q42.label}
              onChange={e => setQ42(f => ({ ...f, label: e.target.value as NodeLabel }))}>
              {NODE_LABELS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
            <input className="input" placeholder="Campo filtro (opcional)"
              value={q42.filterField}
              onChange={e => setQ42(f => ({ ...f, filterField: e.target.value }))} />
            <input className="input" placeholder="Valor (opcional)"
              value={q42.filterValue}
              onChange={e => setQ42(f => ({ ...f, filterValue: e.target.value }))} />
            <input className="input" type="number" placeholder="LIMIT"
              value={q42.limit}
              onChange={e => setQ42(f => ({ ...f, limit: e.target.value }))} />
          </div>
          <button className="btn-primary" onClick={consultarMuchosNodos}>
            MATCH (n:{q42.label}) {q42.filterField ? `WHERE n.${q42.filterField}` : ''} RETURN n LIMIT {q42.limit}
          </button>
          <ResultBox result={result['4.2']?.res ?? null} error={result['4.2']?.err ?? null} />
        </OpCard>

        <OpCard title="4.3 — Consulta agregada (count / avg / sum / min / max)">
          <p className="text-mute" style={{ fontSize: 12, marginBottom: 4 }}>
            Calcula un agregado opcionalmente agrupado por una propiedad.
          </p>
          <div className="form-grid">
            <select className="input" value={q43.label}
              onChange={e => setQ43(f => ({ ...f, label: e.target.value as NodeLabel }))}>
              {NODE_LABELS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
            <select className="input" value={q43.agg}
              onChange={e => setQ43(f => ({ ...f, agg: e.target.value as typeof q43.agg }))}>
              {['count', 'avg', 'sum', 'min', 'max'].map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <input className="input" placeholder="campo (no se usa con count)"
              disabled={q43.agg === 'count'}
              value={q43.field} onChange={e => setQ43(f => ({ ...f, field: e.target.value }))} />
            <input className="input" placeholder="groupBy (opcional)"
              value={q43.groupBy} onChange={e => setQ43(f => ({ ...f, groupBy: e.target.value }))} />
            <input className="input" placeholder="campo filtro (opcional)"
              value={q43.filterField}
              onChange={e => setQ43(f => ({ ...f, filterField: e.target.value }))} />
            <input className="input" placeholder="valor filtro (opcional)"
              value={q43.filterValue}
              onChange={e => setQ43(f => ({ ...f, filterValue: e.target.value }))} />
          </div>
          <button className="btn-primary" onClick={consultarAgregada}>
            MATCH (n:{q43.label}) {q43.filterField ? `WHERE n.${q43.filterField}` : ''} RETURN {q43.agg === 'count' ? 'count(*)' : `${q43.agg}(n.${q43.field || '?'})`}
          </button>
          <ResultBox result={result['4.3']?.res ?? null} error={result['4.3']?.err ?? null} />
        </OpCard>

        <OpCard title="5.1 — Agregar 1+ propiedades a 1 nodo (SET)">
          <p className="text-mute" style={{ fontSize: 12, marginBottom: 4 }}>
            Si la propiedad no existe, Cypher la crea; si existe, la sobreescribe.
          </p>
          <div className="form-grid">
            <select className="input" value={setOneLabel}
              onChange={e => setSetOneLabel(e.target.value as NodeLabel)}>
              {NODE_LABELS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
            <input className="input" placeholder={ID_FIELD[setOneLabel]}
              value={setOneId} onChange={e => setSetOneId(e.target.value)} />
          </div>
          <PairsEditor pairs={setOnePairs} onChange={setSetOnePairs} />
          <button className="btn-primary" onClick={() => aplicarSetOne('5.1')}>
            SET (:{setOneLabel} {`{${ID_FIELD[setOneLabel]}}`}) — agregar props
          </button>
          <ResultBox result={result['5.1']?.res ?? null} error={result['5.1']?.err ?? null} />
        </OpCard>

        <OpCard title="5.2 — Agregar 1+ propiedades a múltiples nodos (bulk SET)">
          <p className="text-mute" style={{ fontSize: 12, marginBottom: 4 }}>
            Aplica SET a todos los nodos del label que cumplan el filtro (déjalo vacío para todos).
          </p>
          <div className="form-grid">
            <select className="input" value={setBulkLabel}
              onChange={e => setSetBulkLabel(e.target.value as NodeLabel)}>
              {NODE_LABELS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
            <input className="input" placeholder="Campo filtro (opcional)"
              value={setBulkFilterField} onChange={e => setSetBulkFilterField(e.target.value)} />
            <input className="input" placeholder="Valor filtro (opcional)"
              value={setBulkFilterValue} onChange={e => setSetBulkFilterValue(e.target.value)} />
          </div>
          <PairsEditor pairs={setBulkPairs} onChange={setSetBulkPairs} />
          <button className="btn-primary" onClick={() => aplicarSetBulk('5.2')}>
            MATCH (n:{setBulkLabel}) {setBulkFilterField ? `WHERE n.${setBulkFilterField}` : ''} SET …
          </button>
          <ResultBox result={result['5.2']?.res ?? null} error={result['5.2']?.err ?? null} />
        </OpCard>

        <OpCard title="5.3 — Actualizar 1+ propiedades de 1 nodo (SET)">
          <p className="text-mute" style={{ fontSize: 12, marginBottom: 4 }}>
            Sobreescribe propiedades existentes en un nodo identificado por su id.
          </p>
          <div className="form-grid">
            <select className="input" value={setOneLabel}
              onChange={e => setSetOneLabel(e.target.value as NodeLabel)}>
              {NODE_LABELS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
            <input className="input" placeholder={ID_FIELD[setOneLabel]}
              value={setOneId} onChange={e => setSetOneId(e.target.value)} />
          </div>
          <PairsEditor pairs={setOnePairs} onChange={setSetOnePairs} />
          <button className="btn-primary" onClick={() => aplicarSetOne('5.3')}>
            SET (:{setOneLabel}) — actualizar props
          </button>
          <ResultBox result={result['5.3']?.res ?? null} error={result['5.3']?.err ?? null} />
        </OpCard>

        <OpCard title="5.4 — Actualizar 1+ propiedades de múltiples nodos (bulk SET)">
          <p className="text-mute" style={{ fontSize: 12, marginBottom: 4 }}>
            SET masivo sobre los nodos del label seleccionado que cumplan el filtro.
          </p>
          <div className="form-grid">
            <select className="input" value={setBulkLabel}
              onChange={e => setSetBulkLabel(e.target.value as NodeLabel)}>
              {NODE_LABELS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
            <input className="input" placeholder="Campo filtro (opcional)"
              value={setBulkFilterField} onChange={e => setSetBulkFilterField(e.target.value)} />
            <input className="input" placeholder="Valor filtro (opcional)"
              value={setBulkFilterValue} onChange={e => setSetBulkFilterValue(e.target.value)} />
          </div>
          <PairsEditor pairs={setBulkPairs} onChange={setSetBulkPairs} />
          <button className="btn-primary" onClick={() => aplicarSetBulk('5.4')}>
            MATCH (n:{setBulkLabel}) {setBulkFilterField ? `WHERE n.${setBulkFilterField}` : ''} SET … (bulk)
          </button>
          <ResultBox result={result['5.4']?.res ?? null} error={result['5.4']?.err ?? null} />
        </OpCard>

        <OpCard title="5.5 — Eliminar 1+ propiedades de 1 nodo (REMOVE)">
          <p className="text-mute" style={{ fontSize: 12, marginBottom: 4 }}>
            REMOVE en un nodo específico (no borra el nodo, solo sus propiedades).
          </p>
          <div className="form-grid">
            <select className="input" value={remOneLabel}
              onChange={e => setRemOneLabel(e.target.value as NodeLabel)}>
              {NODE_LABELS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
            <input className="input" placeholder={ID_FIELD[remOneLabel]}
              value={remOneId} onChange={e => setRemOneId(e.target.value)} />
          </div>
          <NamesEditor names={remOneNames} onChange={setRemOneNames} />
          <button className="btn-danger" onClick={aplicarRemoveOne}>
            REMOVE (:{remOneLabel}) props
          </button>
          <ResultBox result={result['5.5']?.res ?? null} error={result['5.5']?.err ?? null} />
        </OpCard>

        <OpCard title="5.6 — Eliminar 1+ propiedades de múltiples nodos (bulk REMOVE)">
          <p className="text-mute" style={{ fontSize: 12, marginBottom: 4 }}>
            REMOVE masivo. Sin filtro elimina la propiedad en todos los nodos del label.
          </p>
          <div className="form-grid">
            <select className="input" value={remBulkLabel}
              onChange={e => setRemBulkLabel(e.target.value as NodeLabel)}>
              {NODE_LABELS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
            <input className="input" placeholder="Campo filtro (opcional)"
              value={remBulkFilterField} onChange={e => setRemBulkFilterField(e.target.value)} />
            <input className="input" placeholder="Valor filtro (opcional)"
              value={remBulkFilterValue} onChange={e => setRemBulkFilterValue(e.target.value)} />
          </div>
          <NamesEditor names={remBulkNames} onChange={setRemBulkNames} />
          <button className="btn-danger" onClick={aplicarRemoveBulk}>
            MATCH (n:{remBulkLabel}) REMOVE … (bulk)
          </button>
          <ResultBox result={result['5.6']?.res ?? null} error={result['5.6']?.err ?? null} />
        </OpCard>

        <OpCard title="6.1 — Crear relación entre 2 nodos existentes (≥3 propiedades)">
          <p className="text-mute" style={{ fontSize: 12, marginBottom: 4 }}>
            CREATE genérico: tipo libre + 3 o más propiedades. Los nodos deben existir.
          </p>
          <RelEndpoints value={rel61} onChange={setRel61} />
          <PairsEditor pairs={rel61Pairs} onChange={setRel61Pairs} />
          <button className="btn-primary" onClick={crearRelacionGenerica}>
            CREATE (a:{rel61.fromLabel})-[:{rel61.type}]→(b:{rel61.toLabel})
          </button>
          <ResultBox result={result['6.1']?.res ?? null} error={result['6.1']?.err ?? null} />
        </OpCard>

        <OpCard title="7.1 — Agregar 1+ propiedades a 1 relación (SET)">
          <p className="text-mute" style={{ fontSize: 12, marginBottom: 4 }}>
            Si la propiedad no existe en la relación, Cypher la crea.
          </p>
          <RelEndpoints value={rel71} onChange={setRel71} />
          <PairsEditor pairs={rel71Pairs} onChange={setRel71Pairs} />
          <button className="btn-primary" onClick={() => aplicarRelSetOne('7.1')}>
            SET [:{rel71.type}] — agregar props
          </button>
          <ResultBox result={result['7.1']?.res ?? null} error={result['7.1']?.err ?? null} />
        </OpCard>

        <OpCard title="7.2 — Agregar 1+ propiedades a múltiples relaciones (bulk SET)">
          <p className="text-mute" style={{ fontSize: 12, marginBottom: 4 }}>
            Aplica SET a todas las relaciones del tipo seleccionado que cumplan el filtro.
          </p>
          <RelBulkEndpoints value={rel72} onChange={setRel72} />
          <PairsEditor pairs={rel72Pairs} onChange={setRel72Pairs} />
          <button className="btn-primary" onClick={() => aplicarRelSetBulk('7.2')}>
            MATCH ()-[r:{rel72.type}]→() SET … (bulk)
          </button>
          <ResultBox result={result['7.2']?.res ?? null} error={result['7.2']?.err ?? null} />
        </OpCard>

        <OpCard title="7.3 — Actualizar 1+ propiedades de 1 relación (SET)">
          <p className="text-mute" style={{ fontSize: 12, marginBottom: 4 }}>
            Sobreescribe propiedades existentes en una relación específica.
          </p>
          <RelEndpoints value={rel71} onChange={setRel71} />
          <PairsEditor pairs={rel71Pairs} onChange={setRel71Pairs} />
          <button className="btn-primary" onClick={() => aplicarRelSetOne('7.3')}>
            SET [:{rel71.type}] — actualizar props
          </button>
          <ResultBox result={result['7.3']?.res ?? null} error={result['7.3']?.err ?? null} />
        </OpCard>

        <OpCard title="7.4 — Actualizar 1+ propiedades de múltiples relaciones (bulk SET)">
          <p className="text-mute" style={{ fontSize: 12, marginBottom: 4 }}>
            SET masivo sobre todas las relaciones de un tipo con filtro opcional.
          </p>
          <RelBulkEndpoints value={rel72} onChange={setRel72} />
          <PairsEditor pairs={rel72Pairs} onChange={setRel72Pairs} />
          <button className="btn-primary" onClick={() => aplicarRelSetBulk('7.4')}>
            MATCH ()-[r:{rel72.type}]→() SET … (bulk)
          </button>
          <ResultBox result={result['7.4']?.res ?? null} error={result['7.4']?.err ?? null} />
        </OpCard>

        <OpCard title="7.5 — Eliminar 1+ propiedades de 1 relación (REMOVE)">
          <p className="text-mute" style={{ fontSize: 12, marginBottom: 4 }}>
            Quita propiedades de una relación específica sin eliminar la relación.
          </p>
          <RelEndpoints value={rel75} onChange={setRel75} />
          <NamesEditor names={rel75Names} onChange={setRel75Names} />
          <button className="btn-danger" onClick={aplicarRelRemoveOne}>
            REMOVE r.props sobre [:{rel75.type}]
          </button>
          <ResultBox result={result['7.5']?.res ?? null} error={result['7.5']?.err ?? null} />
        </OpCard>

        <OpCard title="7.6 — Eliminar 1+ propiedades de múltiples relaciones (bulk REMOVE)">
          <p className="text-mute" style={{ fontSize: 12, marginBottom: 4 }}>
            Quita propiedades en todas las relaciones del tipo seleccionado.
          </p>
          <RelBulkEndpoints value={rel76} onChange={setRel76} />
          <NamesEditor names={rel76Names} onChange={setRel76Names} />
          <button className="btn-danger" onClick={aplicarRelRemoveBulk}>
            MATCH ()-[r:{rel76.type}]→() REMOVE … (bulk)
          </button>
          <ResultBox result={result['7.6']?.res ?? null} error={result['7.6']?.err ?? null} />
        </OpCard>

        <OpCard title="8.1 — Eliminar 1 nodo (DETACH DELETE)">
          <p className="text-mute" style={{ fontSize: 12, marginBottom: 4 }}>
            Borra un nodo identificado por su id (también remueve sus relaciones).
          </p>
          <div className="form-grid">
            <select className="input" value={del81.label}
              onChange={e => setDel81(f => ({ ...f, label: e.target.value as NodeLabel }))}>
              {NODE_LABELS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
            <input className="input" placeholder={ID_FIELD[del81.label]}
              value={del81.id} onChange={e => setDel81(f => ({ ...f, id: e.target.value }))} />
          </div>
          <button className="btn-danger" onClick={eliminarNodoUno}>
            MATCH (n:{del81.label} {`{${ID_FIELD[del81.label]}}`}) DETACH DELETE n
          </button>
          <ResultBox result={result['8.1']?.res ?? null} error={result['8.1']?.err ?? null} />
        </OpCard>

        <OpCard title="8.2 — Eliminar múltiples nodos (bulk DETACH DELETE)">
          <p className="text-mute" style={{ fontSize: 12, marginBottom: 4 }}>
            Elimina todos los nodos del label que cumplan el filtro (sin filtro = todos).
          </p>
          <div className="form-grid">
            <select className="input" value={del82.label}
              onChange={e => setDel82(f => ({ ...f, label: e.target.value as NodeLabel }))}>
              {NODE_LABELS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
            <input className="input" placeholder="Campo filtro (opcional)"
              value={del82.filterField}
              onChange={e => setDel82(f => ({ ...f, filterField: e.target.value }))} />
            <input className="input" placeholder="Valor (opcional)"
              value={del82.filterValue}
              onChange={e => setDel82(f => ({ ...f, filterValue: e.target.value }))} />
          </div>
          <button className="btn-danger" onClick={eliminarNodosBulk}>
            MATCH (n:{del82.label}) {del82.filterField ? `WHERE n.${del82.filterField}` : ''} DETACH DELETE n
          </button>
          <ResultBox result={result['8.2']?.res ?? null} error={result['8.2']?.err ?? null} />
        </OpCard>

        <OpCard title="9.1 — Eliminar 1 relación (DELETE)">
          <p className="text-mute" style={{ fontSize: 12, marginBottom: 4 }}>
            Elimina una sola relación identificada por sus dos extremos y el tipo.
          </p>
          <RelEndpoints value={del91} onChange={setDel91} />
          <button className="btn-danger" onClick={eliminarRelacionUna}>
            DELETE [:{del91.type}] entre 2 nodos
          </button>
          <ResultBox result={result['9.1']?.res ?? null} error={result['9.1']?.err ?? null} />
        </OpCard>

        <OpCard title="9.2 — Eliminar múltiples relaciones (bulk DELETE)">
          <p className="text-mute" style={{ fontSize: 12, marginBottom: 4 }}>
            Elimina todas las relaciones del tipo seleccionado que cumplan el filtro.
          </p>
          <RelBulkEndpoints value={del92} onChange={setDel92} />
          <button className="btn-danger" onClick={eliminarRelacionesBulk}>
            MATCH ()-[r:{del92.type}]→() {del92.filterField ? `WHERE r.${del92.filterField}` : ''} DELETE r
          </button>
          <ResultBox result={result['9.2']?.res ?? null} error={result['9.2']?.err ?? null} />
        </OpCard>

        <OpCard title="📄 Carga CSV — Crear nodos">
          <p className="text-mute" style={{ fontSize: 12, marginBottom: 8 }}>
            Sube un CSV (con header) y se crearán nodos del label seleccionado. Listas separadas por <code>;</code>.
          </p>
          <div className="form-grid">
            <select className="input" value={csvNodeLabel} onChange={e => setCsvNodeLabel(e.target.value)}>
              {['Usuario', 'Empresa', 'Publicacion', 'Empleo', 'Educacion'].map(l =>
                <option key={l} value={l}>{l}</option>)}
            </select>
            <input className="input" type="file" accept=".csv,text/csv"
              onChange={e => setCsvNodeFile(e.target.files?.[0] ?? null)} />
          </div>
          <button className="btn-primary" onClick={uploadCsvNodes}>POST /api/load-csv/nodes/</button>
          <ResultBox result={result['csvN']?.res ?? null} error={result['csvN']?.err ?? null} />
        </OpCard>

        <OpCard title="📄 Carga CSV — Crear relaciones">
          <p className="text-mute" style={{ fontSize: 12, marginBottom: 8 }}>
            CSV con columnas para los IDs de origen/destino (los nodos deben existir). El resto de columnas se guardan como propiedades de la relación.
          </p>
          <div className="form-grid">
            <input className="input" placeholder="from_label (Usuario)" value={csvRelCfg.from_label}
              onChange={e => setCsvRelCfg(f => ({ ...f, from_label: e.target.value }))} />
            <input className="input" placeholder="from_id_field (usuario_id)" value={csvRelCfg.from_id_field}
              onChange={e => setCsvRelCfg(f => ({ ...f, from_id_field: e.target.value }))} />
            <input className="input" placeholder="from_id_column (usuario_id)" value={csvRelCfg.from_id_column}
              onChange={e => setCsvRelCfg(f => ({ ...f, from_id_column: e.target.value }))} />
            <input className="input" placeholder="to_label (Empresa)" value={csvRelCfg.to_label}
              onChange={e => setCsvRelCfg(f => ({ ...f, to_label: e.target.value }))} />
            <input className="input" placeholder="to_id_field (empresa_id)" value={csvRelCfg.to_id_field}
              onChange={e => setCsvRelCfg(f => ({ ...f, to_id_field: e.target.value }))} />
            <input className="input" placeholder="to_id_column (empresa_id)" value={csvRelCfg.to_id_column}
              onChange={e => setCsvRelCfg(f => ({ ...f, to_id_column: e.target.value }))} />
            <input className="input" placeholder="type (SIGUE_A)" value={csvRelCfg.type}
              onChange={e => setCsvRelCfg(f => ({ ...f, type: e.target.value }))} />
            <input className="input" type="file" accept=".csv,text/csv"
              onChange={e => setCsvRelFile(e.target.files?.[0] ?? null)} />
          </div>
          <button className="btn-primary" onClick={uploadCsvRels}>POST /api/load-csv/rels/</button>
          <ResultBox result={result['csvR']?.res ?? null} error={result['csvR']?.err ?? null} />
        </OpCard>
      </div>
    </div>
  )
}
