/**
 * visualise.js
 * Auto-detect JSON structure and render appropriate visualisation
 */
const Visualise = (() => {

  let _chartInstances = {};

  function destroyChart(id) {
    if (_chartInstances[id]) {
      _chartInstances[id].destroy();
      delete _chartInstances[id];
    }
  }

  /**
   * Auto-detect the best visualisation for the data
   * Returns: 'table' | 'bar' | 'line' | 'pie' | 'tree'
   */
  function autoDetect(data) {
    if (Array.isArray(data)) {
      if (data.length === 0) return { type: 'empty', hint: 'Empty array' };
      // Array of objects → table / chart
      if (typeof data[0] === 'object' && data[0] !== null && !Array.isArray(data[0])) {
        const keys = Object.keys(data[0]);
        // Check for time-series: has a date/time key and a numeric key
        const dateKey = keys.find(k => /date|time|timestamp|created|at$/i.test(k));
        const numKeys = keys.filter(k => typeof data[0][k] === 'number');
        if (dateKey && numKeys.length > 0) {
          return { type: 'line', hint: 'Detected time-series data', dateKey, numKeys };
        }
        // Check for categories: a string key + a numeric key
        const strKey = keys.find(k => typeof data[0][k] === 'string');
        if (strKey && numKeys.length > 0 && data.length <= 50) {
          return { type: 'bar', hint: 'Detected categorical data', strKey, numKeys };
        }
        return { type: 'table', hint: 'Array of objects — showing as table' };
      }
      // Array of primitives → bar/pie
      if (data.every(v => typeof v === 'number')) {
        return { type: 'bar', hint: 'Array of numbers', raw: true };
      }
      if (data.every(v => typeof v === 'string')) {
        return { type: 'pie', hint: 'Array of strings — showing frequency', raw: true };
      }
      return { type: 'table', hint: 'Mixed array', raw: true };
    }
    if (data && typeof data === 'object') {
      const vals = Object.values(data);
      if (vals.every(v => typeof v === 'number')) {
        return { type: 'bar', hint: 'Object with numeric values', objChart: true };
      }
      return { type: 'tree', hint: 'Nested object — showing structure' };
    }
    return { type: 'raw', hint: 'Primitive value' };
  }

  /** Render based on detected type */
  function render(data, container, type = null) {
    container.innerHTML = '';
    const detected = autoDetect(data);
    const visType = type || detected.type;

    // Show hint
    if (detected.hint) {
      const hint = document.createElement('div');
      hint.className = 'visualise-hint';
      hint.innerHTML = `<span class="visualise-hint-icon">💡</span><span>${detected.hint}</span>`;
      container.appendChild(hint);
    }

    switch (visType) {
      case 'table':
        renderTable(data, container, detected);
        break;
      case 'bar':
        renderBar(data, container, detected);
        break;
      case 'line':
        renderLine(data, container, detected);
        break;
      case 'pie':
        renderPie(data, container, detected);
        break;
      case 'tree':
        renderStructureTree(data, container);
        break;
      case 'boxes':
        renderNestedBoxes(data, container);
        break;
      default:
        const pre = document.createElement('pre');
        pre.className = 'json-output';
        pre.textContent = JSON.stringify(data, null, 2);
        container.appendChild(pre);
    }
  }

  /** Render sortable, filterable table */
  function renderTable(data, container, detected) {
    let rows = Array.isArray(data) ? data : [data];
    if (rows.length === 0) { container.innerHTML += '<p class="text-muted">Empty array</p>'; return; }

    // Gather all keys
    const allKeys = [...new Set(rows.flatMap(r => r && typeof r === 'object' ? Object.keys(r) : []))];

    // Filter input
    const filterRow = document.createElement('div');
    filterRow.style.marginBottom = '.75rem';
    filterRow.innerHTML = `
      <div class="search-bar" style="max-width:360px">
        <i class="fas fa-filter search-bar-icon"></i>
        <input type="text" placeholder="Filter rows…" id="table-filter-input" />
        <span class="search-count" id="table-filter-count">${rows.length} rows</span>
      </div>
    `;
    container.appendChild(filterRow);

    // Export button
    const exportBtn = document.createElement('button');
    exportBtn.className = 'btn btn-secondary btn-sm';
    exportBtn.innerHTML = '<i class="fas fa-download"></i> Export CSV';
    exportBtn.style.marginBottom = '.75rem';
    exportBtn.onclick = () => exportCSV(rows, allKeys);
    container.appendChild(exportBtn);

    const wrap = document.createElement('div');
    wrap.className = 'data-table-wrap';

    const table = document.createElement('table');
    table.className = 'data-table';

    // Header
    const thead = document.createElement('thead');
    const hr = document.createElement('tr');
    let sortCol = null;
    let sortAsc = true;
    allKeys.forEach(k => {
      const th = document.createElement('th');
      th.innerHTML = `${k} <span class="sort-icon">⇅</span>`;
      th.dataset.key = k;
      th.onclick = () => {
        if (sortCol === k) sortAsc = !sortAsc;
        else { sortCol = k; sortAsc = true; }
        renderBody();
        thead.querySelectorAll('th').forEach(h => {
          h.classList.remove('sorted-asc', 'sorted-desc');
          if (h.dataset.key === k) h.classList.add(sortAsc ? 'sorted-asc' : 'sorted-desc');
        });
      };
      hr.appendChild(th);
    });
    thead.appendChild(hr);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    table.appendChild(tbody);
    wrap.appendChild(table);
    container.appendChild(wrap);

    let filteredRows = rows;

    function renderBody() {
      let displayRows = [...filteredRows];
      if (sortCol) {
        displayRows.sort((a, b) => {
          const av = a ? a[sortCol] : undefined;
          const bv = b ? b[sortCol] : undefined;
          if (av === bv) return 0;
          if (av === undefined || av === null) return 1;
          if (bv === undefined || bv === null) return -1;
          return sortAsc ? (av < bv ? -1 : 1) : (av > bv ? -1 : 1);
        });
      }
      tbody.innerHTML = '';
      displayRows.forEach(row => {
        const tr = document.createElement('tr');
        allKeys.forEach(k => {
          const td = document.createElement('td');
          const val = row && row[k];
          if (val === undefined || val === null) {
            td.className = 'cell-missing';
            td.textContent = val === null ? 'null' : '—';
          } else if (typeof val === 'object') {
            td.textContent = JSON.stringify(val);
          } else {
            td.textContent = String(val);
          }
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
    }

    // Filter
    filterRow.querySelector('#table-filter-input').addEventListener('input', e => {
      const term = e.target.value.toLowerCase();
      filteredRows = rows.filter(row => {
        if (!row || typeof row !== 'object') return String(row).toLowerCase().includes(term);
        return allKeys.some(k => String(row[k] ?? '').toLowerCase().includes(term));
      });
      filterRow.querySelector('#table-filter-count').textContent = `${filteredRows.length} rows`;
      renderBody();
    });

    renderBody();
  }

  function exportCSV(rows, keys) {
    const lines = [keys.join(',')];
    rows.forEach(row => {
      const vals = keys.map(k => {
        const v = row ? row[k] : '';
        const str = v === undefined || v === null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
        return `"${str.replace(/"/g, '""')}"`;
      });
      lines.push(vals.join(','));
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'data.csv';
    a.click();
    URL.revokeObjectURL(a.href);
    UI.toast('CSV exported', 'success');
  }

  function renderBar(data, container, detected) {
    const canvas = document.createElement('canvas');
    canvas.height = 300;
    container.appendChild(canvas);

    let labels, values;
    if (detected.objChart) {
      labels = Object.keys(data);
      values = Object.values(data);
    } else if (detected.raw) {
      labels = data.map((_, i) => String(i));
      values = data.map(Number);
    } else if (detected.strKey && detected.numKeys) {
      labels = data.map(r => String(r[detected.strKey]));
      values = data.map(r => Number(r[detected.numKeys[0]]));
    } else {
      labels = data.map((_, i) => String(i));
      values = data.map(r => typeof r === 'object' ? Object.values(r)[0] : r);
    }

    // Field selector
    if (Array.isArray(data) && data[0] && typeof data[0] === 'object' && !detected.raw) {
      addFieldSelector(container, data, canvas, 'bar');
    }

    destroyChart('bar');
    _chartInstances['bar'] = new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [{ label: detected.numKeys ? detected.numKeys[0] : 'Value', data: values, backgroundColor: 'rgba(67,97,238,.7)', borderRadius: 4 }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${ctx.parsed.y}` } } },
        scales: { y: { beginAtZero: true } }
      }
    });
  }

  function renderLine(data, container, detected) {
    const canvas = document.createElement('canvas');
    canvas.height = 300;
    container.appendChild(canvas);

    const labels = data.map(r => r[detected.dateKey]);
    const datasets = detected.numKeys.map((k, i) => ({
      label: k,
      data: data.map(r => r[k]),
      borderColor: ['#4361ee','#e76f51','#2d6a4f','#0096c7'][i % 4],
      backgroundColor: 'transparent',
      tension: 0.3,
      pointRadius: 3,
    }));

    destroyChart('line');
    _chartInstances['line'] = new Chart(canvas, {
      type: 'line',
      data: { labels, datasets },
      options: { responsive: true, scales: { y: { beginAtZero: false } } }
    });
  }

  function renderPie(data, container, detected) {
    const canvas = document.createElement('canvas');
    canvas.height = 300;
    container.appendChild(canvas);

    let labels, values;
    if (detected.raw && Array.isArray(data) && data.every(v => typeof v === 'string')) {
      const freq = {};
      data.forEach(v => { freq[v] = (freq[v] || 0) + 1; });
      labels = Object.keys(freq);
      values = Object.values(freq);
    } else if (detected.objChart) {
      labels = Object.keys(data);
      values = Object.values(data);
    } else {
      labels = data.map((_, i) => String(i));
      values = data.map(r => typeof r === 'number' ? r : 1);
    }

    const colors = generateColors(labels.length);
    destroyChart('pie');
    _chartInstances['pie'] = new Chart(canvas, {
      type: 'doughnut',
      data: { labels, datasets: [{ data: values, backgroundColor: colors }] },
      options: { responsive: true, plugins: { legend: { position: 'right' } } }
    });
  }

  function renderStructureTree(data, container) {
    const svg = buildSVGTree(data);
    const wrap = document.createElement('div');
    wrap.style.overflow = 'auto';
    wrap.appendChild(svg);
    container.appendChild(wrap);
  }

  function buildSVGTree(data, maxDepth = 4) {
    const nodes = [];
    const edges = [];
    let nodeId = 0;

    function collect(val, parentId, label, depth) {
      if (depth > maxDepth) return;
      const id = nodeId++;
      const type = val === null ? 'null' : Array.isArray(val) ? 'array' : typeof val;
      const summary = type === 'object' ? `{${Object.keys(val).length}}` :
                      type === 'array'  ? `[${val.length}]` :
                      String(val).substring(0, 20);
      nodes.push({ id, label: label || 'root', summary, type, depth });
      if (parentId !== null) edges.push({ from: parentId, to: id });

      if ((type === 'object' || type === 'array') && val !== null) {
        const entries = Array.isArray(val) ? val.slice(0, 10).map((v, i) => [String(i), v]) : Object.entries(val).slice(0, 10);
        entries.forEach(([k, v]) => collect(v, id, k, depth + 1));
      }
    }

    collect(data, null, 'root', 0);

    // Layout: x by depth, y by order in depth group
    const byDepth = {};
    nodes.forEach(n => { (byDepth[n.depth] = byDepth[n.depth] || []).push(n); });
    const W = 150, H = 60, XGAP = 180, YGAP = 70;

    nodes.forEach(n => {
      const group = byDepth[n.depth];
      const idx = group.indexOf(n);
      n.x = n.depth * XGAP + 20;
      n.y = idx * YGAP + 40;
    });

    const maxX = Math.max(...nodes.map(n => n.x)) + W + 20;
    const maxY = Math.max(...nodes.map(n => n.y)) + H + 20;

    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('width', maxX);
    svg.setAttribute('height', maxY);
    svg.style.fontFamily = 'var(--font-mono)';
    svg.style.fontSize = '11px';

    const typeColors = { object: '#4361ee', array: '#0096c7', string: '#2d6a4f', number: '#e76f51', boolean: '#7b2d8b', null: '#94a3b8' };

    edges.forEach(e => {
      const from = nodes[e.from];
      const to = nodes[e.to];
      const line = document.createElementNS(ns, 'line');
      line.setAttribute('x1', from.x + W / 2);
      line.setAttribute('y1', from.y + H / 2);
      line.setAttribute('x2', to.x + W / 2);
      line.setAttribute('y2', to.y + H / 2);
      line.setAttribute('stroke', '#cbd5e1');
      line.setAttribute('stroke-width', '1.5');
      svg.appendChild(line);
    });

    nodes.forEach(n => {
      const g = document.createElementNS(ns, 'g');
      const rect = document.createElementNS(ns, 'rect');
      rect.setAttribute('x', n.x);
      rect.setAttribute('y', n.y);
      rect.setAttribute('width', W);
      rect.setAttribute('height', H);
      rect.setAttribute('rx', '6');
      rect.setAttribute('fill', 'var(--bg-card)');
      rect.setAttribute('stroke', typeColors[n.type] || '#999');
      rect.setAttribute('stroke-width', '1.5');
      g.appendChild(rect);

      const t1 = document.createElementNS(ns, 'text');
      t1.setAttribute('x', n.x + 8);
      t1.setAttribute('y', n.y + 20);
      t1.setAttribute('fill', 'var(--text)');
      t1.setAttribute('font-weight', '600');
      t1.textContent = n.label.substring(0, 16);
      g.appendChild(t1);

      const t2 = document.createElementNS(ns, 'text');
      t2.setAttribute('x', n.x + 8);
      t2.setAttribute('y', n.y + 38);
      t2.setAttribute('fill', typeColors[n.type] || '#999');
      t2.setAttribute('font-size', '10');
      t2.textContent = `${n.type}: ${n.summary.substring(0, 18)}`;
      g.appendChild(t2);

      svg.appendChild(g);
    });

    return svg;
  }

  function addFieldSelector(container, data, canvas, chartType) {
    const keys = [...new Set(data.flatMap(r => r ? Object.keys(r) : []))];
    const numKeys = keys.filter(k => data.some(r => r && typeof r[k] === 'number'));
    const strKeys = keys.filter(k => data.some(r => r && typeof r[k] === 'string'));

    if (numKeys.length < 1) return;

    const controls = document.createElement('div');
    controls.className = 'vis-controls';
    controls.innerHTML = `
      <label class="form-label" style="margin:0">X/Label:</label>
      <select class="vis-select" id="vis-x-key">${strKeys.map(k => `<option>${k}</option>`).join('')}</select>
      <label class="form-label" style="margin:0">Y/Value:</label>
      <select class="vis-select" id="vis-y-key">${numKeys.map(k => `<option>${k}</option>`).join('')}</select>
      <button class="btn btn-secondary btn-sm" id="vis-update-btn"><i class="fas fa-sync"></i> Update</button>
    `;
    container.insertBefore(controls, canvas);

    controls.querySelector('#vis-update-btn').onclick = () => {
      const xKey = controls.querySelector('#vis-x-key').value;
      const yKey = controls.querySelector('#vis-y-key').value;
      const labels = data.map(r => String(r[xKey]));
      const values = data.map(r => Number(r[yKey]));
      const inst = _chartInstances[chartType];
      if (inst) {
        inst.data.labels = labels;
        inst.data.datasets[0].data = values;
        inst.data.datasets[0].label = yKey;
        inst.update();
      }
    };
  }

  function generateColors(n) {
    const palette = ['#4361ee','#e76f51','#2d6a4f','#0096c7','#7b2d8b','#f4a261','#40916c','#023e8a','#d62828','#ffd166'];
    return Array.from({ length: n }, (_, i) => palette[i % palette.length]);
  }

  /* ── Nested Boxes Visualiser ───────────────────────────────── */
  function renderNestedBoxes(data, container) {
    const wrap = document.createElement('div');
    wrap.className = 'nested-box-wrap';
    const intro = document.createElement('p');
    intro.style.cssText = 'font-size:.8rem;color:var(--text-muted);margin-bottom:.75rem';
    intro.textContent = 'Each coloured box represents an object or array. Colour shows nesting depth. Scroll to explore.';
    wrap.appendChild(intro);
    wrap.appendChild(_buildNBox(data, 'root', 0));
    container.appendChild(wrap);
  }

  function _escHtml(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function _buildNBox(val, key, depth, maxDepth = 8, maxChildren = 30) {
    const depthClass = 'nbox-d' + (depth % 6);
    const type = val === null ? 'null' : Array.isArray(val) ? 'array' : typeof val;
    const isContainer = type === 'object' || type === 'array';

    const box = document.createElement('div');
    box.className = `nbox ${depthClass}${isContainer ? '' : ' nbox-leaf'}`;

    const label = document.createElement('div');
    label.className = 'nbox-label';

    const keySpan = document.createElement('span');
    keySpan.className = 'nbox-key';
    keySpan.textContent = key;
    label.appendChild(keySpan);

    if (isContainer) {
      const entries = Array.isArray(val) ? val : Object.entries(val);
      const count = Array.isArray(val) ? val.length : Object.keys(val).length;
      const badge = document.createElement('span');
      badge.className = 'nbox-type-badge';
      badge.textContent = type === 'array' ? `[ ${count} items ]` : `{ ${count} keys }`;
      label.appendChild(badge);
      box.appendChild(label);

      if (depth < maxDepth && count > 0) {
        const children = document.createElement('div');
        children.className = 'nbox-children';
        const items = Array.isArray(val) ? val : Object.values(val);
        const keys  = Array.isArray(val) ? val.map((_,i) => String(i)) : Object.keys(val);
        const shown = Math.min(count, maxChildren);
        for (let i = 0; i < shown; i++) {
          children.appendChild(_buildNBox(items[i], keys[i], depth + 1, maxDepth, maxChildren));
        }
        if (count > maxChildren) {
          const more = document.createElement('div');
          more.className = 'nbox-more';
          more.textContent = `… ${count - maxChildren} more items not shown`;
          children.appendChild(more);
        }
        box.appendChild(children);
      }
    } else {
      const colon = document.createElement('span');
      colon.className = 'nbox-colon';
      colon.textContent = ':';
      label.appendChild(colon);

      const valStr = val === null ? 'null' : String(val);
      const valEl = document.createElement('span');
      valEl.className = `nbox-val nbox-val-${type}`;
      valEl.textContent = valStr.length > 60 ? valStr.substring(0, 57) + '…' : valStr;
      label.appendChild(valEl);
      box.appendChild(label);
    }

    return box;
  }

  return { render, autoDetect, renderTable, exportCSV, renderNestedBoxes };
})();
