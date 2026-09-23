# DESIGN.md — CodeOracle Pro Engine

Design system for **CodeOracle**, the legacy codebase intelligence and refactoring engine. It is reverse-engineered from six screenshots of the current UI: dark header, warm cream canvas, one large tabbed workspace, indigo for actions, amber for "needs a human", teal for healthy, red for risk, and dark panels for code.

This file is for CodeOracle only. It replaces the Apple Modern file for this project. Keep the Apple file for your other projects.

**Rename to `DESIGN.md` when you drop it in the repo.**

---

## 0. How to read this file

### 0.1 Method and assumptions

- **Colors** were sampled from screenshot pixels and then adjusted only where needed for contrast. Values marked *observed* come straight from the pixels; values marked *adjusted* were changed to pass accessibility. Treat observed values as ±3 per channel.
- **Sizes** were measured in the screenshots and normalized to 100% zoom by dividing by 0.8. Evidence: the workspace card measures about 922px wide, which matches a 1152px (`max-w-6xl`) container captured at 80% browser zoom. If your captures were at a different zoom, only the px values change; ratios stay the same. Verify a few in DevTools.
- **Fonts** cannot be read from a screenshot. The font tokens name the closest matches. If your code already defines the fonts, keep those and update the tokens.
- Anything **not visible** in the screenshots (landing state, analyzing state, errors, modals, toasts) is marked *extrapolated* and built from the same tokens.

### 0.2 Instructions for AI coding assistants

Follow in order:

1. Use only tokens from §13. No one-off hex values, radii, shadows or durations.
2. **Color has one job each.** Ink = structure and primary export actions. Indigo = identity and "generate / run" actions. Teal = healthy. Amber = needs attention or human review. Red = risk. Never swap them.
3. **Surface nesting is fixed:** canvas → white card → beige tile, or canvas → beige panel → white card. Never white-in-white without a 1px line, never beige-in-beige.
4. **Paths, file names, symbols and code are always monospace.** Section titles, numbers and metrics use the display face.
5. **Every risk, status and score shows a text label** as well as color ("HIGH RISK", "Strong", "LOW").
6. **Code and diffs always render in the dark viewer** (§7.9), never on a light surface.
7. **Never show a number the engine did not measure.** If something is estimated, unavailable or unexecuted, say so in the UI ("Unavailable", "Syntax-based estimation").
8. Every interactive element gets rest, hover, pressed, focus-visible, disabled and loading states.
9. Animate only `transform`, `opacity`, `box-shadow`, `background-color`. Respect `prefers-reduced-motion`.
10. Icons: one outline set (Lucide), 1.75px stroke.

### 0.3 What the screenshots show

| # | Screen | Regions captured |
|---|---|---|
| 1 | Header + project summary | Dark app header (brand tile, name, PRO ENGINE badge, tagline, "Service ready" pill), project summary panel (repo tile, name, source, "Analyze Another Project", 3 stat cards), collapsible "Source Files", workspace card with 5-tab bar |
| 2 | Migration Plan | "Modernization Intelligence" card with readiness gauge, "Readiness Breakdown" (5 score cards), "What Breaks If I Change This?" list, blast-radius detail with 4 info panels |
| 3 | Explanation | Section header card, 4 KPI cards (one amber-highlighted), "In simple words" panel with 3 sub-cards, search + language filter, module accordion rows |
| 4 | Dependency Graph | Section header with badges, 6 stat tiles, search + segmented filter + toggle chips, React Flow canvas (nodes, edges, controls, legend, minimap), "Selected item" side panel |
| 5 | Generated Tests | Header with Download ZIP / Regenerate, 4 KPI cards, amber notice, generated-files list, dark code viewer with Copy Code |
| 6 | Refactored Code | Header with Download / Regenerate, 4 KPI cards (one selected, one amber), "Human review required" notice, file list, dark diff viewer with Diff / Original / Modernized switch |

### 0.4 Inconsistencies in the current UI (fixed in this file)

| Observed | Fix in this file |
|---|---|
| Language colors differ: graph legend says TypeScript is violet, but TypeScript node tags are amber | One language token set used everywhere (§1.6) |
| Score 73 uses an amber ring with "Ready with care", but score 76 uses a teal bar with the same label | Score bands decide color everywhere (§1.5) |
| Uppercase labels and helper text measure about 9–10px at screenshot scale (about 11–12px at 100%) | Minimum sizes set in §2.2 |
| Search fields and filter chips have almost no visible edge on beige | Edge rules in §7.7 and §12 |
| Diff lines have no add / remove highlighting | Tinted rows plus `+` / `−` gutter (§7.9) |
| Selected KPI (ink outline) and highlighted KPI (amber outline) look similar | Distinct roles and a check / dot marker (§7.5) |
| Text on the graph's beige background falls below 4.5:1 in `--ink-3` | Use `--ink-2` on `--graph-bg` (§7.8) |

### 0.5 Principles

1. **Evidence over decoration.** The product explains a codebase; every screen leads with numbers, paths and reasons.
2. **Calm density.** Many small facts, arranged in quiet cards on a warm canvas. Whitespace separates groups; borders are hairlines.
3. **Honest certainty.** Measured, estimated and unavailable are visibly different.
4. **Ink first.** The app's primary voice is near-black on cream. Color appears only when it means something.
5. **Risk is never quiet.** A red card, badge and bar always come together.
6. **Code is a different room.** Dark viewers signal "this is source, treat it carefully".
7. **Humans approve.** Anything the tool changes shows a review step before it can be used.

---

## 1. Color

### 1.1 Warm neutrals (about 80% of every screen)

| Token | Hex | Source | Usage |
|---|---|---|---|
| `--canvas` | `#F8F4EE` | observed | Page background |
| `--surface` | `#FFFDFC` | observed | Cards, sub-cards, list rows, side panels, nodes (warm white, never `#FFF`) |
| `--panel` | `#F0EAE3` | observed | Grouping panels: project summary, "In simple words", filter tracks |
| `--track` | `#ECE7DE` | observed | Tab bar track, progress track, segmented track |
| `--tile` | `#F5F2EC` | observed | Stat tiles inside white cards, search field fill |
| `--well` | `#EDE6DA` | observed | Gauge box, emphasized wells |
| `--graph-bg` | `#E7E0D3` | observed | Dependency graph canvas (with dot grid) |
| `--graph-dot` | `#B9B2A2` | observed | Dot-grid points on the graph canvas |
| `--line` | `#E5DFDA` | observed | Card borders, dividers |
| `--line-strong` | `#8F887C` | adjusted | Control edges when `prefers-contrast: more`; 3.5:1 on surface |

### 1.2 Text

| Token | Hex | On surface | On canvas | On panel | Usage |
|---|---|---|---|---|---|
| `--ink` | `#191715` | 17.6:1 | 16.3:1 | — | Titles, values, active tab fill |
| `--ink-2` | `#3D3935` | 11.3:1 | — | — | Body copy, uppercase labels |
| `--ink-3` | `#6B655E` | 5.7:1 | 5.3:1 | 4.8:1 | Subtitles, helper text, metadata (adjusted from the lighter screenshot gray) |
| `--ink-4` | `#8A847C` | 3.7:1 | — | — | **Large text and decorative only** (chevrons, disabled) |
| `--ink-inverse` | `#FFFFFF` | — | — | — | Text on ink, indigo, red-strong |

`--ink-3` on `--graph-bg` is 4.4:1, so labels sitting directly on the graph canvas use `--ink-2`.

### 1.3 Header (dark)

| Token | Hex | Usage |
|---|---|---|
| `--header-bg` | `#191715` | App header background |
| `--header-line` | `#453C1D` | 2px hairline across the very top of the header (dark amber-brown) |
| `--header-muted` | `#918F8D` | Tagline (5.6:1 on header) |

### 1.4 Accent and status families

Each family has the same five roles: **solid** (fills, bars, dots), **strong** (hover / text on white), **surface** (tinted background), **text** (on surface), **line** (tinted border).

**Indigo — identity and actions**

| Token | Hex | Contrast | Usage |
|---|---|---|---|
| `--indigo` | `#4D50D7` | white on it 6.1:1 | Brand tile, filled action buttons ("Regenerate"), focus ring, selected edges |
| `--indigo-press` | `#3E41B8` | white on it 7.9:1 | Hover and pressed for indigo buttons |
| `--indigo-deep` | `#383AA7` | white on it 9.0:1 | PRO ENGINE badge, "Copy Code" button, buttons on dark surfaces |
| `--indigo-text` | `#43469E` | 7.9:1 on surface | Monospace paths, small indigo labels, links |
| `--indigo-surface` | `#EAE9FB` | — | Selected list row, active filter chip, icon tiles, "Project view" pill |
| `--indigo-on-dark` | `#ACAEE4` | 8.2:1 on code bg | File titles inside dark viewers |
| `--indigo-badge-text` | `#BEC2FF` | 5.3:1 on `--indigo-deep` | Text on the PRO ENGINE badge |

**Teal — healthy, strong, passed, low risk**

| Token | Hex | Contrast | Usage |
|---|---|---|---|
| `--teal` | `#378C7B` | 4.0:1 on surface, 3.3:1 on track | Progress bars, entry-point numbers, icons |
| `--teal-strong` | `#2F7A6B` | 5.0:1 on surface | Status words on white ("Strong", "Ready") |
| `--teal-surface` | `#DFF0EA` | — | "Service ready", LOW, ANALYZED, complexity-low pills |
| `--teal-text` | `#2A5A4F` | 6.7:1 on teal-surface | Text on teal-surface |
| `--teal-on-dark` | `#5EB896` | 7.2:1 on code bg | "Syntax check passed", added lines |

**Amber — attention and human review**

| Token | Hex | Contrast | Usage |
|---|---|---|---|
| `--amber` | `#B7822A` | 3.3:1 on surface | Large KPI numbers (24px+), dots, highlight card marker. **Never small text** |
| `--amber-strong` | `#A9761F` | 3.9:1 on surface, 3.2:1 on well | Gauge ring stroke (adjusted from the paler `#C79437` in the screenshot, which was 2.2:1 on its box) |
| `--amber-surface` | `#F6E8CD` | — | Notices, "Generated Tests" icon tile, JS / TS tags |
| `--amber-text` | `#7A5A1E` | 6.3:1 on surface, 5.2:1 on amber-surface | Small text on amber |
| `--amber-line` | `#D8B274` | — | Border on highlighted KPI card and notices |
| `--amber-on-dark` | `#FBD16D` | 12.3:1 on header | Active-tab icon, warning titles inside dark viewers |
| `--amber-warn-bg` | `#403219` | — | Rule/warning bar inside dark viewers |
| `--amber-warn-text` | `#E1C97E` | 7.6:1 on warn bg | Body text of that bar |

**Red — risk**

