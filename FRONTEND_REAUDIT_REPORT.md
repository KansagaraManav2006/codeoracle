# CodeOracle Frontend Re-Audit Report

**Re-audit date:** 2026-10-14  
**Audited revision:** `9c044ae` on branch `Trupesh2`  
**Comparison baseline:** `FRONTEND_AUDIT_REPORT.md`  
**Mode:** Audit only. No frontend source code was modified.  

## 1. Executive Summary

The frontend has improved materially. The Antigravity work fixed several of the most important architectural and accessibility concerns from the first audit: route-level code splitting, an abortable project-query foundation, mobile-sidebar `inert` behavior, post-commit auth redirects, route titles/focus, a shared service-health poller, and pooled scroll observers.

However, the frontend is **not yet ready for a production release at the audited revision** because the new query abstraction introduced a confirmed Risk Hotspots render/fetch loop. The full Playwright golden path fails on that page. Several “completed” initiatives are also only partially applied: three modal implementations still bypass the shared Dialog, landing navigation is still button-based, the auth pages still render two H1s on desktop, project query parameters still leak onto non-workspace routes, and the largest components remain 700–1,295 lines.

### Updated scores

| Dimension | Previous | Current | Change | Explanation |
|---|---:|---:|---:|---|
| Overall frontend | 7.6 | **7.9** | +0.3 | Major performance and accessibility foundations improved, offset by a new core-flow regression. |
| UI/UX | 7.9 | **8.0** | +0.1 | Visual quality remains strong; content length and dense controls remain. |
| Performance | 6.9 | **8.3** | +1.4 | Entry bundle fell from 696.75 kB to 130.34 kB minified; routes are split; Vite warning is gone. |
| Code quality | 7.0 | **7.4** | +0.4 | Query/dialog/navigation foundations improved, but the unstable callback bug and very large components remain. |
| Accessibility | 6.5 | **7.6** | +1.1 | Mobile drawer, route focus/title, semantic auth links, and five dialogs improved; three dialogs and dual-H1 auth structure remain. |
| Test confidence | 7.0 | **7.4** | +0.4 | E2E now executes when localhost access is permitted: 9 pass, 1 fails. No new focused unit tests were added for the new infrastructure. |

### Production-readiness verdict

**Not production-ready at `9c044ae`.** Fix the Risk Hotspots query loop first, add regression tests for `useProjectQuery`, migrate the remaining modal surfaces, and deploy the audited revision before release. After those items, the frontend would be suitable for a public beta and close to a strong production candidate.

## 2. Verification Results

| Check | Result | Evidence |
|---|---|---|
| TypeScript | **PASS** | `npm run lint` completed with no errors. |
| Unit tests | **PASS: 41/41** | Same seven Node test files as the previous audit. |
| Production build | **PASS** | Vite transformed 1,799 modules in 4.27 seconds. |
| Bundle warning | **RESOLVED** | No chunk-size warning in the current build. |
| Accessibility/responsive E2E | **PASS: 2/2** | Skip link/ARIA/heading and 375×667, 768×1024, 1440×900 checks passed. |
| Failure-recovery E2E | **PASS: 7/7** | Authentication, guest restriction, network, database, rate-limit, oversized repository and forbidden-project scenarios passed. |
| Golden-path E2E | **FAIL: 0/1** | Risk Hotspots never exposed the expected file; main contained only pipeline shell at failure. |
| Full E2E | **9 passed, 1 failed** | Completed in 42 seconds with unsandboxed localhost access. |
| Live deployment parity | **FAIL / deployment drift** | Live site still served an older asset/title fingerprint and did not exhibit the new route-title behavior. Current local build could not be treated as deployed. |

### Bundle comparison

| Asset | Previous audit | Current | Result |
|---|---:|---:|---|
| Entry JS | 696.75 kB / 153.51 kB gzip | **130.34 kB / 33.60 kB gzip** | 81.3% smaller minified; 78.1% smaller gzip |
| Landing route | Included in entry | **158.86 kB / 34.83 kB gzip** | Correctly isolated; still the largest application route |
| React Flow vendor | 319.06 kB / 103.07 kB gzip | **319.06 kB / 103.07 kB gzip** | Unchanged but loaded with graph route |
| Neural Map route | 92.74 kB / 27.50 kB gzip | **80.91 kB / 23.12 kB gzip** | Improved |
| CSS | 113.25 kB / 19.62 kB gzip | **96.63 kB / 17.14 kB gzip** | Improved |

