import { StoreProvider, useStore } from './store/StoreContext'
import Topbar from './components/Topbar'
import Sidebar from './components/Sidebar'
import Footer from './components/Footer'
import Toasts from './components/Toasts'
import CypherDrawer from './components/CypherDrawer'
import GraphOverlay from './components/GraphOverlay'
import FeedPage from './pages/FeedPage'
import RedPage from './pages/RedPage'
import EmpleosPage from './pages/EmpleosPage'
import EmpresasPage from './pages/EmpresasPage'
import PerfilPage from './pages/PerfilPage'
import OperacionesPage from './pages/OperacionesPage'
import ConsultasPage from './pages/ConsultasPage'
import DataSciencePage from './pages/DataSciencePage'

function SeedOverlay() {
  const { seeding } = useStore()
  if (!seeding) return null
  return (
    <div className="seed-overlay">
      <div className="seed-spinner" />
      <span className="seed-label">Reseteando base de datos…</span>
    </div>
  )
}

function Shell() {
  const { tab } = useStore()

  const PAGE: Record<string, React.ReactNode> = {
    feed: <FeedPage />,
    red: <RedPage />,
    empleos: <EmpleosPage />,
    empresas: <EmpresasPage />,
    perfil: <PerfilPage />,
    ops: <OperacionesPage />,
    consultas: <ConsultasPage />,
    datascience: <DataSciencePage />,
  }

  return (
    <div className="root">
      <Topbar />
      <div className="app">
        <Sidebar />
        <main className="main">{PAGE[tab] ?? <FeedPage />}</main>
      </div>
      <CypherDrawer />
      <GraphOverlay />
      <Toasts />
      <Footer />
      <SeedOverlay />
    </div>
  )
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  )
}
