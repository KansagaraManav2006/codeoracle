# Neural Map

Neural Map is an additive, lazy-loaded renderer at `?tab=neural-map`, following the app's existing query-based tab routing. It follows Dependency Map in both navigation components. The actual app has Project Details plus six analysis tabs, so shortcuts now run from 1–8; Neural Map is 5.

## Data and rendering

- Reuses `/api/projects/:id/graph?level=module` and its `GraphResponse` unchanged. Internal files are drawn; fan-in/out counts include external dependencies as in Dependency Map.
- Joins `/api/projects/:id/hotspots` by full file path for risk and summaries. If unavailable, graph complexity/cycle risk remains usable and a notice explains the fallback.
- Modernization proposal counts require `/api/projects/:id/refactor`; they are not present in graph or hotspot data. This page routes to Modernization without downloading full proposal code for an unused count.
- React Flow has no built-in force solver and its node rendering uses DOM elements. The requested single-canvas renderer uses `d3-force` plus `d3-quadtree`, without a second graph framework or backend changes.
- The original SELECTED NODE panel is embedded inside DependencyGraphTab. The new panel follows its 310px responsive layout and uses existing LanguageTag, RiskBadge and Button components. The original page is untouched.
- Simulation clones the adapter data, centers at world origin, and stops after 300 ticks. Below 150 nodes, it advances one tick per animation frame; larger graphs advance ten ticks per frame. Both simulation and drawing pause while hidden and stop on unmount. Settled positions remain local; search, selection, pan and zoom do not restart physics.
- Connectivity alone sets radius: `clamp(6 + 1.5 * (fanIn + fanOut), 6, 22)`. High/critical risk and cycles use amber; selection uses the existing blue token; entry points use the existing green token.
- Search is debounced 100ms; filters dim nodes without removing them. A native file selector provides a keyboard alternative to canvas hit testing.

## Verification

Run from `frontend`:

```sh
npm run build
npm run test:neural-map
```

Eight automated cases cover empty/single/two-file layouts, deterministic 100/200/500-file layouts, finite positions, API immutability, external degree counts, hotspot joins, and radius limits independent of risk.

Browser checks passed on the saved Python demo: canvas rendering, both file selections and correct metrics, search, empty-space deselection, reset, mouse pan/wheel zoom, and navigation to Dependency Map with `file=utils.py` focused. An unavailable saved 126-file analysis returned HTTP 409 in both renderers; Neural Map showed its retry state correctly. Large synthetic layouts were checked automatically, not visually. Physical touch pinch and mobile-device performance still need device verification.
