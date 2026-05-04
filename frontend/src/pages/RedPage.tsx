import { useEffect, useState } from 'react'
import { useStore } from '../store/StoreContext'
import { usuariosApi } from '../api/usuarios'
import { relacionesApi } from '../api/relaciones'
import { extractNodes, initials, nodeId } from '../lib/format'
import type { Usuario } from '../types/api'
import { NetworkIcon, PlusIcon } from '../lib/icons'

export default function RedPage() {
  const { me, showToast } = useStore()
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [connected, setConnected] = useState<Set<string>>(new Set())
  const [pending, setPending] = useState<Set<string>>(new Set())

  const myId = me ? (me.props.userId ?? me.props.usuario_id ?? '') : ''

  async function load() {
    setLoading(true)
    try {
      const res = await usuariosApi.list({ limit: '50' })
      setUsuarios(extractNodes(res) as Usuario[])
    } catch {
      showToast('Error al cargar usuarios', 'err')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleConectar(u: Usuario) {
    const uid = nodeId(u.props)
    if (!myId || !uid || uid === myId || connected.has(uid) || pending.has(uid)) return
    setPending(p => new Set(p).add(uid))
    try {
      await relacionesApi.conectar(myId, uid)
      setConnected(c => new Set(c).add(uid))
      showToast(`Conectado con ${u.props.nombre}`, 'ok')
    } catch (e) {
      showToast(`Error: ${e instanceof Error ? e.message : e}`, 'err')
    } finally {
      setPending(p => { const n = new Set(p); n.delete(uid); return n })
    }
  }

  const filtered = search
    ? usuarios.filter(u =>
        u.props.nombre?.toLowerCase().includes(search.toLowerCase()) ||
        u.props.titular?.toLowerCase().includes(search.toLowerCase())
      )
    : usuarios

  return (
    <div className="page">
      <div className="page-header">
        <NetworkIcon size={20} />
        <h2>Mi red</h2>
      </div>

      <input
        className="search-input"
        placeholder="Buscar por nombre o cargo…"
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      {loading ? (
        <div className="loading">Cargando usuarios…</div>
      ) : (
        <div className="grid-2">
          {filtered.map(u => {
            const uid = nodeId(u.props)
            const isMe = uid === myId
            return (
              <div key={uid || u.elementId} className="card user-card">
                <div className="user-card-avatar">{initials(u.props.nombre)}</div>
                <div className="user-card-info">
                  <div className="user-card-name">
                    {u.props.nombre}
                    {u.labels.includes('Admin') && <span className="badge-admin">Admin</span>}
                  </div>
                  <div className="user-card-title">{u.props.titular}</div>
                  {u.props.habilidades && u.props.habilidades.length > 0 && (
                    <div className="user-card-skills">
                      {u.props.habilidades.slice(0, 3).map(h => (
                        <span key={h} className="tag">{h}</span>
                      ))}
                    </div>
                  )}
                  <div className="user-card-meta">{u.props.conexiones_count ?? 0} conexiones</div>
                </div>
                {!isMe && (
                  connected.has(uid) ? (
                    <button className="btn-connected" disabled>
                      ✓ Conectado
                    </button>
                  ) : pending.has(uid) ? (
                    <button className="btn-secondary" disabled style={{ opacity: 0.6 }}>
                      Conectando…
                    </button>
                  ) : (
                    <button className="btn-secondary" onClick={() => handleConectar(u)}>
                      <PlusIcon size={14} /> Conectar
                    </button>
                  )
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
