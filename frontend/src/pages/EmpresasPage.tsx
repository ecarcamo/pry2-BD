import { useEffect, useState } from 'react'
import { useStore } from '../store/StoreContext'
import { empresasApi } from '../api/empresas'
import { relacionesApi } from '../api/relaciones'
import { extractNodes, nodeId } from '../lib/format'
import type { Empresa } from '../types/api'
import { BuildingIcon, PlusIcon } from '../lib/icons'

export default function EmpresasPage() {
  const { me, role, showToast } = useStore()
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    nombre: '', industria: '', pais: 'Guatemala', empleados_count: '',
  })

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
      showToast(`Siguiendo a ${e.props.nombre}`, 'ok')
    } catch (err) {
      showToast(`Error: ${err instanceof Error ? err.message : err}`, 'err')
    }
  }

  async function handleCrear() {
    if (!form.nombre) return
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

  return (
    <div className="page">
      <div className="page-header">
        <BuildingIcon size={20} />
        <h2>Empresas</h2>
        {role === 'Admin' && (
          <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
            <PlusIcon size={14} /> Crear empresa
          </button>
        )}
      </div>

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
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn-ghost" onClick={() => setShowForm(false)}>Cancelar</button>
            <button className="btn-primary" onClick={handleCrear}>Crear</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="loading">Cargando empresas…</div>
      ) : (
        <div className="grid-2">
          {empresas.map(e => {
            const eid = nodeId(e.props)
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
                </div>
                <button className="btn-secondary" onClick={() => handleSeguir(e)}>
                  Seguir
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
