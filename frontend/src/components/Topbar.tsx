import { useStore } from '../store/StoreContext'
import { initials } from '../lib/format'
import { SearchIcon, GraphIcon, CodeIcon } from '../lib/icons'

const ROLES = ['Usuario', 'Reclutador', 'Admin'] as const

export default function Topbar() {
  const { role, setRole, me, setTab, setDrawer, setGraphOpen } = useStore()

  return (
    <header className="topbar">
      <div className="brand">
        <div className="brand-mark">L</div>
        <span>Linkly</span>
      </div>

      <div className="search">
        <span className="ic"><SearchIcon size={16} /></span>
        <input placeholder="Buscar profesionales, empresas, vacantes…" readOnly />
      </div>

      <div className="role-switch">
        {ROLES.map(r => (
          <button key={r} className={role === r ? 'active' : ''} onClick={() => setRole(r)}>
            {r}
          </button>
        ))}
      </div>

      <button className="topbar-btn" onClick={() => setGraphOpen(true)}>
        <GraphIcon size={15} /> Grafo
      </button>
      <button className="topbar-btn" onClick={() => setDrawer(true)}>
        <CodeIcon size={15} /> Cypher
      </button>
      <button className="avatar-btn" title={me?.props.nombre} onClick={() => setTab('perfil')}>
        {initials(me?.props.nombre)}
      </button>
    </header>
  )
}
