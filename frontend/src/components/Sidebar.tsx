import { useStore } from '../store/StoreContext'
import { HomeIcon, NetworkIcon, BriefcaseIcon, BuildingIcon, UserIcon, CheckIcon, CodeIcon, GraphIcon, BarChartIcon, ActivityIcon } from '../lib/icons'
import type { ReactNode } from 'react'

interface NavItem { id: string; icon: ReactNode; label: string }

const NAV: NavItem[] = [
  { id: 'feed',     icon: <HomeIcon size={18} />,      label: 'Inicio' },
  { id: 'red',      icon: <NetworkIcon size={18} />,   label: 'Mi red' },
  { id: 'empleos',  icon: <BriefcaseIcon size={18} />, label: 'Empleos' },
  { id: 'empresas', icon: <BuildingIcon size={18} />,  label: 'Empresas' },
  { id: 'perfil',   icon: <UserIcon size={18} />,      label: 'Mi perfil' },
]

export default function Sidebar() {
  const { tab, setTab, setDrawer, setGraphOpen } = useStore()

  return (
    <aside className="sidebar">
      {NAV.map(item => (
        <button
          key={item.id}
          className={`nav-item ${tab === item.id ? 'active' : ''}`}
          onClick={() => setTab(item.id as Parameters<typeof setTab>[0])}
        >
          <span className="nav-bar" />
          <span className="ic">{item.icon}</span>
          <span>{item.label}</span>
        </button>
      ))}

      <div className="nav-section-label">Modelo</div>

      <button className={`nav-item ${tab === 'ops' ? 'active' : ''}`} onClick={() => setTab('ops')}>
        <span className="nav-bar" />
        <span className="ic"><CheckIcon size={18} /></span>
        <span>Operaciones rúbrica</span>
      </button>

      <button className={`nav-item ${tab === 'consultas' ? 'active' : ''}`} onClick={() => setTab('consultas')}>
        <span className="nav-bar" />
        <span className="ic"><BarChartIcon size={18} /></span>
        <span>Consultas Cypher</span>
      </button>

      <button className={`nav-item ${tab === 'datascience' ? 'active' : ''}`} onClick={() => setTab('datascience')}>
        <span className="nav-bar" />
        <span className="ic"><ActivityIcon size={18} /></span>
        <span>Data Science</span>
      </button>

      <button className="nav-item" onClick={() => setDrawer(true)}>
        <span className="nav-bar" />
        <span className="ic"><CodeIcon size={18} /></span>
        <span>Consola Cypher</span>
      </button>

      <button className="nav-item" onClick={() => setGraphOpen(true)}>
        <span className="nav-bar" />
        <span className="ic"><GraphIcon size={18} /></span>
        <span>Visualizar grafo</span>
      </button>
    </aside>
  )
}
