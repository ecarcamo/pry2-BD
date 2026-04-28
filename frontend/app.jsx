/* ============================================================
   app.jsx — UI principal: grafo, operaciones, consola Cypher, log
   ============================================================ */

const { useState, useEffect, useMemo, useRef, useCallback } = React;

// --- Colores por label (alineados con CSS vars) ---
const LABEL_COLORS = {
  Usuario:     'var(--c-usuario)',
  Admin:       'var(--c-admin)',
  Empresa:     'var(--c-empresa)',
  Publicacion: 'var(--c-publicacion)',
  Empleo:      'var(--c-empleo)',
  Educacion:   'var(--c-educacion)',
};

// "etiqueta principal" para colorear un nodo (Admin se superpone a Usuario)
function primaryLabel(labels) {
  if (labels.includes('Admin')) return 'Admin';
  return labels[0];
}

// Pretty-format props para el inspector
function formatVal(v) {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'string')  return JSON.stringify(v);
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (Array.isArray(v))       return '[' + v.map(formatVal).join(', ') + ']';
  return String(v);
}

// Resaltado de sintaxis Cypher (ligero)
function highlightCypher(src) {
  if (!src) return '';
  const KW = /\b(MATCH|OPTIONAL|CREATE|MERGE|DELETE|DETACH|SET|REMOVE|WHERE|RETURN|ORDER|BY|ASC|DESC|LIMIT|SKIP|AS|AND|OR|NOT|IN|IS|NULL|TRUE|FALSE|WITH|UNWIND|DISTINCT|ON|CONTAINS|STARTS|ENDS)\b/gi;
  const FN = /\b(count|avg|sum|min|max|collect|size|labels|type|keys|toLower|toUpper|date|datetime|toInteger|toFloat)\b/g;
  const STR = /'([^']*)'|"([^"]*)"/g;
  const NUM = /\b\d+(\.\d+)?\b/g;
  const LAB = /:[A-Z][A-Za-z_0-9]*/g;
  const REL = /\[(\w*):([A-Z_][A-Z0-9_]*)/g;

  let s = src
    .replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
  s = s.replace(STR, (m) => `<span class="cy-str">${m}</span>`);
  s = s.replace(KW,  (m) => `<span class="cy-kw">${m}</span>`);
  s = s.replace(FN,  (m) => `<span class="cy-fn">${m}</span>`);
  s = s.replace(NUM, (m) => `<span class="cy-num">${m}</span>`);
  s = s.replace(LAB, (m) => `<span class="cy-lab">${m}</span>`);
  return s;
}

// ============================================================
//  GRAPH VIEW (SVG, force layout simulado pero precomputado)
// ============================================================

