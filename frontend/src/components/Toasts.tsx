import { useStore } from '../store/StoreContext'

export default function Toasts() {
  const { toasts } = useStore()
  return (
    <div className="toast-stack">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.kind}`}>
          {t.kind === 'err' ? '⚠ ' : t.kind === 'info' ? 'ℹ ' : '✓ '}{t.msg}
        </div>
      ))}
    </div>
  )
}