| Token | Hex | Contrast | Usage |
|---|---|---|---|
| `--red` | `#C1625D` | 3.3:1 on track | Bars, dots, critical node outline |
| `--red-strong` | `#A33F39` | white on it 6.3:1 | CRITICAL pill fill, danger button |
| `--red-text` | `#A33F39` | 5.2:1 on red-surface | Risk numbers and titles |
| `--red-surface` | `#F7E5E2` | — | HIGH RISK pill, "8 dependency loops" pill, critical nodes |
| `--red-wash` | `#FAF4F2` | — | Whole-card tint for a risk metric card |
| `--red-line` | `#EBCBC7` | — | Border on risk cards |

**Slate — neutral metadata**

| Token | Hex | Usage |
|---|---|---|
| `--slate-surface` | `#E5EDF1` | Neutral tags |
| `--slate-text` | `#46606F` | Text on slate-surface (5.6:1) |
| `--slate` | `#637F93` | External dependency dots and nodes |

### 1.5 Status mapping (use this table, do not invent new pairs)

| Meaning | Family | Where it appears |
|---|---|---|
| Ready, strong, passed, analyzed, LOW risk, LOW complexity, entry point | Teal | Service ready pill, Strong labels and bars, ANALYZED tag, LOW pill, Syntax check passed |
| Needs attention, suggestion, review, MEDIUM, "Ready with care" | Amber | Suggestions KPI, Human review notice, breaking-change count, gauge at 50–79 |
| Risk, HIGH, dependency loop, cycle, critical | Red | Dependency safety card, HIGH RISK pill, loops pill, cycles chip |
| Identity, primary generate action, selection, project view | Indigo | Brand tile, Regenerate, selected row, ALL chip, PROJECT VIEW pill |
| Neutral information | Slate / beige | Blast-radius pill, external nodes, file counts |

**Score bands** (Readiness score, sub-scores, any 0–100 metric):

| Score | Label | Color |
|---|---|---|
| 80–100 | Strong | Teal (bar `--teal`, label `--teal-strong`) |
| 50–79 | Ready with care | Amber (bar `--amber-strong`, label `--amber-text`) |
| 0–49 | High risk | Red (bar `--red`, label `--red-text`, whole card `--red-wash` + `--red-line`) |

**Risk levels** (files, blast radius): LOW = teal pill, MEDIUM = amber pill, HIGH = red-surface pill, CRITICAL = solid `--red-strong` with white text.

### 1.6 Language colors (one set, used in tags, dots, legend and nodes)

| Language | Dot / node accent | Tag surface | Tag text |
|---|---|---|---|
| Python | `#4D50D7` (indigo) | `--indigo-surface` | `--indigo-text` |
| JavaScript | `#B7822A` (amber) | `--amber-surface` | `--amber-text` |
| TypeScript | `#7862DE` (violet) | `#EFEBFC` | `#4E3FA8` (6.9:1) |
| External | `#637F93` (slate) | `--slate-surface` | `--slate-text` |
| Entry point | `#408B81` (teal) | `--teal-surface` | `--teal-text` |

The screenshots use slate tags for every language in lists and amber tags for TypeScript nodes; this table unifies them so the legend always matches what you see.

### 1.7 Dark code viewer palette

| Token | Hex | Usage |
|---|---|---|
| `--code-bg` | `#1C1B17` | Code area (14.0:1 with `--code-text`) |
| `--code-bar` | `#191715` | Viewer top bar |
| `--code-text` | `#E8E8E2` | Default code text |
| `--code-muted` | `#A09892` | Line numbers, subtitles, inactive toggle labels (6.1:1) |
| `--code-track` | `#2E2A27` | Segmented-control track inside the viewer |
| `--code-line` | `rgba(255,255,255,0.08)` | Dividers inside the viewer |
| `--diff-add-bg` | `rgba(94,184,150,0.14)` | Added lines (recommended; not in screenshots) |
| `--diff-del-bg` | `rgba(193,98,93,0.18)` | Removed lines (recommended) |
| `--diff-del-text` | `#F0A39E` | `−` marker and removed-line accent (recommended) |

Syntax highlighting (recommended): keywords `--indigo-on-dark`, strings `--teal-on-dark`, numbers `--amber-on-dark`, comments `--code-muted` italic, everything else `--code-text`.

### 1.8 Usage balance

| Share | What |
|---|---|
| ~72% | Canvas, surface, panel, track |
| ~12% | Ink text, dark header, dark viewers |
| ~8% | Borders, tiles, wells |
| ~4% | Indigo |
| ~4% | Teal, amber, red combined |

Amber and red are attention colors: keep them to about 3 elements per viewport unless a screen is *about* risk (Migration Plan).

---

## 2. Typography

### 2.1 Families

```css
--font-display: "Outfit", "Sora", var(--font-sans);   /* heavy geometric face seen in titles, KPI numbers, app name */
--font-sans:    "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
--font-mono:    "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
```

- **Display** for the app name, card titles, KPI values, scores. Weights 700 and 800.
- **Sans** for everything else (tabs, buttons, body, labels).
- **Mono** for every file path, symbol, hex, test id, diff and code block.
- Numbers in metrics, tables and counters use `font-variant-numeric: tabular-nums`.
- `-webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility;`

### 2.2 Type scale (normalized to 100% zoom)

| Role | Size / line | Weight | Tracking | Face | Color |
|---|---|---|---|---|---|
| App name | 20 / 1.1 | 800 | -0.01em | Display | `#FFFFFF` |
| Header tagline | 12 / 1.3 | 400 | 0 | Sans | `--header-muted` |
| Card / section title | 18 / 1.25 | 700 | -0.01em | Display | `--ink` |
| Hero card title ("Modernization Intelligence") | 20 / 1.2 | 700 | -0.01em | Display | `--ink` |
| Group heading ("Readiness Breakdown") | 16 / 1.3 | 700 | 0 | Display | `--ink` |
| Subtitle | 13 / 1.4 | 400 | 0 | Sans | `--ink-3` |
| Body | 14 / 1.6 | 400 | 0 | Sans | `--ink-2` |
| Body small (card descriptions) | 13 / 1.5 | 400 | 0 | Sans | `--ink-3` |
| Caption / meta ("3 lines", "0 downstream file(s) affected") | 12 / 1.4 | 400 | 0 | Sans | `--ink-3` |
| Label, uppercase ("TOTAL FILES", "GENERATED FILES") | 11 / 1.2 | 700 | +0.08em | Sans | `--ink-2` |
| KPI value | 30 / 1.05 | 800 | -0.02em | Display | `--ink` |
| Hero metric (readiness "73") | 48 / 1 | 800 | -0.02em | Display | `--ink` |
| Sub-score number | 20 / 1 | 800 | 0 | Display | `--ink` (or status text color) |
| Tag / pill (uppercase) | 11 / 1 | 700 | +0.04em | Sans | per family |
| Button | 13 / 1 | 600 | 0 | Sans | per variant |
| Tab | 14 / 1 | 600 | 0 | Sans | per state |
| Path, list row | 13 / 1.4 | 600 | 0 | Mono | `--ink` or `--indigo-text` |
| Path, graph node | 12 / 1.3 | 600 | 0 | Mono | `--ink` |
| Code / diff | 13 / 1.7 | 400 | 0 | Mono | `--code-text` |

**Minimums:** nothing below 11px (uppercase tags) or 12px (all other text). The screenshots are slightly smaller; this file rounds up for legibility.

### 2.3 Rules

- Titles are sentence case except product names. Labels and tags are uppercase.
- Paths **truncate in the middle** so the file name stays visible: `src/…/DashboardPage.tsx`. The full path appears in a tooltip and on selection. (The screenshots truncate at the end, which hides the most important part.)
- Line length for prose blocks (explanations, notices) ≤ 72 characters.
- Numbers use thousands separators (`23,131`) and units where clear (`655 edges`, `88 / 126`).
- No text in ALL CAPS longer than 3 words.

---

## 3. Shape

| Token | Value | Elements |
|---|---|---|
| `--r-xs` | 6px | Kbd, minimap frame, small checkboxes |
| `--r-sm` | 10px | 28–32px icon chips, small inner tiles |
| `--r-md` | 14px | Graph nodes, list rows, sub-cards, info panels, 44px icon tiles |
| `--r-lg` | 20px | KPI cards, section header cards, code viewers, graph canvas, notices |
| `--r-xl` | 28px | Project summary panel, gauge box, hero cards |
| `--r-2xl` | 32px | The workspace shell (big white card holding the tabs) |
| `--r-pill` | 999px | Buttons, tabs, chips, badges, search fields, status pills, toggles, tab-bar track (uses `--r-xl` when it wraps) |

Rule: the bigger the container, the softer the corner. Nested radius = outer radius − padding (a 32px shell with 24px padding holds ~8–20px children; use the nearest token).

---

## 4. Spacing and layout

**Base unit 4px.** Allowed: `4, 8, 12, 16, 20, 24, 32, 40, 48, 64`.

### 4.1 Containers

| Container | Width | Where |
|---|---|---|
| Header inner | 1200px max | Brand left, status right |
| Workspace | 1152px max, centered | Tab shell (screenshots 2–6) |
| Summary column | ~840px max, centered | Project summary and Source Files card (screenshot 1) |
| Page padding | 16px mobile, 24px tablet, 32px desktop | |

### 4.2 Vertical rhythm

| Between | Spacing |
|---|---|
| Header → first block | 24px |
| Summary panel → Source Files card → workspace | 24–32px |
| Blocks inside a tab (header card → KPIs → notice → panes) | 16–24px |
| Inside a card (title → content) | 16px |
| Card padding | KPI 16×20, header card 20×24, panel 24, sub-card 16–20, list row 12×16 |
| Grid gaps | KPI grid 16px, stat-tile grid 12px, two-pane 16–20px |

### 4.3 Grids by screen

| Screen | Grid |
|---|---|
| KPI rows | 4 equal columns (Explanation, Tests, Refactor) |
| Dependency stats | 6 equal columns (tiles) |
| Readiness breakdown | 5 equal columns |
| "In simple words" | 3 equal columns |
| Project summary stats | 1fr · 1fr · 1.2fr (languages card is wider) |
| Tests / Refactor | List `280px` + viewer `1fr` |
| Dependency Graph | Canvas `1fr` + side panel `260px` |
| Blast radius | List `320px` + detail `1fr`; detail holds a 2×2 panel grid |

### 4.4 Layers

`--z-sticky: 100` (header, tab bar), `--z-dropdown: 200`, `--z-overlay: 300`, `--z-modal: 400`, `--z-toast: 500`, `--z-tooltip: 600`.

### 4.5 Header

68px tall including the 2px top hairline, sticky at the top. Content vertically centered, inner max width 1200px.

---

## 5. Surfaces and effects

### 5.1 Surface recipes

