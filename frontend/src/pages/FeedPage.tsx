import { useEffect, useState } from 'react'
import { useStore } from '../store/StoreContext'
import { publicacionesApi } from '../api/publicaciones'
import { relacionesApi } from '../api/relaciones'
import { extractNodes, initials, nodeId, timeAgo } from '../lib/format'
import type { Publicacion } from '../types/api'
import { HeartIcon, MessageIcon, ShareIcon, PlusIcon, EditIcon } from '../lib/icons'

type PubNode = Publicacion

export default function FeedPage() {
  const { me, showToast } = useStore()
  const [posts, setPosts] = useState<PubNode[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [contenido, setContenido] = useState('')
  const [hashtags, setHashtags] = useState('')

  // comentarios
  const [commentOpen, setCommentOpen] = useState<string | null>(null)
  const [commentText, setCommentText] = useState('')

  // editar comentario (patch propiedad de 1 relación)
  const [editCommentOpen, setEditCommentOpen] = useState<string | null>(null)
  const [editCommentText, setEditCommentText] = useState('')

  const myId = me ? (me.props.userId ?? me.props.usuario_id ?? '') : ''

  async function load() {
    setLoading(true)
    try {
      const res = await publicacionesApi.list({ limit: '50' })
      const all = extractNodes(res) as PubNode[]
      const elementIdNum = (id?: string) => {
        if (!id) return 0
        const tail = id.split(':').pop() ?? id
        const n = Number(tail)
        return Number.isFinite(n) ? n : 0
      }
      const todayIso = new Date().toISOString().slice(0, 10)
      // Bucket 0 = fecha ≤ hoy (datos "reales"), bucket 1 = futuro (seed sintético).
      // Dentro de cada bucket: fecha DESC, luego id(p) DESC para que lo recién creado vaya arriba.
      const bucket = (f: string) => (f && f > todayIso ? 1 : 0)
      all.sort((a, b) => {
        const da = String(a.props.fecha_publicacion ?? '')
        const db = String(b.props.fecha_publicacion ?? '')
        const ba = bucket(da), bb = bucket(db)
        if (ba !== bb) return ba - bb
        const cmp = db.localeCompare(da)
        if (cmp !== 0) return cmp
        return elementIdNum(b.elementId) - elementIdNum(a.elementId)
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
      setContenido(''); setHashtags(''); setShowForm(false)
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
      showToast('¡Reacción enviada!', 'ok')
      load()
    } catch (e) {
      showToast(`Error: ${e instanceof Error ? e.message : e}`, 'err')
    }
  }

  async function handleComentar(post: PubNode) {
    if (!myId || !commentText.trim()) return
    const pid = nodeId(post.props)
    try {
      await relacionesApi.comentar(myId, pid, commentText)
      showToast('Comentario enviado', 'ok')
      setCommentOpen(null); setCommentText('')
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

  // Editar la propiedad "contenido" de la relación COMENTO (patch 1 relación)
  async function handleEditarComentario(post: PubNode) {
    if (!myId || !editCommentText.trim()) return
    const pid = nodeId(post.props)
    const idField = pid.startsWith('p') ? 'publicacion_id' : 'postId'
    const fromField = myId.startsWith('u') ? 'usuario_id' : 'userId'
    try {
      await relacionesApi.patchRelacion({
        from: { label: 'Usuario', idField: fromField, idValue: myId },
        to: { label: 'Publicacion', idField, idValue: pid },
        type: 'COMENTO',
        set: { contenido: editCommentText, editado: true },
      })
      showToast('Comentario actualizado (editado = true)', 'ok')
      setEditCommentOpen(null); setEditCommentText('')
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
                <div className="avatar-sm">{initials(post.props.autor_nombre ?? me?.props.nombre)}</div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{post.props.autor_nombre ?? ''}</div>
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
                <button className="action-btn" onClick={() => {
                  setCommentOpen(commentOpen === pid ? null : pid)
                  setEditCommentOpen(null)
                  setCommentText('')
                }}>
                  <MessageIcon size={16} /> Comentar
                </button>
                <button className="action-btn" onClick={() => handleCompartir(post)}>
                  <ShareIcon size={16} /> Compartir
                </button>
                <button className="action-btn" onClick={() => {
                  setEditCommentOpen(editCommentOpen === pid ? null : pid)
                  setCommentOpen(null)
                  setEditCommentText('')
                }}>
                  <EditIcon size={16} /> Editar comentario
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
                  <button className="btn-primary" onClick={() => handleComentar(post)}>Enviar</button>
                </div>
              )}

              {editCommentOpen === pid && (
                <div className="comment-form">
                  <p className="text-mute" style={{ fontSize: 12, margin: '0 0 6px' }}>
                    Actualiza el contenido de tu comentario en esta publicación (SET r.contenido, r.editado = true)
                  </p>
                  <input
                    className="composer-input"
                    placeholder="Nuevo texto del comentario…"
                    value={editCommentText}
                    onChange={e => setEditCommentText(e.target.value)}
                  />
                  <button className="btn-primary" onClick={() => handleEditarComentario(post)}>
                    Actualizar comentario
                  </button>
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