## 3. Previous Findings: Resolution Status

| Previous issue | Status | Re-audit evidence | Remaining action |
|---|---|---|---|
| Closed mobile sidebar exposed to assistive technology | **Resolved in source** | `AppSidebar.tsx:84-94,432-435` calculates mobile state and applies `inert` + `aria-hidden`; focus enters/restores when opened/closed. Responsive E2E passes. | Add a dedicated assertion that closed drawer controls are not focusable/visible to AX. |
| `PathTracingModal` state update inside `useMemo` | **Resolved** | Synchronization moved to `useEffect` at `PathTracingModal.tsx:27-31`. | Add a regression test for prop changes while open. |
| Navigation during render | **Resolved** | `AuthGuard` redirects from `useEffect` in `App.tsx:34-49`. | Return `null`/fallback while redirecting to prevent an auth-page flash. |
| Missing shared dialog lifecycle | **Partially resolved** | New `common/Dialog.tsx` provides portal, Escape, focus trap, initial focus, body lock, backdrop and restore. Five audited modals use it. | Migrate `ModernizationRulesModal`, `CommandPaletteModal`, and CodeViewer fullscreen. |
| Heavy entry bundle | **Resolved** | All public and workspace routes are lazy imports; entry is 130.34 kB. | Add bundle budgets so the improvement cannot regress. |
| Un-aborted project requests | **Partially resolved** | `useProjectQuery`, background App queries and several services accept AbortSignal. | Fix hook dependency regression; migrate remaining direct fetches/pollers. |
| Duplicate service-health polling | **Resolved with minor cleanup debt** | `useServiceHealth` is a module-level singleton used by StatusPill and HealthIndicator. | Track/clear delayed `updateState` timeout and request timeout in every exit path. |
| Route titles/focus | **Mostly resolved** | `updateRouteA11y` and workspace-specific titles exist. | Do not force focus on initial page load; test back/forward and Suspense completion. |
| Button-based navigation | **Partially resolved** | Auth pages, not-found and some sidebar auth links use `Link`. | Landing Navbar/Footer and several sidebar/home controls still use buttons + `navigateTo`. |
| Excess scroll listeners/observers | **Partially resolved** | Shared scroll subscription and observer pool added in `useScrollAnimation`. | Hero, Navbar, ProductReveal and ProblemSection still own listeners/observers. |
| E2E could not run | **Environment issue clarified** | With localhost permission, all 10 tests execute. | Keep documented local/CI networking requirements; fix the one real failing test. |

## 4. New Critical Regression

### RA-01 — Risk Hotspots repeatedly aborts/restarts its query

**Severity:** P0 / release blocker  
**Status:** Source-confirmed and E2E-confirmed  
**Files:**

- `frontend/src/hooks/useHotspots.ts:41-45`
- `frontend/src/hooks/useProjectQuery.ts:45-101`
- `frontend/e2e/golden-path.spec.ts:343-345`

**Root cause**

`useProjectQuery.execute` depends on `onSuccess` and the effect depends on `execute`. `useHotspots` passes a new inline callback on every render:

```ts
useProjectQuery({
  projectId,
  queryFn,
  onSuccess: () => setVisibleHotspots(50),
});
```

Each query state update causes a render; the callback identity changes; `execute` changes; the effect cleans up, aborts the request, clears data, and starts again. The Hotspots page remains in its loading/empty transition and the golden path cannot see `src/auth_service.py`.

**Observed reproduction**

1. Register through the mocked golden path.
2. Analyze the mocked GitHub repository.
3. Open System Pulse and Explanation successfully.
4. Click Risk Hotspots.
5. After 5 seconds the expected hotspot is still hidden; Playwright’s snapshot shows no hotspot page content in `<main>`.

**Required fix**

Prefer a hook design that does not refetch when notification callbacks change:

- Store `onSuccess`, `onError`, and optionally `queryFn` in refs updated by effects; or
- Require callers to memoize callbacks and memoize this specific `onSuccess`; and
- Make the fetch-trigger effect depend only on stable query identity (`projectId`, `enabled`, and a stable query key/function).

The ref-based approach is safer because the generic hook should not silently require every caller to memoize notification callbacks.

**Acceptance criteria**

