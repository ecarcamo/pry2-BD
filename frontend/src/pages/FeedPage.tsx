import { useEffect, useState } from 'react'
import { useStore } from '../store/StoreContext'
import { publicacionesApi } from '../api/publicaciones'
import { relacionesApi } from '../api/relaciones'
import { extractNodes, initials, nodeId, timeAgo } from '../lib/format'
import type { Publicacion } from '../types/api'
import { HeartIcon, MessageIcon, ShareIcon, PlusIcon } from '../lib/icons'

type PubNode = Publicacion

export default function FeedPage() {
  const { me, showToast } = useStore()
  const [posts, setPosts] = useState<PubNode[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [contenido, setContenido] = useState('')
  const [hashtags, setHashtags] = useState('')
  const [commentOpen, setCommentOpen] = useState<string | null>(null)
  const [commentText, setCommentText] = useState('')

  const myId = me ? (me.props.userId ?? me.props.usuario_id ?? '') : ''

  async function load() {
    setLoading(true)
    try {
      const res = await publicacionesApi.list({ limit: '50' })
      const all = extractNodes(res) as PubNode[]
      all.sort((a, b) => {
        const da = String(a.props.fecha_publicacion ?? '')
        const db = String(b.props.fecha_publicacion ?? '')
        return db.localeCompare(da)
      })
      setPosts(all)
    } catch {
      showToast('Error al cargar publicaciones', 'err')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handlePublicar() {
    if (!contenido.trim() || !myId) return
    const tags = hashtags.split(/[,\s]+/).filter(Boolean)
    try {
      await publicacionesApi.create({ userId: myId, contenido, tags })
      showToast('Publicación creada', 'ok')
      setContenido('')
      setHashtags('')
      setShowForm(false)
      load()
    } catch (e) {
      showToast(`Error: ${e instanceof Error ? e.message : e}`, 'err')
    }
  }

  async function handleLike(post: PubNode) {
    if (!myId) return
    const pid = nodeId(post.props)
    try {
      await relacionesApi.like(myId, pid)
      showToast('¡Like enviado!', 'ok')
      load()
    } catch (e) {
      showToast(`Error: ${e instanceof Error ? e.message : e}`, 'err')
    }
  }

  async function handleCommentar(post: PubNode) {
    if (!myId || !commentText.trim()) return
    const pid = nodeId(post.props)
    try {
      await relacionesApi.comentar(myId, pid, commentText)
      showToast('Comentario enviado', 'ok')
      setCommentOpen(null)
      setCommentText('')
    } catch (e) {
      showToast(`Error: ${e instanceof Error ? e.message : e}`, 'err')
    }
  }

  async function handleCompartir(post: PubNode) {
    if (!myId) return
    const pid = nodeId(post.props)
    try {
      await relacionesApi.compartir(myId, pid)
      showToast('Compartido', 'ok')
    } catch (e) {
      showToast(`Error: ${e instanceof Error ? e.message : e}`, 'err')
    }
  }

  return (
    <div className="page feed-page">
      {/* Composer */}
      <div className="card composer">
        <div className="composer-avatar">{initials(me?.props.nombre)}</div>
        {showForm ? (
          <div style={{ flex: 1 }}>
            <textarea
              className="composer-input"
              placeholder={`¿Qué quieres compartir, ${me?.props.nombre?.split(' ')[0] ?? ''}?`}
              value={contenido}
              onChange={e => setContenido(e.target.value)}
              rows={3}
            />
            <input
              className="composer-tags"
              placeholder="Agrega hashtags (separados por coma)"
              value={hashtags}
              onChange={e => setHashtags(e.target.value)}
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
              <button className="btn-ghost" onClick={() => setShowForm(false)}>Cancelar</button>
              <button className="btn-primary" onClick={handlePublicar}>Publicar</button>
            </div>
          </div>
        ) : (
          <input
            className="composer-input"
            placeholder={`¿Qué quieres compartir, ${me?.props.nombre?.split(' ')[0] ?? ''}?`}
            readOnly
            onClick={() => setShowForm(true)}
          />
        )}
      </div>

      {/* Feed */}
      {loading ? (
        <div className="loading">Cargando publicaciones…</div>
      ) : posts.length === 0 ? (
        <div className="empty">No hay publicaciones. ¡Crea la primera!</div>
      ) : (
        posts.map(post => {
          const pid = nodeId(post.props)
          return (
            <div key={pid || post.elementId} className="card post-card">
              <div className="post-header">
                <div className="avatar-sm">{initials(me?.props.nombre)}</div>
                <div>
                  <div className="post-date">{timeAgo(post.props.fecha_publicacion)}</div>
                  {post.props.es_oferta && <span className="badge-oferta">Oferta</span>}
                </div>
              </div>
              <p className="post-contenido">{post.props.contenido}</p>
              {post.props.tags && post.props.tags.length > 0 && (
                <div className="post-tags">
                  {post.props.tags.map(t => <span key={t} className="tag">#{t}</span>)}
                </div>
              )}
              <div className="post-stats">
                <span>{post.props.likes_count ?? 0} reacciones</span>
              </div>
              <div className="post-actions">
                <button className="action-btn" onClick={() => handleLike(post)}>
                  <HeartIcon size={16} /> Me gusta
                </button>
                <button
                  className="action-btn"
                  onClick={() => {
                    setCommentOpen(commentOpen === pid ? null : pid)
                    setCommentText('')
                  }}
                >
                  <MessageIcon size={16} /> Comentar
                </button>
                <button className="action-btn" onClick={() => handleCompartir(post)}>
                  <ShareIcon size={16} /> Compartir
                </button>
              </div>
              {commentOpen === pid && (
                <div className="comment-form">
                  <input
                    className="composer-input"
                    placeholder="Escribe un comentario…"
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                  />
                  <button className="btn-primary" onClick={() => handleCommentar(post)}>Enviar</button>
                </div>
              )}
            </div>
          )
        })
      )}

      <button className="fab" onClick={() => setShowForm(true)} title="Nueva publicación">
        <PlusIcon size={22} />
      </button>
    </div>
  )
}
