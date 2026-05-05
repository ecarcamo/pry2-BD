import { useState } from 'react'
import { useStore } from '../store/StoreContext'
import { usuariosApi } from '../api/usuarios'
import { empresasApi } from '../api/empresas'
import { empleosApi } from '../api/empleos'
import { relacionesApi } from '../api/relaciones'
import { csvApi } from '../api/csv'
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

  // ── ESTAR_EN: Usuario → Empresa (con cargo + fecha_inicio + actual) ───────
  const [estarEnForm, setEstarEnForm] = useState({ usuario_id: '', empresa_id: '', cargo: 'Software Engineer' })
  async function crearEstarEn() {
    try {
      const res = await relacionesApi.estarEn(
        estarEnForm.usuario_id,
        estarEnForm.empresa_id,
        estarEnForm.cargo,
        new Date().toISOString().slice(0, 10),
        true,
      )
      setOp('estar', res, null)
      showToast('Relación ESTAR_EN creada', 'ok')
    } catch (e) { setOp('estar', null, String(e)) }
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

  // ── 8. Eliminar múltiples nodos (bulk) ────────────────────────────────────
  const [bulkDelLabel, setBulkDelLabel] = useState('Empleo')
  const [bulkDelFilterField, setBulkDelFilterField] = useState('activo')
  const [bulkDelFilterValue, setBulkDelFilterValue] = useState('false')
  async function eliminarNodosBulk() {
    try {
      const filter = bulkDelFilterField
        ? { [bulkDelFilterField]: bulkDelFilterValue === 'true' ? true : bulkDelFilterValue === 'false' ? false : bulkDelFilterValue }
        : {}
      const res = await relacionesApi.bulkDeleteNodos({ label: bulkDelLabel, filter })
      setOp('del2', res, null)
      showToast('Nodos eliminados en bulk', 'ok')
    } catch (e) { setOp('del2', null, String(e)) }
  }

  // ── 9. Actualizar propiedad de 1 relación ─────────────────────────────────
  const [relPatchFromId, setRelPatchFromId] = useState('')
  const [relPatchToId, setRelPatchToId] = useState('')
  const [relPatchField, setRelPatchField] = useState('notificado')
  const [relPatchValue, setRelPatchValue] = useState('true')
  async function patchRelacion() {
    try {
      const res = await relacionesApi.patchRelacion({
        from: { label: 'Usuario', idField: 'userId', idValue: relPatchFromId },
        to: { label: 'Publicacion', idField: 'postId', idValue: relPatchToId },
        type: 'DIO_LIKE',
        set: { [relPatchField]: relPatchValue === 'true' ? true : relPatchValue === 'false' ? false : relPatchValue },
      })
      setOp('rpatch1', res, null)
      showToast('Propiedad de relación actualizada', 'ok')
    } catch (e) { setOp('rpatch1', null, String(e)) }
  }

  // ── 10. Eliminar propiedad de 1 relación ──────────────────────────────────
  const [relRemoveFromId, setRelRemoveFromId] = useState('')
  const [relRemoveToId, setRelRemoveToId] = useState('')
  const [relRemoveProp, setRelRemoveProp] = useState('notificado')
  async function removeRelProp() {
    try {
      const res = await relacionesApi.patchRelacion({
        from: { label: 'Usuario', idField: 'userId', idValue: relRemoveFromId },
        to: { label: 'Publicacion', idField: 'postId', idValue: relRemoveToId },
        type: 'DIO_LIKE',
        remove: [relRemoveProp],
      })
      setOp('rrem1', res, null)
      showToast('Propiedad de relación eliminada', 'ok')
    } catch (e) { setOp('rrem1', null, String(e)) }
  }

  // ── 11. Actualizar props de múltiples relaciones (bulk) ───────────────────
  const [relBulkPatchField, setRelBulkPatchField] = useState('notificado')
  const [relBulkPatchValue, setRelBulkPatchValue] = useState('true')
  async function bulkPatchRelaciones() {
    try {
      const res = await relacionesApi.bulkPatchRelacion({
        from_label: 'Usuario',
        to_label: 'Publicacion',
        type: 'DIO_LIKE',
        set: { [relBulkPatchField]: relBulkPatchValue === 'true' ? true : relBulkPatchValue === 'false' ? false : relBulkPatchValue },
      })
      setOp('rbulk', res, null)
      showToast('Bulk patch de relaciones completado', 'ok')
    } catch (e) { setOp('rbulk', null, String(e)) }
  }

  // ── 12. Eliminar 1 relación ────────────────────────────────────────────────
  const [relDelFromId, setRelDelFromId] = useState('')
  const [relDelToId, setRelDelToId] = useState('')
  async function eliminarRelacion() {
    try {
      const res = await relacionesApi.deleteRelacion({
        from_label: 'Usuario', from_id_field: 'userId', from_id_value: relDelFromId,
        to_label: 'Publicacion', to_id_field: 'postId', to_id_value: relDelToId,
        type: 'DIO_LIKE',
      })
      setOp('rdel1', res, null)
      showToast('Relación DIO_LIKE eliminada', 'ok')
    } catch (e) { setOp('rdel1', null, String(e)) }
  }

  // ── 13. Eliminar múltiples relaciones (bulk) ───────────────────────────────
  const [relBulkDelType, setRelBulkDelType] = useState('COMENTO')
  const [relBulkDelFilterField, setRelBulkDelFilterField] = useState('editado')
  const [relBulkDelFilterValue, setRelBulkDelFilterValue] = useState('false')
  async function eliminarRelacionesBulk() {
    try {
      const filter = relBulkDelFilterField
        ? { [relBulkDelFilterField]: relBulkDelFilterValue === 'true' ? true : relBulkDelFilterValue === 'false' ? false : relBulkDelFilterValue }
        : {}
      const res = await relacionesApi.bulkDeleteRelacion({
        from_label: 'Usuario',
        to_label: 'Publicacion',
        type: relBulkDelType,
        filter,
      })
      setOp('rdel2', res, null)
      showToast('Relaciones eliminadas en bulk', 'ok')
    } catch (e) { setOp('rdel2', null, String(e)) }
  }

  // ── 14. Eliminar props de relación bulk (REMOVE) ──────────────────────────
  async function bulkRemoveRelProp() {
    try {
      const res = await relacionesApi.bulkPatchRelacion({
        from_label: 'Usuario',
        to_label: 'Empresa',
        type: 'SIGUE_A',
        remove: ['motivo'],
      })
      setOp('rremb', res, null)
      showToast('Prop "motivo" eliminada de todas las relaciones SIGUE_A', 'ok')
    } catch (e) { setOp('rremb', null, String(e)) }
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

        <OpCard title="②b Crear nodo (2 labels) — :Usuario:Reclutador">
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

        <OpCard title="⑥b Crear relación ESTAR_EN — Usuario → Empresa (3 props)">
          <p className="text-mute" style={{ fontSize: 12, marginBottom: 8 }}>
            Crea (:Usuario)-[:ESTAR_EN {'{cargo, fecha_inicio, actual}'}]→(:Empresa)
          </p>
          <div className="form-grid">
            <input className="input" placeholder="usuario_id" value={estarEnForm.usuario_id}
              onChange={e => setEstarEnForm(f => ({ ...f, usuario_id: e.target.value }))} />
            <input className="input" placeholder="empresa_id" value={estarEnForm.empresa_id}
              onChange={e => setEstarEnForm(f => ({ ...f, empresa_id: e.target.value }))} />
            <input className="input" placeholder="cargo (ej: Software Engineer)" value={estarEnForm.cargo}
              onChange={e => setEstarEnForm(f => ({ ...f, cargo: e.target.value }))} />
          </div>
          <button className="btn-primary" onClick={crearEstarEn}>CREATE [:ESTAR_EN]</button>
          <ResultBox result={result['estar']?.res ?? null} error={result['estar']?.err ?? null} />
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

        <OpCard title="⑦ Eliminar nodo — simple">
          <div className="form-grid">
            <input className="input" placeholder="userId a eliminar" value={delId}
              onChange={e => setDelId(e.target.value)} />
          </div>
          <button className="btn-danger" onClick={eliminarSimple}>DETACH DELETE Usuario</button>
          <ResultBox result={result['del1']?.res ?? null} error={result['del1']?.err ?? null} />
        </OpCard>

        <OpCard title="⑧ Eliminar múltiples nodos — bulk DETACH DELETE">
          <p className="text-mute" style={{ fontSize: 12, marginBottom: 8 }}>
            Elimina todos los nodos de un label que cumplan un filtro
          </p>
          <div className="form-grid">
            <select className="input" value={bulkDelLabel} onChange={e => setBulkDelLabel(e.target.value)}>
              {['Empleo', 'Empresa', 'Usuario', 'Publicacion'].map(l => <option key={l} value={l}>{l}</option>)}
            </select>
            <input className="input" placeholder="Campo filtro (ej: activo)" value={bulkDelFilterField}
              onChange={e => setBulkDelFilterField(e.target.value)} />
            <input className="input" placeholder="Valor (ej: false)" value={bulkDelFilterValue}
              onChange={e => setBulkDelFilterValue(e.target.value)} />
          </div>
          <button className="btn-danger" onClick={eliminarNodosBulk}>
            MATCH (n:{bulkDelLabel} WHERE n.{bulkDelFilterField || '...'}) DETACH DELETE n
          </button>
          <ResultBox result={result['del2']?.res ?? null} error={result['del2']?.err ?? null} />
        </OpCard>

        <OpCard title="⑨ Actualizar propiedad de 1 relación — DIO_LIKE">
          <p className="text-mute" style={{ fontSize: 12, marginBottom: 8 }}>
            SET sobre relación DIO_LIKE entre Usuario y Publicacion
          </p>
          <div className="form-grid">
            <input className="input" placeholder="userId" value={relPatchFromId}
              onChange={e => setRelPatchFromId(e.target.value)} />
            <input className="input" placeholder="postId" value={relPatchToId}
              onChange={e => setRelPatchToId(e.target.value)} />
            <input className="input" placeholder="Campo (ej: notificado)" value={relPatchField}
              onChange={e => setRelPatchField(e.target.value)} />
            <input className="input" placeholder="Valor (ej: true)" value={relPatchValue}
              onChange={e => setRelPatchValue(e.target.value)} />
          </div>
          <button className="btn-primary" onClick={patchRelacion}>SET r.{relPatchField || 'campo'} = valor</button>
          <ResultBox result={result['rpatch1']?.res ?? null} error={result['rpatch1']?.err ?? null} />
        </OpCard>

        <OpCard title="⑩ Eliminar propiedad de 1 relación — DIO_LIKE">
          <p className="text-mute" style={{ fontSize: 12, marginBottom: 8 }}>
            REMOVE sobre relación DIO_LIKE entre Usuario y Publicacion
          </p>
          <div className="form-grid">
            <input className="input" placeholder="userId" value={relRemoveFromId}
              onChange={e => setRelRemoveFromId(e.target.value)} />
            <input className="input" placeholder="postId" value={relRemoveToId}
              onChange={e => setRelRemoveToId(e.target.value)} />
            <input className="input" placeholder="Propiedad a eliminar (ej: notificado)" value={relRemoveProp}
              onChange={e => setRelRemoveProp(e.target.value)} />
          </div>
          <button className="btn-danger" onClick={removeRelProp}>REMOVE r.{relRemoveProp || 'prop'}</button>
          <ResultBox result={result['rrem1']?.res ?? null} error={result['rrem1']?.err ?? null} />
        </OpCard>

        <OpCard title="⑪ Actualizar props de múltiples relaciones — DIO_LIKE bulk">
          <p className="text-mute" style={{ fontSize: 12, marginBottom: 8 }}>
            SET en todas las relaciones DIO_LIKE (Usuario → Publicacion)
          </p>
          <div className="form-grid">
            <input className="input" placeholder="Campo (ej: notificado)" value={relBulkPatchField}
              onChange={e => setRelBulkPatchField(e.target.value)} />
            <input className="input" placeholder="Valor (ej: true)" value={relBulkPatchValue}
              onChange={e => setRelBulkPatchValue(e.target.value)} />
          </div>
          <button className="btn-primary" onClick={bulkPatchRelaciones}>
            MATCH ()-[r:DIO_LIKE]-&gt;() SET r.{relBulkPatchField || 'campo'}
          </button>
          <ResultBox result={result['rbulk']?.res ?? null} error={result['rbulk']?.err ?? null} />
        </OpCard>

        <OpCard title="⑫ Eliminar 1 relación — DIO_LIKE">
          <p className="text-mute" style={{ fontSize: 12, marginBottom: 8 }}>
            DELETE relación DIO_LIKE entre un Usuario y una Publicacion específica
          </p>
          <div className="form-grid">
            <input className="input" placeholder="userId" value={relDelFromId}
              onChange={e => setRelDelFromId(e.target.value)} />
            <input className="input" placeholder="postId" value={relDelToId}
              onChange={e => setRelDelToId(e.target.value)} />
          </div>
          <button className="btn-danger" onClick={eliminarRelacion}>DELETE [:DIO_LIKE]</button>
          <ResultBox result={result['rdel1']?.res ?? null} error={result['rdel1']?.err ?? null} />
        </OpCard>

        <OpCard title="⑬ Eliminar múltiples relaciones — bulk DELETE">
          <p className="text-mute" style={{ fontSize: 12, marginBottom: 8 }}>
            DELETE todas las relaciones de un tipo con filtro opcional en sus props
          </p>
          <div className="form-grid">
            <select className="input" value={relBulkDelType} onChange={e => setRelBulkDelType(e.target.value)}>
              {['COMENTO', 'DIO_LIKE', 'COMPARTIO', 'SIGUE_A'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <input className="input" placeholder="Campo filtro (ej: editado)" value={relBulkDelFilterField}
              onChange={e => setRelBulkDelFilterField(e.target.value)} />
            <input className="input" placeholder="Valor (ej: false)" value={relBulkDelFilterValue}
              onChange={e => setRelBulkDelFilterValue(e.target.value)} />
          </div>
          <p className="text-mute" style={{ fontSize: 11 }}>
            Nota: COMENTO y DIO_LIKE/COMPARTIO van de Usuario→Publicacion; SIGUE_A va de Usuario→Empresa
          </p>
          <button className="btn-danger" onClick={eliminarRelacionesBulk}>
            MATCH ()-[r:{relBulkDelType}]-&gt;() {relBulkDelFilterField ? `WHERE r.${relBulkDelFilterField}` : ''} DELETE r
          </button>
          <ResultBox result={result['rdel2']?.res ?? null} error={result['rdel2']?.err ?? null} />
        </OpCard>

        <OpCard title="⑭ Eliminar props de múltiples relaciones — SIGUE_A bulk REMOVE">
          <p className="text-mute" style={{ fontSize: 12, marginBottom: 8 }}>
            REMOVE prop "motivo" de todas las relaciones SIGUE_A (Usuario → Empresa)
          </p>
          <button className="btn-danger" onClick={bulkRemoveRelProp}>
            MATCH ()-[r:SIGUE_A]-&gt;() REMOVE r.motivo
          </button>
          <ResultBox result={result['rremb']?.res ?? null} error={result['rremb']?.err ?? null} />
        </OpCard>
      </div>
    </div>
  )
}
