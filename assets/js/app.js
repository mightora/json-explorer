/**
 * app.js
 * Main application orchestrator for JSON Explorer Pro
 */
const App = (() => {

  let _currentData = null;
  let _currentRaw  = '';
  let _viewMode    = 'tree';
  let _maskSensitive = false;

  /* ── Init ──────────────────────────────────────────────────── */
  function init() {
    UI.initTheme();
    UI.initToast();
    loadConfig();
    loadFooter();
    bindEvents();
    restoreSession();
  }

  async function loadConfig() {
    try {
      const res = await fetch('data/config.json');
      const cfg = await res.json();
      // Update document title
      document.title = cfg.site.name + ' — ' + cfg.site.tagline;
      // Update hero text
      const heroH1 = document.querySelector('.hero h1');
      if (heroH1) heroH1.textContent = cfg.hero.heading;
      const heroSub = document.querySelector('.hero-sub');
      if (heroSub) heroSub.textContent = cfg.hero.subheading;
      const heroDesc = document.querySelector('.hero-desc');
      if (heroDesc) heroDesc.textContent = cfg.hero.description;
      // Author
      renderAuthor(cfg.author);
    } catch (_) { /* silently ignore - config is optional */ }
  }

  function renderAuthor(author) {
    const sec = document.getElementById('author-section');
    if (!sec || !author) return;
    const avatarUrl  = 'https://techtweedie.github.io/images/author/ian-tweedie-sq2_hu_a380911c6f4726de.png';
    const blogLogo   = 'https://raw.githubusercontent.com/TechTweedie/techtweedie.github.io/v2/assets/images/site/main-logo.png';
    const brandLabel = author.branding ? author.branding.label : 'TechTweedie';
    sec.innerHTML = `
      <div class="author-section-overlay">
        <div class="author-section-inner">
          <div class="author-photos">
            <img src="${UI.escHtml(avatarUrl)}" alt="${UI.escHtml(author.name)}" class="author-avatar" onerror="this.style.display='none'">
            <img src="${UI.escHtml(blogLogo)}" alt="${UI.escHtml(brandLabel)}" class="author-blog-logo" onerror="this.style.display='none'">
          </div>
          <div class="author-text">
            <h2 class="author-heading">Built by ${UI.escHtml(brandLabel)}</h2>
            <p class="author-bio">${UI.escHtml(author.bio)}</p>
            <div class="author-links">
              ${(author.links || []).map(l => `<a href="${UI.escHtml(l.url)}" target="_blank" rel="noopener" class="author-link">${l.icon ? `<i class="${UI.escHtml(l.icon)}"></i> ` : ''}${UI.escHtml(l.label)}</a>`).join('')}
            </div>
          </div>
        </div>
      </div>`;
  }

  async function loadFooter() {
    try {
      const res = await fetch('https://raw.githubusercontent.com/mightora/mightora.io/refs/heads/main/data/footer.yaml');
      const text = await res.text();
      const data = jsyaml.load(text);
      renderFooter(data);
    } catch (_) { /* silently ignore */ }
  }

  function renderFooter(data) {
    const main = document.getElementById('footer-main');
    const brands = document.getElementById('footer-brands');
    if (!main || !data) return;

    // Group sections by column
    const cols = {};
    (data.sections || []).forEach(s => {
      if (!cols[s.column]) cols[s.column] = [];
      cols[s.column].push(s);
    });

    main.innerHTML = Object.values(cols).map(sections => `
      <div class="footer-col">
        <div class="footer-col-sections">
          ${sections.sort((a,b) => a.position - b.position).map(s => `
            <div>
              <div class="footer-section-title">${UI.escHtml(s.title)}</div>
              <ul class="footer-links">
                ${s.links.map(l => `<li><a href="${UI.escHtml(l.url)}">${UI.escHtml(l.name)}</a></li>`).join('')}
              </ul>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');

    if (brands && data.brands) {
      brands.innerHTML = `
        <div class="container">
          <div class="footer-brands">
            ${data.brands.map(b => `
              <a href="${UI.escHtml(b.url)}" target="_blank" rel="noopener" class="footer-brand">
                <img src="${UI.escHtml(b.logo)}" alt="${UI.escHtml(b.name)}" onerror="this.style.display='none'">
                <span class="footer-brand-desc">${UI.escHtml(b.description)}</span>
              </a>
            `).join('')}
          </div>
        </div>
      `;
    }
  }

  /* ── Session Restore ───────────────────────────────────────── */
  function restoreSession() {
    try {
      const saved = sessionStorage.getItem('json-explorer-input');
      if (saved) {
        const textarea = document.getElementById('json-input');
        if (textarea) {
          textarea.value = saved;
          processInput(saved);
          UI.toast('Session restored', 'info', 2000);
        }
      }
    } catch (_) {}
  }

  function saveSession(raw) {
    try {
      if (raw && raw.length < 500000) {
        sessionStorage.setItem('json-explorer-input', raw);
      }
    } catch (_) {}
  }

  /* ── Event Binding ─────────────────────────────────────────── */
  function bindEvents() {
    // Theme toggle
    const themeBtn = document.getElementById('theme-toggle');
    if (themeBtn) themeBtn.addEventListener('click', UI.toggleTheme);

    // Mobile menu
    const menuBtn = document.getElementById('mobile-menu-btn');
    const headerNav = document.querySelector('.header-nav');
    if (menuBtn && headerNav) {
      menuBtn.addEventListener('click', () => headerNav.classList.toggle('open'));
    }

    // JSON input textarea
    const textarea = document.getElementById('json-input');
    if (textarea) {
      const debouncedProcess = UI.debounce(raw => processInput(raw), 400);
      textarea.addEventListener('input', e => debouncedProcess(e.target.value));
      textarea.addEventListener('paste', e => {
        setTimeout(() => debouncedProcess(textarea.value), 0);
      });
    }

    // Drag and drop
    const dropZone = document.getElementById('drop-zone');
    if (dropZone) {
      dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
      dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
      dropZone.addEventListener('drop', e => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        const file = e.dataTransfer.files[0];
        if (file) loadFile(file);
      });
      dropZone.addEventListener('click', () => document.getElementById('file-input').click());
    }

    // File upload
    const fileInput = document.getElementById('file-input');
    if (fileInput) {
      fileInput.addEventListener('change', e => {
        const file = e.target.files[0];
        if (file) loadFile(file);
      });
    }

    // Load sample
    document.getElementById('btn-load-sample')?.addEventListener('click', loadSample);
    document.getElementById('btn-clear')?.addEventListener('click', clearInput);
    document.getElementById('btn-copy-input')?.addEventListener('click', () => {
      UI.copyText(document.getElementById('json-input').value, 'Input copied!');
    });

    // CTA buttons
    document.getElementById('hero-cta-explore')?.addEventListener('click', () => {
      document.getElementById('json-input')?.focus();
      document.getElementById('input-section')?.scrollIntoView({ behavior: 'smooth' });
    });
    document.getElementById('hero-cta-sample')?.addEventListener('click', loadSample);

    // Nav links with data-activate-tab (e.g. "Insights" link)
    document.querySelectorAll('[data-activate-tab]').forEach(link => {
      link.addEventListener('click', () => {
        const tabId = link.dataset.activateTab;
        UI.activateTab(tabId);
        if (_currentData) refreshTab(tabId);
      });
    });

    // Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        UI.activateTab(tab);
        if (_currentData) refreshTab(tab);
      });
    });

    // View mode buttons (Explore tab)
    document.querySelectorAll('.view-mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.view-mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        _viewMode = btn.dataset.view;
        renderExplore();
      });
    });

    // Search
    const searchInput = document.getElementById('explore-search');
    if (searchInput) {
      searchInput.addEventListener('input', UI.debounce(() => renderExplore(), 300));
      document.getElementById('search-prev')?.addEventListener('click', () => {
        JSONTree.prevMatch();
        updateSearchCount();
      });
      document.getElementById('search-next')?.addEventListener('click', () => {
        JSONTree.nextMatch();
        updateSearchCount();
      });
    }

    // Transform buttons
    document.querySelectorAll('.transform-op-btn').forEach(btn => {
      btn.addEventListener('click', () => applyTransform(btn.dataset.op));
    });

    // Transform copy/download
    document.getElementById('transform-copy')?.addEventListener('click', () => {
      const out = document.getElementById('transform-output');
      if (out) UI.copyText(out.textContent, 'Copied!');
    });
    document.getElementById('transform-download')?.addEventListener('click', () => {
      const out = document.getElementById('transform-output');
      if (out) UI.downloadJSON(out.textContent, 'transformed.json');
    });

    // Diff
    document.getElementById('btn-run-diff')?.addEventListener('click', runDiff);
    document.getElementById('diff-show-same')?.addEventListener('change', runDiff);

    // Sensitive data
    document.getElementById('btn-mask-toggle')?.addEventListener('click', toggleMask);
    document.getElementById('btn-export-masked')?.addEventListener('click', exportMasked);

    // Transform: extract path
    document.getElementById('btn-extract-path')?.addEventListener('click', () => {
      const path = document.getElementById('extract-path-input')?.value?.trim();
      if (path && _currentData) {
        const sub = JSONTransform.extractSubtree(_currentData, path);
        if (sub !== undefined) {
          showTransformOutput(JSON.stringify(sub, null, 2));
        } else {
          UI.toast('Path not found', 'error');
        }
      }
    });

    // Visualise
    document.getElementById('vis-type-select')?.addEventListener('change', e => {
      if (_currentData) renderVisualise(e.target.value);
    });
    document.getElementById('vis-refresh')?.addEventListener('click', () => {
      if (_currentData) renderVisualise();
    });

    // JWT decode button
    document.getElementById('btn-decode-jwt')?.addEventListener('click', () => {
      const val = document.getElementById('jwt-input')?.value?.trim();
      if (val) renderJWT(val);
    });
  }

  /* ── File Loading ───────────────────────────────────────────── */
  function loadFile(file) {
    if (!file.name.match(/\.(json|txt)$/i) && file.type !== 'application/json') {
      UI.toast('Please upload a .json or .txt file', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = e => {
      const content = e.target.result;
      document.getElementById('json-input').value = content;
      processInput(content);
      UI.toast(`Loaded: ${file.name} (${UI.formatSize(file.size)})`, 'success');
    };
    reader.readAsText(file);
  }

  /* ── Sample Data ────────────────────────────────────────────── */
  function loadSample() {
    const sample = {
      "store": {
        "name": "JSON Explorer Demo",
        "version": "1.0",
        "metadata": {
          "created": "2024-01-15T09:30:00Z",
          "updated": "2024-03-01T14:22:00Z",
          "tags": ["demo", "sample", "json"]
        }
      },
      "users": [
        { "id": 1, "name": "Alice Johnson", "email": "alice@example.com", "role": "admin", "active": true, "score": 98.5 },
        { "id": 2, "name": "Bob Smith",    "email": "bob@example.com",   "role": "user",  "active": true, "score": 74.2 },
        { "id": 3, "name": "Carol White",  "email": "carol@example.com", "role": "user",  "active": false,"score": 88.0 },
        { "id": 4, "name": "Dave Brown",   "email": "dave@example.com",  "role": "mod",   "active": true, "score": 91.1 },
        { "id": 5, "name": "Eve Davis",    "email": null,                "role": "user",  "active": true, "score": 62.3 }
      ],
      "products": [
        { "id": "p001", "name": "Widget Pro", "price": 29.99, "category": "Tools", "stock": 150 },
        { "id": "p002", "name": "Gadget Plus", "price": 49.99, "category": "Tech",  "stock": 42  },
        { "id": "p003", "name": "Doohickey",   "price": 9.99,  "category": "Tools", "stock": 500 },
        { "id": "p004", "name": "Thingamajig", "price": 14.99, "category": "Other", "stock": 0   }
      ],
      "config": {
        "apiKey": "sk-demo-1234567890abcdef",
        "apiUrl": "https://api.example.com/v2",
        "timeout": 30,
        "retries": 3,
        "features": {
          "darkMode": true,
          "notifications": true,
          "analytics": false
        },
        "limits": {
          "requests_per_minute": 100,
          "max_payload_kb": 1024,
          "session_timeout_minutes": 60
        }
      },
      "stats": {
        "totalOrders": 1842,
        "revenue": 54231.50,
        "avgOrderValue": 29.44,
        "newUsersThisMonth": 234,
        "churnRate": 0.032
      }
    };
    const raw = JSON.stringify(sample, null, 2);
    document.getElementById('json-input').value = raw;
    processInput(raw);
    UI.toast('Sample data loaded', 'success');
  }

  function clearInput() {
    document.getElementById('json-input').value = '';
    _currentData = null;
    _currentRaw = '';
    clearOutputs();
    sessionStorage.removeItem('json-explorer-input');
    showValidation(null);
    showInputStats(null);
    UI.toast('Cleared', 'info');
  }

  function clearOutputs() {
    document.getElementById('explore-output').innerHTML = '<div class="empty-state"><div class="empty-state-icon">🔍</div><h3>Nothing to explore yet</h3><p>Paste JSON or load a file to begin.</p></div>';
    document.getElementById('transform-output').textContent = '';
    document.getElementById('insights-output').innerHTML = '';
    document.getElementById('vis-output').innerHTML = '';
    document.getElementById('sensitive-output').innerHTML = '';
    document.getElementById('node-detail').style.display = 'none';
  }

  /* ── Input Processing ───────────────────────────────────────── */
  function processInput(raw) {
    _currentRaw = raw;
    saveSession(raw);

    if (!raw || !raw.trim()) {
      showValidation(null);
      showInputStats(null);
      _currentData = null;
      clearOutputs();
      return;
    }

    const textarea = document.getElementById('json-input');
    const { data, error } = JSONParser.parse(raw);

    if (error) {
      showValidation({ type: 'error', ...error });
      textarea?.classList.remove('valid-json');
      textarea?.classList.add('invalid-json');
      _currentData = null;
    } else {
      showValidation({ type: 'success' });
      textarea?.classList.remove('invalid-json');
      textarea?.classList.add('valid-json');
      _currentData = data;
      showInputStats(raw, data);
      refreshActiveTab();
    }
  }

  function showValidation({ type, message, line, column, hint, repairable, repaired } = {}) {
    const el = document.getElementById('validation-msg');
    if (!el) return;
    if (type === null || type === undefined) { el.classList.remove('show'); return; }
    el.classList.add('show');
    if (type === 'success') {
      el.className = 'validation-message show validation-success';
      el.innerHTML = '<i class="fas fa-check-circle"></i> Valid JSON';
    } else {
      el.className = 'validation-message show validation-error';
      let html = `<div><i class="fas fa-times-circle"></i> <strong>Invalid JSON</strong>`;
      if (line)    html += ` — Line ${line}${column ? `, Column ${column}` : ''}`;
      html += `<pre>${UI.escHtml(message || '')}</pre>`;
      if (hint)    html += `<div style="margin-top:.35rem;font-size:.8rem;opacity:.85">💡 ${UI.escHtml(hint)}</div>`;
      if (repairable) {
        html += `<div style="margin-top:.5rem"><button class="btn btn-sm btn-success" id="btn-repair">🔧 Auto-repair</button></div>`;
      }
      html += '</div>';
      el.innerHTML = html;
      if (repairable) {
        el.querySelector('#btn-repair')?.addEventListener('click', () => {
          const fixed = JSON.stringify(repaired, null, 2);
          document.getElementById('json-input').value = fixed;
          processInput(fixed);
          UI.toast('JSON repaired!', 'success');
        });
      }
    }
  }

  function showInputStats(raw, data) {
    const el = document.getElementById('input-stats');
    if (!el) return;
    if (!raw) { el.innerHTML = ''; return; }
    const chars = raw.length;
    const lines = raw.split('\n').length;
    const keys = data ? JSONParser.countNodes(data) : 0;
    const depth = data ? JSONParser.maxDepth(data) : 0;
    el.innerHTML = `
      <span><strong>${chars.toLocaleString()}</strong> chars</span>
      <span><strong>${lines.toLocaleString()}</strong> lines</span>
      <span><strong>${UI.formatSize(new Blob([raw]).size)}</strong></span>
      <span><strong>${keys.toLocaleString()}</strong> nodes</span>
      <span>depth: <strong>${depth}</strong></span>
    `;
  }

  /* ── Tab Refresh ───────────────────────────────────────────── */
  function refreshActiveTab() {
    const activeTab = document.querySelector('.tab-btn.active');
    if (activeTab) refreshTab(activeTab.dataset.tab);
  }

  function refreshTab(tabId) {
    if (!_currentData && tabId !== 'tab-help' && tabId !== 'tab-diff') return;
    switch (tabId) {
      case 'tab-explore':   renderExplore();   break;
      case 'tab-transform': renderTransform(); break;
      case 'tab-insights':  renderInsights();  break;
      case 'tab-visualise': renderVisualise(); break;
      case 'tab-sensitive': renderSensitive(); break;
    }
  }

  /* ── Explore Tab ────────────────────────────────────────────── */
  function renderExplore() {
    if (!_currentData) return;
    const container = document.getElementById('explore-output');
    const search = document.getElementById('explore-search')?.value || '';

    switch (_viewMode) {
      case 'tree':
        renderTree(container, search);
        break;
      case 'formatted':
        container.innerHTML = `<div class="json-output full-height"><code>${UI.syntaxHighlight(JSON.stringify(_currentData, null, 2))}</code></div>`;
        break;
      case 'minified':
        container.innerHTML = `<div class="json-output full-height"><code>${UI.escHtml(JSON.stringify(_currentData))}</code></div>`;
        break;
      case 'table':
        if (Array.isArray(_currentData)) {
          container.innerHTML = '';
          Visualise.renderTable(_currentData, container, {});
        } else {
          container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📋</div><h3>Table view requires an array</h3><p>Table view is best for arrays of objects.</p></div>';
        }
        break;
    }
  }

  function renderTree(container, search) {
    container.innerHTML = '';

    const breadcrumb = document.createElement('div');
    breadcrumb.className = 'tree-breadcrumb';
    container.appendChild(breadcrumb);

    const treeContainer = document.createElement('div');
    treeContainer.className = 'tree-container';
    treeContainer.style.border = 'none';
    container.appendChild(treeContainer);

    JSONTree.init(treeContainer, breadcrumb, document.getElementById('node-detail'), null);
    JSONTree.render(_currentData, search);

    updateSearchCount();
  }

  function updateSearchCount() {
    const el = document.getElementById('search-count');
    if (!el) return;
    const total = JSONTree.getMatchCount();
    const idx   = JSONTree.getMatchIndex();
    el.textContent = total > 0 ? `${idx + 1}/${total}` : '';
  }

  /* ── Transform Tab ──────────────────────────────────────────── */
  function renderTransform() {
    if (!_currentData) return;
    showTransformOutput(JSON.stringify(_currentData, null, 2));
  }

  function applyTransform(op) {
    if (!_currentData) { UI.toast('Please provide valid JSON first', 'error'); return; }
    let result;
    try {
      switch (op) {
        case 'pretty':    result = JSON.stringify(_currentData, null, 2); break;
        case 'minify':    result = JSON.stringify(_currentData); break;
        case 'sort-keys': result = JSON.stringify(JSONTransform.sortKeys(_currentData), null, 2); break;
        case 'remove-nulls':  result = JSON.stringify(JSONTransform.removeNulls(_currentData), null, 2); break;
        case 'remove-empty':  result = JSON.stringify(JSONTransform.removeEmpty(_currentData), null, 2); break;
        case 'flatten':       result = JSON.stringify(JSONTransform.flatten(_currentData), null, 2); break;
        case 'unflatten':     result = JSON.stringify(JSONTransform.unflatten(_currentData), null, 2); break;
        case 'parse-escaped': {
          const raw = document.getElementById('json-input').value;
          result = JSON.stringify(JSONTransform.parseEscaped(raw.trim()), null, 2);
          break;
        }
        default: UI.toast('Unknown operation', 'error'); return;
      }
      showTransformOutput(result);
      document.querySelectorAll('.transform-op-btn').forEach(b => b.classList.toggle('active', b.dataset.op === op));
    } catch (e) {
      UI.toast('Transform failed: ' + e.message, 'error');
    }
  }

  function showTransformOutput(text) {
    const out = document.getElementById('transform-output');
    if (out) {
      out.innerHTML = `<code>${UI.syntaxHighlight(text)}</code>`;
      out.dataset.raw = text;
    }
  }

  /* ── Insights Tab ───────────────────────────────────────────── */
  function renderInsights() {
    if (!_currentData) return;
    const metrics = JSONInsights.analyse(_currentData);
    const container = document.getElementById('insights-output');
    container.innerHTML = '';

    // Stat cards
    const grid = document.createElement('div');
    grid.className = 'insights-grid';
    const statCards = [
      { icon: '🔑', value: metrics.totalKeys,   label: 'Total Keys' },
      { icon: '📦', value: metrics.totalObjects, label: 'Objects' },
      { icon: '📋', value: metrics.totalArrays,  label: 'Arrays' },
      { icon: '💬', value: metrics.totalValues,  label: 'Values' },
      { icon: '📏', value: metrics.maxDepth,     label: 'Max Depth' },
      { icon: '∅',  value: metrics.nullCount,    label: 'Null Values' },
      { icon: '⬛', value: metrics.emptyStringCount, label: 'Empty Strings' },
      { icon: '🔢', value: metrics.largestArray, label: 'Largest Array' },
    ];

    statCards.forEach(s => {
      const card = document.createElement('div');
      card.className = 'insight-card';
      card.innerHTML = `<div class="insight-icon">${s.icon}</div><div class="insight-value">${s.value.toLocaleString()}</div><div class="insight-label">${s.label}</div>`;
      grid.appendChild(card);
    });
    container.appendChild(grid);

    // Charts row
    const chartRow = document.createElement('div');
    chartRow.className = 'insights-chart-row';

    // Type distribution chart
    const typeCard = document.createElement('div');
    typeCard.className = 'chart-card';
    typeCard.innerHTML = '<h4>Type Distribution</h4>';
    const typeCanvas = document.createElement('canvas');
    typeCanvas.height = 200;
    typeCard.appendChild(typeCanvas);
    chartRow.appendChild(typeCard);

    // Top repeated keys
    const repeatCard = document.createElement('div');
    repeatCard.className = 'chart-card';
    repeatCard.innerHTML = '<h4>Most Common Keys</h4>';
    const repeatCanvas = document.createElement('canvas');
    repeatCanvas.height = 200;
    repeatCard.appendChild(repeatCanvas);
    chartRow.appendChild(repeatCard);

    container.appendChild(chartRow);

    // Draw charts using Chart.js
    const typeData = JSONInsights.getTypeChartData(metrics);
    new Chart(typeCanvas, {
      type: 'doughnut',
      data: {
        labels: typeData.labels,
        datasets: [{ data: typeData.values, backgroundColor: typeData.colors }]
      },
      options: { responsive: true, plugins: { legend: { position: 'right', labels: { boxWidth: 12 } } } }
    });

    const topKeys = JSONInsights.getTopRepeatedKeys(metrics);
    if (topKeys.length > 0) {
      new Chart(repeatCanvas, {
        type: 'bar',
        data: {
          labels: topKeys.map(k => k.key),
          datasets: [{ data: topKeys.map(k => k.count), backgroundColor: 'rgba(67,97,238,.7)', borderRadius: 4 }]
        },
        options: {
          responsive: true,
          plugins: { legend: { display: false } },
          scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
        }
      });
    } else {
      repeatCanvas.parentNode.innerHTML += '<p class="text-muted" style="font-size:.85rem">No repeated keys found</p>';
    }

    // Likely timestamps
    if (metrics.likelyTimestamps.length > 0) {
      const ts = document.createElement('div');
      ts.className = 'card card-sm';
      ts.style.marginTop = '1rem';
      ts.innerHTML = `
        <h4 style="margin-bottom:.75rem">🕐 Likely Timestamps</h4>
        <div style="display:flex;flex-direction:column;gap:.35rem">
          ${metrics.likelyTimestamps.slice(0, 10).map(t => {
            const readable = UI.formatDate(t.value);
            return `<div style="font-size:.82rem;font-family:var(--font-mono)">
              <span class="text-muted">${UI.escHtml(t.path)}</span>:
              <span>${UI.escHtml(String(t.value))}</span>
              ${readable ? `<span class="badge badge-info" style="margin-left:.5rem">${UI.escHtml(readable)}</span>` : ''}
            </div>`;
          }).join('')}
        </div>`;
      container.appendChild(ts);
    }
  }

  /* ── Visualise Tab ──────────────────────────────────────────── */
  function renderVisualise(type = null) {
    if (!_currentData) return;
    const container = document.getElementById('vis-output');
    container.innerHTML = '';

    // If type select has a value, use it
    const sel = document.getElementById('vis-type-select');
    const selType = sel && sel.value !== 'auto' ? sel.value : null;
    Visualise.render(_currentData, container, type || selType);
  }

  /* ── Sensitive Data Tab ─────────────────────────────────────── */
  function renderSensitive() {
    if (!_currentData) return;
    const findings = SensitiveData.scan(_currentData);
    const container = document.getElementById('sensitive-output');
    container.innerHTML = '';

    // JWT scan
    const jwts = JWTHelper.scanForJWTs(_currentData);

    if (findings.length === 0 && jwts.length === 0) {
      container.innerHTML = `<div class="empty-state"><div class="empty-state-icon" style="color:var(--success-light)">✓</div><h3>No sensitive fields detected</h3><p>No obvious sensitive field names found in this JSON.</p></div>`;
      return;
    }

    // Summary banner
    const summary = document.createElement('div');
    summary.className = 'card card-sm';
    summary.style.marginBottom = '1rem';
    const high = findings.filter(f => f.severity === 'high').length;
    const med  = findings.filter(f => f.severity === 'medium').length;
    const low  = findings.filter(f => f.severity === 'low').length;
    summary.innerHTML = `
      <div style="display:flex;gap:1rem;flex-wrap:wrap;align-items:center">
        <strong>${findings.length} sensitive field${findings.length !== 1 ? 's' : ''} detected</strong>
        ${high ? `<span class="badge badge-danger">${high} high</span>` : ''}
        ${med  ? `<span class="badge badge-warning">${med} medium</span>` : ''}
        ${low  ? `<span class="badge badge-info">${low} low</span>` : ''}
        ${jwts.length ? `<span class="badge badge-warning">${jwts.length} JWT${jwts.length !== 1 ? 's' : ''} found</span>` : ''}
      </div>
    `;
    container.appendChild(summary);

    // Mask toggle
    const controls = document.createElement('div');
    controls.className = 'btn-group';
    controls.style.marginBottom = '1rem';
    controls.innerHTML = `
      <button class="btn btn-ghost btn-sm" id="btn-mask-toggle">
        <i class="fas ${_maskSensitive ? 'fa-eye' : 'fa-eye-slash'}"></i>
        ${_maskSensitive ? 'Show values' : 'Mask values'}
      </button>
      <button class="btn btn-ghost btn-sm" id="btn-export-masked">
        <i class="fas fa-download"></i> Export masked JSON
      </button>
    `;
    controls.querySelector('#btn-mask-toggle').addEventListener('click', () => {
      _maskSensitive = !_maskSensitive;
      renderSensitive();
    });
    controls.querySelector('#btn-export-masked').addEventListener('click', exportMasked);
    container.appendChild(controls);

    // Findings list
    const list = document.createElement('div');
    list.className = 'sensitive-list';
    findings.forEach(f => {
      const item = document.createElement('div');
      item.className = `sensitive-item sensitive-item-${f.severity}`;
      const dispVal = _maskSensitive
        ? `<span class="masked-val">${UI.escHtml(SensitiveData.formatValue(f.value))}</span><span style="font-size:.75rem;color:var(--text-muted);margin-left:.5rem">hover to reveal</span>`
        : UI.escHtml(SensitiveData.formatValue(f.value));
      item.innerHTML = `
        <div class="sensitive-item-header">
          <span class="sensitive-item-key">"${UI.escHtml(f.key)}"</span>
          <span class="badge badge-${SensitiveData.getSeverityColor(f.severity)}">${f.severity}</span>
        </div>
        <div class="sensitive-item-path">${UI.escHtml(f.path)}</div>
        <div class="sensitive-item-why"><i class="fas fa-info-circle"></i> ${UI.escHtml(f.reason)}</div>
        <div class="sensitive-item-val">${dispVal}</div>
      `;
      list.appendChild(item);
    });
    container.appendChild(list);

    // JWTs
    if (jwts.length > 0) {
      const jwtHeader = document.createElement('h4');
      jwtHeader.style.margin = '1.5rem 0 .75rem';
      jwtHeader.textContent = '🔏 JWT Tokens Found';
      container.appendChild(jwtHeader);
      jwts.forEach(j => renderJWTCard(j, container));
    }
  }

  function renderJWT(tokenStr) {
    const container = document.getElementById('jwt-decode-output');
    if (!container) return;
    try {
      const decoded = JWTHelper.decode(tokenStr);
      const expiry = JWTHelper.getExpiry(decoded.payload);
      const issuedAt = JWTHelper.getIssuedAt(decoded.payload);
      container.innerHTML = `
        <div class="jwt-warning"><i class="fas fa-exclamation-triangle"></i> Signature not verified — this is a client-side decode only</div>
        <div class="jwt-parts">
          <div class="jwt-part">
            <h4>Header</h4>
            <div class="json-output"><code>${UI.syntaxHighlight(JSON.stringify(decoded.header, null, 2))}</code></div>
          </div>
          <div class="jwt-part">
            <h4>Payload</h4>
            <div class="json-output"><code>${UI.syntaxHighlight(JSON.stringify(decoded.payload, null, 2))}</code></div>
          </div>
        </div>
        ${expiry ? `
          <div style="margin-top:1rem;display:flex;gap:1rem;flex-wrap:wrap;font-size:.875rem">
            <div>Expires: <strong>${expiry.formatted}</strong></div>
            ${expiry.expired ? '<span class="badge badge-danger">EXPIRED</span>' : `<span class="badge badge-success">Valid (${expiry.expiresIn > 0 ? expiry.expiresIn + ' min remaining' : 'expires soon'})</span>`}
          </div>
        ` : ''}
        ${issuedAt ? `<div style="margin-top:.5rem;font-size:.875rem">Issued at: <strong>${issuedAt.formatted}</strong></div>` : ''}
        <div style="margin-top:.75rem;font-size:.8rem;color:var(--text-muted)">
          Subject: <code>${UI.escHtml(decoded.payload.sub || 'n/a')}</code>
          &nbsp;|&nbsp;
          Issuer: <code>${UI.escHtml(decoded.payload.iss || 'n/a')}</code>
          &nbsp;|&nbsp;
          Algorithm: <code>${UI.escHtml(decoded.header.alg || 'n/a')}</code>
        </div>
      `;
      container.style.display = 'block';
    } catch (e) {
      container.innerHTML = `<div class="validation-message show validation-error"><i class="fas fa-times-circle"></i> ${UI.escHtml(e.message)}</div>`;
      container.style.display = 'block';
    }
  }

  function renderJWTCard(jwtInfo, container) {
    try {
      const decoded = JWTHelper.decode(jwtInfo.value);
      const card = document.createElement('div');
      card.className = 'jwt-section';
      card.innerHTML = `
        <div class="jwt-warning"><i class="fas fa-exclamation-triangle"></i> Signature not verified</div>
        <div style="font-size:.82rem;color:var(--text-muted);margin-bottom:.75rem">Found at: <code>${UI.escHtml(jwtInfo.path)}</code></div>
        <div class="jwt-parts">
          <div class="jwt-part"><h4>Header</h4>
            <div class="json-output" style="max-height:150px"><code>${UI.syntaxHighlight(JSON.stringify(decoded.header, null, 2))}</code></div>
          </div>
          <div class="jwt-part"><h4>Payload</h4>
            <div class="json-output" style="max-height:150px"><code>${UI.syntaxHighlight(JSON.stringify(decoded.payload, null, 2))}</code></div>
          </div>
        </div>
      `;
      container.appendChild(card);
    } catch (e) {
      /* skip invalid JWT */
    }
  }

  function toggleMask() {
    _maskSensitive = !_maskSensitive;
    renderSensitive();
  }

  function exportMasked() {
    if (!_currentData) return;
    const findings = SensitiveData.scan(_currentData);
    const fields = findings.map(f => f.key);
    const masked = SensitiveData.mask(_currentData, fields);
    UI.downloadJSON(masked, 'masked-data.json');
  }

  /* ── Diff Tab ───────────────────────────────────────────────── */
  function runDiff() {
    const leftRaw  = document.getElementById('diff-left')?.value?.trim() || '';
    const rightRaw = document.getElementById('diff-right')?.value?.trim() || '';
    const output   = document.getElementById('diff-output');
    const summary  = document.getElementById('diff-summary');
    if (!output) return;

    if (!leftRaw || !rightRaw) {
      output.innerHTML = '<div class="empty-state"><div class="empty-state-icon">⚖️</div><h3>Paste JSON into both panels</h3><p>Add JSON to the left and right panels to compare.</p></div>';
      return;
    }

    const leftResult  = JSONParser.parse(leftRaw);
    const rightResult = JSONParser.parse(rightRaw);

    if (leftResult.error)  { output.innerHTML = `<div class="validation-message show validation-error"><i class="fas fa-times-circle"></i> Left JSON: ${UI.escHtml(leftResult.error.message)}</div>`; return; }
    if (rightResult.error) { output.innerHTML = `<div class="validation-message show validation-error"><i class="fas fa-times-circle"></i> Right JSON: ${UI.escHtml(rightResult.error.message)}</div>`; return; }

    const showSame = document.getElementById('diff-show-same')?.checked !== false;
    const diffTree = JSONDiff.diff(leftResult.data, rightResult.data);
    const stats = JSONDiff.getStats(diffTree);

    if (summary) {
      summary.innerHTML = `
        <span class="diff-stat diff-added"><i class="fas fa-plus-circle"></i> ${stats.added} added</span>
        <span class="diff-stat diff-removed"><i class="fas fa-minus-circle"></i> ${stats.removed} removed</span>
        <span class="diff-stat diff-changed"><i class="fas fa-exchange-alt"></i> ${stats.changed} changed</span>
        <span class="diff-stat diff-same"><i class="fas fa-equals"></i> ${stats.same} unchanged</span>
      `;
    }

    output.innerHTML = '';
    const rendered = JSONDiff.renderHTML(diffTree, showSame);
    output.appendChild(rendered);
  }

  /* ── Public API ─────────────────────────────────────────────── */
  return { init };
})();

document.addEventListener('DOMContentLoaded', App.init);