| Surface | Recipe |
|---|---|
| **Workspace shell** | `--surface`, 1px `--line`, `--r-2xl`, padding 24px, shadow `--sh-shell` |
| **Card** | `--surface`, 1px `--line`, `--r-lg` (KPI, header) or `--r-md` (rows, sub-cards) |
| **Panel** | `--panel`, no border, `--r-xl`, padding 24px; holds white cards |
| **Tile** | `--tile`, 1px `--line`, `--r-md`; sits inside a white card (stat tiles, info panels) |
| **Well** | `--well`, `--r-xl`; gauge box |
| **Highlight card** | Card with 1.5px `--amber-line` border and an amber dot marker top-right |
| **Selected card** | Card with 1.5px `--ink` border |
| **Risk card** | `--red-wash` fill, 1px `--red-line` border, `--red-text` value |
| **Notice** | `--amber-surface`, 1px `--amber-line`, `--r-lg` |
| **Dark viewer** | `--code-bg`, `--r-lg`, top bar `--code-bar` |
| **Graph canvas** | `--graph-bg` with dot grid, `--r-lg` |

### 5.2 Shadows

```css
--sh-1: 0 1px 2px rgba(25,23,21,0.06), 0 1px 1px rgba(25,23,21,0.04);   /* white pill buttons, inactive tabs at rest */
--sh-2: 0 4px 12px rgba(25,23,21,0.08);                                  /* hover on cards, buttons, nodes */
--sh-3: 0 12px 32px rgba(25,23,21,0.12);                                 /* popovers, menus, toasts */
--sh-4: 0 24px 64px rgba(25,23,21,0.18);                                 /* modals */
--sh-shell: 0 8px 40px rgba(25,23,21,0.06);                              /* workspace shell */
--sh-indigo: 0 6px 16px -4px rgba(77,80,215,0.45);                       /* filled indigo buttons only (glow seen on Regenerate) */
```
No other colored shadows. Cards at rest have a border and no shadow.

### 5.3 Other effects

| Effect | Spec |
|---|---|
| **Dot grid** | `background-image: radial-gradient(var(--graph-dot) 1px, transparent 1.2px); background-size: 20px 20px;` on the graph canvas |
| **Focus ring** | `outline: 2px solid var(--indigo); outline-offset: 2px;` on `:focus-visible`. On dark surfaces add a 2px `--code-bar` gap first |
| **Selection** | `::selection { background: var(--indigo-surface); color: var(--ink); }` |
| **Scrollbar** | Thin overlay: `scrollbar-width: thin; scrollbar-color: #C9C1B4 transparent;` (used in the blast-radius file list and code viewers) |
| **Row hover** | Background `rgba(25,23,21,0.03)`; selected row uses `--indigo-surface` |
| **Divider** | 1px `--line`; inside panels use `rgba(25,23,21,0.08)` |
| **Sticky tab bar** (recommended) | `position: sticky; top: 76px;` on `--canvas` at 92% with `backdrop-filter: blur(8px)` |
| **Status glow** | None. Status is a dot + text, not a glow |
| **Skeleton** | `--track` base, moving `rgba(255,255,255,0.6)` highlight, 1.6s linear infinite |

---

## 6. Iconography

One outline family, **Lucide**, 1.75px stroke, round caps and joins. Sizes: 14 (chips), 16 (buttons, inputs), 18 (tabs), 22 (icon tiles), 28 (empty states).

| Use | Icon |
|---|---|
| Brand tile | `Eye` |
| Service ready | `CircleCheck` |
| Explanation tab | `BookOpen` |
| Dependency Graph tab | `Workflow` (fork / network glyph) |
| Generated Tests tab | `TestTube` |
| Refactored Code tab | `WandSparkles` |
| Migration Plan tab | `Map` |
| Analyze another / Refresh | `RotateCcw` / `RefreshCw` |
| Download (report, ZIP, markdown, mermaid) | `Download` |
| Regenerate tests | `Play` |
| Regenerate refactor | `WandSparkles` |
| Copy code | `Clipboard` → `Check` for 1.5s |
| Total files / files understood | `FileText` |
| Code lines | `Hash` |
| Connections | `Cpu` |
| Detected languages | `Code` |
| Search | `Search` |
| Collapse / expand | `ChevronDown` (rotates 180°) |
| Info / empty | `Info` |
| Warning notice | `TriangleAlert` |
| Blast radius | `Target` |
| Files that depend on this | `Network` |
| Files this depends on | `ArrowRight` |
| Entry points | `FileWarning` |
| Tests to run | `ShieldCheck` |
| Readiness breakdown | `Gauge` |
| Decision support | `Map` on an ink tile |

**Icon tiles** (44×44, `--r-md`, glyph 22px) carry the section's meaning: indigo-surface + indigo glyph (Explanation, Dependency), amber-surface + amber-text glyph (Generated Tests), teal-surface + teal glyph (Refactored Code, project healthy), ink + indigo-on-dark glyph (Decision support).
**Icon chips** (28×28, `--r-sm`, `--track`, glyph 14–16px `--ink-3`) sit in the corner of KPI cards.

Icon-only buttons need an `aria-label` and a tooltip.

---

## 7. Components

### 7.0 Inventory

| Group | Components |
|---|---|
| Shell | App header, status pill, workspace shell, tab bar, sticky tab bar |
| Actions | Outline, Ink, Indigo, Indigo-on-dark, Ghost, Danger buttons; icon button; copy button; download menu |
| Containers | Project summary panel, collapsible card, section card, header bar, KPI card (default / highlight / selected / risk), stat tile, score card, info sub-card, info panel, module row (accordion), master–detail list |
| Data display | Gauge ring, progress bar, dependency graph (node, edge, controls, legend, minimap), selected-item side panel, tags, status pills, filter chips, toggle chips |
| Inputs | Search field, segmented control, dark segmented control, URL input, sample-repo chips, sort dropdown, checkbox, switch |
| Code | Dark code viewer, dark diff viewer, rule/warning bar |
| Feedback | Notice (warning / info / success / danger), toast, tooltip, popover, modal, skeleton, spinner, analysis stepper, empty state, error state |

Items marked *extrapolated* are not visible in the screenshots but the product needs them.

### 7.1 App header

```html
<header class="app-header">
  <div class="app-header__inner">
    <div class="brand">
      <span class="brand__tile"><svg><!-- Eye --></svg></span>
      <div>
        <div class="brand__row"><span class="brand__name">CodeOracle</span><span class="badge-pro">PRO ENGINE</span></div>
        <p class="brand__tag">Legacy Codebase Intelligence &amp; Refactoring Engine</p>
      </div>
    </div>
    <span class="status-pill" data-state="ready" role="status">Service ready</span>
  </div>
</header>
```
```css
.app-header { position: sticky; top: 0; z-index: var(--z-sticky); height: 68px; background: var(--header-bg);
  box-shadow: inset 0 2px 0 var(--header-line); }
.app-header__inner { max-width: 1200px; height: 100%; margin: 0 auto; padding: 0 32px; display: flex; align-items: center; justify-content: space-between; }
.brand { display: flex; align-items: center; gap: 12px; }
.brand__tile { width: 44px; height: 44px; border-radius: 12px; background: var(--indigo); display: grid; place-items: center; color: #fff;
  box-shadow: inset 0 1px 0 rgba(255,255,255,.2); }
.brand__row { display: flex; align-items: center; gap: 8px; }
.brand__name { font: 800 20px/1.1 var(--font-display); letter-spacing: -0.01em; color: #fff; }
.badge-pro { padding: 3px 8px; border-radius: var(--r-pill); background: var(--indigo-deep); color: var(--indigo-badge-text);
  font: 700 11px/1 var(--font-sans); letter-spacing: .06em; }
.brand__tag { margin: 2px 0 0; font: 400 12px/1.3 var(--font-sans); color: var(--header-muted); }
```
Mobile (< 640px): hide the tagline, keep the badge, shrink the tile to 36px.

### 7.2 Status pill ("Service ready")

Pill, 32px high, padding `0 12px`, 12px / 600, leading 14px icon.

| State | Fill / text | Icon | Notes |
|---|---|---|---|
| Ready | `--teal-surface` / `--teal-text` | `CircleCheck` in `--teal-strong` | Default |
| Checking | `--slate-surface` / `--slate-text` | Spinner | First load, retries |
| Degraded | `--amber-surface` / `--amber-text` | `TriangleAlert` | Slow or partial; tooltip explains |
| Offline | `--red-surface` / `--red-text` | `WifiOff` | Disables Analyze and Regenerate buttons |

`role="status"`, poll health every 30s, never flash between states faster than 2s.

### 7.3 Buttons

Pill radius, `font: 600 13px/1 var(--font-sans)`, icon 16px with an 8px gap. Heights: small 32 (inside viewers), default 40, large 48 (landing "Analyze"). Padding `0 16px` (default). Minimum hit area 44px (use padding or a `::after` pseudo-element on small buttons).

| Variant | Look | Used for |
|---|---|---|
| **Outline** | `--surface`, 1px `--line`, `--ink` text, `--sh-1` | Analyze Another Project, Download ZIP, Download Markdown, Refresh Explanation, Download proposal, Download Mermaid |
| **Ink** | `--ink` fill, white text | Download Executive Report (primary export) |
| **Indigo** | `--indigo` fill, white text, `--sh-indigo` | Regenerate tests, Regenerate (run / generate actions) |
| **Indigo on dark** | `--indigo-deep` fill, `--indigo-badge-text` | Copy Code, copy icon button inside viewers |
| **Ghost** | Transparent, `--ink-2` | Cancel, Skip, low-priority links |
| **Danger** | `--red-strong` fill, white text | Destructive confirm only |

State rules: hover Outline → `--tile` fill + `--line-strong` border; Ink → `--ink-2`; Indigo → `--indigo-press`. Pressed: `scale(0.97)`. Disabled: `--track` fill, `--ink-4` text, no shadow, `cursor: not-allowed`. Loading: keep the button width, swap the icon for an 16px spinner, change the label to the progressive form ("Regenerating…"), set `aria-busy="true"`.

```css
.btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 40px; padding: 0 16px;
  border: 1px solid transparent; border-radius: var(--r-pill); font: 600 13px/1 var(--font-sans); cursor: pointer;
  transition: background-color var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out),
              box-shadow var(--dur-base) var(--ease-out), transform var(--dur-instant) var(--ease-out); }
.btn:active { transform: scale(.97); }
.btn:focus-visible { outline: 2px solid var(--indigo); outline-offset: 2px; }
.btn[disabled] { background: var(--track); color: var(--ink-4); border-color: transparent; box-shadow: none; cursor: not-allowed; }

.btn-outline { background: var(--surface); color: var(--ink); border-color: var(--line); box-shadow: var(--sh-1); }
.btn-outline:hover { background: var(--tile); border-color: var(--line-strong); }
.btn-ink     { background: var(--ink); color: #fff; }
.btn-ink:hover { background: var(--ink-2); }
.btn-indigo  { background: var(--indigo); color: #fff; box-shadow: var(--sh-indigo); }
.btn-indigo:hover { background: var(--indigo-press); }
.btn-dark    { background: var(--indigo-deep); color: var(--indigo-badge-text); }
.btn-ghost   { background: transparent; color: var(--ink-2); }
.btn-ghost:hover { background: rgba(25,23,21,.05); }
.btn-danger  { background: var(--red-strong); color: #fff; }
.btn-sm      { min-height: 32px; padding: 0 12px; font-size: 12px; }   /* inside viewers; extend hit area to 44px */
```

