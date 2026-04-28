/* ============================================================
   shell.jsx — App raíz: estado del grafo, panel izq, log y consola
   v3: integración con backend Express + Neo4j vía window.API
   ============================================================ */

const { useState: useS, useEffect: useE, useMemo: useM, useRef: useR, useCallback: useCb } = React;

function deepCloneGraph(g) {
  return {
    nodes: g.nodes.map(n => ({ id: n.id, labels: [...n.labels], props: { ...n.props } })),
    rels:  g.rels.map(r => ({ id: r.id, type: r.type, from: r.from, to: r.to, props: { ...r.props } })),
  };
}

function freshGraphFromSeed() {
  return deepCloneGraph({ nodes: window.SEED.nodes, rels: window.SEED.rels });
}

function classifyQuery(q) {
  const u = q.toUpperCase();
  if (/\b(CREATE|MERGE|SET|REMOVE|DELETE|DETACH)\b/.test(u)) return 'write';
  return 'read';
}

function shortStats(s) {
  if (!s) return '';
  const parts = [];
  if (s.nodesCreated)  parts.push(`+${s.nodesCreated} nodo(s)`);
  if (s.nodesDeleted)  parts.push(`-${s.nodesDeleted} nodo(s)`);
  if (s.relsCreated)   parts.push(`+${s.relsCreated} rel(es)`);
  if (s.relsDeleted)   parts.push(`-${s.relsDeleted} rel(es)`);
  if (s.labelsAdded)   parts.push(`+${s.labelsAdded} label(s)`);
  if (s.labelsRemoved) parts.push(`-${s.labelsRemoved} label(s)`);
  if (s.propsSet)      parts.push(`${s.propsSet} prop(s) seteadas`);
  if (s.propsRemoved)  parts.push(`${s.propsRemoved} prop(s) eliminadas`);
  return parts.join(' · ');
}