- One `/hotspots` request on initial mount, excluding an explicit user refetch.
- Project switch aborts the old request and performs exactly one request for the new project.
- Callback identity changes do not refetch.
- `onSuccess` receives the latest callback implementation.
- Golden-path E2E passes.
- New unit tests cover initial success, callback identity change, abort on project switch, stale response rejection, manual refetch, and unmount.

## 5. Remaining Problems With Context for Antigravity

### RA-02 — Shared Dialog migration is incomplete

**Severity:** P1 accessibility  
**Context:** The shared primitive is good, but the claim “shared Dialog primitive” is not complete across the frontend.

Still raw:

- `ModernizationRulesModal.tsx:39` — no Escape, trap, initial focus or trigger restoration.
- `CommandPaletteModal.tsx:228` — Escape and autofocus exist, but no trap or focus restoration; close icon lacks an accessible label.
- `CodeViewer.tsx:229` — fullscreen uses `role="dialog"` directly; Escape exists but no trap/restore/body-lock consistency.

**Action:** Migrate all three to `common/Dialog.tsx`; add a single parameterized Playwright test that opens every modal, checks the accessible name, presses Tab/Shift+Tab, presses Escape, and verifies trigger focus restoration.

### RA-03 — Project query parameter still leaks to public/auth/404 routes

**Severity:** P1 UX/state correctness  
**File:** `App.tsx`, project persistence effect around lines 315-329.

The effect adds `project=<id>` to `window.location.pathname` whenever a project is loaded, without checking `currentRoute === '/workspace'`. The previous runtime audit observed this on `/signin`, `/register`, and a 404. The new commit added workspace title scoping but did not scope project URL mutation.

**Action:** Only open/persist/synchronize project URLs inside `/workspace`. On `/`, auth, and `*`, do not append project state. Add route regression tests.

### RA-04 — Auth pages still have two H1 elements on desktop

**Severity:** P1 accessibility/content structure  
**Files:** `AuthVisualPanel.tsx:55`, `SignInPage.tsx:134`, `RegisterPage.tsx:136`.

The page form and the shared visual panel both use H1. New inline mobile panels use H2, but the desktop `AuthVisualPanel` H1 remains.

**Action:** Change the visual headline to H2 or styled text. Each route should expose exactly one H1. Add this assertion to the accessibility E2E spec for `/signin` and `/register`.

### RA-05 — Landing navigation still uses buttons for navigation

**Severity:** P2 semantics/usability  
**Files:** `LandingNavbar.tsx`, `LandingFooter.tsx`.

The new `Link` component was used in auth/not-found/sidebar areas, but the landing Navbar and Footer still use buttons for Sign In, Register, Workspace, Story, Risk, Tests and Modernization. Users still cannot copy link targets or use native open-in-new-tab behavior.

**Action:** Use `<a href="#section">` for page sections and `Link` for routes. Preserve the current styling and mobile close behavior.

### RA-06 — Largest components were not decomposed

**Severity:** P1 maintainability  

| File | Current lines | Previous lines | Status |
|---|---:|---:|---|
| `ForceGraphCanvas.tsx` | 1,295 | 1,295 | Unchanged |
| `DependencyGraphTab.tsx` | 1,014 | 1,014 | Unchanged |
| `App.tsx` | 879 | 795 | Larger due infrastructure |
| `ExplanationTab.tsx` | 866 | 866 | Unchanged |
| `HeroSection.tsx` | 839 | 839 | Unchanged |
| `MigrationPlanTab.tsx` | 820 | 820 | Unchanged |
| `RefactoredCodeTab.tsx` | 761 | 761 | Unchanged |
| `GeneratedTestsTab.tsx` | 728 | 728 | Unchanged |

Code splitting improves load performance but does not improve local complexity, testability, or change risk.

**Action:** Decompose by responsibility, not arbitrary line count: query/controller, derived view model, toolbar, summary, list/canvas, inspector and modal actions. Target feature coordinators below roughly 350–500 lines.

### RA-07 — Query migration remains incomplete

**Severity:** P1 reliability  

Direct requests remain in auth, Google status, recent projects, change impact, job polling, generated-test polling, Migration refresh and Neural Map aggregation. Some are appropriate specialized flows, but they still implement inconsistent abort/error behavior.

**Action:** Do not force everything into `useProjectQuery`. Instead provide three intentional primitives:

1. `useProjectQuery` for idempotent project GETs.
2. `useJobMutation`/poller for submit + terminal-state jobs.
3. A typed `fetchJson` service for auth and one-shot requests.

