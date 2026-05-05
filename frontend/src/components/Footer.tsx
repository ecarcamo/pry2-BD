import { useStore } from '../store/StoreContext'
import { adminApi } from '../api/admin'
import { CodeIcon, RefreshIcon } from '../lib/icons'

export default function Footer() {
  const { setDrawer, showToast, seeding, setSeeding } = useStore()

  async function handleSeed() {
    if (!confirm('¿Borrar todos los datos y recargar desde los CSVs? Esto puede tardar 2-3 minutos.')) return
    setSeeding(true)
    showToast('Cargando datos... esto puede tardar', 'info')
    try {
      await adminApi.seed()
      showToast('Datos recargados exitosamente', 'ok')
    } catch (e) {
      showToast(`Error al hacer seed: ${e instanceof Error ? e.message : e}`, 'err')
    } finally {
      setSeeding(false)
    }
  }

  return (
    <footer className="footer">
      <span>
        <strong style={{ color: 'var(--text)' }}>Linkly</strong> · Proyecto 2 · Bases de Datos 2 · UVG
      </span>
      <span className="spacer" />
      <span>Nicolás Concuá · Esteban Cárcamo · Ernesto Ascencio</span>
      <button className="footer-btn" onClick={handleSeed} disabled={seeding}>
        <RefreshIcon size={13} /> {seeding ? 'Cargando...' : 'reset datos'}
      </button>
      <button className="footer-btn" onClick={() => setDrawer(true)}>
        <CodeIcon size={13} /> Cypher
      </button>
    </footer>
  )
}