**Download menu** (extrapolated): a single Outline button with a chevron opens a menu of formats where a tab offers more than one (Markdown, PDF, JSON). Menu is a popover (§7.12).

**Copy button:** label changes to "Copied" with a `Check` icon for 1.5s and announces "Copied to clipboard" via `aria-live="polite"`.

### 7.4 Tab bar (workspace navigation)

Five tabs in a beige track at the top of the workspace shell.

| Part | Spec |
|---|---|
| Track | `--track`, `--r-xl`, padding 8px, spans the full width of the shell (trailing empty space is intentional) |
| Tab | Pill, height 40px, padding `0 16px`, 14px / 600, icon 18px, gap 8px, tabs separated by 8px |
| Inactive | `--surface` fill, 1px `--line`, `--ink` text and icon, `--sh-1` |
| Hover | Border `--line-strong`, lift 1px |
| **Active** | `--ink` fill, white text, **icon in `--amber-on-dark`**, no border |
| Focus | 2px `--indigo` ring with 2px offset |
| Order | Explanation · Dependency Graph · Generated Tests · Refactored Code · Migration Plan |

Behavior:
- `role="tablist"`; arrow keys move focus, Home / End jump, Enter or Space activates, `aria-selected`, panels have `role="tabpanel"` and `aria-labelledby`.
- The active fill is a single element that slides between tabs (spring, ~350ms) instead of jumping.
- Tabs are disabled (with a tooltip "Run an analysis first") until results exist.
- Optional status dot (8px) on a tab: amber on Migration Plan when human review is required, red on Dependency Graph when loops exist (extrapolated).
- Below 1024px the track scrolls horizontally with scroll-snap and an edge fade; the active tab scrolls into view.
- Recommended: make the track sticky under the header (§5.3).

```css
.tabs { display: flex; gap: 8px; padding: 8px; background: var(--track); border-radius: var(--r-xl); overflow-x: auto; scrollbar-width: none; }
.tab { display: inline-flex; align-items: center; gap: 8px; height: 40px; padding: 0 16px; border: 1px solid var(--line);
  border-radius: var(--r-pill); background: var(--surface); color: var(--ink); font: 600 14px/1 var(--font-sans); box-shadow: var(--sh-1);
  white-space: nowrap; transition: transform var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out); }
.tab:hover { border-color: var(--line-strong); transform: translateY(-1px); }
.tab[aria-selected="true"] { background: var(--ink); color: #fff; border-color: var(--ink); box-shadow: none; transform: none; }
.tab[aria-selected="true"] svg { color: var(--amber-on-dark); }
```

### 7.5 Cards and panels

**a) Project summary panel** (screenshot 1)
`--panel`, `--r-xl`, padding 24px. Header row: 44px icon tile (`--teal-surface`, `CircleCheck` in `--teal-strong`), repo name 18px / 700 display (ellipsis, full name in tooltip), "Source: GitHub repository" 12px `--ink-3`; right: Outline button "Analyze Another Project" with `RotateCcw`. Hairline divider. Below: 3 white stat cards (Total files, Code lines, Detected languages). The languages card is 1.2× wider and holds slate tags.

**b) Collapsible card ("Source Files (126)")**
`--surface`, 1px `--line`, `--r-xl`, padding 20×24. Title 16px / 700, subtitle 12px `--ink-3` ("Show file paths and sizes"), chevron at right (rotates 180° when open, 250ms). Body: filter input + list of `path … size` rows in mono, sizes right-aligned in tabular numbers, max height 320px with thin scrollbar. It is a `button` with `aria-expanded` and `aria-controls`.

**c) Section card** (Explanation, Dependency Graph)
`--surface`, 1px `--line`, `--r-xl`, padding 24px. Header: 44px icon tile + title 18px / 700 + subtitle 13px `--ink-3`; actions right; 1px divider; then the section body (KPI cards, tiles, panels).

**d) Header bar** (Generated Tests, Refactored Code, Migration Plan intro)
A shorter standalone card: `--surface`, `--r-lg`, padding 16×20, icon tile + title + subtitle on the left, actions on the right (Outline + Indigo). KPI cards follow as separate cards.

**e) KPI card**
Label (11px uppercase, `--ink-2`), optional 28px icon chip at the right, value (30px / 800 display). Text values ("Safety locked", "Unavailable", "125/126", "655 edges") use the same size and wrap to at most two lines.

| Variant | Look | Meaning | Marker |
|---|---|---|---|
| Default | `--surface`, 1px `--line`, `--r-lg` | Neutral fact | Icon chip |
| **Highlight** | 1.5px `--amber-line`, value in `--amber` | The one number that needs attention (Suggestions, Breaking-change risks) | 10px amber dot top-right |
| **Selected** | 1.5px `--ink` border | Card is an active filter | `Check` icon top-right, `aria-pressed="true"` |
| **Risk** | `--red-wash`, 1px `--red-line`, value `--red-text` | Metric is in the danger band | `TriangleAlert` icon |

Rules: at most one Highlight per row. A clickable KPI (filters the list below) shows `cursor: pointer`, hover border `--line-strong`, and is a `button`.

**f) Stat tile** (Dependency Graph, 6 across)
`--tile`, 1px `--line`, `--r-md`, padding 12×16. Label 12px `--ink-3` (sentence case). Value 22px / 800 display, colored by meaning: ink (Files shown), `--indigo-text` (Connections), `--red-text` (Dependency loops), `--amber-strong` (Standalone files, Needs review), `--teal-strong` (Entry points).

**g) Score card** (Readiness Breakdown, 5 across)
`--surface`, 1px `--line`, `--r-lg`, padding 16px. Row: title 13px / 600 left, number 20px / 800 right. Progress bar (6px, `--track`). Status label 12px / 700 in the band color. Description 12px / 1.5 `--ink-3`, up to 3 lines. The card takes the band color scheme from §1.5; the low band uses the Risk look (`--red-wash`, `--red-line`).

**h) Info sub-card** ("How it starts", "Important files", "How files connect")
`--surface`, 1px `--line`, `--r-md`, padding 16–20. Label 12px / 700 `--indigo-text`. Body 13px / 1.6 `--ink-2`. Three across inside a `--panel`. Panel footer: "What CodeOracle noticed" label + bulleted list, above a hairline.

**i) Info panel** (blast-radius detail, 2×2)
`--tile`, 1px `--line`, `--r-md`, padding 16. Icon 16px in its meaning color + title 13px / 700. Body is a list of mono paths, 12px, 8px apart. Empty: "None detected" in `--ink-3`.

| Panel | Icon and color |
|---|---|
| Files that depend on this | `Network`, `--red-text` |
| Files this depends on | `ArrowRight`, `--indigo-text` |
| Entry points affected | `FileWarning`, `--amber-strong` |
| Tests to run | `ShieldCheck`, `--teal-strong` |

**j) Module row** (Explanation list, accordion)
`--surface`, 1px `--line`, `--r-lg`, padding 12×20. Left: chevron (rotates), mono path 13px / 600 in `--indigo-text` with language tag and ANALYZED tag, then a one-line description (12px `--ink-3`). Right: `3 lines · 0 classes · 0 functions` (12px `--ink-3`, tabular) and a complexity pill. Expanded content lists classes, functions, imports and a plain-language summary. `button` with `aria-expanded`.

### 7.6 Tags, pills and chips

All are pills. Uppercase, 11px / 700, `+0.04em`, height 22px, padding `0 8px` (chips: 28px high, padding `0 12px`).

| Component | Look | Example |
|---|---|---|
| Language tag | Per §1.6 | `PYTHON`, `TYPESCRIPT` |
| Status pill | Teal / amber / red surface + text (§1.5) | `ANALYZED`, `LOW`, `HIGH RISK`, `COMPLEXITY: LOW` |
| Info pill | `--indigo-surface` + `--indigo-text` | `PROJECT VIEW` |
| Alert pill | `--red-surface` + `--red-text` | `8 DEPENDENCY LOOPS` |
| Decision pill | `--ink` fill, white text | `DECISION SUPPORT` |
| Meta pill | `--panel` + `--ink-2` | `Blast radius: 26` |
| Filter chip | Inactive: `--surface`, 1px `--line`, `--ink-2`. Active: `--indigo-surface`, `--indigo-text`, 1px `rgba(77,80,215,.3)` | `ALL`, `PYTHON`, `JAVASCRIPT`, `TYPESCRIPT` |
| Toggle chip | Label carries the state: `EXTERNAL: OFF`, `CYCLES: HIGHLIGHTED`. Off = outline. On = tinted by meaning (cycles = red-surface) | `aria-pressed` |
| Dot | 8–10px, `--amber` / `--red` / `--teal` / language color | Card markers, legend |
| Count | 18px min, `--red-strong` fill, white 11px / 700 | Tab badges (extrapolated) |

### 7.7 Inputs and filters

**Search field** — pill, height 36px, fill `--tile`, **1px `--line` edge** (screenshots have none), leading `Search` icon 16px `--ink-3`, 13px text, placeholder `--ink-3` ("Search module path or symbol name…"). Focus: fill `--surface`, 2px `--indigo` ring. Clear button appears when filled. Result count lives in an `aria-live="polite"` region ("12 of 126 files").

**Segmented control** (ALL / IMPORT / REQUIRE) — track `--panel`, pill, padding 3px; segments 11px / 700 uppercase; active `--indigo-surface` + `--indigo-text`; inactive `--ink-2`; a sliding thumb moves between segments. `role="radiogroup"`.

**Dark segmented control** (Diff / Original / Modernized) — track `--code-track`, active `--indigo` fill with white text, inactive `--code-muted`.

**Language filter row** — label "Filter Language:" 12px / 700 `--ink-2`, then filter chips, right-aligned in the same bar as the search field. Multi-select is not needed: `ALL` clears the others.

**URL input** (extrapolated, landing state) — height 48, pill, `--surface`, 1px `--line`, leading `Github` icon, placeholder `https://github.com/owner/repo`, Indigo large button "Analyze" attached inside on the right. Validate on submit; error text below in `--red-text` with an icon.

**Sample-repo chips** (extrapolated) — filter-chip style under the URL input for one-click demos. Label them as demos.

**Sort dropdown** (extrapolated) — Outline small button "Sort: Risk"; options Risk, Lines, Name, Complexity.

### 7.8 Data visualization

**Progress bar** — 6px high, `--track`, `--r-pill`, fill by band color, width animates 600ms `--ease-out` once, `role="progressbar"` with `aria-valuenow`.