function useForceLayout(nodes, rels, width, height) {
  const [positions, setPositions] = useState({});
  const tickRef = useRef(0);

  useEffect(() => {
    // init positions for new nodes
    setPositions((prev) => {
      const np = { ...prev };
      const nodesById = {};
      for (const n of nodes) nodesById[n.id] = true;
      // remove deleted
      for (const k of Object.keys(np)) if (!nodesById[k]) delete np[k];
      // add new
      for (const n of nodes) {
        if (!np[n.id]) {
          const r = Math.min(width, height) * 0.32;
          const a = Math.random() * Math.PI * 2;
          np[n.id] = {
            x: width/2 + Math.cos(a) * r * (0.4 + Math.random()*0.6),
            y: height/2 + Math.sin(a) * r * (0.4 + Math.random()*0.6),
            vx: 0, vy: 0,
          };
        }
      }
      return np;
    });
  }, [nodes.length, width, height]);

  // simple force tick
  useEffect(() => {
    let raf;
    const step = () => {
      tickRef.current++;
      setPositions((prev) => {
        const next = {};
        for (const k of Object.keys(prev)) next[k] = { ...prev[k] };
        const ids = Object.keys(next);
        const cx = width/2, cy = height/2;
        // repulsion
        for (let i = 0; i < ids.length; i++) {
          for (let j = i+1; j < ids.length; j++) {
            const a = next[ids[i]], b = next[ids[j]];
            const dx = b.x - a.x, dy = b.y - a.y;
            const d2 = dx*dx + dy*dy + 0.01;
            const d = Math.sqrt(d2);
            const f = 1800 / d2;
            const fx = (dx/d) * f, fy = (dy/d) * f;
            a.vx -= fx; a.vy -= fy;
            b.vx += fx; b.vy += fy;
          }
        }
        // springs
        for (const r of rels) {
          const a = next[r.from], b = next[r.to];
          if (!a || !b) continue;
          const dx = b.x - a.x, dy = b.y - a.y;
          const d = Math.sqrt(dx*dx + dy*dy) || 1;
          const target = 110;
          const f = (d - target) * 0.02;
          const fx = (dx/d) * f, fy = (dy/d) * f;
          a.vx += fx; a.vy += fy;
          b.vx -= fx; b.vy -= fy;
        }
        // center pull + integrate
        for (const id of ids) {
          const p = next[id];
          p.vx += (cx - p.x) * 0.005;
          p.vy += (cy - p.y) * 0.005;
          p.vx *= 0.82; p.vy *= 0.82;
          if (!p.locked) {
            p.x += p.vx; p.y += p.vy;
          }
          p.x = Math.max(40, Math.min(width-40, p.x));
          p.y = Math.max(40, Math.min(height-40, p.y));
        }
        return next;
      });
      if (tickRef.current < 120) raf = requestAnimationFrame(step);
    };
    tickRef.current = 0;
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [nodes.length, rels.length, width, height]);

  return [positions, setPositions];
}

function GraphView({ graph, selected, onSelect, version }) {
  const wrapRef = useRef(null);
  const [size, setSize] = useState({ w: 800, h: 600 });
  useEffect(() => {
    const r = wrapRef.current;
    if (!r) return;
    const obs = new ResizeObserver(() => {
      const rect = r.getBoundingClientRect();
      setSize({ w: rect.width, h: rect.height });
    });
    obs.observe(r);
    return () => obs.disconnect();
  }, []);

  const [positions, setPositions] = useForceLayout(graph.nodes, graph.rels, size.w, size.h);
  // re-trigger layout on version bump (after big mutations)
  useEffect(() => { /* useForceLayout depends on lengths, version is bonus */ }, [version]);

  const [drag, setDrag] = useState(null);

  const onNodeMouseDown = (e, id) => {
    e.stopPropagation();
    setDrag({ id, startX: e.clientX, startY: e.clientY, origX: positions[id].x, origY: positions[id].y });
  };
  useEffect(() => {
    if (!drag) return;
    const move = (e) => {
      setPositions((prev) => {
        const np = { ...prev };
        np[drag.id] = { ...np[drag.id],
          x: drag.origX + (e.clientX - drag.startX),
          y: drag.origY + (e.clientY - drag.startY),
          vx: 0, vy: 0, locked: true };
        return np;
      });
    };
    const up = () => setDrag(null);
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
  }, [drag]);

  // build incident map for highlight
  const incidentRels = useMemo(() => {
    if (!selected) return new Set();
    const s = new Set();
    for (const r of graph.rels) {
      if (r.from === selected || r.to === selected) s.add(r.id);
    }
    return s;
  }, [selected, graph.rels]);

  // nodes connected to selected
  const connectedNodes = useMemo(() => {
    const s = new Set();
    if (!selected) return s;
    s.add(selected);
    for (const r of graph.rels) {
      if (r.from === selected) s.add(r.to);
      if (r.to === selected) s.add(r.from);
    }
    return s;
  }, [selected, graph.rels]);

  // Group parallel edges so they don't overlap visually
  function edgeOffset(r, allRels) {
    const same = allRels.filter(x =>
      (x.from === r.from && x.to === r.to) || (x.from === r.to && x.to === r.from)
    );
    const idx = same.findIndex(x => x.id === r.id);
    return (idx - (same.length - 1) / 2) * 18;
  }

  // counts for legend
  const labelCounts = useMemo(() => {
    const c = {};
    for (const n of graph.nodes) {
      const lab = primaryLabel(n.labels);
      c[lab] = (c[lab] || 0) + 1;
      // also count Admin if dual
      if (n.labels.includes('Admin') && lab !== 'Admin') c.Admin = (c.Admin || 0) + 1;
    }
    return c;
  }, [graph.nodes]);

  return (
    <div className="graph-wrap" ref={wrapRef} onClick={() => onSelect(null)}>
      <svg className="graph-svg" width={size.w} height={size.h}>
        <defs>
          {Object.entries(LABEL_COLORS).map(([k, v]) => (
            <marker key={k} id={`arrow-${k}`} viewBox="0 0 10 10" refX="11" refY="5"
              markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill={v} opacity="0.6" />
            </marker>
          ))}
          <marker id="arrow-default" viewBox="0 0 10 10" refX="11" refY="5"
            markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="oklch(0.5 0.012 250)" />
          </marker>
          <marker id="arrow-hl" viewBox="0 0 10 10" refX="11" refY="5"
            markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--c-publicacion)" />
          </marker>
        </defs>

        {/* edges */}
        {graph.rels.map(r => {
          const a = positions[r.from]; const b = positions[r.to];
          if (!a || !b) return null;
          const off = edgeOffset(r, graph.rels);
          const mx = (a.x + b.x)/2; const my = (a.y + b.y)/2;
          const dx = b.x - a.x; const dy = b.y - a.y;
          const len = Math.sqrt(dx*dx + dy*dy) || 1;
          const nx = -dy / len, ny = dx / len;
          const cx = mx + nx * off; const cy = my + ny * off;
          const path = `M ${a.x} ${a.y} Q ${cx} ${cy} ${b.x} ${b.y}`;
          const hl = incidentRels.has(r.id);
          const dim = selected && !hl;
          return (
            <g key={r.id}>
              <path d={path}
                className={`edge-line ${hl ? 'highlight' : ''} ${dim ? 'dim' : ''}`}
                markerEnd={hl ? 'url(#arrow-hl)' : 'url(#arrow-default)'} />
              {hl && (
                <text className="edge-label" x={cx} y={cy - 4} textAnchor="middle">
                  {r.type}
                </text>
              )}
            </g>
          );
        })}

        {/* nodes */}
        {graph.nodes.map(n => {
          const p = positions[n.id]; if (!p) return null;
          const lab = primaryLabel(n.labels);
          const color = LABEL_COLORS[lab] || 'oklch(0.7 0.05 250)';
          const isSel = n.id === selected;
          const dim = selected && !connectedNodes.has(n.id);
          const r = lab === 'Usuario' || lab === 'Admin' ? 22 : 18;
          // short display: nombre / titulo / contenido (cropped)
          const name = n.props.nombre || n.props.titulo || n.props.institucion ||
                       (n.props.contenido ? n.props.contenido.slice(0, 18) + '…' : n.id);
          return (
            <g key={n.id}
               transform={`translate(${p.x}, ${p.y})`}
               onMouseDown={(e) => onNodeMouseDown(e, n.id)}
               onClick={(e) => { e.stopPropagation(); onSelect(n.id); }}
               style={{ opacity: dim ? 0.35 : 1, transition: 'opacity 0.15s' }}>
              <circle className={`node-circle ${isSel ? 'selected' : ''}`}
                r={r}
                fill={color}
                fillOpacity="0.18"
                stroke={color}
                strokeWidth={isSel ? 3 : 1.6}
              />
              {/* dual-label ring for Admin */}
              {n.labels.includes('Admin') && lab === 'Admin' && (
                <circle r={r + 4} fill="none"
                  stroke={LABEL_COLORS.Usuario} strokeWidth="1" strokeDasharray="3 2" />
              )}
              <text className="node-label" y="3">{lab.slice(0, 8)}</text>
              <text className="node-sublabel" y={r + 12}>{name}</text>
            </g>
          );
        })}
      </svg>

      {/* legend */}
      <div className="graph-legend" onClick={(e) => e.stopPropagation()}>
        {Object.entries(LABEL_COLORS).map(([k, v]) => (
          <span key={k} className="legend-pill">
            <span className="swatch" style={{ background: v }} />
            {k}
            <span className="ct">·{labelCounts[k] || 0}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ============================================================
//  INSPECTOR (overlay con detalles del nodo seleccionado)
// ============================================================

function Inspector({ graph, nodeId, onClose, onSelect }) {
  const node = graph.nodes.find(n => n.id === nodeId);
  if (!node) return null;
  const incoming = graph.rels.filter(r => r.to === nodeId);
  const outgoing = graph.rels.filter(r => r.from === nodeId);
  const schemas = node.labels.map(l => window.SEED.SCHEMA[l] || {});
  const allSchemaKeys = new Set();
  for (const s of schemas) for (const k of Object.keys(s)) allSchemaKeys.add(k);
  const propKeys = [...new Set([...allSchemaKeys, ...Object.keys(node.props)])];

  return (
    <div className="inspector" onClick={(e) => e.stopPropagation()}>
      <div className="inspector-head">
        <div className="labels">
          {node.labels.map(l => (
            <span key={l} className="label-chip"
              style={{ color: LABEL_COLORS[l], borderColor: LABEL_COLORS[l] }}>
              :{l}
            </span>
          ))}
        </div>
        <span className="id">{node.id}</span>
        <button className="close" onClick={onClose}>×</button>
      </div>
      <div className="inspector-body">
        <h5>Propiedades</h5>
        <div className="kv">
          {propKeys.map(k => {
            // type from any matching schema
            let type = '';
            for (const s of schemas) if (s[k]) { type = s[k]; break; }
            const v = node.props[k];
            return (
              <React.Fragment key={k}>
                <div className="k">{k}</div>
                <div className="v">
                  {v === undefined ? <span style={{color:'var(--text-dim)'}}>—</span> : formatVal(v)}
                  {type && <span className="type">·{type}</span>}
                </div>
              </React.Fragment>
            );
          })}
        </div>

        {(outgoing.length > 0) && <h5>Salientes ({outgoing.length})</h5>}
        <div className="rel-list">
          {outgoing.map(r => {
            const target = graph.nodes.find(n => n.id === r.to);
            return (
              <div key={r.id} className="rel-row" onClick={() => onSelect(r.to)}>
                <span className="arrow">─[</span>
                <span className="type">:{r.type}</span>
                <span className="arrow">]→ </span>
                {target ? (target.props.nombre || target.props.titulo || target.id) : r.to}
              </div>
            );
          })}
        </div>

        {(incoming.length > 0) && <h5>Entrantes ({incoming.length})</h5>}
        <div className="rel-list">
          {incoming.map(r => {
            const source = graph.nodes.find(n => n.id === r.from);
            return (
              <div key={r.id} className="rel-row" onClick={() => onSelect(r.from)}>
                {source ? (source.props.nombre || source.props.titulo || source.id) : r.from}
                <span className="arrow"> ─[</span>
                <span className="type">:{r.type}</span>
                <span className="arrow">]→</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// expose
Object.assign(window, { GraphView, Inspector, highlightCypher, LABEL_COLORS, primaryLabel, formatVal });
