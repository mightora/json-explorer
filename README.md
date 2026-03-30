# JSON Explorer Pro

> The ultimate browser-based JSON workspace — explore, diff, transform and visualise JSON instantly. All processing happens locally in your browser.

[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-Live-brightgreen)](https://mightora.github.io/json-explorer/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Made by TechTweedie](https://img.shields.io/badge/Made%20by-TechTweedie-purple)](https://techtweedie.github.io)

---

## ✨ Features

### 🔍 Explore
- Collapsible tree explorer with lazy loading for large JSON
- View as formatted, minified, tree or table
- Real-time search across keys and values
- Copy key, value, or path with one click
- Breadcrumb navigation & pinned node details

### ⚖️ Diff
- Structural side-by-side JSON comparison
- Highlights added (green), removed (red), and changed (orange) nodes
- Summary counts per change type
- Toggle unchanged nodes on/off

### ✨ Transform
- Pretty print, minify, sort keys
- Remove nulls / empty values
- Flatten to dot-notation keys / unflatten
- Parse escaped/stringified JSON
- Extract subtree by path (dot or bracket notation)

### 📊 Insights
- Total keys, objects, arrays, values
- Max depth, null counts, empty field counts
- Type distribution chart
- Most repeated key names chart
- Likely timestamp detection with human-readable dates

### 📈 Visualise
- Auto-detects arrays, time-series, categories, proportions
- Bar chart, line chart, pie/donut chart
- Sortable & filterable data table
- Structure tree diagram (SVG)
- Export data as CSV
- User-selectable fields for custom charts

### 🛡️ Sensitive Data
- Detects passwords, tokens, API keys, email, PII and more
- Severity levels (high / medium / low)
- Mask values with hover-to-reveal
- Export masked JSON for safe sharing
- Auto-detects and decodes JWT tokens

### 🔑 JWT Decoder
- Decode header & payload
- Show expiry, issued-at, subject, issuer
- Expiry status (valid / expired)
- Clearly marked as "signature not verified"

---

## 🔒 Privacy

All processing is 100% local. Your JSON **never leaves your browser**.

- No backend
- No uploads
- No sign-in
- No analytics on your data
- Safe for sensitive data, credentials, and PII

---

## 🚀 Running Locally

This is a static site — no build step required.

```bash
# Clone the repository
git clone https://github.com/mightora/json-explorer.git
cd json-explorer

# Serve with any static server, e.g.:
npx serve .
# or
python3 -m http.server 8080
# or just open index.html in your browser
```

Then open [http://localhost:8080](http://localhost:8080).

---

## 🌐 GitHub Pages Deployment

1. Push to `main` branch
2. Go to **Settings → Pages**
3. Set source to **Deploy from a branch** → `main` → `/ (root)`
4. Your site will be live at `https://<org>.github.io/json-explorer/`

---

## ⚙️ Customisation

### Central Config (`data/config.json`)
Customise the site name, hero text, author bio, and feature toggles.

### Footer (`data/footer.json`)
Rendered dynamically from JSON, based on the Mightora footer YAML structure.
Edit to add/remove links and brands.

### CSS Variables (`assets/css/main.css`)
All colours, spacing and typography are defined as CSS custom properties at the top of `:root`.
Dark mode overrides are in `[data-theme="dark"]`.

---

## 📁 File Structure

```
json-explorer/
├── index.html              # Main application
├── data/
│   ├── config.json         # Central configuration
│   └── footer.json         # Footer data
├── assets/
│   ├── css/
│   │   └── main.css        # All styles (Mightora design language)
│   └── js/
│       ├── json-parser.js  # Safe parsing with error hints
│       ├── json-tree.js    # Collapsible tree renderer
│       ├── json-diff.js    # Structural diff engine
│       ├── json-transform.js # Transform operations
│       ├── json-insights.js  # Metrics and analysis
│       ├── visualise.js    # Charts & table visualisations
│       ├── sensitive-data.js # Sensitive field detection
│       ├── jwt-helper.js   # JWT decode utility
│       ├── ui.js           # UI utilities (toast, theme, etc.)
│       └── app.js          # Main application orchestrator
└── README.md
```

---

## 🛠️ Architecture

- **Static only** — GitHub Pages compatible, no server required
- **No frameworks** — Vanilla JS modules wrapped in IIFE pattern
- **Chart.js** (CDN) for lightweight charts
- **Font Awesome** (CDN) for icons
- **Inter** + **JetBrains Mono** (Google Fonts) for typography
- **Lazy rendering** for large JSON (chunked tree loading)
- **Session restore** via `sessionStorage`
- **Dark / light mode** via CSS custom properties + `data-theme`

---

## 👤 Author

**Ian Tweedie** — Microsoft MVP, Power Platform Architect

- 🌐 [iantweedie.biz](https://iantweedie.biz)
- 📺 [YouTube @techtweedie](https://youtube.com/@techtweedie)
- 💼 [LinkedIn](https://go.iantweedie.biz/LinkedIn-Linktree)
- 🐙 [GitHub](https://github.com/itweedie)

Built as part of the [Mightora.io](https://mightora.io) free developer tools suite.

---

## 📄 License

MIT — free to use, modify, and distribute.