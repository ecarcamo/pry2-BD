import { useEffect, useState } from 'react'
import { useStore } from '../store/StoreContext'
import { empleosApi } from '../api/empleos'
import { empresasApi } from '../api/empresas'
import { relacionesApi } from '../api/relaciones'
import { extractNodes, nodeId, fmtDate } from '../lib/format'
import type { Empleo, Empresa } from '../types/api'
import { BriefcaseIcon, PlusIcon } from '../lib/icons'

const MODALIDADES = ['remoto', 'presencial', 'híbrido']

export default function EmpleosPage() {
  const { me, role, showToast } = useStore()
  const [empleos, setEmpleos] = useState<Empleo[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [applied, setApplied] = useState<Set<string>>(new Set())
  const [form, setForm] = useState({
    titulo: '', salario_min: '', salario_max: '', modalidad: 'remoto',
    descripcion: '', ubicacion: '', empresaId: '',
  })
  const [empresas, setEmpresas] = useState<Empresa[]>([])

  // filtro
  const [filtroModal, setFiltroModal] = useState('')
  const [filtroMin, setFiltroMin] = useState('')

  // retirar postulaciones pendientes (bulk delete relaciones)
  const [retirando, setRetirando] = useState(false)

  // archivar empleos cerrados (bulk delete nodos)
  const [archivando, setArchivando] = useState(false)

  const myId = me ? (me.props.userId ?? me.props.usuario_id ?? '') : ''
  const isReclutador = role === 'Reclutador' || role === 'Admin'

  async function load() {
    setLoading(true)
    try {
      const params: Record<string, string> = { limit: '50' }
      if (filtroModal) params.modalidad = filtroModal
      if (filtroMin) params.salarioMin = filtroMin
      const res = await empleosApi.list(params)
      setEmpleos(extractNodes(res) as Empleo[])
    } catch {
      showToast('Error al cargar empleos', 'err')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [filtroModal, filtroMin])

  useEffect(() => {
    if (myId)
      relacionesApi.misRelaciones(myId, 'POSTULO_A', 'empleo_id')
        .then(r => setApplied(new Set(r.ids)))
        .catch(() => {})
  }, [myId])

  useEffect(() => {
    if (isReclutador)
      empresasApi.list({ limit: '200' }).then(res => setEmpresas(extractNodes(res) as Empresa[])).catch(() => {})
  }, [isReclutador])

  async function handlePostular(e: Empleo) {
    if (!myId) return
    const eid = nodeId(e.props)
    try {
      await relacionesApi.postular(myId, eid)
      setApplied(a => new Set(a).add(eid))
      showToast('¡Postulación enviada!', 'ok')
    } catch (err) {
      showToast(`Error: ${err instanceof Error ? err.message : err}`, 'err')
    }
  }

  async function handleCrear() {
    if (!form.titulo) { showToast('El título es obligatorio', 'err'); return }
    if (!form.empresaId) { showToast('Debes seleccionar una empresa', 'err'); return }
    try {
      await empleosApi.create({
        empresaId: form.empresaId,
        titulo: form.titulo,
        salario_min: parseFloat(form.salario_min) || 0,
        salario_max: parseFloat(form.salario_max) || 0,
        modalidad: form.modalidad,
        activo: true,
        fecha_publicacion: new Date().toISOString().slice(0, 10),
      })
      showToast('Vacante publicada', 'ok')
      setShowForm(false)
      setForm({ titulo: '', salario_min: '', salario_max: '', modalidad: 'remoto', descripcion: '', ubicacion: '', empresaId: '' })
      load()
    } catch (err) {
      showToast(`Error: ${err instanceof Error ? err.message : err}`, 'err')
    }
  }

  async function handleRetirarPostulaciones() {
    if (!myId) return
    setRetirando(true)
    try {
      const res = await relacionesApi.bulkDeleteRelacion({
        from_label: 'Usuario',
        to_label: 'Empleo',
        type: 'POSTULO_A',
        filter: { estado: 'pendiente' },
      })
      const n = (res as { stats: { relsDeleted?: number } }).stats?.relsDeleted ?? 0
      showToast(`${n} postulación(es) pendiente(s) retirada(s)`, 'ok')
      setApplied(new Set())
    } catch (err) {
      showToast(`Error: ${err instanceof Error ? err.message : err}`, 'err')
    } finally {
      setRetirando(false)
    }
  }

  async function handleArchivarCerrados() {
    setArchivando(true)
    try {
      const res = await relacionesApi.bulkDeleteNodos({ label: 'Empleo', filter: { activo: false } })
      const n = (res as { stats: { nodesDeleted?: number } }).stats?.nodesDeleted ?? 0
      showToast(`${n} empleo(s) cerrado(s) eliminado(s)`, 'ok')
      load()
    } catch (err) {
      showToast(`Error: ${err instanceof Error ? err.message : err}`, 'err')
    } finally {
      setArchivando(false)
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <BriefcaseIcon size={20} />
        <h2>Empleos</h2>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          {!isReclutador && myId && (
            <button className="btn-ghost" style={{ fontSize: 13 }}
              onClick={handleRetirarPostulaciones} disabled={retirando}>
              {retirando ? 'Retirando…' : 'Retirar postulaciones pendientes'}
            </button>
          )}
          {role === 'Admin' && (
            <button className="btn-ghost" style={{ fontSize: 13, color: 'var(--err)' }}
              onClick={handleArchivarCerrados} disabled={archivando}>
              {archivando ? 'Archivando…' : 'Eliminar empleos cerrados'}
            </button>
          )}
          {isReclutador && (
            <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
              <PlusIcon size={14} /> Publicar vacante
            </button>
          )}
        </div>
      </div>

      {/* Formulario nueva vacante */}
      {showForm && isReclutador && (
        <div className="card form-card">
          <h3>Nueva vacante</h3>
          <div className="form-grid">
            <input className="input" placeholder="Título del puesto *" value={form.titulo}
              onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} />
            <select className="input" value={form.modalidad}
              onChange={e => setForm(f => ({ ...f, modalidad: e.target.value }))}>
              {MODALIDADES.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <select className="input" style={{ gridColumn: '1 / -1' }} value={form.empresaId}
              onChange={e => setForm(f => ({ ...f, empresaId: e.target.value }))}>
              <option value="">Seleccionar empresa *</option>
              {empresas.map(emp => {
                const id = nodeId(emp.props)
                return <option key={id} value={id}>{emp.props.nombre}</option>
              })}
            </select>
            <input className="input" placeholder="Salario mínimo (USD)" type="number" value={form.salario_min}
              onChange={e => setForm(f => ({ ...f, salario_min: e.target.value }))} />
            <input className="input" placeholder="Salario máximo (USD)" type="number" value={form.salario_max}
              onChange={e => setForm(f => ({ ...f, salario_max: e.target.value }))} />
          </div>
          <p className="text-mute" style={{ fontSize: 12, marginTop: 4 }}>
            Crea nodo <code>:Empleo</code> con 6 props: titulo, salario_min, salario_max, modalidad, activo, fecha_publicacion
          </p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn-ghost" onClick={() => setShowForm(false)}>Cancelar</button>
            <button className="btn-primary" onClick={handleCrear}>Publicar</button>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="card" style={{ padding: '12px 16px', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <span className="text-mute" style={{ fontSize: 13 }}>Filtrar:</span>
        <select className="input" style={{ width: 'auto' }}
          value={filtroModal} onChange={e => setFiltroModal(e.target.value)}>
          <option value="">Modalidad</option>
          {MODALIDADES.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <input className="input" style={{ width: 160 }} placeholder="Salario mín." type="number"
          value={filtroMin} onChange={e => setFiltroMin(e.target.value)} />
        {(filtroModal || filtroMin) && (
          <button className="btn-ghost" style={{ fontSize: 13 }}
            onClick={() => { setFiltroModal(''); setFiltroMin('') }}>
            Limpiar
          </button>
        )}
      </div>

      {loading ? (
        <div className="loading">Cargando empleos…</div>
      ) : empleos.length === 0 ? (
        <div className="empty">No hay empleos con esos filtros.</div>
      ) : (
        <div className="list-cards">
          {empleos.map(e => {
            const eid = nodeId(e.props)
            const yaAplique = applied.has(eid)
            return (
              <div key={eid || e.elementId} className="card empleo-card">
                <div className="empleo-header">
                  <div>
                    <div className="empleo-title">{e.props.titulo}</div>
                    <div className="empleo-meta">
                      <span className={`badge-modalidad ${e.props.modalidad}`}>{e.props.modalidad}</span>
                      {e.props.activo
                        ? <span className="badge-activo">Activo</span>
                        : <span className="badge-inactivo">Cerrado</span>}
                    </div>
                  </div>
                  <div className="empleo-salary">
                    {e.props.salario_min != null && e.props.salario_max != null
                      ? `$${e.props.salario_min.toLocaleString()} – $${e.props.salario_max.toLocaleString()}`
                      : ''}
                  </div>
                </div>
                <div className="empleo-footer">
                  <span className="empleo-fecha">{fmtDate(e.props.fecha_publicacion)}</span>
                  {!isReclutador && (
                    yaAplique ? (
                      <button className="btn-connected" disabled>✓ Postulado</button>
                    ) : (
                      <button className="btn-primary" onClick={() => handlePostular(e)}>
                        Postularme
                      </button>
                    )
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