Generated-test polling and RecentProjects are the highest remaining cancellation priorities.

### RA-08 — Design-token consolidation has barely moved

**Severity:** P2 design-system consistency  
**Evidence:** 1,300 literal hex occurrences remain versus 1,312 previously.

Top offenders remain MainProductStory (126), Hero (100), ProductReveal (87), RecentProjects (85), CapabilityBento (76), LandingNavbar (72), and auth pages/panel.

**Action:** Add semantic marketing/canvas/auth tokens, then prevent new literal colors with linting. Preserve intentional data-visualization palette exceptions in one typed palette module.

### RA-09 — Landing page remains too long and repetitive

**Severity:** P2 UX/performance  
**Evidence:** Live older deployment still measured 17,806 px in the current browser visit; the current source retains the same full sequence of sections. Source did not implement the previous content consolidation recommendation.

**Action:** Preserve identity but merge:

- Problem + first part of MainProductStory
- Modernization into the seven-stage story
- Trust principles + “Does Not Claim” manifesto
- FactStrip into CapabilityBento or remove it
- Reduce five audience cards to three primary audiences

Target: Hero → intake/demo → evidence → risk → protection → impact → roadmap → FAQ → CTA.

### RA-10 — Scroll pooling is incomplete

**Severity:** P3 performance polish  

`useScrollAnimation` now shares one global scroll loop and observer pools, which is good. However, HeroSection, LandingNavbar and ProductRevealSection still add their own scroll listeners, while ProblemSection creates independent observers.

**Action:** Move those consumers to the shared subscription/pool. Add a development diagnostic asserting the number of active global listeners/observers after landing mount/unmount.

### RA-11 — New infrastructure lacks focused tests

**Severity:** P1 quality  

The four improvement commits changed query, dialog, navigation, health and scroll infrastructure but added no unit test files. The unit count remains 41. Existing E2E caught the query regression only because it traverses Hotspots.

**Action:** Add focused tests for:

- `useProjectQuery` identity, cancellation and stale responses.
- Dialog focus trap/restore/Escape/backdrop/body scroll.
- `Link` modifier clicks and query-string navigation.
- `useServiceHealth` singleton subscription lifecycle and delayed state cleanup.
- Shared scroll listener/observer cleanup.

### RA-12 — Live deployment does not match the audited source

**Severity:** P1 release/process  

The live site served `assets/index-cGwM6bgd.js`, retained the old fixed page title, and exposed the pre-update navigation semantics. The local audited build produced `index-CCGeoZ-6.js` and route-specific title code.

**Action:** Deploy `9c044ae` or a fixed successor, expose build SHA in `/api/health` and a small client meta tag, and verify source SHA equals deployed SHA in the release checklist.

## 6. Page-by-Page Re-Ratings

| Page | Previous | Current | Main change | Remaining concern |
|---|---:|---:|---|---|
| Landing | 7.4 | **7.5** | Lazy route and pooled scroll utilities improve load | Still very long; navigation buttons; many literal colors |
| Sign in | 7.8 | **8.0** | Lazy route, semantic route links, post-commit guard | Dual H1 remains; visual panel still heavily hardcoded |
| Register | 7.8 | **8.0** | Same improvements as Sign in | Dual H1 and password announcement still need work |
| 404 | 8.2 | **8.3** | Uses semantic Link | Project query parameter leak remains |
| Workspace ingest | 7.6 | **7.7** | Entry split and route loading fallback | Large InputSection and uncancelled recent/demo requests |
| Overview | 8.3 | **8.4** | Lazy route lowers initial cost | 700 lines; large-list virtualization not implemented |
| System Pulse | 7.9 | **8.1** | Abortable query hook | Loading view still loses persistent page heading context |
| Explanation | 7.5 | **7.7** | Lazy route | 866 lines and loose `any` contracts remain |
| Risk Hotspots | 8.1 | **5.5** | Intended abortable query | **Broken by unstable `onSuccess` dependency loop** |
| Dependency Graph | 7.8 | **8.1** | Route/vendor split and abortable query | 1,014 lines, small mobile controls, canvas/list complexity |
| Neural Map | 7.9 | **8.0** | Smaller route chunk | Canvas accessibility and dense controls remain |
| Generated Tests | 7.7 | **7.8** | Route split | Polling cancellation and remaining raw download/fullscreen flows |
| Refactor Proposals | 7.6 | **7.8** | Route split | 761-line coordinator, loose error/catch types |
| Migration Plan | 8.2 | **8.3** | Route split and formula dialog migration | 820 lines, direct refresh fetch, extreme mobile length |

