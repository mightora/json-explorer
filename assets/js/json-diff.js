/**
 * json-diff.js
 * Structural JSON diff (not text-based)
 * Returns a diff tree with added/removed/changed/same nodes
 */
const JSONDiff = (() => {

  /**
   * Compare two JSON values recursively.
   * Returns a diff object tree.
   */
  function diff(left, right, path = '$') {
    if (deepEqual(left, right)) {
      return { type: 'same', path, left, right };
    }

    const leftType  = getType(left);
    const rightType = getType(right);

    if (leftType !== rightType) {
      return { type: 'changed', path, left, right, leftType, rightType };
    }

    if (leftType === 'object') {
      return diffObjects(left, right, path);
    }

    if (leftType === 'array') {
      return diffArrays(left, right, path);
    }

    return { type: 'changed', path, left, right };
  }

  function diffObjects(left, right, path) {
    const children = [];
    const allKeys = new Set([...Object.keys(left), ...Object.keys(right)]);

    let added = 0, removed = 0, changed = 0, same = 0;

    for (const key of allKeys) {
      const childPath = `${path}.${key}`;
      if (!(key in left)) {
        children.push({ type: 'added',   path: childPath, key, left: undefined, right: right[key] });
        added++;
      } else if (!(key in right)) {
        children.push({ type: 'removed', path: childPath, key, left: left[key], right: undefined });
        removed++;
      } else {
        const childDiff = diff(left[key], right[key], childPath);
        childDiff.key = key;
        children.push(childDiff);
        if (childDiff.type === 'same') same++;
        else if (childDiff.type === 'added') added++;
        else if (childDiff.type === 'removed') removed++;
        else changed++;
      }
    }

    return { type: 'object', path, children, stats: { added, removed, changed, same } };
  }

  function diffArrays(left, right, path) {
    const children = [];
    const maxLen = Math.max(left.length, right.length);
    let added = 0, removed = 0, changed = 0, same = 0;

    for (let i = 0; i < maxLen; i++) {
      const childPath = `${path}[${i}]`;
      if (i >= left.length) {
        children.push({ type: 'added',   path: childPath, key: i, left: undefined, right: right[i] });
        added++;
      } else if (i >= right.length) {
        children.push({ type: 'removed', path: childPath, key: i, left: left[i], right: undefined });
        removed++;
      } else {
        const childDiff = diff(left[i], right[i], childPath);
        childDiff.key = i;
        children.push(childDiff);
        if (childDiff.type === 'same') same++;
        else if (childDiff.type === 'added') added++;
        else if (childDiff.type === 'removed') removed++;
        else changed++;
      }
    }

    return { type: 'array', path, children, stats: { added, removed, changed, same } };
  }

  function getType(val) {
    if (val === null) return 'null';
    if (Array.isArray(val)) return 'array';
    return typeof val;
  }

  function deepEqual(a, b) {
    if (a === b) return true;
    if (a === null || b === null) return false;
    if (typeof a !== typeof b) return false;
    if (typeof a !== 'object') return a === b;
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    for (const k of keysA) {
      if (!deepEqual(a[k], b[k])) return false;
    }
    return true;
  }

  /** Aggregate stats from a diff tree */
  function getStats(diffTree) {
    const stats = { added: 0, removed: 0, changed: 0, same: 0 };
    walk(diffTree, node => {
      if (node.type === 'added')   stats.added++;
      else if (node.type === 'removed') stats.removed++;
      else if (node.type === 'changed') stats.changed++;
      else if (node.type === 'same')    stats.same++;
    });
    return stats;
  }

  function walk(node, fn) {
    fn(node);
    if (node.children) node.children.forEach(c => walk(c, fn));
  }

  /**
   * Render diff tree as HTML
   */
  function renderHTML(diffTree, showSame = true) {
    const div = document.createElement('div');
    div.className = 'diff-tree';
    renderNode(diffTree, div, 0, showSame);
    return div;
  }

  function renderNode(node, container, depth, showSame) {
    const indent = depth * 20;

    if (node.type === 'same' && !showSame) return;

    if (node.type === 'object' || node.type === 'array') {
      // Render children
      if (node.children) {
        node.children.forEach(child => renderNode(child, container, depth + 1, showSame));
      }
      return;
    }

    const row = document.createElement('div');
    row.className = `diff-row diff-row-${node.type}`;
    row.style.paddingLeft = indent + 'px';

    const key = node.key !== undefined ? `<span class="diff-row-key">"${escHtml(String(node.key))}"</span>: ` : '';

    if (node.type === 'added') {
      row.innerHTML = `<span class="diff-added">+ ${key}${formatVal(node.right)}</span>`;
    } else if (node.type === 'removed') {
      row.innerHTML = `<span class="diff-removed">− ${key}${formatVal(node.left)}</span>`;
    } else if (node.type === 'changed') {
      row.innerHTML = `<span class="diff-changed">~ ${key}<del class="diff-removed">${formatVal(node.left)}</del> → <ins class="diff-added">${formatVal(node.right)}</ins></span>`;
    } else if (node.type === 'same') {
      row.innerHTML = `<span class="diff-same">  ${key}${formatVal(node.left)}</span>`;
    }

    container.appendChild(row);
  }

  function formatVal(val) {
    if (val === undefined) return '<em>undefined</em>';
    const str = JSON.stringify(val);
    if (str && str.length > 120) return escHtml(str.substring(0, 120)) + '…';
    return escHtml(str || 'null');
  }

  function escHtml(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  return { diff, getStats, renderHTML, deepEqual };
})();
