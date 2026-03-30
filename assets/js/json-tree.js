/**
 * json-tree.js
 * Collapsible tree explorer with search, copy, breadcrumbs, and node pinning
 */
const JSONTree = (() => {
  const LAZY_THRESHOLD = 100; // collapse large arrays by default
  let _container = null;
  let _breadcrumb = null;
  let _nodeDetail = null;
  let _searchMatches = [];
  let _searchIdx = 0;
  let _onSelect = null;

  function init(container, breadcrumb, nodeDetail, onSelect) {
    _container = container;
    _breadcrumb = breadcrumb;
    _nodeDetail = nodeDetail;
    _onSelect = onSelect;
  }

  function render(data, searchTerm = '') {
    if (!_container) return;
    _searchMatches = [];
    _searchIdx = 0;
    _container.innerHTML = '';
    const root = buildNode(data, null, '$', 0, searchTerm.toLowerCase());
    _container.appendChild(root);
    if (searchTerm && _searchMatches.length > 0) {
      scrollToMatch(0);
    }
    updateBreadcrumb(['root']);
  }

  function buildNode(value, key, path, depth, search) {
    const isObj = value !== null && typeof value === 'object';
    const isArr = Array.isArray(value);
    const nodeEl = document.createElement('div');
    nodeEl.className = 'tree-node';

    const row = document.createElement('div');
    row.className = 'tree-node-row';
    row.dataset.path = path;

    // Toggle button or placeholder
    if (isObj) {
      const toggle = document.createElement('span');
      toggle.className = 'tree-toggle';
      toggle.innerHTML = '&#9654;'; // ▶
      row.appendChild(toggle);
    } else {
      const ph = document.createElement('span');
      ph.className = 'tree-toggle-placeholder';
      row.appendChild(ph);
    }

    // Key
    if (key !== null) {
      const keySpan = document.createElement('span');
      keySpan.className = 'tree-key';
      keySpan.textContent = `"${key}"`;
      const colon = document.createElement('span');
      colon.className = 'tree-colon';
      colon.textContent = ': ';
      row.appendChild(keySpan);
      row.appendChild(colon);
    }

    // Value or summary
    if (isObj) {
      const keys = Object.keys(value);
      const summary = document.createElement('span');
      summary.className = 'tree-val-' + (isArr ? 'array' : 'object');
      const typeBadge = document.createElement('span');
      typeBadge.className = 'tree-type-badge';
      typeBadge.textContent = isArr ? 'array' : 'object';
      const countSpan = document.createElement('span');
      countSpan.className = 'tree-count';
      countSpan.textContent = ` ${keys.length} ${isArr ? 'items' : 'keys'}`;
      row.appendChild(summary);
      row.appendChild(typeBadge);
      row.appendChild(countSpan);
    } else {
      const valSpan = document.createElement('span');
      const vType = value === null ? 'null' : typeof value;
      valSpan.className = 'tree-val-' + vType;
      let dispVal = JSON.stringify(value);
      if (typeof value === 'string' && value.length > 200) {
        dispVal = `"${value.substring(0, 200)}…"`;
      }
      // Search highlighting
      if (search && dispVal.toLowerCase().includes(search)) {
        valSpan.innerHTML = highlightText(dispVal, search);
        row.classList.add('search-match');
        _searchMatches.push(row);
      } else {
        valSpan.textContent = dispVal;
      }
      row.appendChild(valSpan);
    }

    // Search match on key
    if (search && key !== null && String(key).toLowerCase().includes(search)) {
      row.classList.add('search-match');
      if (!_searchMatches.includes(row)) _searchMatches.push(row);
    }

    // Copy button
    const copyBtn = document.createElement('button');
    copyBtn.className = 'tree-copy-btn';
    copyBtn.innerHTML = '<i class="fas fa-copy"></i> copy';
    copyBtn.title = 'Copy value';
    copyBtn.addEventListener('click', e => {
      e.stopPropagation();
      const val = isObj ? JSON.stringify(value, null, 2) : JSON.stringify(value);
      navigator.clipboard.writeText(val).then(() => UI.toast('Copied!', 'success'));
    });
    row.appendChild(copyBtn);

    nodeEl.appendChild(row);

    // Children
    if (isObj) {
      const children = document.createElement('div');
      children.className = 'tree-children';
      children.style.display = 'none';
      const keys = Object.keys(value);
      const totalKeys = keys.length;
      const lazyLoad = totalKeys > LAZY_THRESHOLD;
      let rendered = 0;
      const batchSize = 50;

      function renderBatch() {
        const end = Math.min(rendered + batchSize, totalKeys);
        for (let i = rendered; i < end; i++) {
          const k = keys[i];
          const childPath = isArr ? `${path}[${k}]` : `${path}.${k}`;
          children.appendChild(buildNode(value[k], k, childPath, depth + 1, search));
        }
        rendered = end;
        if (rendered < totalKeys) {
          const moreBtn = document.createElement('button');
          moreBtn.className = 'btn btn-ghost btn-sm';
          moreBtn.style.margin = '.5rem';
          moreBtn.textContent = `Load more (${totalKeys - rendered} remaining)`;
          moreBtn.onclick = () => { moreBtn.remove(); renderBatch(); };
          children.appendChild(moreBtn);
        }
      }

      const toggle = row.querySelector('.tree-toggle');
      let open = !lazyLoad && depth < 2;

      function setOpen(val) {
        open = val;
        toggle.innerHTML = open ? '&#9660;' : '&#9654;';
        toggle.classList.toggle('open', open);
        children.style.display = open ? 'block' : 'none';
        if (open && rendered === 0) renderBatch();
      }

      setOpen(open);

      toggle.addEventListener('click', e => { e.stopPropagation(); setOpen(!open); });
      row.addEventListener('click', e => {
        if (e.target === toggle) return;
        setOpen(!open);
        selectNode(row, key, value, path);
      });

      nodeEl.appendChild(children);
    } else {
      row.addEventListener('click', () => selectNode(row, key, value, path));
    }

    return nodeEl;
  }

  function highlightText(text, search) {
    const idx = text.toLowerCase().indexOf(search);
    if (idx < 0) return escapeHtml(text);
    return escapeHtml(text.substring(0, idx)) +
      `<mark class="search-highlight">${escapeHtml(text.substring(idx, idx + search.length))}</mark>` +
      escapeHtml(text.substring(idx + search.length));
  }

  function escapeHtml(s) {
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function selectNode(row, key, value, path) {
    _container.querySelectorAll('.tree-node-row.selected').forEach(r => r.classList.remove('selected'));
    row.classList.add('selected');
    updateBreadcrumb(path.split('.').filter(Boolean));
    if (_nodeDetail) showNodeDetail(key, value, path);
    if (_onSelect) _onSelect({ key, value, path });
  }

  function showNodeDetail(key, value, path) {
    const type = value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;
    const size = type === 'string' ? value.length :
                 (type === 'object' || type === 'array') ? Object.keys(value).length : null;

    _nodeDetail.innerHTML = `
      <div class="node-detail-title"><i class="fas fa-crosshairs"></i> Selected Node</div>
      <div class="node-detail-grid">
        <span class="node-detail-label">Key:</span>
        <span class="node-detail-val">${key !== null ? escapeHtml(String(key)) : '(root)'}</span>
        <span class="node-detail-label">Type:</span>
        <span class="node-detail-val"><span class="badge badge-primary">${type}</span></span>
        <span class="node-detail-label">Path:</span>
        <span class="node-detail-val">
          ${escapeHtml(path)}
          <button class="btn btn-ghost btn-sm" onclick="navigator.clipboard.writeText('${escapeHtml(path)}').then(()=>UI.toast('Path copied!','success'))">
            <i class="fas fa-copy"></i>
          </button>
        </span>
        ${size !== null ? `<span class="node-detail-label">Size:</span><span class="node-detail-val">${size}</span>` : ''}
        ${type === 'string' ? `<span class="node-detail-label">Value:</span><span class="node-detail-val">"${escapeHtml(value)}"</span>` : ''}
        ${type === 'number' || type === 'boolean' ? `<span class="node-detail-label">Value:</span><span class="node-detail-val">${value}</span>` : ''}
      </div>
    `;
    _nodeDetail.style.display = 'block';
  }

  function updateBreadcrumb(parts) {
    if (!_breadcrumb) return;
    _breadcrumb.innerHTML = parts.map((p, i) =>
      `<span class="breadcrumb-item">${escapeHtml(String(p))}</span>${i < parts.length - 1 ? '<span class="breadcrumb-sep">/</span>' : ''}`
    ).join('');
  }

  function search(term) {
    _searchMatches = [];
    _searchIdx = 0;
    // Re-render with search
    return _searchMatches;
  }

  function nextMatch() {
    if (!_searchMatches.length) return;
    _searchIdx = (_searchIdx + 1) % _searchMatches.length;
    scrollToMatch(_searchIdx);
    return _searchIdx;
  }

  function prevMatch() {
    if (!_searchMatches.length) return;
    _searchIdx = (_searchIdx - 1 + _searchMatches.length) % _searchMatches.length;
    scrollToMatch(_searchIdx);
    return _searchIdx;
  }

  function scrollToMatch(idx) {
    if (!_searchMatches[idx]) return;
    _searchMatches.forEach((m, i) => {
      m.classList.toggle('search-highlight-active', i === idx);
    });
    _searchMatches[idx].scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function getMatchCount() { return _searchMatches.length; }
  function getMatchIndex() { return _searchIdx; }

  return { init, render, search, nextMatch, prevMatch, getMatchCount, getMatchIndex };
})();
