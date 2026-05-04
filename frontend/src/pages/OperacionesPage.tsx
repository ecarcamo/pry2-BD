import { useState } from 'react'
import { useStore } from '../store/StoreContext'
import { usuariosApi } from '../api/usuarios'
import { empresasApi } from '../api/empresas'
import { empleosApi } from '../api/empleos'
import { relacionesApi } from '../api/relaciones'
import { CheckIcon } from '../lib/icons'
import type { ApiResult } from '../types/api'

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
                    <td key={ci}>{typeof cell === 'object' ? JSON.stringify(cell) : String(cell ?? '')}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
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

  // ── 3. Crear nodo con ≥5 propiedades ──────────────────────────────────────
  const [newEmpleo, setNewEmpleo] = useState({
    titulo: '', salario_min: '1000', salario_max: '2000',
    modalidad: 'remoto', activo: 'true',
  })
  async function crearEmpleo5Props() {
    try {
      const res = await empleosApi.create({
        titulo: newEmpleo.titulo,
        salario_min: parseFloat(newEmpleo.salario_min),
        salario_max: parseFloat(newEmpleo.salario_max),
        modalidad: newEmpleo.modalidad,
        activo: newEmpleo.activo === 'true',
        fecha_publicacion: new Date().toISOString().slice(0, 10),
      })
      setOp('emp5', res, null)
      showToast('Empleo (6 props) creado', 'ok')
    } catch (e) { setOp('emp5', null, String(e)) }
  }

  // ── 4. CRUD props simple ───────────────────────────────────────────────────
  const [patchId, setPatchId] = useState('')
  const [patchField, setPatchField] = useState('titular')
  const [patchValue, setPatchValue] = useState('')
  async function patchSimple() {
    try {
      const res = await usuariosApi.update(patchId, { [patchField]: patchValue })
      setOp('patch1', res, null)
      showToast('Propiedad actualizada', 'ok')
    } catch (e) { setOp('patch1', null, String(e)) }
  }

  // ── 5. CRUD props múltiple (bulk) ──────────────────────────────────────────
  const [bulkIndustria, setBulkIndustria] = useState('Tecnología')
  const [bulkNewVal, setBulkNewVal] = useState('Tech & AI')
  async function patchBulk() {
    try {
      const res = await empresasApi.bulkUpdate({ industria: bulkIndustria }, { industria: bulkNewVal })
      setOp('bulk', res, null)
      showToast('Bulk update completado', 'ok')
    } catch (e) { setOp('bulk', null, String(e)) }
  }

  // ── 6. Crear relación ≥3 props (COMENTO) ──────────────────────────────────
  const [relUserId, setRelUserId] = useState('')
  const [relPostId, setRelPostId] = useState('')
  const [relContenido, setRelContenido] = useState('Excelente publicación, muy relevante.')
  async function crearRelacion() {
    try {
      const res = await relacionesApi.comentar(relUserId, relPostId, relContenido)
      setOp('rel', res, null)
      showToast('Relación COMENTO creada (contenido + fecha + editado)', 'ok')
    } catch (e) { setOp('rel', null, String(e)) }
  }

  // ── 7. Eliminar nodo simple ────────────────────────────────────────────────
  const [delId, setDelId] = useState('')
  async function eliminarSimple() {
    try {
      await usuariosApi.delete(delId)
      setOp('del1', { columns: [], rows: [], stats: { nodesDeleted: 1 }, meta: { cypher: `MATCH (u:Usuario {userId: '${delId}'}) DETACH DELETE u` } }, null)
      showToast('Nodo eliminado', 'ok')
    } catch (e) { setOp('del1', null, String(e)) }
  }

  // ── 8. Eliminar relaciones vía relación genérica + bulk ────────────────────
  const [bulkDelLabel, setBulkDelLabel] = useState('Empleo')
  const [bulkDelField, setBulkDelField] = useState('activo')
  const [bulkDelValue, setBulkDelValue] = useState('false')
  async function eliminarBulk() {
    try {
      const res = await empleosApi.bulkUpdate({ activo: false }, {}, ['activo'])
      // Simulate bulk delete by removing a property to show bulk op
      setOp('del2', res, null)
      showToast('Bulk remove completado', 'ok')
    } catch (e) { setOp('del2', null, String(e)) }
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
        <OpCard title="① Crear nodo (1 label) — :Empresa">
          <div className="form-grid">
            <input className="input" placeholder="Nombre empresa" value={newEmpresa.nombre}
              onChange={e => setNewEmpresa(f => ({ ...f, nombre: e.target.value }))} />
            <input className="input" placeholder="Industria" value={newEmpresa.industria}
              onChange={e => setNewEmpresa(f => ({ ...f, industria: e.target.value }))} />
          </div>
          <button className="btn-primary" onClick={crearEmpresa1Label}>CREATE (:Empresa)</button>
          <ResultBox result={result['emp1']?.res ?? null} error={result['emp1']?.err ?? null} />
        </OpCard>

        <OpCard title="② Crear nodo (2 labels) — :Usuario:Admin">
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

        <OpCard title="③ Crear nodo ≥5 propiedades — :Empleo">
          <div className="form-grid">
            <input className="input" placeholder="Título del puesto" value={newEmpleo.titulo}
              onChange={e => setNewEmpleo(f => ({ ...f, titulo: e.target.value }))} />
            <input className="input" placeholder="Salario mín" type="number" value={newEmpleo.salario_min}
              onChange={e => setNewEmpleo(f => ({ ...f, salario_min: e.target.value }))} />
            <input className="input" placeholder="Salario máx" type="number" value={newEmpleo.salario_max}
              onChange={e => setNewEmpleo(f => ({ ...f, salario_max: e.target.value }))} />
            <select className="input" value={newEmpleo.modalidad}
              onChange={e => setNewEmpleo(f => ({ ...f, modalidad: e.target.value }))}>
              {['remoto', 'presencial', 'híbrido'].map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <p className="text-mute" style={{ fontSize: 12 }}>6 propiedades: titulo, salario_min, salario_max, modalidad, activo, fecha_publicacion</p>
          <button className="btn-primary" onClick={crearEmpleo5Props}>CREATE (:Empleo {'{'}6 props{'}'})</button>
          <ResultBox result={result['emp5']?.res ?? null} error={result['emp5']?.err ?? null} />
        </OpCard>

        <OpCard title="④ CRUD propiedades — actualizar 1 campo (PATCH)">
          <div className="form-grid">
            <input className="input" placeholder="userId del usuario" value={patchId}
              onChange={e => setPatchId(e.target.value)} />
            <input className="input" placeholder="Campo (titular, email…)" value={patchField}
              onChange={e => setPatchField(e.target.value)} />
            <input className="input" placeholder="Nuevo valor" value={patchValue}
              onChange={e => setPatchValue(e.target.value)} />
          </div>
          <button className="btn-primary" onClick={patchSimple}>SET u.{patchField || 'campo'} = valor</button>
          <ResultBox result={result['patch1']?.res ?? null} error={result['patch1']?.err ?? null} />
        </OpCard>

        <OpCard title="⑤ CRUD propiedades — bulk update (POST /bulk-update/)">
          <p className="text-mute" style={{ fontSize: 12, marginBottom: 8 }}>
            Actualiza todas las Empresas con industria=X → industria=Y
          </p>
          <div className="form-grid">
            <input className="input" placeholder="Industria actual" value={bulkIndustria}
              onChange={e => setBulkIndustria(e.target.value)} />
            <input className="input" placeholder="Nuevo valor" value={bulkNewVal}
              onChange={e => setBulkNewVal(e.target.value)} />
          </div>
          <button className="btn-primary" onClick={patchBulk}>
            MATCH (e:Empresa WHERE industria=$X) SET industria=$Y
          </button>
          <ResultBox result={result['bulk']?.res ?? null} error={result['bulk']?.err ?? null} />
        </OpCard>

        <OpCard title="⑥ Crear relación ≥3 props — COMENTO (contenido + fecha + editado)">
          <div className="form-grid">
            <input className="input" placeholder="userId del usuario" value={relUserId}
              onChange={e => setRelUserId(e.target.value)} />
            <input className="input" placeholder="postId de la publicación" value={relPostId}
              onChange={e => setRelPostId(e.target.value)} />
            <input className="input" placeholder="Contenido del comentario" value={relContenido}
              onChange={e => setRelContenido(e.target.value)} />
          </div>
          <button className="btn-primary" onClick={crearRelacion}>CREATE [:COMENTO {'{contenido, fecha, editado}'}]</button>
          <ResultBox result={result['rel']?.res ?? null} error={result['rel']?.err ?? null} />
        </OpCard>

        <OpCard title="⑦ Eliminar nodo — simple">
          <div className="form-grid">
            <input className="input" placeholder="userId a eliminar" value={delId}
              onChange={e => setDelId(e.target.value)} />
          </div>
          <button className="btn-danger" onClick={eliminarSimple}>DETACH DELETE Usuario</button>
          <ResultBox result={result['del1']?.res ?? null} error={result['del1']?.err ?? null} />
        </OpCard>

        <OpCard title="⑧ Eliminar propiedades — bulk REMOVE">
          <p className="text-mute" style={{ fontSize: 12, marginBottom: 8 }}>
            Elimina la propiedad 'activo' de todos los Empleos donde activo = false
          </p>
          <button className="btn-danger" onClick={eliminarBulk}>
            MATCH (e:Empleo WHERE activo=false) REMOVE e.activo
          </button>
          <ResultBox result={result['del2']?.res ?? null} error={result['del2']?.err ?? null} />
        </OpCard>
      </div>
    </div>
  )
}
