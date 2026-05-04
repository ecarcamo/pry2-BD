import { useEffect, useState } from 'react'
import { useStore } from '../store/StoreContext'
import { empresasApi } from '../api/empresas'
import { relacionesApi } from '../api/relaciones'
import { extractNodes, nodeId } from '../lib/format'
import type { Empresa } from '../types/api'
import { BuildingIcon, PlusIcon, EditIcon } from '../lib/icons'

export default function EmpresasPage() {
  const { me, role, showToast } = useStore()
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [followed, setFollowed] = useState<Set<string>>(new Set())
  const [form, setForm] = useState({
    nombre: '', industria: '', pais: 'Guatemala', empleados_count: '',
  })

  // bulk update state (Admin)
  const [showBulk, setShowBulk] = useState(false)
  const [bulkDesde, setBulkDesde] = useState('')
  const [bulkHacia, setBulkHacia] = useState('')

  // edit empresa state
  const [editId, setEditId] = useState<string | null>(null)
  const [editField, setEditField] = useState('nombre')
  const [editValue, setEditValue] = useState('')

  const myId = me ? (me.props.userId ?? me.props.usuario_id ?? '') : ''

  async function load() {
    setLoading(true)
    try {
      const res = await empresasApi.list({ limit: '50' })
      setEmpresas(extractNodes(res) as Empresa[])
    } catch {
      showToast('Error al cargar empresas', 'err')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleSeguir(e: Empresa) {
    if (!myId) return
    const eid = nodeId(e.props)
    try {
      await relacionesApi.seguir(myId, eid)
      setFollowed(f => new Set(f).add(eid))
      showToast(`Siguiendo a ${e.props.nombre}`, 'ok')
    } catch (err) {
      showToast(`Error: ${err instanceof Error ? err.message : err}`, 'err')
    }
  }

  async function handleCrear() {
    if (!form.nombre || !form.industria) {
      showToast('Nombre e industria son obligatorios', 'err')
      return
    }
    try {
      await empresasApi.create({
        nombre: form.nombre,
        industria: form.industria,
        pais: form.pais,
        empleados_count: parseInt(form.empleados_count) || 0,
        verificada: false,
      })
      showToast('Empresa creada', 'ok')
      setShowForm(false)
      setForm({ nombre: '', industria: '', pais: 'Guatemala', empleados_count: '' })
      load()
    } catch (err) {
      showToast(`Error: ${err instanceof Error ? err.message : err}`, 'err')
    }
  }

  async function handleBulkUpdate() {
    if (!bulkDesde.trim() || !bulkHacia.trim()) return
    try {
      const res = await empresasApi.bulkUpdate({ industria: bulkDesde }, { industria: bulkHacia })
      const n = res.stats.propsSet ?? 0
      showToast(`Industria actualizada en ${n} empresa(s)`, 'ok')
      setBulkDesde(''); setBulkHacia('')
      setShowBulk(false)
      load()
    } catch (err) {
      showToast(`Error: ${err instanceof Error ? err.message : err}`, 'err')
    }
  }

  async function handleEditEmpresa(e: Empresa) {
    const eid = nodeId(e.props)
    try {
      await empresasApi.update(eid, { [editField]: editValue })
      showToast(`${editField} actualizado`, 'ok')
      setEditId(null)
      load()
    } catch (err) {
      showToast(`Error: ${err instanceof Error ? err.message : err}`, 'err')
    }
  }

  const isAdmin = role === 'Admin'
  const isReclutador = role === 'Reclutador'

  return (
    <div className="page">
      <div className="page-header">
        <BuildingIcon size={20} />
        <h2>Empresas</h2>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          {isAdmin && (
            <>
              <button className="btn-ghost" onClick={() => setShowBulk(!showBulk)}>
                <EditIcon size={14} /> Actualizar industria en bloque
              </button>
              <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
                <PlusIcon size={14} /> Nueva empresa
              </button>
            </>
          )}
          {isReclutador && (
            <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
              <PlusIcon size={14} /> Nueva empresa
            </button>
          )}
        </div>
      </div>

      {/* Crear empresa */}
      {showForm && (
        <div className="card form-card">
          <h3>Nueva empresa</h3>
          <div className="form-grid">
            <input className="input" placeholder="Nombre" value={form.nombre}
              onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} />
            <input className="input" placeholder="Industria" value={form.industria}
              onChange={e => setForm(f => ({ ...f, industria: e.target.value }))} />
            <input className="input" placeholder="País" value={form.pais}
              onChange={e => setForm(f => ({ ...f, pais: e.target.value }))} />
            <input className="input" placeholder="Empleados" type="number" value={form.empleados_count}
              onChange={e => setForm(f => ({ ...f, empleados_count: e.target.value }))} />
          </div>
          <p className="text-mute" style={{ fontSize: 12 }}>
            Crea nodo <code>:Empresa</code> con 1 label y 6 propiedades (nombre, industria, pais, empleados_count, verificada, fecha_fundacion)
          </p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn-ghost" onClick={() => setShowForm(false)}>Cancelar</button>
            <button className="btn-primary" onClick={handleCrear}>Crear empresa</button>
          </div>
        </div>
      )}

      {/* Bulk update industria (Admin) */}
      {showBulk && isAdmin && (
        <div className="card form-card">
          <h3>Actualizar industria en bloque</h3>
          <p className="text-mute" style={{ fontSize: 13 }}>
            Actualiza la propiedad <code>industria</code> de <strong>todas</strong> las empresas que tengan un valor dado.
          </p>
          <div className="form-grid">
            <input className="input" placeholder="Industria actual (ej: Tecnología)"
              value={bulkDesde} onChange={e => setBulkDesde(e.target.value)} />
            <input className="input" placeholder="Nuevo valor (ej: Tech & IA)"
              value={bulkHacia} onChange={e => setBulkHacia(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
            <button className="btn-ghost" onClick={() => setShowBulk(false)}>Cancelar</button>
            <button className="btn-primary" onClick={handleBulkUpdate}>Aplicar a todas</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="loading">Cargando empresas…</div>
      ) : (
        <div className="grid-2">
          {empresas.map(e => {
            const eid = nodeId(e.props)
            const isEditing = editId === eid
            return (
              <div key={eid || e.elementId} className="card empresa-card">
                <div className="empresa-icon">
                  {e.props.nombre?.charAt(0).toUpperCase() ?? 'E'}
                </div>
                <div className="empresa-info">
                  <div className="empresa-name">
                    {e.props.nombre}
                    {e.props.verificada && <span className="badge-verificada">✓</span>}
                  </div>
                  <div className="empresa-meta">{e.props.industria} · {e.props.pais}</div>
                  <div className="empresa-employees">{e.props.empleados_count?.toLocaleString()} empleados</div>

                  {/* Edición inline de 1 propiedad (Admin) */}
                  {isAdmin && isEditing && (
                    <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <select className="input" style={{ flex: '0 0 auto', width: 130 }}
                        value={editField} onChange={ev => setEditField(ev.target.value)}>
                        {['nombre', 'industria', 'pais', 'empleados_count'].map(f =>
                          <option key={f} value={f}>{f}</option>)}
                      </select>
                      <input className="input" style={{ flex: 1, minWidth: 100 }}
                        placeholder="Nuevo valor" value={editValue}
                        onChange={ev => setEditValue(ev.target.value)} />
                      <button className="btn-primary" onClick={() => handleEditEmpresa(e)}>Guardar</button>
                      <button className="btn-ghost" onClick={() => setEditId(null)}>✕</button>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                  {followed.has(eid) ? (
                    <button className="btn-connected" disabled>✓ Siguiendo</button>
                  ) : (
                    <button className="btn-secondary" onClick={() => handleSeguir(e)}>Seguir</button>
                  )}
                  {isAdmin && !isEditing && (
                    <button className="btn-ghost" style={{ fontSize: 12 }}
                      onClick={() => { setEditId(eid); setEditField('nombre'); setEditValue(e.props.nombre) }}>
                      <EditIcon size={12} /> Editar
                    </button>
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