**Readiness gauge**
- Box: `--well`, `--r-xl`, padding 24px, two columns.
- Ring: 112px, stroke 10px, round caps, track `rgba(25,23,21,0.08)`, value stroke by score band (`--amber-strong` for 50–79, `--teal` for 80+, `--red` for < 50). Starts at 12 o'clock, clockwise; draw-in 800ms once.
- Center: score 48px / 800 display, "OUT OF 100" 11px uppercase `--ink-3`.
- Right column: "READINESS RATING" 11px uppercase label, band label 18px / 800 ("Ready with care"), "Explainable score" 12px `--ink-3` as a button that opens the score-breakdown popover.
- Provide `role="img"` with `aria-label="Readiness score 73 out of 100, ready with care"`.

**Dependency graph (React Flow)**

| Part | Spec |
|---|---|
| Canvas | `--graph-bg` + dot grid (§5.3), `--r-lg`, 1px `--line`, height `clamp(420px, 60vh, 640px)`. Labels drawn directly on it use `--ink-2` |
| Node | `--surface`, 1px `--line`, `--r-md`, width 200px, padding 10–12px. Row 1: mono path 12px / 600 (middle-truncated) + language tag. Row 2: "Module" (mono 11px `--ink-3`) and a language-colored dot + "N lines". Hairline. Row 3 (optional): small chips such as `1 DEPS`. Hover: `--sh-2`, lift 1px. Selected: 2px `--indigo` ring |
| Node — cycle member | `--red-surface` fill, 1px `--red-line`, `CRITICAL` pill (solid `--red-strong`) |
| Node — entry point | Teal tag, 2px `--teal` left border |
| Node — external | `--slate-surface`, dashed 1px `--slate` border |
| Edge | 2px `--indigo` at 70%, orthogonal (smoothstep) with an arrowhead. Cycle edges: `--red`, dashed. On selection, unrelated edges fade to 15% |
| Controls | Bottom-left vertical stack of three 36px icon buttons (zoom in, zoom out, fit), `--surface`, `--r-md`, `--sh-1` |
| Legend | Floating pill, bottom-left beside controls, `--surface` at 92% with blur, "Legend:" 12px / 700, five 10px dots with 12px `--ink-2` labels (Python, JavaScript, TypeScript, External, Entry Point) using §1.6 colors |
| Minimap | Bottom-right, 160×110px, `--surface`, `--r-md`, nodes as tiny rects in language color, viewport outlined in `--indigo` |
| Side panel | 260px, `--surface`, 1px `--line`, `--r-lg`, padding 20. Header "SELECTED ITEM" uppercase label + hairline. **Empty:** centered `Info` icon 28px `--ink-4` + "Select an item to view details. Double-click a file to see its functions and classes." **Filled:** mono path 13px / 700, tags, risk pill, lines / classes / functions, "Imports" and "Imported by" lists (mono), `Open in Explanation` ghost link |
| Large graphs | Above ~150 nodes, cluster by folder with an expand toggle (extrapolated). Never render all labels at low zoom |
| Keyboard | Nodes are focusable; arrow keys move between connected nodes; Enter selects; a "List view" toggle offers the same data as a table for screen readers |

### 7.9 Code and diff viewer (dark)

```html
<section class="viewer" aria-label="Code for tests/test__init__.py">
  <header class="viewer__bar">
    <div><div class="viewer__title">tests/test__init__.py</div><div class="viewer__sub">Targets src/backend/__init__.py</div></div>
    <button class="btn btn-dark btn-sm">Copy Code</button>
  </header>
  <pre class="viewer__code" tabindex="0"><code>…</code></pre>
</section>
```

| Part | Spec |
|---|---|
| Container | `--code-bg`, `--r-lg`, overflow hidden, fills the right pane and stretches to the list's height |
| Top bar | `--code-bar`, padding 14×20, 1px `--code-line` below. Title: mono 13px / 700 `--indigo-on-dark`. Subtitle: 12px `--code-muted`, or "Syntax check passed" in `--teal-on-dark` with `Check` |
| Actions | Tests: Indigo-on-dark "Copy Code" pill with `Clipboard`. Refactor: dark segmented control (Diff / Original / Modernized) + circular 32px indigo-on-dark copy icon button |
| Rule bar (diff only) | `--amber-warn-bg`, padding 10×20, `TriangleAlert` 14px `--amber-on-dark`; rule name uppercase 12px / 700 `--amber-on-dark` followed by explanation 12px `--amber-warn-text` |
| Code area | Padding 20×24, mono 13px / 1.7, tab size 2, `white-space: pre`, scrolls both ways with thin scrollbar, `max-height: 560px` |
| Line numbers | Optional 40px gutter, right-aligned, `--code-muted`, not selectable |
| Diff rows | Gutter shows `+` or `−`. Added: `--diff-add-bg` with `--teal-on-dark` marker. Removed: `--diff-del-bg` with `--diff-del-text` marker. Hunk header (`@@ … @@`) in `--indigo-on-dark`; file headers (`---`, `+++`) in `--code-muted` |
| Empty | "Select a file to view its code." centered in `--code-muted` |
| Accessibility | The `pre` is focusable, labelled, and scrollable by keyboard. Do not rely on red / green alone: the `+` / `−` glyphs carry the meaning |

Extrapolated: word-wrap toggle, "Copy path", "Download this file", and a side-by-side diff option on wide screens.

### 7.10 Master–detail lists

Used for Generated Files, Files with suggestions, and "What breaks if I change this?".

| Part | Spec |
|---|---|
| Panel | `--surface`, 1px `--line`, `--r-lg`, padding 12px, sticky label at the top |
| Label | Uppercase 11px / 700 `--ink-2`, padding `8px 8px 12px` |
| Row | `--r-md`, padding 10×12, leading `FileText` 16px, mono 12px / 700 name (middle-truncated), meta line 11px `--ink-3` (`1 case · pytest`, `1 update · 1 note`) |
| Hover | `rgba(25,23,21,0.03)` |
| **Selected** | `--indigo-surface`, name in `--indigo-text`, icon `--indigo-text` |
| Blast-radius row | Mono path + risk pill on the right (LOW / MEDIUM / HIGH) + "0 downstream files affected" |
| Header of the list | Search field (36px) for lists over ~20 items |
| Behavior | `role="listbox"`, arrow keys move selection, Home / End, type-ahead by file name. Selection persists across tab switches |
| Text quality | Pluralize correctly ("1 case", "2 cases", "0 downstream files"). The screenshots show "1 cases" and "file(s)" |

Default sort for the blast-radius list is highest risk first (the screenshot shows alphabetical, which buries the important files).

### 7.11 Notices

`--r-lg`, padding 14×20, icon 18px, title 13px / 700, body 13px / 1.5.

| Type | Surface | Icon and body | Example |
|---|---|---|---|
| Warning | `--amber-surface`, 1px `--amber-line` | `TriangleAlert` `--amber-text`; body `--amber-text` | "Human review required — Prepared 2 modernization rule group(s) across 2 file(s). Review every diff and run the generated tests before merging." |
| Info | `--indigo-surface` | `Info` `--indigo-text`; body `--ink-2` | "Coverage is shown only when tests run in the trusted built-in demo. Public repository code remains safely unexecuted." (screenshot 5 shows this in amber; keep it amber if you treat it as a limitation, indigo if purely informational) |
| Success | `--teal-surface` | `CircleCheck` `--teal-strong`; body `--teal-text` | "125 of 126 generated test files passed syntax validation." |
| Danger | `--red-surface`, 1px `--red-line` | `OctagonAlert` `--red-text`; body `--red-text` | "Analysis failed. The repository is private." |

`role="status"` for warning / info / success, `role="alert"` for danger. "Human review required" is persistent and not dismissible.

### 7.12 Overlays and feedback (extrapolated)

| Component | Spec |
|---|---|
| **Toast** | `--ink` fill, white 13px text, `--r-lg`, padding 12×16, `--sh-3`, icon 16px + message + optional ghost action. Bottom-center, 4s auto-dismiss (pauses on hover); errors stay until dismissed. `role="status"`, errors `role="alert"`. Max 3 stacked. Uses: "Copied to clipboard", "Tests regenerated", "Report downloaded" |
| **Tooltip** | `--ink` fill, white 12px / 500, `--r-sm`, padding 6×10, opens after 400ms or on focus. Never the only place for essential info. Shows full paths for truncated names |
| **Popover** | `--surface`, 1px `--line`, `--r-lg`, `--sh-3`, 320px. Uses: score breakdown ("How this score is calculated"), download formats, sort options |
| **Modal / confirm** | 480px, `--surface`, `--r-xl`, `--sh-4`, padding 28. Backdrop `rgba(25,23,21,0.4)` with `blur(6px)`. Use for "Analyze another project? Current results will be cleared." Focus trap, Esc closes, focus returns to the trigger |
| **Skeleton** | Shapes match the final layout: KPI card (label bar + value bar), list rows, code viewer (dark with 8 lines), graph (canvas with 6 node outlines) |
| **Spinner** | 18px ring, 2px stroke, track `--line`, arc `--indigo`, 0.8s linear |
| **Empty state** | Centered stack, max width 360: 64px icon tile (`--tile`, glyph `--ink-3`), 16px / 700 title, 13px `--ink-3` line, optional Outline button. Example: "No suggestions found. Your code already follows the rules we check." |
| **Error state** | Same layout with a `--red-surface` tile and `--red-text` glyph, a plain-language cause, a Retry button and a small mono error code |

---

## 8. Screen anatomy

Every screen is built from §7 components. Widths are for a 1440px desktop viewport.

### 8.1 Page frame (all analyzed states)

```
┌─ Header (dark, sticky, 68px) ─────────────────────────────────────────────┐
│ [◉ Eye]  CodeOracle [PRO ENGINE]                        (✓ Service ready) │
│          Legacy Codebase Intelligence & Refactoring Engine                │
└───────────────────────────────────────────────────────────────────────────┘
            ┌─ Project summary panel (--panel, ~840) ────────────────┐
            │ [✓] repo-name                     ( ↻ Analyze Another ) │
            │     Source: GitHub repository                           │
            │ ─────────────────────────────────────────────────────── │
            │ [TOTAL FILES  126] [CODE LINES  23,131] [Languages ▪▪▪] │
            └─────────────────────────────────────────────────────────┘
            ┌─ Source Files (126) ─ Show file paths and sizes ─── ⌄ ──┐
            └─────────────────────────────────────────────────────────┘
      ┌─ Workspace shell (1152, --r-2xl) ───────────────────────────────────┐
      │ ┌ tab track ────────────────────────────────────────────────────┐   │
      │ │ (Explanation) (Dependency Graph) (Generated Tests) (Refactored…│   │
      │ └───────────────────────────────────────────────────────────────┘   │
      │  … active tab content …                                             │
      └─────────────────────────────────────────────────────────────────────┘
```
The summary panel and Source Files card stay above the workspace on every tab. Scrolling keeps the header and (recommended) the tab track pinned.

