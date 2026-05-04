import { useEffect, useState } from 'react'
import { useStore } from '../store/StoreContext'
import { empleosApi } from '../api/empleos'
import { relacionesApi } from '../api/relaciones'
import { extractNodes, nodeId, fmtDate } from '../lib/format'
import type { Empleo } from '../types/api'
import { BriefcaseIcon, PlusIcon } from '../lib/icons'

const MODALIDADES = ['remoto', 'presencial', 'híbrido']

export default function EmpleosPage() {
  const { me, role, showToast } = useStore()
  const [empleos, setEmpleos] = useState<Empleo[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    titulo: '', salario_min: '', salario_max: '', modalidad: 'remoto',
  })

  const myId = me ? (me.props.userId ?? me.props.usuario_id ?? '') : ''

  async function load() {
    setLoading(true)
    try {
      const res = await empleosApi.list({ limit: '50' })
      setEmpleos(extractNodes(res) as Empleo[])
    } catch {
      showToast('Error al cargar empleos', 'err')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handlePostular(e: Empleo) {
    if (!myId) return
    const eid = nodeId(e.props)
    try {
      await relacionesApi.postular(myId, eid)
      showToast('¡Postulación enviada!', 'ok')
    } catch (err) {
      showToast(`Error: ${err instanceof Error ? err.message : err}`, 'err')
    }
  }

  async function handleCrear() {
    if (!form.titulo) return
    try {
      await empleosApi.create({
        titulo: form.titulo,
        salario_min: parseFloat(form.salario_min) || 0,
        salario_max: parseFloat(form.salario_max) || 0,
        modalidad: form.modalidad,
        activo: true,
      })
      showToast('Empleo creado', 'ok')
      setShowForm(false)
      setForm({ titulo: '', salario_min: '', salario_max: '', modalidad: 'remoto' })
      load()
    } catch (err) {
      showToast(`Error: ${err instanceof Error ? err.message : err}`, 'err')
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <BriefcaseIcon size={20} />
        <h2>Empleos</h2>
        {(role === 'Reclutador' || role === 'Admin') && (
          <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
            <PlusIcon size={14} /> Crear empleo
          </button>
        )}
      </div>

      {showForm && (
        <div className="card form-card">
          <h3>Nueva vacante</h3>
          <div className="form-grid">
            <input className="input" placeholder="Título del puesto" value={form.titulo}
              onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} />
            <select className="input" value={form.modalidad}
              onChange={e => setForm(f => ({ ...f, modalidad: e.target.value }))}>
              {MODALIDADES.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <input className="input" placeholder="Salario mínimo" type="number" value={form.salario_min}
              onChange={e => setForm(f => ({ ...f, salario_min: e.target.value }))} />
            <input className="input" placeholder="Salario máximo" type="number" value={form.salario_max}
              onChange={e => setForm(f => ({ ...f, salario_max: e.target.value }))} />
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn-ghost" onClick={() => setShowForm(false)}>Cancelar</button>
            <button className="btn-primary" onClick={handleCrear}>Crear</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="loading">Cargando empleos…</div>
      ) : (
        <div className="list-cards">
          {empleos.map(e => {
            const eid = nodeId(e.props)
            return (
              <div key={eid || e.elementId} className="card empleo-card">
                <div className="empleo-header">
                  <div>
                    <div className="empleo-title">{e.props.titulo}</div>
                    <div className="empleo-meta">
                      <span className={`badge-modalidad ${e.props.modalidad}`}>{e.props.modalidad}</span>
                      {e.props.activo ? <span className="badge-activo">Activo</span> : <span className="badge-inactivo">Cerrado</span>}
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
                  <button className="btn-primary" onClick={() => handlePostular(e)}>
                    Postularme
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