## 7. Updated Component Ratings

Weights remain: UI 20%, UX 20%, responsiveness 15%, interactions 10%, performance 15%, code quality 10%, accessibility 10%.

### Components materially changed since the first audit

| Component | UI | UX | Resp. | Interact. | Perf. | Code | A11y | Overall | Status |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| App / WorkspaceContent | 8 | 8 | 8 | 8 | 9 | 7 | 8 | **8.1** | Improved; still oversized and route-state leak remains |
| AppSidebar | 8 | 9 | 9 | 9 | 8 | 8 | 9 | **8.6** | Critical issue resolved |
| Dialog | 8 | 9 | 9 | 9 | 8 | 9 | 9 | **8.7** | Strong new primitive |
| PathTracingModal | 8 | 8 | 8 | 8 | 8 | 8 | 8 | **8.0** | Render-phase bug resolved |
| ChangeImpactModal | 8 | 9 | 8 | 9 | 8 | 8 | 9 | **8.4** | Dialog lifecycle resolved |
| ShortcutsModal | 8 | 8 | 8 | 9 | 8 | 8 | 9 | **8.2** | Dialog lifecycle resolved |
| ArchitectureTourModal | 8 | 8 | 8 | 9 | 8 | 8 | 9 | **8.2** | Dialog lifecycle resolved |
| TestDownloadModal | 8 | 8 | 8 | 8 | 8 | 8 | 9 | **8.1** | Dialog lifecycle resolved |
| ReadinessFormulaModal | 8 | 9 | 8 | 8 | 8 | 8 | 9 | **8.2** | Dialog lifecycle resolved |
| AuthGuard | 7 | 8 | 9 | 7 | 9 | 8 | 8 | **8.1** | Correct lifecycle; minor flash risk |
| useProjectQuery | 7 | 5 | 8 | 6 | 6 | 5 | 7 | **6.2** | New P0 dependency-identity bug |
| useDependencyGraph | 8 | 8 | 8 | 8 | 8 | 8 | 7 | **7.9** | Abortable query works with stable inputs |
| useHotspots | 8 | 4 | 8 | 5 | 3 | 4 | 7 | **5.4** | Core page regression |
| useServiceHealth | 8 | 8 | 8 | 8 | 8 | 8 | 8 | **8.0** | Poll deduplication achieved |
| StatusPill / HealthIndicator | 8 | 8 | 8 | 8 | 9 | 9 | 8 | **8.3** | Consolidated successfully |
| Link/navigation utilities | 8 | 8 | 9 | 8 | 9 | 8 | 8 | **8.3** | Good primitive; adoption incomplete |
| Scroll animation utilities | 8 | 8 | 8 | 8 | 9 | 8 | 8 | **8.2** | Pooled; some standalone consumers remain |

### Remaining component families

| Family / components | Current range | Verdict |
|---|---:|---|
| Core primitives: Button, Card, Notice, EmptyState, SearchField, SegmentedControl, Tags | **8.1–8.7** | Keep; add arrow-key radio behavior and loading button contract when needed. |
| Metric primitives: KpiCard, StatCard, StatTile, ScoreCard, ReadinessGauge | **7.9–8.3** | Visually strong; consolidate overlapping APIs. |
| Code/Diff viewers | **7.6–7.8** | Good task UX; CodeViewer fullscreen still needs Dialog and large-diff virtualization. |
| Overview and project shell | **7.7–8.4** | Strongest conventional page; large inventory needs threshold virtualization. |
| Pulse subcomponents | **7.7–8.3** | Strong executive story; reduce repeated metrics and long vertical sequence. |
| Explanation components | **7.4–7.9** | Visually good; typing and decomposition still weak. |
| Hotspot presentation components | **8.0–8.5** | Keep visual design; blocked by query hook regression, not presentation. |
| Graph presentation components | **7.7–8.2** | Strong graph/list/inspector system; coordinator remains too large. |
| Neural Map components | **7.1–8.4** | Distinctive flagship; accessible table/list and larger mobile targets still required. |
| Tests/modernization components | **7.5–8.1** | Good evidence workflow; modal migration and polling architecture incomplete. |
| Migration components | **7.7–8.5** | Best executive UX; formula dialog improved, page remains oversized. |
| Landing components | **7.3–8.3** | High visual quality; content reduction and tokenization remain the main work. |
| Auth components | **7.8–8.1** | Better navigation; dual H1 and hardcoded palette remain. |