### 8.2 Explanation

```
┌ Section card ───────────────────────────────────────────────────────────┐
│ [⚡] Codebase Explanation            (⬇ Download Markdown) (↻ Refresh)   │
│      Deterministic overview of project modules, architecture, complexity │
│ ─────────────────────────────────────────────────────────────────────── │
│ [FILES UNDERSTOOD 88 / 126] [TOTAL LINES 23,131] [SUGGESTIONS ● 53] [CONNECTIONS 655 edges]
│ ┌ Panel: In simple words ───────────────────────────────────────────┐   │
│ │ text                                                              │   │
│ │ [How it starts] [Important files] [How files connect]  (3 sub-cards)│  │
│ │ ───────────────────────────────────────────────────────────────── │   │
│ │ What CodeOracle noticed  • …                                        │   │
│ └───────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
┌ Filter bar ─ ( 🔍 Search module path or symbol name… )   Filter Language: [ALL] [PYTHON] [JAVASCRIPT] [TYPESCRIPT]
┌ Module row ─ ⌄ path/to/file.py [PYTHON][ANALYZED]     3 lines · 0 classes · 0 functions  [COMPLEXITY: LOW]
┌ Module row ─ …
```
Suggestions is the highlight KPI. Module list is virtualized past ~100 rows.

### 8.3 Dependency Graph

```
┌ Section card ───────────────────────────────────────────────────────────┐
│ [⬡] Code Relationships [PROJECT VIEW] [8 DEPENDENCY LOOPS]  (⬇ Download Mermaid)
│     See how files connect and identify areas that need attention.        │
│ ─────────────────────────────────────────────────────────────────────── │
│ [Files shown 126][Connections 189][Dependency loops 8][Standalone files 56][Entry Points 7][Needs review 10]
└─────────────────────────────────────────────────────────────────────────┘
┌ Toolbar ─ ( 🔍 Search files and modules… )   (ALL|IMPORT|REQUIRE)  [EXTERNAL: OFF] [CYCLES: HIGHLIGHTED]
┌ Graph canvas (dot grid) ────────────────────────────┐ ┌ SELECTED ITEM ───┐
│ nodes · edges                                        │ │ (ⓘ) Select an    │
│ [+][−][⤢]  Legend: ● Python ● JS ● TS ● External ●   │ │ item to view     │
│                                          [minimap]   │ │ details…         │
└──────────────────────────────────────────────────────┘ └──────────────────┘
```

### 8.4 Generated Tests

```
┌ Header bar ─ [🧪] Generated Unit Tests                    (⬇ Download ZIP) [▶ Regenerate tests]
│              Review-ready pytest and Vitest files generated from static code structure.
┌ KPIs ─ [TEST CASES 613] [VALID TEST FILES 125/126] [TEST RUN Safety locked] [MEASURED COVERAGE Unavailable]
┌ Notice (amber) ─ Coverage is shown only when tests run in the trusted built-in demo…
┌ GENERATED FILES ──────┐ ┌ Dark viewer ───────────────────────────────────────────┐
│ ▸ tests/test_a.py      │ │ tests/test__init__.py                     [ Copy Code ] │
│   1 case · pytest      │ │ Targets src/backend/__init__.py                         │
│ …                      │ │ code…                                                   │
└────────────────────────┘ └─────────────────────────────────────────────────────────┘
```

### 8.5 Refactored Code

```
┌ Header bar ─ [✨] Modernization Proposal              (⬇ Download proposal) [✨ Regenerate]
│              Suggested updates shown as reviewable before-and-after changes.
┌ KPIs ─ [FILES REVIEWED 126] [FILES WITH SUGGESTIONS ✓ 2 (selected)] [SUGGESTED UPDATES 2] [BREAKING-CHANGE RISKS ● 2]
┌ Notice (amber) ─ ⚠ Human review required — Prepared 2 modernization rule group(s)…
┌ FILES WITH SUGGESTIONS ┐ ┌ Dark viewer ───────────────────────────────────────────┐
│ ▸ DashboardPage.tsx     │ │ src/…/DashboardPage.tsx    (Diff|Original|Modernized) ⧉ │
│   1 update · 1 note     │ │ ✓ Syntax check passed                                   │
│ ▸ VesselsPage.tsx       │ │ ⚠ JS STRICT INEQUALITY: Replaced loose inequality…      │
└─────────────────────────┘ │ diff…                                                   │
                            └─────────────────────────────────────────────────────────┘
```

### 8.6 Migration Plan

```
┌ Hero card (--r-xl) ───────────────────────────────────────────────────────────┐
│ [🗺 ink tile] Modernization Intelligence [DECISION SUPPORT]   ┌ Gauge box (--well) ┐│
│               Explainable readiness assessment and blast-radius │   ◔ 73            ││
│ paragraph…                                                     │ READINESS RATING   ││
│ ( ⬇ Download Executive Report )                                │ Ready with care    ││
│                                                                └────────────────────┘│
└───────────────────────────────────────────────────────────────────────────────────┘
(◔) Readiness Breakdown
[Code understanding 85][Complexity 92][Dependency safety 15 (risk)][Maintainability 99][Test protection 76]
┌ What Breaks If I Change This? ┐ ┌ src/…/api.ts   [HIGH RISK] [Blast radius: 26] ─────────┐
│ ( 🔍 Search source files… )    │ │ Change-impact & blast-radius assessment                │
│ path        [LOW]              │ │ ┌ Files that depend on this ┐ ┌ Files this depends on ┐ │
│ 0 downstream files affected    │ │ ┌ Entry points affected     ┐ ┌ Tests to run          ┐ │
└────────────────────────────────┘ └────────────────────────────────────────────────────────┘
```
Hierarchy: gauge and the risk card are the two focal points. The Download Executive Report button is the only Ink button on the screen.

### 8.7 Landing / input state (extrapolated)

Centered column (640px) on the canvas below the header: display headline (H1 clamp 32–48px, two lines max, "Understand legacy code before you change it."), 16px lede in `--ink-3`, the URL input with the large Indigo "Analyze" button, sample-repo chips, and a row of three plain facts ("Read-only analysis", "Your code is never executed", "Reports you can export"). Only show claims that are true. No hero illustration; a faded dot-grid graph preview is enough.

### 8.8 Analyzing state (extrapolated)

Replace the workspace with a single card (`--r-xl`, 560px) showing a vertical **analysis stepper**:

1. Fetching repository
2. Reading and classifying files
3. Building dependency graph
4. Generating explanations and tests
5. Scoring readiness

Each step shows: pending (`--ink-4` ring), running (indigo spinner), done (teal check), failed (red icon + reason). Show **real progress only** ("Parsing files 64 of 126"); never a fake percentage. Provide Cancel (Ghost). Results appear tab by tab as soon as each is ready; unfinished tabs show skeletons.

### 8.9 Error and limit states (extrapolated)

| Case | Message pattern | Action |
|---|---|---|
| Invalid URL | "That doesn't look like a GitHub repository URL." | Inline under the input |
| Private or missing repo | "We couldn't access this repository. It may be private or the URL may be wrong." | Retry, edit URL |
| Repository too large | "This repository has N files. We can analyze up to M." (real limits only) | Suggest a sub-folder |
| No supported languages | "No Python, JavaScript or TypeScript files were found." | Analyze another |
| Rate limit / timeout | "Analysis took longer than expected." | Retry, notify later |
| Service offline | Status pill turns red; Analyze and Regenerate disabled with a tooltip | Retry connection |
| Tab data failed | Error state inside that tab only; other tabs keep working | Retry this tab |

---

## 9. Motion and animation

Calm and quick. Motion confirms a change; it never entertains.

### 9.1 Tokens

| Token | Value | Use |
|---|---|---|
| `--dur-instant` | 100ms | Press, checkbox, tooltip close |
| `--dur-fast` | 150ms | Hover color, chip select, small fades |
| `--dur-base` | 250ms | Card hover, accordion, popover, toast |
| `--dur-slow` | 400ms | Tab indicator, modal, side panels |
| `--dur-spring` | 500ms | Anything using a spring easing |
| `--dur-draw` | 600–800ms | Progress fill, gauge ring (once) |
| `--ease-standard` | `cubic-bezier(0.28, 0.11, 0.32, 1)` | Color, opacity |
| `--ease-out` | `cubic-bezier(0.22, 1, 0.36, 1)` | Entrances, hover lifts |
| `--ease-in` | `cubic-bezier(0.64, 0, 0.78, 0)` | Exits |
| `--ease-sheet` | `cubic-bezier(0.32, 0.72, 0, 1)` | Modals, side panels |
| `--spring-snap` | `linear()` damped spring (≈3% overshoot) | Tab indicator, segmented thumb, toast |

### 9.2 Pattern library

| Pattern | Behavior | Timing |
|---|---|---|
| Tab change | Active fill slides to the new tab; old panel fades out 100ms, new panel fades in and rises 8px | 350ms spring / 200ms `--ease-out` |
| KPI count-up | Numbers count from 0 the first time a tab is opened, then stay static | 700ms `--ease-out`, once |
| Progress bars | Fill from 0 to value, staggered 60ms left to right | 600ms `--ease-out`, once |
| Gauge ring | Stroke draws clockwise from 12 o'clock, then the number counts up | 800ms, once |
| Card hover | Border to `--line-strong`, shadow `--sh-2`, lift 1px (interactive cards only) | 250ms |
| Accordion | Chevron rotates 180°, body expands via `grid-template-rows: 0fr → 1fr` | 300ms `--ease-out` |
| List selection | Row background fades to `--indigo-surface`; viewer content cross-fades and resets scroll to top | 150ms |
| Regenerate | Button shows spinner; viewer content dims to 40% with a thin indigo progress line on top; results fade in | 150ms in / 250ms out |
| Copy | Icon swaps to check, label to "Copied" | 150ms swap, 1.5s hold |
| Graph fit | On load or filter, viewport animates to fit | 400ms `--ease-out` |
| Graph selection | Related edges brighten, unrelated fade to 15%, view pans to the node | 200ms fade, 300ms pan |
| Node hover | Lift 1px + `--sh-2` | 150ms |
| Toast | Slides up 8px and fades in; leaves with fade | 250ms in / 150ms out |
| Modal | Backdrop fades; dialog scales 0.97 → 1 and fades | 250ms `--ease-sheet` |
| Stepper (analysis) | Running step's ring spins; on completion the check draws | 400ms |
| Skeleton | Highlight sweeps left to right | 1.6s linear infinite (loading only) |
| Tab-to-tab data | Only content that changed animates; headers and tabs stay still | — |

### 9.3 Rules

1. Only animate `transform`, `opacity`, `box-shadow`, `background-color`.
2. Animate in once per tab open. Never replay on re-render or filter change.
3. Loops are for loaders only (spinner, skeleton, indeterminate bar).
4. No autoplay, no bouncing, no parallax, no decorative motion on the graph.
5. Stagger at most 6 items, 60ms apart; anything beyond appears together.
6. Never delay content for animation; results are usable immediately.
7. Interruptible: switching tabs mid-animation cancels the previous one cleanly.

