/**
 * json-parser.js
 * Safe JSON parsing with detailed error messages
 */
const JSONParser = (() => {
  /**
   * Parse JSON string, returning { data, error }
   * error is null on success, or { message, line, column, hint } on failure
   */
  function parse(str) {
    if (!str || !str.trim()) {
      return { data: null, error: { message: 'Empty input', line: null, column: null, hint: 'Paste or type JSON to get started.' } };
    }
    // Try auto-repair first on parse failure
    try {
      const data = JSON.parse(str);
      return { data, error: null };
    } catch (e) {
      const errInfo = parseError(e, str);
      // Try to offer a repair
      const repaired = tryRepair(str);
      if (repaired !== null) {
        errInfo.repairable = true;
        errInfo.repaired = repaired;
      }
      return { data: null, error: errInfo };
    }
  }

  function parseError(e, str) {
    const msg = e.message || String(e);
    let line = null;
    let column = null;
    let hint = null;

    // Extract position from error message (various engines)
    const posMatch = msg.match(/position\s+(\d+)/i) ||
                     msg.match(/at\s+(\d+)$/i) ||
                     msg.match(/\(line\s+(\d+)/i);
    if (posMatch) {
      const pos = parseInt(posMatch[1]);
      const lineCol = posToLineCol(str, pos);
      line = lineCol.line;
      column = lineCol.col;
    }

    // Friendly hints
    if (msg.includes('Unexpected token')) {
      const token = msg.match(/Unexpected token (.)/);
      const ch = token ? token[1] : '';
      if (ch === ',') hint = 'Trailing comma found. Remove the last comma before } or ].';
      else if (ch === '}') hint = 'Unexpected }. Check for missing comma or extra closing brace.';
      else if (ch === ']') hint = 'Unexpected ]. Check for missing comma or extra closing bracket.';
      else if (ch === '"') hint = 'Unexpected quote. Check for unescaped quotes inside strings.';
      else if (ch === "'") hint = "JSON requires double quotes, not single quotes.";
      else hint = `Unexpected character: ${ch}. Check JSON syntax around line ${line}.`;
    } else if (msg.includes('Unexpected end')) {
      hint = 'JSON appears incomplete. Check for unclosed brackets or braces.';
    } else if (msg.includes('Expected')) {
      hint = 'Missing required character. Check commas between properties or array elements.';
    } else {
      hint = 'Check for missing commas, unmatched brackets, or unquoted property names.';
    }

    return { message: msg, line, column, hint };
  }

  function posToLineCol(str, pos) {
    const lines = str.substring(0, pos).split('\n');
    return { line: lines.length, col: lines[lines.length - 1].length + 1 };
  }

  function tryRepair(str) {
    try {
      // Try removing trailing commas
      let repaired = str
        .replace(/,\s*([}\]])/g, '$1')     // trailing commas
        .replace(/([{,]\s*)(\w+):/g, '$1"$2":') // unquoted keys
        .replace(/:\s*'([^']*)'/g, ': "$1"');   // single-quoted values
      const data = JSON.parse(repaired);
      return data;
    } catch (_) {
      return null;
    }
  }

  /** Detect type name for a value */
  function typeName(val) {
    if (val === null) return 'null';
    if (Array.isArray(val)) return 'array';
    return typeof val;
  }

  /** Count nodes recursively */
  function countNodes(data) {
    let count = 1;
    if (data && typeof data === 'object') {
      Object.values(data).forEach(v => { count += countNodes(v); });
    }
    return count;
  }

  /** Compute max depth */
  function maxDepth(data, depth = 0) {
    if (data && typeof data === 'object') {
      const vals = Object.values(data);
      if (!vals.length) return depth;
      return Math.max(...vals.map(v => maxDepth(v, depth + 1)));
    }
    return depth;
  }

  /** Get keys at path using dot/bracket notation */
  function getByPath(data, path) {
    const parts = parsePath(path);
    let current = data;
    for (const p of parts) {
      if (current == null) return undefined;
      current = current[p];
    }
    return current;
  }

  function parsePath(path) {
    // Supports: a.b.c, a[0].b, ["key"]
    const parts = [];
    const re = /([^.[\]]+)|\[(\d+)\]|\["([^"]+)"\]/g;
    let m;
    while ((m = re.exec(path)) !== null) {
      if (m[1] !== undefined) parts.push(m[1]);
      else if (m[2] !== undefined) parts.push(parseInt(m[2]));
      else if (m[3] !== undefined) parts.push(m[3]);
    }
    return parts;
  }

  return { parse, typeName, countNodes, maxDepth, getByPath, parsePath };
})();
