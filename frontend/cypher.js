/* ============================================================
   cypher.js — Mini-intérprete Cypher sobre el grafo en memoria.
   Soporta el subset necesario para la rúbrica:
     CREATE (n:Label {props}) [, ...]
     CREATE (a)-[r:TYPE {props}]->(b)
     MATCH (a:Label {props})-[r:TYPE]->(b) WHERE ... RETURN ...
     OPTIONAL MATCH
     MERGE (n:Label {props}) ON CREATE SET ... ON MATCH SET ...
     SET n.prop = val, n:Label
     REMOVE n.prop, n:Label
     DELETE n          (con verificación de relaciones)
     DETACH DELETE n
     ORDER BY ... ASC|DESC
     LIMIT n
     funciones: count(*), count(x), avg(), sum(), min(), max(),
                collect(), size(), labels(), type(), keys(),
                date(), datetime(), toLower(), toUpper()
   El parser es deliberadamente tolerante; reporta errores claros.
   ============================================================ */

window.CypherEngine = (function () {

  // ====================================================
  //  TOKENIZER
  // ====================================================
  const KEYWORDS = new Set([
    'MATCH','OPTIONAL','CREATE','MERGE','DELETE','DETACH','SET','REMOVE',
    'WHERE','RETURN','ORDER','BY','ASC','DESC','LIMIT','SKIP',
    'AS','AND','OR','NOT','IN','XOR','IS','NULL','TRUE','FALSE',
    'WITH','UNWIND','DISTINCT','ON','CONTAINS','STARTS','ENDS'
  ]);

  function tokenize(src) {
    const tokens = [];
    let i = 0;
    const n = src.length;
    while (i < n) {
      const c = src[i];
      if (c === ' ' || c === '\t' || c === '\n' || c === '\r') { i++; continue; }
      if (c === '/' && src[i+1] === '/') { while (i<n && src[i] !== '\n') i++; continue; }
      // strings
      if (c === "'" || c === '"') {
        const quote = c; i++; let s = '';
        while (i < n && src[i] !== quote) {
          if (src[i] === '\\' && i+1 < n) { s += src[i+1]; i += 2; }
          else { s += src[i++]; }
        }
        if (src[i] !== quote) throw new Error("String sin cerrar");
        i++; tokens.push({ kind: 'str', value: s });
        continue;
      }
      // number
      if (/[0-9]/.test(c) || (c === '-' && /[0-9]/.test(src[i+1]||'') && !tokens.length || (c === '-' && /[0-9]/.test(src[i+1]||'') && tokens.length && /^(op|punct)$/.test(tokens[tokens.length-1].kind) && tokens[tokens.length-1].value !== ')'))) {
        let s = ''; if (c === '-') { s = '-'; i++; }
        while (i < n && /[0-9.]/.test(src[i])) s += src[i++];
        tokens.push({ kind: 'num', value: parseFloat(s) });
        continue;
      }
      // identifier / keyword
      if (/[A-Za-z_]/.test(c)) {
        let s = '';
        while (i < n && /[A-Za-z0-9_]/.test(src[i])) s += src[i++];
        const up = s.toUpperCase();
        if (up === 'TRUE')       tokens.push({ kind: 'bool', value: true });
        else if (up === 'FALSE') tokens.push({ kind: 'bool', value: false });
        else if (up === 'NULL')  tokens.push({ kind: 'null' });
        else if (KEYWORDS.has(up)) tokens.push({ kind: 'kw', value: up });
        else                     tokens.push({ kind: 'ident', value: s });
        continue;
      }
      // punctuation / operators
      const two = src.substr(i, 2);
      if (['<=','>=','<>','!=','->','<-','=~'].includes(two)) {
        tokens.push({ kind: 'op', value: two });
        i += 2; continue;
      }
      if ('()[]{},.:;|+*/=<>-'.includes(c)) {
        tokens.push({ kind: 'punct', value: c });
        i++; continue;
      }
      throw new Error("Carácter inesperado: " + c);
    }
    return tokens;
  }

  // ====================================================
  //  PARSER  (recursive descent)
  // ====================================================
  function Parser(tokens) {
    this.t = tokens; this.i = 0;
  }
  Parser.prototype.peek = function (o = 0) { return this.t[this.i + o]; };
  Parser.prototype.eat = function () { return this.t[this.i++]; };
  Parser.prototype.eof = function () { return this.i >= this.t.length; };
  Parser.prototype.matchKw = function (...kws) {
    const tk = this.peek();
    if (tk && tk.kind === 'kw' && kws.includes(tk.value)) { this.i++; return tk; }
    return null;
  };
  Parser.prototype.expect = function (kind, value) {
    const tk = this.peek();
    if (!tk || tk.kind !== kind || (value !== undefined && tk.value !== value)) {
      throw new Error("Se esperaba " + (value || kind) + " y vino "
        + (tk ? (tk.value !== undefined ? tk.value : tk.kind) : 'EOF'));
    }
    return this.eat();
  };
  Parser.prototype.expectPunct = function (v) { return this.expect('punct', v); };
  Parser.prototype.expectKw = function (v) { return this.expect('kw', v); };

  // entry
  Parser.prototype.parseQuery = function () {
    const clauses = [];
    while (!this.eof()) {
      const tk = this.peek();
      if (!tk) break;
      if (tk.kind === 'punct' && tk.value === ';') { this.i++; continue; }
      if (tk.kind !== 'kw') throw new Error("Cláusula esperada, vino: " + JSON.stringify(tk));
      switch (tk.value) {
        case 'MATCH':    clauses.push(this.parseMatch(false)); break;
        case 'OPTIONAL': this.eat(); this.expectKw('MATCH'); clauses.push(this.parseMatch(true)); break;
        case 'CREATE':   clauses.push(this.parseCreate()); break;
        case 'MERGE':    clauses.push(this.parseMerge()); break;
        case 'WHERE':    clauses.push(this.parseWhere()); break;
        case 'RETURN':   clauses.push(this.parseReturn()); break;
        case 'SET':      clauses.push(this.parseSet()); break;
        case 'REMOVE':   clauses.push(this.parseRemove()); break;
        case 'DELETE':   clauses.push(this.parseDelete(false)); break;
        case 'DETACH':   this.eat(); this.expectKw('DELETE'); clauses.push(this.parseDelete(true)); break;
        case 'ORDER':    clauses.push(this.parseOrderBy()); break;
        case 'LIMIT':    clauses.push(this.parseLimit()); break;
        case 'SKIP':     clauses.push(this.parseSkip()); break;
        case 'WITH':     clauses.push(this.parseWith()); break;
        default: throw new Error("Cláusula no soportada: " + tk.value);
      }
    }
    return clauses;
  };

  Parser.prototype.parsePattern = function () {
    // pattern = nodePat ((-[r]->|<-[r]-|--) nodePat)*
    const parts = [];
    parts.push(this.parseNodePat());
    while (true) {
      const tk = this.peek();
      if (!tk) break;
      // edge starts with '-' or '<-'
      if (tk.kind === 'punct' && tk.value === '-') {
        const e = this.parseEdgePat('out-or-undirected'); parts.push(e);
        parts.push(this.parseNodePat());
      } else if (tk.kind === 'op' && tk.value === '<-') {
        this.eat();
        const e = this.parseEdgeBody(); e.direction = 'in';
        // expect '-'
        this.expectPunct('-');
        parts.push(e);
        parts.push(this.parseNodePat());
      } else break;
    }
    return parts;
  };

  Parser.prototype.parseEdgePat = function () {
    // already saw '-'. Could be "-[...]-" or "-[...]->", or "--"
    this.expectPunct('-');
    let body = { variable: null, types: [], props: {}, direction: 'undirected' };
    if (this.peek() && this.peek().kind === 'punct' && this.peek().value === '[') {
      body = this.parseEdgeBody();
    }
    // expect ending '-' or '->' (op)
    const tk = this.peek();
    if (tk && tk.kind === 'op' && tk.value === '->') { this.eat(); body.direction = 'out'; }
    else { this.expectPunct('-'); /* undirected */ }
    return { kind: 'edge', ...body };
  };

  Parser.prototype.parseEdgeBody = function () {
    // assumes current is '['
    this.expectPunct('[');
    let variable = null, types = [], props = {};
    if (this.peek() && this.peek().kind === 'ident') { variable = this.eat().value; }
    if (this.peek() && this.peek().kind === 'punct' && this.peek().value === ':') {
      this.eat();
      types.push(this.expect('ident').value);
      while (this.peek() && this.peek().kind === 'punct' && this.peek().value === '|') {
        this.eat();
        if (this.peek().kind === 'punct' && this.peek().value === ':') this.eat();
        types.push(this.expect('ident').value);
      }
    }
    if (this.peek() && this.peek().kind === 'punct' && this.peek().value === '{') {
      props = this.parsePropsMap();
    }
    this.expectPunct(']');
    return { kind: 'edge', variable, types, props };
  };

  Parser.prototype.parseNodePat = function () {
    this.expectPunct('(');
    let variable = null, labels = [], props = {};
    if (this.peek() && this.peek().kind === 'ident') { variable = this.eat().value; }
    while (this.peek() && this.peek().kind === 'punct' && this.peek().value === ':') {
      this.eat();
      labels.push(this.expect('ident').value);
    }
    if (this.peek() && this.peek().kind === 'punct' && this.peek().value === '{') {
      props = this.parsePropsMap();
    }
    this.expectPunct(')');
    return { kind: 'node', variable, labels, props };
  };

  Parser.prototype.parsePropsMap = function () {
    this.expectPunct('{');
    const map = {};
    if (!(this.peek().kind === 'punct' && this.peek().value === '}')) {
      while (true) {
        const k = this.expect('ident').value;
        this.expectPunct(':');
        const v = this.parseExpression();
        map[k] = v;
        if (this.peek() && this.peek().kind === 'punct' && this.peek().value === ',') { this.eat(); continue; }
        break;
      }
    }
    this.expectPunct('}');
    return map;
  };

  Parser.prototype.parseMatch = function (optional) {
    this.expectKw('MATCH');
    const patterns = [this.parsePattern()];
    while (this.peek() && this.peek().kind === 'punct' && this.peek().value === ',') {
      this.eat(); patterns.push(this.parsePattern());
    }
    return { kind: 'MATCH', optional, patterns };
  };

  Parser.prototype.parseCreate = function () {
    this.expectKw('CREATE');
    const patterns = [this.parsePattern()];
    while (this.peek() && this.peek().kind === 'punct' && this.peek().value === ',') {
      this.eat(); patterns.push(this.parsePattern());
    }
    return { kind: 'CREATE', patterns };
  };

  Parser.prototype.parseMerge = function () {
    this.expectKw('MERGE');
    const pattern = this.parsePattern();
    const onCreate = []; const onMatch = [];
    while (this.peek() && this.peek().kind === 'kw' && this.peek().value === 'ON') {
      this.eat();
      const which = this.expect('kw').value;
      this.expectKw('SET');
      const sets = this.parseSetList();
      if (which === 'CREATE') onCreate.push(...sets);
      else if (which === 'MATCH') onMatch.push(...sets);
    }
    return { kind: 'MERGE', pattern, onCreate, onMatch };
  };

  Parser.prototype.parseWhere = function () {
    this.expectKw('WHERE');
    return { kind: 'WHERE', expr: this.parseExpression() };
  };

  Parser.prototype.parseReturn = function () {
    this.expectKw('RETURN');
    let distinct = false;
    if (this.matchKw('DISTINCT')) distinct = true;
    const items = [];
    while (true) {
      const expr = this.parseExpression();
      let alias = null;
      if (this.matchKw('AS')) alias = this.expect('ident').value;
      items.push({ expr, alias });
      if (this.peek() && this.peek().kind === 'punct' && this.peek().value === ',') { this.eat(); continue; }
      break;
    }
    return { kind: 'RETURN', distinct, items };
  };

  Parser.prototype.parseSetList = function () {
    const items = [];
    while (true) {
      // could be: var.prop = expr | var = {map} | var:Label | var += {map}
      const v = this.expect('ident').value;
      const tk = this.peek();
      if (tk && tk.kind === 'punct' && tk.value === ':') {
        this.eat();
        const lab = this.expect('ident').value;
        items.push({ kind: 'addLabel', variable: v, label: lab });
      } else if (tk && tk.kind === 'punct' && tk.value === '.') {
        this.eat();
        const prop = this.expect('ident').value;
        // optional '+=' not supported on .prop
        this.expect('punct', '=');
        const val = this.parseExpression();
        items.push({ kind: 'setProp', variable: v, prop, value: val });
      } else if (tk && tk.kind === 'punct' && tk.value === '=') {
        this.eat();
        if (this.peek().kind === 'punct' && this.peek().value === '{') {
          const map = this.parsePropsMap();
          items.push({ kind: 'replaceProps', variable: v, map });
        } else {
          throw new Error("SET v = expects map literal");
        }
      } else if (tk && tk.kind === 'op' && tk.value === '=~') {
        throw new Error("Operador =~ no soportado en SET");
      } else {
        throw new Error("SET: forma no soportada cerca de " + JSON.stringify(tk));
      }
      if (this.peek() && this.peek().kind === 'punct' && this.peek().value === ',') { this.eat(); continue; }
      break;
    }
    return items;
  };

  Parser.prototype.parseSet = function () {
    this.expectKw('SET');
    return { kind: 'SET', items: this.parseSetList() };
  };

  Parser.prototype.parseRemove = function () {
    this.expectKw('REMOVE');
    const items = [];
    while (true) {
      const v = this.expect('ident').value;
      const tk = this.peek();
      if (tk && tk.kind === 'punct' && tk.value === ':') {
        this.eat();
        const lab = this.expect('ident').value;
        items.push({ kind: 'removeLabel', variable: v, label: lab });
      } else if (tk && tk.kind === 'punct' && tk.value === '.') {
        this.eat();
        const prop = this.expect('ident').value;
        items.push({ kind: 'removeProp', variable: v, prop });
      } else throw new Error("REMOVE: forma inválida");
      if (this.peek() && this.peek().kind === 'punct' && this.peek().value === ',') { this.eat(); continue; }
      break;
    }
    return { kind: 'REMOVE', items };
  };

  Parser.prototype.parseDelete = function (detach) {
    this.expectKw('DELETE');
    const vars = [];
    while (true) {
      vars.push(this.expect('ident').value);
      if (this.peek() && this.peek().kind === 'punct' && this.peek().value === ',') { this.eat(); continue; }
      break;
    }
    return { kind: 'DELETE', detach, vars };
  };

  Parser.prototype.parseOrderBy = function () {
    this.expectKw('ORDER'); this.expectKw('BY');
    const items = [];
    while (true) {
      const expr = this.parseExpression();
      let dir = 'ASC';
      if (this.matchKw('ASC')) dir = 'ASC';
      else if (this.matchKw('DESC')) dir = 'DESC';
      items.push({ expr, dir });
      if (this.peek() && this.peek().kind === 'punct' && this.peek().value === ',') { this.eat(); continue; }
      break;
    }
    return { kind: 'ORDER', items };
  };

  Parser.prototype.parseLimit = function () {
    this.expectKw('LIMIT');
    const n = this.parseExpression();
    return { kind: 'LIMIT', expr: n };
  };
  Parser.prototype.parseSkip = function () {
    this.expectKw('SKIP');
    const n = this.parseExpression();
    return { kind: 'SKIP', expr: n };
  };
  Parser.prototype.parseWith = function () {
    this.expectKw('WITH');
    const items = [];
    while (true) {
      const expr = this.parseExpression();
      let alias = null;
      if (this.matchKw('AS')) alias = this.expect('ident').value;
      items.push({ expr, alias });
      if (this.peek() && this.peek().kind === 'punct' && this.peek().value === ',') { this.eat(); continue; }
      break;
    }
    return { kind: 'WITH', items };
  };

  // ===== Expressions (precedence: OR > AND > NOT > comparison > additive > mult > unary > primary) =====
  Parser.prototype.parseExpression = function () { return this.parseOr(); };
  Parser.prototype.parseOr = function () {
    let left = this.parseAnd();
    while (this.matchKw('OR')) {
      const right = this.parseAnd();
      left = { kind: 'binop', op: 'OR', left, right };
    }
    return left;
  };
  Parser.prototype.parseAnd = function () {
    let left = this.parseNot();
    while (this.matchKw('AND')) {
      const right = this.parseNot();
      left = { kind: 'binop', op: 'AND', left, right };
    }
    return left;
  };
  Parser.prototype.parseNot = function () {
    if (this.matchKw('NOT')) {
      return { kind: 'unop', op: 'NOT', operand: this.parseNot() };
    }
    return this.parseComparison();
  };
  Parser.prototype.parseComparison = function () {
    let left = this.parseAdditive();
    while (true) {
      const tk = this.peek(); if (!tk) break;
      let op = null;
      if (tk.kind === 'punct' && (tk.value === '=' || tk.value === '<' || tk.value === '>')) { op = tk.value; this.eat(); }
      else if (tk.kind === 'op' && ['<=','>=','<>','!='].includes(tk.value)) { op = tk.value; this.eat(); }
      else if (tk.kind === 'kw' && tk.value === 'IN') { op = 'IN'; this.eat(); }
      else if (tk.kind === 'kw' && tk.value === 'CONTAINS') { op = 'CONTAINS'; this.eat(); }
      else if (tk.kind === 'kw' && tk.value === 'STARTS') { this.eat(); this.expectKw('WITH' in {} ? 'WITH' : 'WITH'); op = 'STARTS_WITH'; }
      else if (tk.kind === 'kw' && tk.value === 'ENDS')  { this.eat(); this.expectKw('WITH'); op = 'ENDS_WITH'; }
      else if (tk.kind === 'kw' && tk.value === 'IS')    { this.eat();
        if (this.matchKw('NOT')) { this.expectKw('NULL'); return { kind: 'binop', op: 'IS_NOT_NULL', left, right: null }; }
        this.expectKw('NULL');
        return { kind: 'binop', op: 'IS_NULL', left, right: null };
      }
      else break;
      const right = this.parseAdditive();
      left = { kind: 'binop', op, left, right };
    }
    return left;
  };
  Parser.prototype.parseAdditive = function () {
    let left = this.parseMul();
    while (true) {
      const tk = this.peek(); if (!tk) break;
      if (tk.kind === 'punct' && (tk.value === '+' || tk.value === '-')) {
        this.eat();
        const right = this.parseMul();
        left = { kind: 'binop', op: tk.value, left, right };
      } else break;
    }
    return left;
  };
  Parser.prototype.parseMul = function () {
    let left = this.parseUnary();
    while (true) {
      const tk = this.peek(); if (!tk) break;
      if (tk.kind === 'punct' && (tk.value === '*' || tk.value === '/')) {
        this.eat();
        const right = this.parseUnary();
        left = { kind: 'binop', op: tk.value, left, right };
      } else break;
    }
    return left;
  };
  Parser.prototype.parseUnary = function () {
    const tk = this.peek();
    if (tk && tk.kind === 'punct' && tk.value === '-') {
      this.eat();
      return { kind: 'unop', op: 'neg', operand: this.parseUnary() };
    }
    return this.parsePrimary();
  };
  Parser.prototype.parsePrimary = function () {
    const tk = this.peek();
    if (!tk) throw new Error("Expresión esperada");
    if (tk.kind === 'num')  { this.eat(); return { kind: 'lit', value: tk.value }; }
    if (tk.kind === 'str')  { this.eat(); return { kind: 'lit', value: tk.value }; }
    if (tk.kind === 'bool') { this.eat(); return { kind: 'lit', value: tk.value }; }
    if (tk.kind === 'null') { this.eat(); return { kind: 'lit', value: null }; }
    if (tk.kind === 'punct' && tk.value === '(') {
      this.eat(); const e = this.parseExpression(); this.expectPunct(')'); return e;
    }
    if (tk.kind === 'punct' && tk.value === '[') {
      this.eat();
      const items = [];
      if (!(this.peek().kind === 'punct' && this.peek().value === ']')) {
        while (true) {
          items.push(this.parseExpression());
          if (this.peek() && this.peek().kind === 'punct' && this.peek().value === ',') { this.eat(); continue; }
          break;
        }
      }
      this.expectPunct(']');
      return { kind: 'list', items };
    }
    if (tk.kind === 'punct' && tk.value === '{') {
      const map = this.parsePropsMap();
      return { kind: 'mapLit', map };
    }
    if (tk.kind === 'punct' && tk.value === '*') {
      this.eat(); return { kind: 'star' };
    }
    if (tk.kind === 'ident') {
      this.eat();
      // function call?
      if (this.peek() && this.peek().kind === 'punct' && this.peek().value === '(') {
        this.eat();
        let distinct = false;
        if (this.peek() && this.peek().kind === 'kw' && this.peek().value === 'DISTINCT') { this.eat(); distinct = true; }
        const args = [];
        if (!(this.peek().kind === 'punct' && this.peek().value === ')')) {
          while (true) {
            args.push(this.parseExpression());
            if (this.peek() && this.peek().kind === 'punct' && this.peek().value === ',') { this.eat(); continue; }
            break;
          }
        }
        this.expectPunct(')');
        return { kind: 'call', name: tk.value, args, distinct };
      }
      // property access chain
      let node = { kind: 'var', name: tk.value };
      while (this.peek() && this.peek().kind === 'punct' && this.peek().value === '.') {
        this.eat();
        const p = this.expect('ident').value;
        node = { kind: 'prop', target: node, prop: p };
      }
      return node;
    }
    if (tk.kind === 'kw' && tk.value === 'COUNT') { // safety
      // not used (count is ident in lexer)
    }
    throw new Error("Token inesperado: " + JSON.stringify(tk));
  };

  // ====================================================
  //  EXECUTOR
  // ====================================================
  function deepClone(o) { return JSON.parse(JSON.stringify(o)); }

  function valLit(graph, n) {
    if (n.kind === 'lit') return n.value;
    return null;
  }

  function evalProps(map, env, graph) {
    const out = {};
    for (const k of Object.keys(map)) out[k] = evalExpr(map[k], env, graph);
    return out;
  }

  function getEntity(env, name) {
    return env[name];
  }

  function evalExpr(node, env, graph) {
    if (!node) return null;
    switch (node.kind) {
      case 'lit': return node.value;
      case 'star': return '*';
      case 'list': return node.items.map(x => evalExpr(x, env, graph));
      case 'mapLit': return evalProps(node.map, env, graph);
      case 'var': {
        if (!(node.name in env)) return null;
        return env[node.name];
      }
      case 'prop': {
        const t = evalExpr(node.target, env, graph);
        if (t == null) return null;
        if (t.props && node.prop in t.props) return t.props[node.prop];
        // for entity: support .id
        if (node.prop === 'id') return t.id;
        return null;
      }
      case 'unop': {
        const v = evalExpr(node.operand, env, graph);
        if (node.op === 'NOT') return !v;
        if (node.op === 'neg') return -v;
        return null;
      }
      case 'binop': {
        const op = node.op;
        if (op === 'AND') return !!evalExpr(node.left, env, graph) && !!evalExpr(node.right, env, graph);
        if (op === 'OR')  return !!evalExpr(node.left, env, graph) || !!evalExpr(node.right, env, graph);
        const L = evalExpr(node.left, env, graph);
        if (op === 'IS_NULL') return L == null;
        if (op === 'IS_NOT_NULL') return L != null;
        const R = evalExpr(node.right, env, graph);
        switch (op) {
          case '=':  return L === R;
          case '<>': case '!=': return L !== R;
          case '<':  return L < R;
          case '<=': return L <= R;
          case '>':  return L > R;
          case '>=': return L >= R;
          case '+':  return (Array.isArray(L) ? [...L, ...(Array.isArray(R)?R:[R])] : L + R);
          case '-':  return L - R;
          case '*':  return L * R;
          case '/':  return L / R;
          case 'IN': return Array.isArray(R) && R.includes(L);
          case 'CONTAINS': return typeof L === 'string' && typeof R === 'string' && L.includes(R);
          case 'STARTS_WITH': return typeof L === 'string' && L.startsWith(R);
          case 'ENDS_WITH':   return typeof L === 'string' && L.endsWith(R);
          default: throw new Error("op desconocido " + op);
        }
      }
      case 'call': {
        const name = node.name.toLowerCase();
        // aggregates handled separately at projection level — here treat scalar
        if (['count','avg','sum','min','max','collect'].includes(name)) {
          // out of context, evaluate first arg
          const a = node.args.map(x => evalExpr(x, env, graph));
          return a[0];
        }
        if (name === 'size') {
          const a = evalExpr(node.args[0], env, graph);
          if (Array.isArray(a)) return a.length;
          if (typeof a === 'string') return a.length;
          return 0;
        }
        if (name === 'labels') {
          const a = evalExpr(node.args[0], env, graph);
          return a && a.labels ? [...a.labels] : [];
        }
        if (name === 'type') {
          const a = evalExpr(node.args[0], env, graph);
          return a && a.type ? a.type : null;
        }
        if (name === 'keys') {
          const a = evalExpr(node.args[0], env, graph);
          return a && a.props ? Object.keys(a.props) : [];
        }
        if (name === 'tolower') return String(evalExpr(node.args[0], env, graph) || '').toLowerCase();
        if (name === 'toupper') return String(evalExpr(node.args[0], env, graph) || '').toUpperCase();
        if (name === 'date' || name === 'datetime') {
          const a = node.args.length ? evalExpr(node.args[0], env, graph) : null;
          return a || new Date().toISOString().slice(0, name === 'date' ? 10 : 19);
        }
        if (name === 'tointeger') return parseInt(evalExpr(node.args[0], env, graph), 10);
        if (name === 'tofloat')   return parseFloat(evalExpr(node.args[0], env, graph));
        throw new Error("Función no soportada: " + name);
      }
      default: throw new Error("Nodo expr desconocido: " + node.kind);
    }
  }

  // --- Pattern matching ---
  function findNodes(graph, labels, props) {
    return graph.nodes.filter(n => {
      for (const lab of labels) if (!n.labels.includes(lab)) return false;
      for (const k of Object.keys(props)) {
        const want = props[k];
        if (n.props[k] !== want) return false;
      }
      return true;
    });
  }

  function matchPattern(graph, parts, env) {
    // parts: alternating node, edge, node, edge, ...
    if (parts.length === 1) {
      const np = parts[0];
      const cands = findNodes(graph, np.labels, evalProps(np.props, env, graph));
      return cands.map(n => {
        const e = { ...env };
        if (np.variable) e[np.variable] = n;
        return e;
      });
    }
    // recursive: take first node, first edge, second node
    let results = [];
    const firstNode = parts[0];
    const cands = findNodes(graph, firstNode.labels, evalProps(firstNode.props, env, graph));
    for (const a of cands) {
      const e0 = { ...env };
      if (firstNode.variable) e0[firstNode.variable] = a;
      results.push(...extendPattern(graph, parts, 1, a, e0));
    }
    return results;
  }

  function extendPattern(graph, parts, idx, prevNode, env) {
    if (idx >= parts.length) return [env];
    const edgePat = parts[idx];
    const nodePat = parts[idx + 1];
    // candidate edges
    const out = [];
    for (const r of graph.rels) {
      if (edgePat.types.length && !edgePat.types.includes(r.type)) continue;
      // direction
      let other = null;
      if (edgePat.direction === 'out') {
        if (r.from !== prevNode.id) continue;
        other = graph.nodes.find(x => x.id === r.to);
      } else if (edgePat.direction === 'in') {
        if (r.to !== prevNode.id) continue;
        other = graph.nodes.find(x => x.id === r.from);
      } else { // undirected
        if (r.from === prevNode.id) other = graph.nodes.find(x => x.id === r.to);
        else if (r.to === prevNode.id) other = graph.nodes.find(x => x.id === r.from);
        else continue;
      }
      if (!other) continue;
      // node pattern check
      for (const lab of nodePat.labels) if (!other.labels.includes(lab)) { other = null; break; }
      if (!other) continue;
      const wantProps = evalProps(nodePat.props, env, graph);
      let ok = true;
      for (const k of Object.keys(wantProps)) if (other.props[k] !== wantProps[k]) { ok = false; break; }
      if (!ok) continue;
      const wantEProps = evalProps(edgePat.props, env, graph);
      let oke = true;
      for (const k of Object.keys(wantEProps)) if (r.props[k] !== wantEProps[k]) { oke = false; break; }
      if (!oke) continue;
      const e2 = { ...env };
      if (edgePat.variable) e2[edgePat.variable] = r;
      if (nodePat.variable) e2[nodePat.variable] = other;
      out.push(...extendPattern(graph, parts, idx + 2, other, e2));
    }
    return out;
  }

  // --- Aggregation detection ---
  function isAgg(expr) {
    if (!expr) return false;
    if (expr.kind === 'call' && ['count','avg','sum','min','max','collect'].includes(expr.name.toLowerCase())) return true;
    if (expr.kind === 'binop') return isAgg(expr.left) || isAgg(expr.right);
    if (expr.kind === 'unop')  return isAgg(expr.operand);
    return false;
  }

  function evalAgg(expr, rows, graph) {
    // recursively evaluate, using aggregator on rows when needed
    if (expr.kind === 'call' && ['count','avg','sum','min','max','collect'].includes(expr.name.toLowerCase())) {
      const name = expr.name.toLowerCase();
      const arg = expr.args[0];
      let values;
      if (name === 'count' && arg && arg.kind === 'star') values = rows.map(_ => 1);
      else values = rows.map(r => evalExpr(arg, r, graph)).filter(v => v != null);
      if (expr.distinct) values = [...new Set(values.map(v => JSON.stringify(v)))].map(s => JSON.parse(s));
      switch (name) {
        case 'count': return values.length;
        case 'avg': return values.length ? values.reduce((a,b)=>a+b,0)/values.length : null;
        case 'sum': return values.reduce((a,b)=>a+(b||0), 0);
        case 'min': return values.length ? values.reduce((a,b)=>a<b?a:b) : null;
        case 'max': return values.length ? values.reduce((a,b)=>a>b?a:b) : null;
        case 'collect': return values;
      }
    }
    if (expr.kind === 'binop') {
      const L = evalAgg(expr.left, rows, graph);
      const R = evalAgg(expr.right, rows, graph);
      switch (expr.op) {
        case '+': return L+R; case '-': return L-R;
        case '*': return L*R; case '/': return L/R;
      }
    }
    if (expr.kind === 'unop' && expr.op === 'neg') return -evalAgg(expr.operand, rows, graph);
    // non-agg → constant on first row
    return rows.length ? evalExpr(expr, rows[0], graph) : null;
  }

  // --- Entry executor ---
  function execute(query, graph, opts = {}) {
    const tokens = tokenize(query);
    const parser = new Parser(tokens);
    const clauses = parser.parseQuery();

    // Track stats
    const stats = {
      nodesCreated: 0, nodesDeleted: 0,
      relsCreated: 0,  relsDeleted: 0,
      labelsAdded: 0,  labelsRemoved: 0,
      propsSet: 0,     propsRemoved: 0,
    };

    let rows = [{}]; // env rows

    let returnSpec = null;
    let orderSpec = null;
    let limitN = null;
    let skipN  = null;

    for (const c of clauses) {
      if (c.kind === 'MATCH') {
        const newRows = [];
        for (const env of rows) {
          let extended = [];
          for (const pat of c.patterns) {
            const matched = matchPattern(graph, pat, env);
            extended = extended.length ? crossEnv(extended, matched) : matched;
          }
          if (extended.length) newRows.push(...extended);
          else if (c.optional) newRows.push(env);
        }
        rows = newRows;
      } else if (c.kind === 'WHERE') {
        rows = rows.filter(env => !!evalExpr(c.expr, env, graph));
      } else if (c.kind === 'CREATE') {
        rows = rows.map(env => {
          for (const pat of c.patterns) {
            createPattern(graph, pat, env, stats);
          }
          return env;
        });
      } else if (c.kind === 'MERGE') {
        rows = rows.flatMap(env => mergePattern(graph, c, env, stats));
      } else if (c.kind === 'SET') {
        for (const env of rows) applySetItems(graph, c.items, env, stats);
      } else if (c.kind === 'REMOVE') {
        for (const env of rows) applyRemoveItems(graph, c.items, env, stats);
      } else if (c.kind === 'DELETE') {
        for (const env of rows) applyDelete(graph, c.vars, c.detach, env, stats);
      } else if (c.kind === 'RETURN') {
        returnSpec = c;
      } else if (c.kind === 'ORDER') {
        orderSpec = c;
      } else if (c.kind === 'LIMIT') {
        limitN = evalExpr(c.expr, rows[0] || {}, graph);
      } else if (c.kind === 'SKIP') {
        skipN = evalExpr(c.expr, rows[0] || {}, graph);
      } else if (c.kind === 'WITH') {
        // simple WITH — project items as env
        rows = projectRows(rows, c.items, graph, true).rows;
      }
    }

    // Build result
    let columns = [];
    let resultRows = [];
    if (returnSpec) {
      const items = returnSpec.items;
      columns = items.map((it, idx) => it.alias || stringifyExpr(it.expr) || ('col'+idx));

      const aggMode = items.some(it => isAgg(it.expr));
      if (aggMode) {
        // single-group aggregation (no GROUP BY support yet) — but support implicit group by non-agg keys
        const groups = new Map();
        const nonAggIdx = items.map((it,i) => isAgg(it.expr) ? null : i).filter(i => i!==null);
        for (const env of rows) {
          const key = JSON.stringify(nonAggIdx.map(i => evalExpr(items[i].expr, env, graph)));
          if (!groups.has(key)) groups.set(key, []);
          groups.get(key).push(env);
        }
        if (groups.size === 0) {
          // even with no rows, count(*) should give 0
          const r = items.map(it => isAgg(it.expr) ? evalAgg(it.expr, [], graph) : null);
          resultRows = [r];
        } else {
          for (const [, gRows] of groups) {
            const r = items.map(it =>
              isAgg(it.expr) ? evalAgg(it.expr, gRows, graph)
                              : evalExpr(it.expr, gRows[0], graph)
            );
            resultRows.push(r);
          }
        }
      } else {
        for (const env of rows) {
          resultRows.push(items.map(it => evalExpr(it.expr, env, graph)));
        }
      }

      if (returnSpec.distinct) {
        const seen = new Set(); const dedup = [];
        for (const r of resultRows) {
          const k = JSON.stringify(r);
          if (!seen.has(k)) { seen.add(k); dedup.push(r); }
        }
        resultRows = dedup;
      }
      if (orderSpec) {
        const idxs = orderSpec.items.map(o => {
          // find column by stringified expr or alias
          const key = stringifyExpr(o.expr);
          let i = items.findIndex(it => (it.alias && it.alias === key) || stringifyExpr(it.expr) === key);
          return { i, dir: o.dir, expr: o.expr };
        });
        resultRows.sort((a, b) => {
          for (const o of idxs) {
            let va = o.i >= 0 ? a[o.i] : null;
            let vb = o.i >= 0 ? b[o.i] : null;
            if (va == null && vb == null) continue;
            if (va == null) return 1;
            if (vb == null) return -1;
            if (va < vb) return o.dir === 'ASC' ? -1 : 1;
            if (va > vb) return o.dir === 'ASC' ? 1 : -1;
          }
          return 0;
        });
      }
      if (skipN != null)  resultRows = resultRows.slice(skipN);
      if (limitN != null) resultRows = resultRows.slice(0, limitN);
    }

    return { columns, rows: resultRows, stats, matched: rows.length };
  }

  function crossEnv(a, b) {
    const out = [];
    for (const x of a) for (const y of b) out.push({ ...x, ...y });
    return out;
  }

  function projectRows(rows, items, graph, asEnv) {
    const out = [];
    for (const env of rows) {
      const newEnv = asEnv ? {} : null;
      const r = items.map((it, idx) => {
        const v = evalExpr(it.expr, env, graph);
        const name = it.alias || stringifyExpr(it.expr) || ('col'+idx);
        if (asEnv) newEnv[name] = v;
        return v;
      });
      out.push(asEnv ? newEnv : r);
    }
    return { rows: out };
  }

  function stringifyExpr(e) {
    if (!e) return '';
    if (e.kind === 'var') return e.name;
    if (e.kind === 'prop') return stringifyExpr(e.target) + '.' + e.prop;
    if (e.kind === 'lit') return JSON.stringify(e.value);
    if (e.kind === 'star') return '*';
    if (e.kind === 'call') return e.name + '(' + e.args.map(stringifyExpr).join(',') + ')';
    if (e.kind === 'list') return '[' + e.items.map(stringifyExpr).join(',') + ']';
    return '?';
  }

  // === mutation helpers ===
  function newId(prefix, items) {
    let n = items.length ? Math.max(...items.map(x => parseInt(x.id.slice(1), 10))) + 1 : 1;
    return prefix + n;
  }

  function createPattern(graph, parts, env, stats) {
    let prevNode = null;
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      if (p.kind === 'node') {
        let n;
        if (p.variable && env[p.variable] && env[p.variable].labels) {
          n = env[p.variable];
        } else {
          if (!p.labels.length) throw new Error("CREATE de nodo sin label requiere variable existente");
          n = {
            id: newId('n', graph.nodes),
            labels: [...p.labels],
            props: evalProps(p.props, env, graph),
          };
          graph.nodes.push(n);
          stats.nodesCreated++;
          if (p.variable) env[p.variable] = n;
        }
        prevNode = n;
      } else if (p.kind === 'edge') {
        const next = parts[i+1];
        // Resolve target node — must look ahead, create or fetch from env
        let other;
        if (next.variable && env[next.variable] && env[next.variable].labels) {
          other = env[next.variable];
        } else {
          if (!next.labels.length) throw new Error("CREATE relación: nodo destino requiere label o variable");
          other = {
            id: newId('n', graph.nodes),
            labels: [...next.labels],
            props: evalProps(next.props, env, graph),
          };
          graph.nodes.push(other);
          stats.nodesCreated++;
          if (next.variable) env[next.variable] = other;
        }
        if (!p.types.length) throw new Error("CREATE: relación requiere :TIPO");
        const dir = p.direction === 'out' ? 'out' : (p.direction === 'in' ? 'in' : 'out');
        const r = {
          id: newId('r', graph.rels),
          type: p.types[0],
          from: dir === 'out' ? prevNode.id : other.id,
          to:   dir === 'out' ? other.id   : prevNode.id,
          props: evalProps(p.props, env, graph),
        };
        graph.rels.push(r);
        stats.relsCreated++;
        if (p.variable) env[p.variable] = r;
        prevNode = other;
        i++; // skip next node (already consumed)
      }
    }
  }

  function mergePattern(graph, mergeC, env, stats) {
    const parts = mergeC.pattern;
    if (parts.length === 1) {
      const np = parts[0];
      const wantProps = evalProps(np.props, env, graph);
      const found = findNodes(graph, np.labels, wantProps);
      if (found.length) {
        const out = [];
        for (const n of found) {
          const e2 = { ...env };
          if (np.variable) e2[np.variable] = n;
          if (mergeC.onMatch.length) applySetItems(graph, mergeC.onMatch, e2, stats);
          out.push(e2);
        }
        return out;
      } else {
        const n = {
          id: newId('n', graph.nodes),
          labels: [...np.labels],
          props: wantProps,
        };
        graph.nodes.push(n);
        stats.nodesCreated++;
        const e2 = { ...env };
        if (np.variable) e2[np.variable] = n;
        if (mergeC.onCreate.length) applySetItems(graph, mergeC.onCreate, e2, stats);
        return [e2];
      }
    }
    // MERGE de path: intentar match, sino crear
    const matches = matchPattern(graph, parts, env);
    if (matches.length) {
      if (mergeC.onMatch.length) for (const m of matches) applySetItems(graph, mergeC.onMatch, m, stats);
      return matches;
    }
    const e2 = { ...env };
    createPattern(graph, parts, e2, stats);
    if (mergeC.onCreate.length) applySetItems(graph, mergeC.onCreate, e2, stats);
    return [e2];
  }

  function applySetItems(graph, items, env, stats) {
    for (const it of items) {
      const ent = env[it.variable];
      if (!ent) throw new Error("SET: variable desconocida " + it.variable);
      if (it.kind === 'addLabel') {
        if (!ent.labels.includes(it.label)) { ent.labels.push(it.label); stats.labelsAdded++; }
      } else if (it.kind === 'setProp') {
        ent.props[it.prop] = evalExpr(it.value, env, graph);
        stats.propsSet++;
      } else if (it.kind === 'replaceProps') {
        ent.props = evalProps(it.map, env, graph);
        stats.propsSet++;
      }
    }
  }

  function applyRemoveItems(graph, items, env, stats) {
    for (const it of items) {
      const ent = env[it.variable];
      if (!ent) throw new Error("REMOVE: variable desconocida " + it.variable);
      if (it.kind === 'removeLabel') {
        const idx = ent.labels.indexOf(it.label);
        if (idx >= 0) { ent.labels.splice(idx, 1); stats.labelsRemoved++; }
      } else if (it.kind === 'removeProp') {
        if (it.prop in ent.props) { delete ent.props[it.prop]; stats.propsRemoved++; }
      }
    }
  }

  function applyDelete(graph, vars, detach, env, stats) {
    for (const v of vars) {
      const ent = env[v];
      if (!ent) continue;
      if (ent.type) {
        // it's a relationship
        const idx = graph.rels.indexOf(ent);
        if (idx >= 0) { graph.rels.splice(idx, 1); stats.relsDeleted++; }
      } else if (ent.labels) {
        const incident = graph.rels.filter(r => r.from === ent.id || r.to === ent.id);
        if (incident.length && !detach) {
          throw new Error(`No se puede DELETE el nodo ${ent.id} porque tiene ${incident.length} relación(es). Usa DETACH DELETE.`);
        }
        for (const r of incident) {
          const i = graph.rels.indexOf(r);
          if (i >= 0) { graph.rels.splice(i, 1); stats.relsDeleted++; }
        }
        const ni = graph.nodes.indexOf(ent);
        if (ni >= 0) { graph.nodes.splice(ni, 1); stats.nodesDeleted++; }
      }
    }
  }

  return { execute };
})();