```css
@keyframes fade-up { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
@keyframes shimmer { to { transform: translateX(100%); } }
@keyframes spin { to { transform: rotate(360deg); } }
@keyframes pulse { 50% { opacity: .45; } }

.tabpanel[data-state="active"] { animation: fade-up var(--dur-base) var(--ease-out) both; }
.bar__fill { transform-origin: left; animation: bar-in 600ms var(--ease-out) both; animation-delay: calc(var(--i, 0) * 60ms); }
@keyframes bar-in { from { transform: scaleX(0); } to { transform: scaleX(1); } }
.gauge__value { stroke-dasharray: var(--len); stroke-dashoffset: var(--len); animation: gauge-in 800ms var(--ease-out) forwards; }
@keyframes gauge-in { to { stroke-dashoffset: var(--offset); } }
.acc-body { display: grid; grid-template-rows: 0fr; transition: grid-template-rows 300ms var(--ease-out); }
.acc-body[data-open="true"] { grid-template-rows: 1fr; }
.acc-body > div { overflow: hidden; }
.skeleton { position: relative; overflow: hidden; background: var(--track); border-radius: var(--r-md); }
.skeleton::after { content: ""; position: absolute; inset: 0; transform: translateX(-100%);
  background: linear-gradient(90deg, transparent, rgba(255,255,255,.6), transparent); animation: shimmer 1.6s linear infinite; }

@media (hover: hover) and (pointer: fine) { .card.is-interactive:hover { border-color: var(--line-strong); box-shadow: var(--sh-2); transform: translateY(-1px); } }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important; scroll-behavior: auto !important; }
  .spinner { animation: pulse 1.6s ease-in-out infinite !important; }
  .skeleton::after { display: none; }
  .tabpanel[data-state="active"] { animation: none; }
}
```
Reduced motion means less travel, not less feedback: keep color and opacity changes, drop slides, counts, springs and shimmer.

Spring easing (for `--spring-snap`, use with `--dur-spring`):
```css
--spring-snap: linear(0, 0.126, 0.372, 0.612, 0.798, 0.92, 0.989, 1.02, 1.028, 1.026, 1.019, 1.012, 1.006, 1.003, 1.001, 1, 0.999, 0.999, 0.999, 1, 1, 1, 1, 1, 1);
```
Fallback: `cubic-bezier(0.32, 0.72, 0, 1)`.

---

## 10. Responsive

| Breakpoint | Width | Behavior |
|---|---|---|
| Mobile | < 640px | One column, 16px padding |
| Tablet | 640–1024px | Two columns where useful, 24px padding |
| Desktop | 1024–1440px | Full layouts as in §8 |
| Wide | > 1440px | Content stays at 1152px, centered |

**Recompose, do not shrink.**

| Component | Below 1024px | Below 640px |
|---|---|---|
| Header | Full | Tagline hidden, tile 36px, status pill shows icon only (label in tooltip / `aria-label`) |
| Summary panel | Stats 3-up | Stat cards stack; "Analyze Another Project" moves under the repo name, full width |
| Tab bar | Horizontal scroll with snap and edge fade | Same; icons stay, labels stay (scroll instead of truncate) |
| KPI rows (4) | 2 × 2 | 2 × 2 (1 column if a value is long text) |
| Stat tiles (6) | 3 × 2 | 2 × 3 |
| Score cards (5) | 3 + 2 | Horizontal scroll-snap row with peeking cards |
| "In simple words" (3) | Stacked | Stacked |
| List + viewer | Stacked: the list collapses into a "Files (N)" select / accordion above the viewer | Same |
| Code and diff viewers | Full width, horizontal scroll, font 12px | Same; segmented control wraps under the filename |
| Graph + side panel | Panel becomes a bottom sheet on node select | Same; minimap hidden; legend collapses to a "Legend" button |
| Gauge box | Ring above text | Ring above text, centered |
| Blast radius | List above detail; detail info panels 1 column | Same |
| Buttons in headers | Wrap under the title | Full width, stacked, primary first |

Also: use `100dvh`, respect `env(safe-area-inset-*)`, keep touch targets ≥ 44px, gate hover effects with `(hover: hover)`, and give every hover reveal a tap or focus equivalent.

---

## 11. Interaction and UX rules

### 11.1 State matrix

| State | Look | Timing |
|---|---|---|
| Rest | Base spec | — |
| Hover | Border `--line-strong`, `--sh-2`, or 3% ink tint on rows | 150–250ms |
| Pressed | `scale(0.97)` (buttons), `scale(0.99)` (cards) | 100ms |
| Focus-visible | 2px `--indigo` ring, 2px offset | 100ms |
| Selected | `--indigo-surface` (rows, chips), ink outline (KPI filter), ink fill (tab) | 150ms |
| Disabled | `--track` fill, `--ink-4` text, no shadow, explained by tooltip | — |
| Loading | Spinner in button or skeleton in place, `aria-busy`, layout stable | 150ms |
| Error | Red edge or notice, plain-language reason, retry | 150ms |
| Success | Teal check or toast, auto-clears | 200ms |

### 11.2 Waiting

| Wait | Response |
|---|---|
| < 100ms | Nothing extra |
| 100ms – 1s | Button loading state |
| 1 – 5s | Skeleton for content, spinner for actions |
| 5 – 30s | Progress with named steps and Cancel |
| > 30s | Background job with status in the header pill and a "notify me" option |

Analysis runs long: show the stepper (§8.8) and let finished tabs open early.

### 11.3 Behavior rules

- **Deep links:** encode tab, file and filters in the URL (`?tab=tests&file=tests/test_copilot.py`), so a link reopens the same view.
- **Persistence:** keep the selected file and filters when switching tabs and back.
- **Keyboard shortcuts** (recommended, shown in tooltips): `1`–`5` switch tabs, `/` focuses search, `c` copies the current code, `g` toggles cycle highlighting, `?` lists shortcuts. Disabled while typing in a field.
- **Regenerate** never silently replaces reviewed work: if the user has copied or downloaded, show "Results changed" with a diff link, or keep the previous version accessible for one step.
- **Human review gate:** anything that modifies code (refactor, tests) shows the review notice, and export buttons say "Download proposal", never "Apply".
- **Honest data:** label each metric as measured, estimated or unavailable; a missing value shows "Unavailable" with the reason in a tooltip, never `0` or `–`.
- **Pluralization and counts** are always correct ("1 case", "2 cases").
- **Downloads** are named `codeoracle-{repo}-{tab}-{YYYY-MM-DD}.{ext}`.
- **Empty is a result:** "0 suggestions" is a valid outcome and gets an explanation, not a blank area.
- **One primary action per view.** Regenerate is Indigo; exports are Outline, except the executive report (Ink).

---

## 12. Accessibility (non-negotiable)

**Color and contrast**
- [ ] Body text ≥ 4.5:1 and large text (24px, or 19px bold) ≥ 3:1 on its actual background. All text tokens in §1 are pre-checked against `--surface`; recheck on `--panel`, `--track`, `--tile` and `--graph-bg`.
- [ ] `--amber` (`#B7822A`) is never small text (3.3:1). Use `--amber-text` for small amber text and `--amber-strong` on tinted tiles.
- [ ] `--ink-4` and `--line` are decorative only.
- [ ] Meaning is never carried by color alone: risk and status always have a text label, icon or glyph. Diff rows carry `+` / `−`. Graph nodes in cycles carry a `CRITICAL` tag, not just a red fill.
- [ ] Non-text UI (progress fill, gauge stroke, dots) ≥ 3:1 against its track or background; the gauge and bars use the adjusted colors in §1.4.

**Controls**
- [ ] Every interactive element has a visible `:focus-visible` ring (2px `--indigo`, 2px offset).
- [ ] Touch targets ≥ 44×44px, including 32px pills and 28px chips (extend the hit area).
- [ ] Search fields, chips and toggle chips have a visible edge (1px `--line`) plus their label or icon. In `prefers-contrast: more`, edges switch to `--line-strong`.
- [ ] Every input has a `<label>` (visually hidden is fine); errors use `aria-describedby`.