## 8. Antigravity Implementation Brief

Give Antigravity this exact priority order. Do not start with visual redesign.

### P0 — Fix the production regression

**Objective:** Make `useProjectQuery` immune to callback identity changes and restore Risk Hotspots.

**Files:**

- `frontend/src/hooks/useProjectQuery.ts`
- `frontend/src/hooks/useHotspots.ts`
- New test file for `useProjectQuery`
- `frontend/e2e/golden-path.spec.ts` only if its locator needs semantic hardening after the product bug is fixed

**Constraints:**

- Preserve abort-on-project-switch and stale-response protection.
- Do not hide the regression by increasing the Playwright timeout.
- Do not remove `onSuccess`; stabilize its consumption.
- Verify request counts.

### P1 — Complete infrastructure adoption

1. Migrate the three raw dialogs to `Dialog`.
2. Scope project persistence/URL synchronization to `/workspace`.
3. Change `AuthVisualPanel` H1 to H2.
4. Convert Landing Navbar/Footer navigation buttons to anchors/Link.
5. Add focused unit/E2E coverage for all four improvements.

### P1 — Decompose high-risk components

Start with:

1. `ForceGraphCanvas`
2. `DependencyGraphTab`
3. `App`
4. `ExplanationTab`
5. `GeneratedTestsTab`
6. `MigrationPlanTab`

Keep behavior and visual output stable. Extract typed state/query hooks and pure presentation sections before any redesign.

### P2 — Finish design-system and landing work

- Replace literal colors with semantic tokens by family.
- Merge redundant landing sections.
- Preserve the warm canvas, indigo interaction system, dark feature headers, mono evidence labels, and trust-oriented voice.
- Do not add more animation; reduce independent scroll work.

### Required completion checks

```text
npm run lint
npm test
npm run build
npm run test:e2e
```

Required result: all commands exit 0; 10/10 current E2E tests pass; new focused tests pass; live build SHA matches the intended commit.

## 9. Revised Roadmap

| Priority | Task | Effort | Impact |
|---|---|---:|---|
| P0 | Stabilize `useProjectQuery` callbacks and pass golden path | 0.5–1 d | Restores broken core page and release viability |
| P0 | Add query hook regression tests | 0.5–1 d | Prevents repeat of the new failure |
| P1 | Complete remaining Dialog migrations | 1 d | Finishes keyboard/focus accessibility foundation |
| P1 | Scope project URL state to workspace | 0.5 d | Removes auth/404 state leakage |
| P1 | Fix auth heading structure and landing link semantics | 0.5–1 d | Improves document semantics and native navigation |
| P1 | Deploy fixed commit and expose build SHA | 0.5 d | Removes source/deployment ambiguity |
| P1 | Decompose first three largest coordinators | 4–7 d | Reduces maintenance/change risk |
| P2 | Migrate remaining specialized fetch/poll flows | 2–4 d | Consistent cancellation/errors |
| P2 | Tokenize landing/auth/Neural palettes | 3–5 d | Stronger design-system consistency |
| P2 | Shorten landing architecture | 2–4 d | Better comprehension and conversion |
| P3 | Finish shared scroll/observer adoption | 1–2 d | Incremental runtime/battery improvement |

## 10. Final Verdict

Antigravity solved a meaningful portion of the first report—especially bundle performance, mobile drawer accessibility, request cancellation foundations, service-health duplication, and route behavior. This is not superficial progress.

The work is incomplete in two ways:

1. **A new P0 bug was introduced by the query abstraction**, breaking Risk Hotspots and the golden path.
2. Several commits describe a frontend-wide improvement, but adoption is partial: dialogs, links, query handling, scroll pooling, component decomposition, tokens and landing consolidation are not finished.

### Fix first, second, third

1. Fix and test `useProjectQuery` / Risk Hotspots.
2. Finish Dialog adoption, project URL scoping and auth heading semantics.
3. Deploy the fixed revision, verify build SHA, then begin large-component decomposition.

Do not redesign the visual identity. The frontend’s design language remains one of its strongest assets.
