import { useState } from 'react'
import { useStore } from '../store/StoreContext'
import { usuariosApi } from '../api/usuarios'
import { educacionApi } from '../api/educacion'
import { experienciaApi } from '../api/experiencia'
import { relacionesApi } from '../api/relaciones'
import { extractNodes, initials, nodeId } from '../lib/format'
import type { Educacion, ExperienciaLaboral } from '../types/api'
import { UserIcon, PlusIcon, EditIcon } from '../lib/icons'

export default function PerfilPage() {
  const { me, role, showToast } = useStore()
  const [editField, setEditField] = useState<string | null>(null)
  const [fieldValue, setFieldValue] = useState('')

  // educación
  const [showEduForm, setShowEduForm] = useState(false)
  const [eduForm, setEduForm] = useState({ institucion: '', carrera: '', grado: 'Licenciatura', pais: 'Guatemala' })
  const [newEduId, setNewEduId] = useState('')

  // experiencia
  const [showExpForm, setShowExpForm] = useState(false)
  const [expForm, setExpForm] = useState({ cargo: '', salario: '', descripcion: '' })
  const [newExpId, setNewExpId] = useState('')

  // ascender a Admin (crear nodo :Usuario:Admin)
  const [showAdminForm, setShowAdminForm] = useState(false)
  const [adminForm, setAdminForm] = useState({ nombre: '', email: '', nivel_acceso: 'moderador' })
  const [adminCreado, setAdminCreado] = useState(false)

  // eliminar cuenta
  const [confirmarEliminar, setConfirmarEliminar] = useState(false)

  const myId = me ? (me.props.userId ?? me.props.usuario_id ?? '') : ''
  const isAdmin = role === 'Admin'

  const EDITABLE = [
    { key: 'titular', label: 'Cargo actual' },
    { key: 'email', label: 'Email' },
    { key: 'abierto_a_trabajo', label: 'Abierto a trabajo' },
  ]

  async function handleSaveField() {
    if (!editField || !myId) return
    let val: string | boolean = fieldValue
    if (editField === 'abierto_a_trabajo') val = fieldValue === 'true'
    try {
      await usuariosApi.update(myId, { [editField]: val })
      showToast(`${editField} actualizado`, 'ok')
      setEditField(null)
    } catch (e) {
      showToast(`Error: ${e instanceof Error ? e.message : e}`, 'err')
    }
  }

  async function handleCrearEducacion() {
    try {
      const res = await educacionApi.create({ ...eduForm, acreditada: true })
      const nodes = extractNodes(res) as Educacion[]
      const edu = nodes[0]
      if (edu && myId) {
        const eduId = nodeId(edu.props)
        setNewEduId(eduId)
        await relacionesApi.estudiar(myId, eduId, new Date().toISOString().slice(0, 10))
      }
      showToast('Educación agregada y vinculada', 'ok')
      setShowEduForm(false)
      setEduForm({ institucion: '', carrera: '', grado: 'Licenciatura', pais: 'Guatemala' })
    } catch (e) {
      showToast(`Error: ${e instanceof Error ? e.message : e}`, 'err')
    }
  }

  async function handleCrearExperiencia() {
    try {
      const res = await experienciaApi.create({
        cargo: expForm.cargo,
        salario: parseFloat(expForm.salario) || 0,
        descripcion: expForm.descripcion,
        activo: true,
      })
      const nodes = extractNodes(res) as ExperienciaLaboral[]
      const exp = nodes[0]
      if (exp && myId) {
        const expId = nodeId(exp.props)
        setNewExpId(expId)
        await relacionesApi.trabajoEn(myId, expId, new Date().toISOString().slice(0, 10))
      }
      showToast('Experiencia agregada y vinculada', 'ok')
      setShowExpForm(false)
      setExpForm({ cargo: '', salario: '', descripcion: '' })
    } catch (e) {
      showToast(`Error: ${e instanceof Error ? e.message : e}`, 'err')
    }
  }

  async function handleCrearAdmin() {
    if (!adminForm.nombre || !adminForm.email) {
      showToast('Nombre y email son obligatorios', 'err'); return
    }
    try {
      await usuariosApi.createAdmin({
        nombre: adminForm.nombre,
        email: adminForm.email,
        nivel_acceso: adminForm.nivel_acceso,
        titular: 'Administrador',
        habilidades: [],
      })
      setAdminCreado(true)
      showToast('Usuario Admin creado con labels :Usuario:Admin', 'ok')
      setShowAdminForm(false)
      setAdminForm({ nombre: '', email: '', nivel_acceso: 'moderador' })
    } catch (e) {
      showToast(`Error: ${e instanceof Error ? e.message : e}`, 'err')
    }
  }

  async function handleEliminarCuenta() {
    if (!myId) return
    try {
      await usuariosApi.delete(myId)
      showToast('Cuenta eliminada (DETACH DELETE)', 'ok')
      setConfirmarEliminar(false)
    } catch (e) {
      showToast(`Error: ${e instanceof Error ? e.message : e}`, 'err')
    }
  }

  if (!me) return <div className="loading">Cargando perfil…</div>

  const p = me.props

  return (
    <div className="page perfil-page">
      {/* Header */}
      <div className="card perfil-header-card">
        <div className="perfil-avatar">{initials(p.nombre)}</div>
        <div className="perfil-info">
          <h2>{p.nombre}</h2>
          <p>{p.titular}</p>
          <p className="text-mute">{p.email}</p>
          {me.labels.includes('Admin') && (
            <span className="badge-admin">Admin · {p.nivel_acceso}</span>
          )}
          <div className="perfil-meta">
            <span>{p.conexiones_count ?? 0} conexiones</span>
            {p.abierto_a_trabajo && <span className="badge-open">Abierto a trabajo</span>}
          </div>
        </div>
      </div>

      {/* Información editable */}
      <div className="card">
        <div className="section-header">
          <h3>Información</h3>
        </div>
        {EDITABLE.map(({ key, label }) => (
          <div key={key} className="field-row">
            <span className="field-label">{label}</span>
            {editField === key ? (
              <div style={{ display: 'flex', gap: 8, flex: 1 }}>
                {key === 'abierto_a_trabajo' ? (
                  <select className="input" value={fieldValue}
                    onChange={e => setFieldValue(e.target.value)}>
                    <option value="true">Sí</option>
                    <option value="false">No</option>
                  </select>
                ) : (
                  <input className="input" value={fieldValue}
                    onChange={e => setFieldValue(e.target.value)} />
                )}
                <button className="btn-primary" onClick={handleSaveField}>Guardar</button>
                <button className="btn-ghost" onClick={() => setEditField(null)}>Cancelar</button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                <span>
                  {key === 'abierto_a_trabajo'
                    ? (p.abierto_a_trabajo ? 'Sí' : 'No')
                    : ((p as Record<string, unknown>)[key] as string ?? '—')}
                </span>
                <button className="btn-icon" onClick={() => {
                  setEditField(key)
                  const v = (p as Record<string, unknown>)[key]
                  setFieldValue(v === true ? 'true' : v === false ? 'false' : (v as string ?? ''))
                }}>
                  <EditIcon size={14} />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Habilidades */}
      {p.habilidades && p.habilidades.length > 0 && (
        <div className="card">
          <h3>Habilidades</h3>
          <div className="skills-list">
            {p.habilidades.map(h => <span key={h} className="tag">{h}</span>)}
          </div>
        </div>
      )}

      {/* Educación */}
      <div className="card">
        <div className="section-header">
          <h3>Educación</h3>
          <button className="btn-ghost" onClick={() => setShowEduForm(!showEduForm)}>
            <PlusIcon size={14} /> Agregar
          </button>
        </div>
        {showEduForm && (
          <div className="form-card sub-form">
            <input className="input" placeholder="Institución" value={eduForm.institucion}
              onChange={e => setEduForm(f => ({ ...f, institucion: e.target.value }))} />
            <input className="input" placeholder="Carrera" value={eduForm.carrera}
              onChange={e => setEduForm(f => ({ ...f, carrera: e.target.value }))} />
            <select className="input" value={eduForm.grado}
              onChange={e => setEduForm(f => ({ ...f, grado: e.target.value }))}>
              {['Técnico', 'Licenciatura', 'Ingeniería', 'Maestría', 'Doctorado'].map(g =>
                <option key={g} value={g}>{g}</option>)}
            </select>
            <input className="input" placeholder="País" value={eduForm.pais}
              onChange={e => setEduForm(f => ({ ...f, pais: e.target.value }))} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-primary" onClick={handleCrearEducacion}>Guardar</button>
              <button className="btn-ghost" onClick={() => setShowEduForm(false)}>Cancelar</button>
            </div>
          </div>
        )}
        {newEduId && (
          <div className="text-mute" style={{ marginTop: 8, fontSize: 12 }}>
            ✓ Educación vinculada · ID: {newEduId}
          </div>
        )}
      </div>

      {/* Experiencia */}
      <div className="card">
        <div className="section-header">
          <h3>Experiencia laboral</h3>
          <button className="btn-ghost" onClick={() => setShowExpForm(!showExpForm)}>
            <PlusIcon size={14} /> Agregar
          </button>
        </div>
        {showExpForm && (
          <div className="form-card sub-form">
            <input className="input" placeholder="Cargo" value={expForm.cargo}
              onChange={e => setExpForm(f => ({ ...f, cargo: e.target.value }))} />
            <input className="input" placeholder="Salario (USD)" type="number" value={expForm.salario}
              onChange={e => setExpForm(f => ({ ...f, salario: e.target.value }))} />
            <input className="input" placeholder="Descripción del rol" value={expForm.descripcion}
              onChange={e => setExpForm(f => ({ ...f, descripcion: e.target.value }))} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-primary" onClick={handleCrearExperiencia}>Guardar</button>
              <button className="btn-ghost" onClick={() => setShowExpForm(false)}>Cancelar</button>
            </div>
          </div>
        )}
        {newExpId && (
          <div className="text-mute" style={{ marginTop: 8, fontSize: 12 }}>
            ✓ Experiencia vinculada · ID: {newExpId}
          </div>
        )}
      </div>

      {/* Crear usuario Admin (solo visible en modo Admin) */}
      {isAdmin && (
        <div className="card">
          <div className="section-header">
            <h3>Gestión de administradores</h3>
            <button className="btn-ghost" onClick={() => setShowAdminForm(!showAdminForm)}>
              <PlusIcon size={14} /> Nuevo Admin
            </button>
          </div>
          <p className="text-mute" style={{ fontSize: 13 }}>
            Crea un nodo con 2 labels: <code>:Usuario:Admin</code>
          </p>
          {showAdminForm && (
            <div className="form-card sub-form">
              <input className="input" placeholder="Nombre completo" value={adminForm.nombre}
                onChange={e => setAdminForm(f => ({ ...f, nombre: e.target.value }))} />
              <input className="input" placeholder="Email" value={adminForm.email}
                onChange={e => setAdminForm(f => ({ ...f, email: e.target.value }))} />
              <select className="input" value={adminForm.nivel_acceso}
                onChange={e => setAdminForm(f => ({ ...f, nivel_acceso: e.target.value }))}>
                {['moderador', 'admin', 'superadmin', 'editor'].map(n =>
                  <option key={n} value={n}>{n}</option>)}
              </select>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn-primary" onClick={handleCrearAdmin}>
                  Crear :Usuario:Admin
                </button>
                <button className="btn-ghost" onClick={() => setShowAdminForm(false)}>Cancelar</button>
              </div>
            </div>
          )}
          {adminCreado && (
            <div className="text-mute" style={{ fontSize: 12, marginTop: 8, color: 'var(--ok)' }}>
              ✓ Admin creado con labels :Usuario:Admin
            </div>
          )}
        </div>
      )}

      {/* Zona peligrosa */}
      <div className="card" style={{ borderColor: 'var(--err)', opacity: 0.85 }}>
        <div className="section-header">
          <h3 style={{ color: 'var(--err)' }}>Zona peligrosa</h3>
        </div>
        <p className="text-mute" style={{ fontSize: 13 }}>
          Elimina tu cuenta y todas sus relaciones del grafo (DETACH DELETE).
        </p>
        {!confirmarEliminar ? (
          <button className="btn-danger" onClick={() => setConfirmarEliminar(true)}>
            Eliminar mi cuenta
          </button>
        ) : (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <span className="text-mute" style={{ fontSize: 13 }}>¿Confirmas? Esta acción no se puede deshacer.</span>
            <button className="btn-danger" onClick={handleEliminarCuenta}>Sí, eliminar</button>
            <button className="btn-ghost" onClick={() => setConfirmarEliminar(false)}>Cancelar</button>
          </div>
        )}
      </div>
    </div>
  )
}
