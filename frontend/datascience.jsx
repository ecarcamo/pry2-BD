/* ============================================================
   datascience.jsx — Panel de Data Science
   Tres algoritmos: PageRank · Jaccard Similarity · BFS Shortest Path
   ============================================================ */

const { useState: useDS, useEffect: useDE, Fragment: DSFrag } = React;

function rowsToObjects(data) {
  if (!data || !data.rows || !data.columns) return [];
  return data.rows.map(row =>
    Object.fromEntries(data.columns.map((col, i) => [col, row[i]]))
  );
}

// ─── Influencers ─────────────────────────────────────────────

function InfluencerBar({ item, maxScore, rank }) {
  const pct = maxScore > 0 ? Math.max(2, (item.score_influencia / maxScore) * 100) : 2;
  const palette = [
    'var(--c-publicacion)',
    'var(--c-usuario)',
    'var(--c-empresa)',
    'var(--c-empleo)',
    'var(--c-educacion)',
  ];
  const color = palette[rank % palette.length];
  return (
    <div className="ds-bar-item">
      <div className="ds-bar-meta">
        <span className="ds-rank" style={{ color }}># {rank + 1}</span>
        <span className="ds-name">{item.nombre || item.userId}</span>
        <span className="ds-score">{Number(item.score_influencia).toFixed(1)}</span>
      </div>
      <div className="ds-bar-track">
        <div className="ds-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <div className="ds-bar-sub">
        {item.titular && <span className="ds-titular">{item.titular}</span>}
        <span className="ds-stats">
          {item.conexiones} cx &nbsp;·&nbsp; {item.likes_recibidos} ♥ &nbsp;·&nbsp; {item.menciones} @
        </span>
      </div>
    </div>
  );
}

function InfluencersSection({ neo4jStatus }) {
  const [data, setData] = useDS([]);
  const [loading, setLoading] = useDS(false);
  const [error, setError] = useDS('');

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await window.API.datascience.influencers(10);
      setData(rowsToObjects(res));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useDE(() => {
    if (neo4jStatus === 'ok') fetchData();
  }, [neo4jStatus]);

  const maxScore = data.length > 0
    ? Math.max(...data.map(d => d.score_influencia || 0))
    : 1;

  return (
    <div className="ds-section">
      <div className="ds-section-head">
        <div>
          <div className="ds-algo-name">PageRank Personalizado</div>
          <div className="ds-algo-desc">
            Score = conexiones×2 + likes×0.5 + menciones×3 + publicaciones×1
          </div>
        </div>
        <button className="ds-refresh-btn" onClick={fetchData}
                disabled={loading || neo4jStatus !== 'ok'} title="Recalcular">
          {loading ? '…' : '↺'}
        </button>
      </div>

      {neo4jStatus !== 'ok' && (
        <div className="ds-offline-msg">Requiere conexión con Neo4j Aura</div>
      )}
      {error && <div className="ds-error">⚠ {error}</div>}
      {loading && <div className="ds-loading">Calculando scores de influencia…</div>}

      {!loading && !error && data.length > 0 && (
        <div className="ds-bars">
          {data.map((item, i) => (
            <InfluencerBar key={item.userId || i} item={item} maxScore={maxScore} rank={i} />
          ))}
        </div>
      )}

      {!loading && !error && data.length === 0 && neo4jStatus === 'ok' && (
        <div className="ds-empty">Sin datos de usuarios en la base.</div>
      )}
    </div>
  );
}

// ─── Recomendaciones ─────────────────────────────────────────

