/**
 * ui.js
 * UI utility functions — toasts, theme, syntax highlighting, etc.
 */
const UI = (() => {

  /* ── Toast Notifications ──────────────────────────────────── */
  let _toastContainer = null;

  function initToast() {
    _toastContainer = document.getElementById('toast-container');
    if (!_toastContainer) {
      _toastContainer = document.createElement('div');
      _toastContainer.id = 'toast-container';
      _toastContainer.className = 'toast-container';
      document.body.appendChild(_toastContainer);
    }
  }

  function toast(message, type = 'info', duration = 2800) {
    if (!_toastContainer) initToast();
    const t = document.createElement('div');
    const icons = { success: '✓', error: '✕', info: 'ℹ', warning: '⚠' };
    t.className = `toast toast-${type}`;
    t.innerHTML = `<span>${icons[type] || 'ℹ'}</span> ${escHtml(message)}`;
    _toastContainer.appendChild(t);
    setTimeout(() => {
      t.style.animation = 'toastOut .3s ease forwards';
      setTimeout(() => t.remove(), 300);
    }, duration);
  }

  /* ── Theme ──────────────────────────────────────────────────── */
  function initTheme() {
    const saved = localStorage.getItem('json-explorer-theme') || 'light';
    setTheme(saved);
  }

  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('json-explorer-theme', theme);
    // The sun/moon SVG icons are toggled via CSS ([data-theme="dark"] .icon-sun { display:none })
    // so we do not need to write innerHTML here
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    setTheme(current === 'dark' ? 'light' : 'dark');
  }

  /* ── Syntax Highlighting ────────────────────────────────────── */
  function syntaxHighlight(json) {
    if (typeof json !== 'string') json = JSON.stringify(json, null, 2);
    return json
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function(match) {
        let cls = 'json-number';
        if (/^"/.test(match)) {
          if (/:$/.test(match)) {
            cls = 'json-key';
            match = match.replace(/:$/, '');
            return `<span class="${cls}">${match}</span>:`;
          } else {
            cls = 'json-string';
          }
        } else if (/true|false/.test(match)) {
          cls = 'json-bool';
        } else if (/null/.test(match)) {
          cls = 'json-null';
        }
        return `<span class="${cls}">${match}</span>`;
      });
  }

  /* ── Copy to clipboard ──────────────────────────────────────── */
  function copyText(text, label = 'Copied!') {
    navigator.clipboard.writeText(text).then(() => toast(label, 'success')).catch(() => {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      toast(label, 'success');
    });
  }

  /* ── Download ────────────────────────────────────────────────── */
  function downloadJSON(data, filename = 'data.json') {
    const blob = new Blob([typeof data === 'string' ? data : JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
    toast('Downloaded ' + filename, 'success');
  }

  /* ── Format file size ────────────────────────────────────────── */
  function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  }

  /* ── Escape HTML ─────────────────────────────────────────────── */
  function escHtml(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  /* ── Debounce ────────────────────────────────────────────────── */
  function debounce(fn, delay) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
  }

  /* ── Format readable date from timestamp/ISO string ─────────── */
  function formatDate(val) {
    if (!val) return null;
    // Unix timestamp (seconds)
    if (typeof val === 'number' && val > 1e9 && val < 1e13) {
      return new Date(val * 1000).toLocaleString();
    }
    // Unix timestamp (milliseconds)
    if (typeof val === 'number' && val > 1e12) {
      return new Date(val).toLocaleString();
    }
    // ISO string
    if (typeof val === 'string') {
      const d = new Date(val);
      if (!isNaN(d.getTime())) return d.toLocaleString();
    }
    return null;
  }

  /* ── Detect base64 ───────────────────────────────────────────── */
  function isBase64(str) {
    if (typeof str !== 'string' || str.length < 8) return false;
    return /^[A-Za-z0-9+/]+=*$/.test(str) && str.length % 4 === 0;
  }

  function decodeBase64(str) {
    try { return atob(str); } catch (_) { return null; }
  }

  /* ── Active tab management ───────────────────────────────────── */
  function activateTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tabId));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === tabId));
  }

  return {
    toast, initToast, initTheme, setTheme, toggleTheme,
    syntaxHighlight, copyText, downloadJSON, formatSize, escHtml,
    debounce, formatDate, isBase64, decodeBase64, activateTab
  };
})();
