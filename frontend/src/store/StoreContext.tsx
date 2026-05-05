import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { usuariosApi } from '../api/usuarios'
import { extractNodes } from '../lib/format'
import type { Usuario } from '../types/api'

type Role = 'Usuario' | 'Reclutador' | 'Admin'
type Tab = 'feed' | 'red' | 'empleos' | 'empresas' | 'perfil' | 'ops' | 'consultas' | 'datascience'

export interface Toast {
  id: string
  msg: string
  kind: 'ok' | 'err' | 'info'
}

export interface LogEntry {
  ts: string
  query: string
  source: 'ui' | 'console'
  kind: 'read' | 'write'
  ok: boolean
  summary?: string
  error?: string
}

interface StoreCtx {
  role: Role
  setRole: (r: Role) => void
  tab: Tab
  setTab: (t: Tab) => void
  me: { elementId: string; labels: string[]; props: Usuario['props'] } | null
  meLoading: boolean
  drawer: boolean
  setDrawer: (v: boolean) => void
  graphOpen: boolean
  setGraphOpen: (v: boolean) => void
  seeding: boolean
  setSeeding: (v: boolean) => void
  toasts: Toast[]
  showToast: (msg: string, kind?: Toast['kind']) => void
  log: LogEntry[]
  addLog: (e: LogEntry) => void
}

const Ctx = createContext<StoreCtx | null>(null)

const ROLE_EMAIL: Record<Role, string> = {
  Usuario: 'nconcua@uvg.edu.gt',
  Reclutador: 'dramirez@correo.com',
  Admin: 'ecarcamo@uvg.edu.gt',
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<Role>('Usuario')
  const [tab, setTab] = useState<Tab>('feed')
  const [me, setMe] = useState<StoreCtx['me']>(null)
  const [meLoading, setMeLoading] = useState(true)
  const [drawer, setDrawer] = useState(false)
  const [graphOpen, setGraphOpen] = useState(false)
  const [seeding, setSeeding] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [log, setLog] = useState<LogEntry[]>([])
  const toastTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const showToast = useCallback((msg: string, kind: Toast['kind'] = 'ok') => {
    const id = Math.random().toString(36).slice(2)
    setToasts(t => [...t, { id, msg, kind }])
    const timer = setTimeout(() => {
      setToasts(t => t.filter(x => x.id !== id))
      toastTimers.current.delete(id)
    }, 2500)
    toastTimers.current.set(id, timer)
  }, [])

  const addLog = useCallback((e: LogEntry) => {
    setLog(prev => [e, ...prev].slice(0, 120))
  }, [])

  useEffect(() => {
    setMeLoading(true)
    const email = ROLE_EMAIL[role]
    usuariosApi.list({ limit: '5' })
      .then(res => {
        const nodes = extractNodes(res)
        const found = nodes.find(n => n.props.email === email || n.props.email === email)
        if (found) {
          setMe({ elementId: found.elementId, labels: found.labels, props: found.props as Usuario['props'] })
        } else if (nodes.length > 0) {
          setMe({ elementId: nodes[0].elementId, labels: nodes[0].labels, props: nodes[0].props as Usuario['props'] })
        }
      })
      .catch(() => {})
      .finally(() => setMeLoading(false))
  }, [role])

  const value = useMemo<StoreCtx>(() => ({
    role, setRole, tab, setTab, me, meLoading,
    drawer, setDrawer, graphOpen, setGraphOpen,
    seeding, setSeeding,
    toasts, showToast, log, addLog,
  }), [role, tab, me, meLoading, drawer, graphOpen, seeding, toasts, log, showToast, addLog])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useStore(): StoreCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useStore fuera de StoreProvider')
  return ctx
}