function RecomendacionesSection({ neo4jStatus }) {
  const [userId, setUserId] = useDS('');
  const [data, setData] = useDS(null);
  const [loading, setLoading] = useDS(false);
  const [error, setError] = useDS('');

  const search = async () => {
    const uid = userId.trim();
    if (!uid) return;
    setLoading(true);
    setError('');
    setData(null);
    try {
      const res = await window.API.datascience.recomendaciones(uid);
      setData(rowsToObjects(res));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ds-section">
      <div className="ds-section-head">
        <div>
          <div className="ds-algo-name">Jaccard Similarity</div>
          <div className="ds-algo-desc">"Personas que quizás conozcas"</div>
        </div>
      </div>

      <div className="ds-input-row">
        <input
          className="ds-input"
          value={userId}
          onChange={e => setUserId(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && search()}
          placeholder="userId del usuario…"
          disabled={neo4jStatus !== 'ok'}
        />
        <button className="ds-btn" onClick={search}
                disabled={!userId.trim() || loading || neo4jStatus !== 'ok'}>
          {loading ? '…' : 'Buscar'}
        </button>
      </div>

      <div className="ds-hint">
        Tip: haz click en un nodo del grafo → Inspector → copia el userId
      </div>

      {neo4jStatus !== 'ok' && (
        <div className="ds-offline-msg">Requiere Neo4j Aura</div>
      )}
      {error && <div className="ds-error">⚠ {error}</div>}
      {loading && <div className="ds-loading">Calculando similitud Jaccard…</div>}

      {!loading && data !== null && data.length === 0 && (
        <div className="ds-empty">
          Sin recomendaciones. Puede que este usuario no tenga conexiones en común con otros.
        </div>
      )}

      {!loading && data && data.length > 0 && (
        <div className="ds-rec-list">
          {data.map((item, i) => (
            <div key={item.userId || i} className="ds-rec-card">
              <div className="ds-rec-score-badge">
                <span className="ds-rec-pct">{(item.jaccard * 100).toFixed(1)}</span>
                <span className="ds-rec-pct-label">%</span>
              </div>
              <div className="ds-rec-info">
                <div className="ds-rec-name">{item.nombre || item.userId}</div>
                {item.titular && <div className="ds-rec-titular">{item.titular}</div>}
                <div className="ds-rec-common">
                  {item.conexiones_en_comun} conexión{item.conexiones_en_comun !== 1 ? 'es' : ''} en común
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Grados de separación ─────────────────────────────────────

function GradosSection({ neo4jStatus }) {
  const [fromId, setFromId] = useDS('');
  const [toId, setToId] = useDS('');
  const [result, setResult] = useDS(null);
  const [noPath, setNoPath] = useDS(false);
  const [loading, setLoading] = useDS(false);
  const [error, setError] = useDS('');

  const search = async () => {
    const f = fromId.trim(), t = toId.trim();
    if (!f || !t) return;
    setLoading(true);
    setError('');
    setResult(null);
    setNoPath(false);
    try {
      const res = await window.API.datascience.gradosSeparacion(f, t);
      const objs = rowsToObjects(res);
      if (objs.length > 0) {
        setResult(objs[0]);
      } else {
        setNoPath(true);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const degreeLabel = result
    ? result.grados === 0 ? 'mismo nodo'
    : result.grados === 1 ? '1er grado'
    : result.grados === 2 ? '2do grado'
    : `${result.grados}° grado`
    : '';

  return (
    <div className="ds-section">
      <div className="ds-section-head">
        <div>
          <div className="ds-algo-name">BFS Shortest Path</div>
          <div className="ds-algo-desc">Grados de separación entre dos usuarios</div>
        </div>
      </div>

      <div className="ds-input-row">
        <input className="ds-input" value={fromId}
               onChange={e => setFromId(e.target.value)}
               placeholder="userId origen"
               disabled={neo4jStatus !== 'ok'} />
      </div>
      <div className="ds-input-row" style={{ marginTop: 6 }}>
        <input className="ds-input" value={toId}
               onChange={e => setToId(e.target.value)}
               onKeyDown={e => e.key === 'Enter' && search()}
               placeholder="userId destino"
               disabled={neo4jStatus !== 'ok'} />
        <button className="ds-btn" onClick={search}
                disabled={!fromId.trim() || !toId.trim() || loading || neo4jStatus !== 'ok'}>
          {loading ? '…' : 'Calcular'}
        </button>
      </div>

      <div className="ds-hint">
        Ingresa dos userIds para ver el camino más corto en el grafo de conexiones.
      </div>

      {neo4jStatus !== 'ok' && (
        <div className="ds-offline-msg">Requiere Neo4j Aura</div>
      )}
      {error && <div className="ds-error">⚠ {error}</div>}
      {loading && <div className="ds-loading">Calculando camino más corto…</div>}
      {noPath && !loading && (
        <div className="ds-empty">No existe camino entre estos dos usuarios.</div>
      )}

      {result && !loading && (
        <div className="ds-grados-result">
          <div className="ds-grados-badge">
            <span className="ds-grados-num">{result.grados}</span>
            <span className="ds-grados-lbl">{degreeLabel}</span>
          </div>
          <div className="ds-path-chain">
            {(result.nombres || []).map((nombre, i) => (
              <DSFrag key={i}>
                {i > 0 && <span className="ds-path-arrow">→</span>}
                <span className="ds-path-node">{nombre}</span>
              </DSFrag>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Panel principal ──────────────────────────────────────────

function DataSciencePanel({ neo4jStatus }) {
  const [tab, setTab] = useDS('influencers');

  const TABS = [
    { id: 'influencers',     label: 'Influencers',       icon: '▲' },
    { id: 'recomendaciones', label: 'Recomendaciones',   icon: '◎' },
    { id: 'grados',          label: 'Grados de sep.',    icon: '~' },
  ];

  return (
    <div className="ds-panel">
      <div className="ds-inner-tabs">
        {TABS.map(t => (
          <button key={t.id}
                  className={'ds-inner-tab' + (tab === t.id ? ' active' : '')}
                  onClick={() => setTab(t.id)}>
            <span className="ds-tab-icon">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      <div className="ds-content">
        {tab === 'influencers'     && <InfluencersSection     neo4jStatus={neo4jStatus} />}
        {tab === 'recomendaciones' && <RecomendacionesSection neo4jStatus={neo4jStatus} />}
        {tab === 'grados'          && <GradosSection          neo4jStatus={neo4jStatus} />}
      </div>
    </div>
  );
}

window.DataSciencePanel = DataSciencePanel;