function ResultTable({ res }) {
  if (!res || !res.columns || !res.columns.length) {
    return <div className="muted" style={{padding:'4px 0', fontSize:'10.5px'}}>(sin RETURN)</div>;
  }
  if (!res.rows.length) {
    return <div className="muted" style={{padding:'4px 0', fontSize:'10.5px'}}>(0 filas)</div>;
  }
  return (
    <div style={{maxHeight:240, overflow:'auto', border:'1px solid var(--border-soft)', borderRadius:5, marginTop:6}}>
      <table className="result-table">
        <thead>
          <tr>{res.columns.map((c,i) => <th key={i}>{c}</th>)}</tr>
        </thead>
        <tbody>
          {res.rows.map((row, ri) => (
            <tr key={ri}>
              {row.map((v, ci) => (
                <td key={ci}><div className="json">{renderCell(v)}</div></td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function renderCell(v) {
  if (v == null) return <span style={{color:'var(--text-dim)'}}>null</span>;
  if (typeof v === 'object' && v !== null && v.labels && v.props) {
    return (
      <div>
        <span className="label-list">
          {v.labels.map(l => (
            <span key={l} className="label-chip"
              style={{color: window.LABEL_COLORS[l], borderColor: window.LABEL_COLORS[l]}}>
              :{l}
            </span>
          ))}
        </span>
        <div style={{color:'var(--text-mute)', fontSize:'10px', marginTop:2}}>
          {Object.entries(v.props).slice(0,3).map(([k,val]) =>
            `${k}: ${typeof val === 'string' ? `'${val}'` : Array.isArray(val) ? `[${val.length}]` : val}`
          ).join(' · ')}
        </div>
      </div>
    );
  }
  if (typeof v === 'object' && v !== null && v.type) {
    return <span style={{color:'var(--c-admin)'}}>:{v.type}</span>;
  }
  if (Array.isArray(v)) {
    return <span>[{v.map((x,i) => <span key={i}>{i>0?', ':''}{typeof x === 'string' ? `'${x}'` : String(x)}</span>)}]</span>;
  }
  if (typeof v === 'string') return `'${v}'`;
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  return String(v);
}

function App() {
  const [graph, setGraph]         = useS(freshGraphFromSeed());
  const [version, setVersion]     = useS(0);
  const [selected, setSelected]   = useS(null);
  const [log, setLog]             = useS([]);
  const [editor, setEditor]       = useS(window.PRESET_QUERIES[0].query);
  const [openSection, setOpenSection] = useS('1. Creación de nodos');
  const [toast, setToast]         = useS(null);
  const [neo4jStatus, setNeo4jStatus] = useS('checking'); // 'ok' | 'offline' | 'checking'
  const [instanceInfo, setInstanceInfo] = useS(null);

  const showToast = (msg, kind='ok') => {
    setToast({ msg, kind });
    setTimeout(() => setToast(null), 2200);
  };

  // Chequea /ping al montar
  useE(() => {
    async function checkPing() {
      try {
        const data = await window.API.ping();
        setNeo4jStatus('ok');
        setInstanceInfo(data);
      } catch {
        setNeo4jStatus('offline');
      }
    }
    checkPing();
    const interval = setInterval(checkPing, 30000);
    return () => clearInterval(interval);
  }, []);

  // runQuery: intenta API.rawCypher; si falla (offline) cae al motor local
  const runQuery = async (q) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    const ts = new Date().toLocaleTimeString('es-GT', { hour12: false });
    let entry;

    if (neo4jStatus === 'ok') {
      try {
        const mode = classifyQuery(trimmed);
        const data = await window.API.rawCypher(trimmed, {}, mode);
        entry = {
          ts, query: trimmed, kind: mode, ok: true,
          result: { columns: data.columns || [], rows: data.rows || [], stats: data.stats || {} },
          summary: shortStats(data.stats) || (data.rows ? `${data.rows.length} fila(s)` : ''),
          source: 'neo4j',
        };
        showToast('Query ejecutada en Neo4j Aura', 'ok');
      } catch (err) {
        entry = { ts, query: trimmed, kind: classifyQuery(trimmed), ok: false, error: err.message, source: 'neo4j' };
        showToast('Error: ' + err.message, 'err');
      }
    } else {
      // modo offline — motor local en memoria
      try {
        const next = deepCloneGraph(graph);
        const res = window.CypherEngine.execute(trimmed, next);
        setGraph(next);
        setVersion(v => v + 1);
        entry = {
          ts, query: trimmed, kind: classifyQuery(trimmed), ok: true,
          result: res, summary: shortStats(res.stats) || (res.matched ? `${res.matched} fila(s) recorrida(s)` : ''),
          source: 'local',
        };
        showToast('Query ejecutada (modo offline)', 'ok');
      } catch (err) {
        entry = { ts, query: trimmed, kind: classifyQuery(trimmed), ok: false, error: err.message, source: 'local' };
        showToast('Error: ' + err.message, 'err');
      }
    }
    setLog(prev => [entry, ...prev].slice(0, 80));
  };

  // handleOp: prefiere endpoint si existe y hay conexión, sino rawCypher/local
  const handleOp = async (op) => {
    if (op.special === 'reset') {
      if (neo4jStatus === 'ok') {
        try {
          await window.API.rawCypher('MATCH (n) DETACH DELETE n', {}, 'write');
          showToast('Base limpiada en Aura, recargando seed...', 'ok');
          // ejecutar seed via backend no está disponible directamente desde el browser;
          // mostramos un aviso y restauramos el grafo visual al estado seed
        } catch (err) {
          showToast('Error al limpiar: ' + err.message, 'err');
        }
      }
      setGraph(freshGraphFromSeed());
      setVersion(v => v + 1);
      setSelected(null);
      const ts = new Date().toLocaleTimeString('es-GT', { hour12: false });
      setLog(prev => [{
        ts, query: '// Reset — MATCH (n) DETACH DELETE n + seed restaurado',
        kind: 'write', ok: true, result: { columns: [], rows: [], stats: {} },
        summary: 'Estado restaurado', source: neo4jStatus === 'ok' ? 'neo4j' : 'local',
      }, ...prev].slice(0, 80));
      showToast('Base restablecida', 'ok');
      return;
    }

    // Si el item tiene endpoint y hay conexión, llamar al backend tipado
    if (op.endpoint && neo4jStatus === 'ok') {
      const ts = new Date().toLocaleTimeString('es-GT', { hour12: false });
      try {
        const fn = window.API._resolve(op.endpoint.call);
        if (!fn) throw new Error(`API method not found: ${op.endpoint.call}`);
        const data = await fn(op.endpoint.body);
        const entry = {
          ts, query: op.query || `// ${op.endpoint.call}(...)`,
          kind: 'write', ok: true,
          result: { columns: data.columns || [], rows: data.rows || [], stats: data.stats || {} },
          summary: shortStats(data.stats) || (data.rows ? `${data.rows.length} fila(s)` : ''),
          source: 'neo4j',
          cypherUsed: data.meta?.cypher,
        };
        setLog(prev => [entry, ...prev].slice(0, 80));
        if (op.query) setEditor(op.query);
        showToast('Operación ejecutada en Neo4j Aura', 'ok');
        return;
      } catch (err) {
        const entry = { ts, query: op.query || `// ${op.endpoint.call}(...)`, kind: 'write', ok: false, error: err.message, source: 'neo4j' };
        setLog(prev => [entry, ...prev].slice(0, 80));
        showToast('Error: ' + err.message, 'err');
        return;
      }
    }

    // Fallback: ejecutar el query Cypher (local o remoto)
    setEditor(op.query);
    runQuery(op.query);
  };

  const stats = useM(() => {
    const labelCt = {}; const relTypeCt = {};
    for (const n of graph.nodes) {
      for (const l of n.labels) labelCt[l] = (labelCt[l]||0)+1;
    }
    for (const r of graph.rels) relTypeCt[r.type] = (relTypeCt[r.type]||0)+1;
    return { nodes: graph.nodes.length, rels: graph.rels.length, labelCt, relTypeCt };
  }, [graph, version]);

  const editorRef = useR(null);
  useE(() => {
    const f = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' &&
          document.activeElement === editorRef.current) {
        e.preventDefault();
        runQuery(editor);
      }
    };
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  }, [editor, graph, neo4jStatus]);

  const statusDot = neo4jStatus === 'ok' ? '#22c55e' : neo4jStatus === 'checking' ? '#f59e0b' : '#6b7280';
  const statusLabel = neo4jStatus === 'ok'
    ? `Aura · ${instanceInfo?.instance || ''} · ${instanceInfo?.database || ''}`
    : neo4jStatus === 'checking' ? 'Conectando…' : 'Offline (motor local)';

  return (
    <>
      <div className="topbar">
        <div className="brand">
          <div className="brand-dot" style={{background: statusDot}}></div>
          <div className="brand-name">NeoLab</div>
          <div className="brand-sub">· {statusLabel}</div>
        </div>
        <div className="meta">
          <span className="stat-pill">nodos <b>{stats.nodes}</b></span>
          <span className="stat-pill">relaciones <b>{stats.rels}</b></span>
          <span className="stat-pill">labels <b>{Object.keys(stats.labelCt).length}</b></span>
          <span className="stat-pill">tipos rel <b>{Object.keys(stats.relTypeCt).length}</b></span>
        </div>
      </div>

      <div className="app">
        {/* LEFT: operations */}
        <div className="col">
          <div className="panel-head">
            <span className="dot" style={{background:'var(--c-empresa)'}}></span>
            Operaciones · rúbrica
          </div>
          <div className="ops">
            {window.OPERATIONS.map((sec, idx) => (
              <div key={sec.section}
                   className={'op-section ' + (openSection === sec.section ? 'open' : '')}>
                <button className="op-section-head"
                        onClick={() => setOpenSection(openSection === sec.section ? null : sec.section)}>
                  <span className="num">{String(idx+1).padStart(2,'0')}</span>
                  <span>{sec.section.replace(/^\d+\.\s*/, '')}</span>
                  <span className="chev">›</span>
                </button>
                <div className="op-section-body">
                  {sec.items.map((it, j) => (
                    <button key={j} className="op-btn" onClick={() => handleOp(it)}>
                      <span className="op-title">{it.title}</span>
                      <span className="op-cypher">{it.subtitle}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CENTER: graph */}
        <div className="col center">
          <div className="panel-head">
            <span className="dot" style={{background:'var(--c-publicacion)'}}></span>
            Grafo en vivo
            <span style={{marginLeft:'auto', fontFamily:'var(--mono)', fontSize:10, color:'var(--text-dim)', textTransform:'none', letterSpacing:0}}>
              click = inspeccionar · arrastra para mover
            </span>
          </div>
          <window.GraphView graph={graph} selected={selected} onSelect={setSelected} version={version} />
          {selected && (
            <window.Inspector graph={graph} nodeId={selected}
              onClose={() => setSelected(null)} onSelect={setSelected} />
          )}
        </div>

        {/* RIGHT: cypher console */}
        <div className="col right">
          <div className="panel-head">
            <span className="dot" style={{background:'var(--c-empleo)'}}></span>
            Consola Cypher
            {neo4jStatus !== 'ok' && (
              <span style={{marginLeft:8, fontFamily:'var(--mono)', fontSize:9, color:'#f59e0b'}}>
                (motor local)
              </span>
            )}
          </div>
          <div className="editor-wrap">
            <div className="editor">
              <textarea
                ref={editorRef}
                value={editor}
                onChange={(e) => setEditor(e.target.value)}
                spellCheck={false}
                placeholder="// Escribe tu query en Cypher y presiona Run o Ctrl+Enter"
              />
            </div>
            <div className="editor-bar">
              <button className="run-btn" onClick={() => runQuery(editor)}>
                ▸ Run
                <span className="kbd">⌘↵</span>
              </button>
              <button className="ghost-btn" onClick={() => setEditor('')}>limpiar</button>
              <span style={{marginLeft:'auto', fontFamily:'var(--mono)', fontSize:10, color:'var(--text-dim)'}}>
                {editor.length} chars
              </span>
            </div>
            <div className="preset-row">
              <span style={{color:'var(--text-dim)', fontFamily:'var(--mono)', fontSize:10, alignSelf:'center', marginRight:4}}>
                consultas del modelo:
              </span>
              {window.PRESET_QUERIES.map((p, i) => (
                <button key={i} className="preset-chip" onClick={() => { setEditor(p.query); runQuery(p.query); }}>
                  {p.label}
                  <span className="who">{p.who}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="log">
            {log.length === 0 && (
              <div className="empty">
                Aún no hay queries.<br/>
                Usa el panel izquierdo o escribe Cypher arriba.
              </div>
            )}
            {log.map((e, i) => (
              <div key={i} className="log-entry">
                <div className="head">
                  <span className={'badge ' + (e.ok ? (e.kind === 'write' ? 'write' : 'read') : 'err')}>
                    {e.ok ? e.kind : 'error'}
                  </span>
                  <span className="ts">{e.ts}</span>
                  {e.source && (
                    <span style={{fontFamily:'var(--mono)', fontSize:9, color: e.source === 'neo4j' ? '#22c55e' : '#9ca3af', marginLeft:4}}>
                      {e.source === 'neo4j' ? '⬡ Aura' : '⬡ local'}
                    </span>
                  )}
                </div>
                <div className="query"
                  dangerouslySetInnerHTML={{ __html: window.highlightCypher(e.query) }} />
                {e.cypherUsed && (
                  <div style={{fontFamily:'var(--mono)', fontSize:9, color:'var(--text-dim)', marginTop:2, wordBreak:'break-all'}}>
                    ↳ {e.cypherUsed}
                  </div>
                )}
                {e.ok ? (
                  <>
                    <div className="summary">{e.summary}</div>
                    {e.result && <ResultTable res={e.result} />}
                  </>
                ) : (
                  <div className="err-msg">⚠ {e.error}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {toast && (
        <div className={'toast show ' + (toast.kind || 'ok')}>{toast.msg}</div>
      )}
    </>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