**Patterns**
- [ ] **Tabs:** `tablist` / `tab` / `tabpanel`, arrow-key navigation, `aria-selected`, roving tabindex.
- [ ] **Accordion rows:** `button` with `aria-expanded` and `aria-controls`.
- [ ] **List of files:** `listbox` / `option`, `aria-selected`, arrow keys, type-ahead.
- [ ] **Segmented control:** `radiogroup` with `radio` roles.
- [ ] **Toggle chips:** `aria-pressed`.
- [ ] **Gauge:** `role="img"` with a full text label; the breakdown is also readable as text below it.
- [ ] **Progress bars:** `role="progressbar"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, and a visible label.
- [ ] **Graph:** focusable nodes, keyboard traversal along edges, and a "List view" alternative (table of files with their dependencies). Announce selection changes.
- [ ] **Code viewers:** focusable, labelled regions, scrollable by keyboard; copy result announced via `aria-live`.
- [ ] **Live regions:** search result counts and status pill (`polite`), errors (`assertive`), toasts (`status` / `alert`).
- [ ] Skip-to-content link, one `<h1>`, ordered headings, landmarks (`header`, `nav`, `main`).

**Adaptation**
- [ ] Works at 320px and 200% zoom (code and graph scroll inside their own containers; the page does not scroll sideways).
- [ ] `prefers-reduced-motion` respected (§9.3); nothing flashes more than 3 times a second.
- [ ] `forced-colors: active`: shadows vanish, so borders carry structure:
  ```css
  @media (forced-colors: active) { .card, .btn, .tab, .chip, .viewer, .kpi { border: 1px solid CanvasText; } }
  ```
- [ ] `<html lang>` set; use `Intl` for numbers and dates.

---

## 13. CSS tokens (drop-in)

```css
:root {
  color-scheme: light;

  /* Warm neutrals */
  --canvas:        #F8F4EE;
  --surface:       #FFFDFC;
  --panel:         #F0EAE3;
  --track:         #ECE7DE;
  --tile:          #F5F2EC;
  --well:          #EDE6DA;
  --graph-bg:      #E7E0D3;
  --graph-dot:     #B9B2A2;
  --gauge-track:   rgba(25,23,21,0.08);
  --line:          #E5DFDA;
  --line-strong:   #8F887C;

  /* Text */
  --ink:           #191715;
  --ink-2:         #3D3935;
  --ink-3:         #6B655E;
  --ink-4:         #8A847C;   /* large text / decorative only */
  --ink-inverse:   #FFFFFF;

  /* Header */
  --header-bg:     #191715;
  --header-line:   #453C1D;
  --header-muted:  #918F8D;

  /* Indigo */
  --indigo:            #4D50D7;
  --indigo-press:      #3E41B8;
  --indigo-deep:       #383AA7;
  --indigo-text:       #43469E;
  --indigo-surface:    #EAE9FB;
  --indigo-on-dark:    #ACAEE4;
  --indigo-badge-text: #BEC2FF;

  /* Teal */
  --teal:          #378C7B;
  --teal-strong:   #2F7A6B;
  --teal-surface:  #DFF0EA;
  --teal-text:     #2A5A4F;
  --teal-on-dark:  #5EB896;

  /* Amber */
  --amber:            #B7822A;   /* large numbers, dots */
  --amber-strong:     #A9761F;   /* gauge, values on tinted tiles */
  --amber-surface:    #F6E8CD;
  --amber-text:       #7A5A1E;
  --amber-line:       #D8B274;
  --amber-on-dark:    #FBD16D;
  --amber-warn-bg:    #403219;
  --amber-warn-text:  #E1C97E;

  /* Red */
  --red:           #C1625D;
  --red-strong:    #A33F39;
  --red-text:      #A33F39;
  --red-surface:   #F7E5E2;
  --red-wash:      #FAF4F2;
  --red-line:      #EBCBC7;

  /* Slate */
  --slate:         #637F93;
  --slate-surface: #E5EDF1;
  --slate-text:    #46606F;

  /* Languages */
  --lang-python:     #4D50D7;
  --lang-javascript: #B7822A;
  --lang-typescript: #7862DE;
  --lang-external:   #637F93;
  --lang-entry:      #408B81;
  --ts-surface:      #EFEBFC;
  --ts-text:         #4E3FA8;

  /* Code viewer */
  --code-bg:       #1C1B17;
  --code-bar:      #191715;
  --code-text:     #E8E8E2;
  --code-muted:    #A09892;
  --code-track:    #2E2A27;
  --code-line:     rgba(255,255,255,0.08);
  --diff-add-bg:   rgba(94,184,150,0.14);
  --diff-del-bg:   rgba(193,98,93,0.18);
  --diff-del-text: #F0A39E;

  /* Radius */
  --r-xs: 6px;  --r-sm: 10px;  --r-md: 14px;  --r-lg: 20px;  --r-xl: 28px;  --r-2xl: 32px;  --r-pill: 999px;

  /* Shadows */
  --sh-1: 0 1px 2px rgba(25,23,21,0.06), 0 1px 1px rgba(25,23,21,0.04);
  --sh-2: 0 4px 12px rgba(25,23,21,0.08);
  --sh-3: 0 12px 32px rgba(25,23,21,0.12);
  --sh-4: 0 24px 64px rgba(25,23,21,0.18);
  --sh-shell:  0 8px 40px rgba(25,23,21,0.06);
  --sh-indigo: 0 6px 16px -4px rgba(77,80,215,0.45);

  /* Motion */
  --dur-instant: 100ms; --dur-fast: 150ms; --dur-base: 250ms; --dur-slow: 400ms; --dur-spring: 500ms;
  --ease-standard: cubic-bezier(0.28, 0.11, 0.32, 1);
  --ease-out:      cubic-bezier(0.22, 1, 0.36, 1);
  --ease-in:       cubic-bezier(0.64, 0, 0.78, 0);
  --ease-sheet:    cubic-bezier(0.32, 0.72, 0, 1);
  --spring-snap: linear(0, 0.126, 0.372, 0.612, 0.798, 0.92, 0.989, 1.02, 1.028, 1.026, 1.019, 1.012, 1.006, 1.003, 1.001, 1, 0.999, 0.999, 0.999, 1, 1, 1, 1, 1, 1);

  /* Layers */
  --z-sticky: 100; --z-dropdown: 200; --z-overlay: 300; --z-modal: 400; --z-toast: 500; --z-tooltip: 600;

  /* Type */
  --font-display: "Outfit", "Sora", var(--font-sans);
  --font-sans:    "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-mono:    "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}

@media (prefers-contrast: more) { :root { --line: var(--line-strong); --ink-3: #4F4A44; } }
```

Base styles:
```css
*, *::before, *::after { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; scroll-padding-top: 88px; }
body { margin: 0; background: var(--canvas); color: var(--ink-2); font: 400 14px/1.6 var(--font-sans);
  -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility; }
h1, h2, h3, h4 { margin: 0; color: var(--ink); font-family: var(--font-display); }
code, pre, kbd, samp { font-family: var(--font-mono); }
a { color: var(--indigo-text); text-decoration: none; } a:hover { text-decoration: underline; }
:focus-visible { outline: 2px solid var(--indigo); outline-offset: 2px; }
::selection { background: var(--indigo-surface); color: var(--ink); }
button, input, select, textarea { font: inherit; color: inherit; }
.num { font-variant-numeric: tabular-nums; }
.label { font: 700 11px/1.2 var(--font-sans); letter-spacing: .08em; text-transform: uppercase; color: var(--ink-2); }
.path  { font: 600 13px/1.4 var(--font-mono); color: var(--indigo-text); }
```

**No dark theme is defined.** The screenshots are light-only (the header and code viewers are already dark). If you add one later, derive it from §1.3 and §1.7 and recheck every text pair.

---

## 14. Tailwind mapping

```js
// tailwind.config.js (v3 style; in v4 declare the same values under @theme)
export default {
  theme: {
    extend: {
      colors: {
        canvas: "var(--canvas)", surface: "var(--surface)", panel: "var(--panel)", track: "var(--track)",
        tile: "var(--tile)", well: "var(--well)", line: "var(--line)", "line-strong": "var(--line-strong)",
        ink: { DEFAULT: "var(--ink)", 2: "var(--ink-2)", 3: "var(--ink-3)", 4: "var(--ink-4)" },
        header: "var(--header-bg)",
        indigo: { DEFAULT: "var(--indigo)", press: "var(--indigo-press)", deep: "var(--indigo-deep)", text: "var(--indigo-text)", surface: "var(--indigo-surface)" },
        teal:   { DEFAULT: "var(--teal)", strong: "var(--teal-strong)", surface: "var(--teal-surface)", text: "var(--teal-text)" },
        amber:  { DEFAULT: "var(--amber)", strong: "var(--amber-strong)", surface: "var(--amber-surface)", text: "var(--amber-text)", line: "var(--amber-line)" },
        red:    { DEFAULT: "var(--red)", strong: "var(--red-strong)", text: "var(--red-text)", surface: "var(--red-surface)", wash: "var(--red-wash)", line: "var(--red-line)" },
        code:   { bg: "var(--code-bg)", bar: "var(--code-bar)", text: "var(--code-text)", muted: "var(--code-muted)" },
      },
      borderRadius: { xs: "6px", sm: "10px", md: "14px", lg: "20px", xl: "28px", "2xl": "32px", pill: "999px" },
      boxShadow: { 1: "var(--sh-1)", 2: "var(--sh-2)", 3: "var(--sh-3)", 4: "var(--sh-4)", shell: "var(--sh-shell)", indigo: "var(--sh-indigo)" },
      fontFamily: { display: ["var(--font-display)"], sans: ["var(--font-sans)"], mono: ["var(--font-mono)"] },
      maxWidth: { workspace: "1152px", header: "1200px", summary: "840px" },
      transitionTimingFunction: { out: "var(--ease-out)", sheet: "var(--ease-sheet)", standard: "var(--ease-standard)", spring: "var(--spring-snap)" },
      transitionDuration: { fast: "150ms", base: "250ms", slow: "400ms", spring: "500ms" },
    },
  },
};
```
Example KPI card: `class="rounded-lg border border-line bg-surface px-5 py-4"`. Active tab: `class="rounded-pill bg-ink text-white h-10 px-4 text-sm font-semibold"`.

---

## 15. Content and voice

The product speaks like a careful senior engineer: plain, specific, honest about what it did and did not check.

- **Plain first.** Lead with what it means ("In simple words"), then details.
- **Say how sure you are.** Measured, estimated, unavailable. Example: "Syntax-based estimation (125 of 126 generated test files pass syntax validation; execution unmeasured)".
- **Be specific and small.** "88 of 126 files were fully understood." Not "Most files were analyzed."
- **Buttons are verbs:** "Regenerate tests", "Download ZIP", "Copy Code", "Analyze Another Project". No "Submit" or "OK".
- **Status words:** Strong · Ready with care · High risk · Safety locked · Unavailable. Keep the set small and reuse it.
- **Errors:** what happened, why if known, what to do next. No blame, no exclamation marks.
- **Empty states** explain the outcome ("No suggestions found") and the next step.
- **Correct plurals**, never "file(s)".
- **Avoid:** hype ("revolutionary", "magical", "effortless"), unqualified AI claims, and any number the engine did not produce.
- **Numbers:** thousands separators (`23,131`), `88 / 126` for part-of-whole, units after values (`655 edges`, `26` blast radius). Use `Intl.NumberFormat`.
- **Sentence case** for titles and buttons; uppercase only for labels and tags.

---

## 16. Pre-ship checklist

**Visual**
- [ ] Every color, radius, shadow, duration and easing traces to a token.
- [ ] Surface nesting follows canvas → white → beige (never white-in-white without a line).
- [ ] Ink, indigo, teal, amber and red are used only for their meanings (§1.5).
- [ ] At most one Highlight KPI per row; at most one Ink button per screen.
- [ ] Risk shows as card + pill + bar together, with text labels.
- [ ] Paths and code are monospace; titles and numbers are the display face.
- [ ] Code and diffs appear only in the dark viewer.

**Behavior**
- [ ] All interactive elements have hover, pressed, focus-visible, disabled and loading states.
- [ ] Tabs, lists, accordions and segmented controls are keyboard operable.
- [ ] Selected tab, file and filters survive tab switches and are in the URL.
- [ ] Copy, download and regenerate give clear feedback.
- [ ] Long paths truncate in the middle with a tooltip.

**Data honesty**
- [ ] Every metric is measured, or labelled estimated / unavailable.
- [ ] Nothing modifies code without the human-review notice.
- [ ] Counts and plurals are correct.

**Motion**
- [ ] Only transform / opacity / shadow / color animate; entrances play once per tab open.
- [ ] `prefers-reduced-motion` block present and tested.

**Accessibility and responsive**
- [ ] §12 checklist passed; contrast spot-checked on the rendered page, especially on `--panel`, `--tile` and `--graph-bg`.
- [ ] Works at 320px, 200% zoom, keyboard only, and in high-contrast mode.
- [ ] Tabs scroll, lists stack, graph side panel becomes a sheet, viewers scroll inside their own frame.

**Common mistakes**
- Using pure white (`#FFF`) or cool grays anywhere on the warm canvas.
- Small text in `--amber` or `--ink-4`.
- Coloring a 76 score teal and a 73 score amber (bands decide, §1.5).
- Showing a fake progress percentage while analyzing.
- Truncating file paths at the end so the file name disappears.
- Using Indigo for exports or Ink for "generate" actions.