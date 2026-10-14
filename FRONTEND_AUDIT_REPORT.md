# CodeOracle Frontend Audit Report

**Audit date:** 2026-10-14  
**Scope:** `frontend/` source, routes, reusable components, hooks, services, tests, production build, and deployed UI at `https://codeoracle-l7ay.onrender.com`  
**Audit mode:** Audit only. No application source was modified.  

## Validation status and evidence policy

- **Verified:** `npm run lint` passed; `npm test` passed all 41 tests; `npm run build` passed.
- **Measured build output:** main application chunk 696.75 kB minified / 153.51 kB gzip; React Flow vendor chunk 319.06 kB / 103.07 kB gzip; Neural Map chunk 92.74 kB / 27.50 kB gzip; CSS 113.25 kB / 19.62 kB gzip. Vite emitted a chunk-size warning.
- **Runtime browser inspection:** deployed landing, sign-in, registration, 404, ingestion/workspace overview, and all nine analysis views were inspected at 1440×900 and 375×667. Graph and Neural Map canvases rendered. No horizontal document overflow was observed.
- **E2E execution:** **Not Verified.** `npm run test:e2e` and a focused accessibility spec both stalled before test execution while Playwright attempted to start its configured Vite server. They produced no pass/fail result and were stopped after repeated zero-output waits.
- **Data set limitation:** workspace runtime checks used the built-in two-file Python Legacy benchmark. Large-repository density, graph performance at production scale, authenticated-only ingestion, real uploads, OAuth, downloads, and destructive/error recovery flows were not executed. Those items are marked **Not Verified** where relevant.
- **Working tree at audit start:** `frontend/src/components/InputSection.tsx` was already modified and `FULL_CONTEXT.md` was already untracked. These were not changed by this audit.

## 1. Executive Summary

### Scores

| Dimension | Score | Rationale |
|---|---:|---|
| Overall frontend | **7.6 / 10** | Strong, distinctive SaaS UI with broad state coverage and unusually rich architecture visualizations, held back by accessibility gaps, oversized components, duplicated request patterns, and a heavy initial bundle. |
| UI/UX | **7.9 / 10** | Premium identity, excellent information design in analysis views, good responsive stacking, but a 21,679 px desktop / 23,806 px mobile landing page, dense controls, and many small targets create fatigue. |
| Code quality | **7.0 / 10** | Type-safe build and useful utilities/hooks, but several 700–1,295-line components, widespread `any`, render-time side effects, and inconsistent API/cancellation patterns reduce maintainability. |
| Accessibility | **6.5 / 10** | Skip link, labels, live regions, tab semantics, focus styles, reduced-motion support, and meaningful status roles are good. Closed mobile navigation remains exposed to assistive technology; most dialogs lack a complete focus lifecycle. |
| Performance | **6.9 / 10** | Neural Map is lazy-loaded and simulations clean up, but the main chunk is 696.75 kB minified, the landing page installs many scroll observers/listeners, and most major workspace views are eagerly imported. |

### Production-readiness assessment

**Conditionally production-ready for a portfolio/demo or controlled beta; not yet ready for an accessibility-sensitive or high-scale enterprise release.** The core flows build, unit tests pass, deployed views load, responsive overflow is controlled, and errors/loading/empty states are broadly represented. Before a general production launch, fix the off-canvas navigation accessibility defect, standardize modal focus behavior, remove render-time state changes, introduce request cancellation/stale-response protection, split major routes, and restore reliable E2E execution.

### Top 5 strengths

1. A coherent, memorable visual identity: warm canvas, dark feature headers, indigo interaction color, mono data labels, and consistent evidence-first language.
2. Excellent analysis information architecture across Overview, Pulse, Hotspots, Graph, Neural Map, Tests, Refactor, and Migration.
3. Broad state design: loading, empty, error, partial-confidence, status, progress, and recovery states exist rather than being afterthoughts.
4. Strong static-analysis trust UX: confidence labels, unresolved imports, static-vs-runtime boundaries, and non-destructive language are surfaced repeatedly.
5. A healthy verification baseline: TypeScript, production build, and 41 focused unit tests pass; the deployed app rendered all audited views without console errors during inspection.

### Top 10 weaknesses

1. The visually closed mobile sidebar remains in the accessibility tree and exposes all navigation controls (`AppSidebar.tsx:391-407`).
2. Six of nine dialog implementations have no Escape handling; none implements a complete focus trap + initial focus + trigger restoration lifecycle.
3. `PathTracingModal` calls `setState` inside `useMemo`, a render-phase side effect (`PathTracingModal.tsx:21-24`).
4. `App` performs navigation during render for authenticated sign-in/register routes (`App.tsx:488-499`).
5. The main bundle is 696.75 kB minified, and all large workspace tabs except Neural Map are eagerly imported.
6. Component size is excessive: `ForceGraphCanvas` 1,295 lines, `DependencyGraphTab` 1,014, `ExplanationTab` 866, `HeroSection` 839, `MigrationPlanTab` 820, and `App` 795.
7. The landing page is dramatically overlong and repeats similar trust/evidence messages across many sections.
8. Direct `fetch` calls bypass the shared API client and often lack abort/stale-response handling (`App.tsx:298,310` and multiple tabs/hooks).
9. Styling is only partially tokenized: 1,312 literal hex-color occurrences across 40 component files, especially landing/auth views.
10. E2E execution is currently unreliable in this environment; the suite did not reach test execution.

## 2. Complete Component Rating Table

Scoring uses the requested weighting: **UI 20%, UX 20%, responsiveness 15%, animation/interactions 10%, performance 15%, code quality/reuse 10%, accessibility 10%**. `A/I` means animation and interaction. Scores reflect the component itself, not only the containing page.

### Application shell, auth, and core workspace

| Component (file) | UI | UX | Resp. | A/I | Perf. | Code | A11y | Overall | Priority |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| App / WorkspaceContent (`src/App.tsx`) | 8 | 7 | 8 | 7 | 6 | 6 | 7 | **7.1** | High |
| AuthProvider (`src/context/AuthContext.tsx`) | 7 | 8 | 8 | 7 | 7 | 7 | 7 | **7.4** | Medium |
| AppSidebar (`src/components/AppSidebar.tsx`) | 8 | 8 | 8 | 8 | 7 | 7 | 5 | **7.5** | Critical |
| ProjectContextBar (`src/components/ProjectContextBar.tsx`) | 8 | 8 | 8 | 7 | 8 | 8 | 8 | **7.9** | Low |
| ProjectNavBar (`src/components/ProjectNavBar.tsx`) | 7 | 7 | 7 | 7 | 8 | 7 | 7 | **7.2** | Low |
| WorkspaceShell (`src/components/WorkspaceShell.tsx`) | 8 | 8 | 9 | 7 | 9 | 9 | 8 | **8.3** | Low |
| Header (`src/components/Header.tsx`) | 7 | 7 | 8 | 6 | 7 | 7 | 7 | **7.1** | Low |
| HealthIndicator (`src/components/HealthIndicator.tsx`) | 7 | 7 | 8 | 6 | 6 | 7 | 8 | **7.0** | Medium |
| InputSection (`src/components/InputSection.tsx`) | 8 | 8 | 8 | 8 | 7 | 7 | 8 | **7.7** | Medium |
| RecentProjectsSection (`src/components/RecentProjectsSection.tsx`) | 8 | 8 | 8 | 7 | 6 | 7 | 7 | **7.3** | Medium |
| JobProgressView (`src/components/JobProgressView.tsx`) | 8 | 8 | 8 | 8 | 8 | 8 | 8 | **8.0** | Low |
| SignInPage (`src/components/auth/SignInPage.tsx`) | 8 | 8 | 9 | 7 | 8 | 7 | 7 | **7.9** | Medium |
| RegisterPage (`src/components/auth/RegisterPage.tsx`) | 8 | 8 | 9 | 7 | 8 | 7 | 7 | **7.9** | Medium |
| AuthVisualPanel (`src/components/auth/AuthVisualPanel.tsx`) | 9 | 8 | 8 | 7 | 8 | 7 | 7 | **7.9** | Low |
| GoogleAuthButton (`src/components/auth/GoogleAuthButton.tsx`) | 8 | 8 | 8 | 7 | 7 | 8 | 8 | **7.8** | Low |

### Shared UI components

| Component (file) | UI | UX | Resp. | A/I | Perf. | Code | A11y | Overall | Priority |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| AnalysisStepper (`common/AnalysisStepper.tsx`) | 8 | 8 | 8 | 8 | 8 | 7 | 8 | **7.9** | Low |
| Badge (`common/Badge.tsx`) | 8 | 8 | 9 | 7 | 9 | 9 | 7 | **8.2** | Low |
| Button (`common/Button.tsx`) | 8 | 8 | 9 | 8 | 9 | 9 | 8 | **8.4** | Keep |
| Card (`common/Card.tsx`) | 8 | 8 | 9 | 7 | 9 | 9 | 8 | **8.2** | Keep |
| ChangeImpactModal (`common/ChangeImpactModal.tsx`) | 8 | 8 | 8 | 7 | 7 | 7 | 5 | **7.3** | High |
| ChangeImpactView (`common/ChangeImpactView.tsx`) | 8 | 8 | 8 | 8 | 6 | 6 | 7 | **7.4** | Medium |
| FilterChip / ToggleChip (`common/Chips.tsx`) | 8 | 8 | 8 | 8 | 9 | 9 | 8 | **8.3** | Keep |
| CodeViewer (`common/CodeViewer.tsx`) | 8 | 8 | 8 | 8 | 7 | 7 | 7 | **7.6** | Medium |
| DiffViewer (`common/DiffViewer.tsx`) | 8 | 8 | 8 | 8 | 7 | 7 | 7 | **7.6** | Medium |
| EmptyState (`common/EmptyState.tsx`) | 8 | 8 | 9 | 7 | 9 | 9 | 8 | **8.2** | Keep |
| FindingFunnel (`common/FindingFunnel.tsx`) | 8 | 8 | 8 | 7 | 8 | 8 | 7 | **7.8** | Low |
| KpiCard (`common/KpiCard.tsx`) | 8 | 8 | 8 | 7 | 8 | 8 | 7 | **7.8** | Low |
| LoadingState (`common/LoadingState.tsx`) | 7 | 8 | 9 | 7 | 9 | 9 | 8 | **8.1** | Keep |
| NotFoundPage (`common/NotFoundPage.tsx`) | 8 | 8 | 9 | 7 | 9 | 9 | 8 | **8.2** | Keep |
| Notice (`common/Notice.tsx`) | 8 | 8 | 9 | 7 | 9 | 9 | 9 | **8.4** | Keep |
| PageHeader (`common/PageHeader.tsx`) | 8 | 8 | 8 | 7 | 9 | 8 | 8 | **8.1** | Keep |
| PageHeroHeader (`common/PageHeroHeader.tsx`) | 9 | 8 | 8 | 8 | 8 | 8 | 8 | **8.2** | Keep |
| PipelineStrip (`common/PipelineStrip.tsx`) | 8 | 8 | 8 | 8 | 8 | 8 | 8 | **8.0** | Low |
| ProgressBar (`common/ProgressBar.tsx`) | 7 | 8 | 9 | 8 | 9 | 6 | 8 | **7.9** | Medium |
| ProjectTitle (`common/ProjectTitle.tsx`) | 8 | 8 | 9 | 7 | 9 | 9 | 8 | **8.2** | Keep |
| ReadinessGauge (`common/ReadinessGauge.tsx`) | 9 | 8 | 8 | 8 | 8 | 8 | 7 | **8.1** | Low |
| RiskBadge (`common/RiskBadge.tsx`) | 8 | 8 | 9 | 7 | 9 | 9 | 8 | **8.2** | Keep |
| ScoreCard (`common/ScoreCard.tsx`) | 8 | 8 | 8 | 7 | 9 | 8 | 7 | **7.9** | Low |
| SearchField (`common/SearchField.tsx`) | 8 | 9 | 9 | 8 | 9 | 9 | 9 | **8.7** | Keep |
| SegmentedControl (`common/SegmentedControl.tsx`) | 8 | 8 | 8 | 8 | 9 | 9 | 9 | **8.4** | Keep |
| ShortcutsModal (`common/ShortcutsModal.tsx`) | 8 | 8 | 8 | 8 | 8 | 8 | 6 | **7.7** | High |
| StatCard (`common/StatCard.tsx`) | 8 | 8 | 8 | 7 | 9 | 9 | 7 | **8.0** | Keep |
| StatTile (`common/StatTile.tsx`) | 8 | 8 | 8 | 8 | 9 | 8 | 8 | **8.1** | Low |
| StatusPill (`common/StatusPill.tsx`) | 8 | 8 | 8 | 8 | 6 | 7 | 8 | **7.5** | Medium |
| Tags (`common/Tags.tsx`) | 8 | 8 | 9 | 7 | 9 | 9 | 8 | **8.2** | Keep |
| Toast / ToastProvider (`common/Toast.tsx`) | 8 | 8 | 8 | 8 | 7 | 7 | 9 | **7.9** | Medium |

### Analysis pages and feature components

| Component (file) | UI | UX | Resp. | A/I | Perf. | Code | A11y | Overall | Priority |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| ProjectOverviewTab (`ProjectOverviewTab.tsx`) | 8 | 9 | 9 | 8 | 7 | 7 | 8 | **8.1** | Medium |
| ProjectResultsView (`ProjectResultsView.tsx`) | 8 | 8 | 8 | 7 | 7 | 7 | 7 | **7.6** | Low |
| TabNavigation (`TabNavigation.tsx`) | 8 | 8 | 8 | 9 | 9 | 9 | 9 | **8.5** | Keep |
| SystemPulseTab (`pulse/SystemPulseTab.tsx`) | 8 | 8 | 8 | 8 | 7 | 7 | 8 | **7.8** | Medium |
| RepositoryHealthHero (`pulse/RepositoryHealthHero.tsx`) | 9 | 8 | 8 | 8 | 8 | 8 | 8 | **8.2** | Low |
| ArchitectureHealthMap (`pulse/ArchitectureHealthMap.tsx`) | 8 | 8 | 8 | 8 | 7 | 7 | 7 | **7.7** | Medium |
| HealthDimensionCards (`pulse/HealthDimensionCards.tsx`) | 8 | 8 | 8 | 8 | 7 | 7 | 7 | **7.7** | Medium |
| IntelligentSignalsSection (`pulse/IntelligentSignalsSection.tsx`) | 8 | 8 | 8 | 7 | 8 | 8 | 7 | **7.8** | Low |
| PressureZonesSection (`pulse/PressureZonesSection.tsx`) | 8 | 8 | 8 | 7 | 8 | 8 | 7 | **7.8** | Low |
| SubsystemHealthMatrix (`pulse/SubsystemHealthMatrix.tsx`) | 8 | 8 | 7 | 7 | 8 | 8 | 7 | **7.7** | Medium |
| NextActionsSection (`pulse/NextActionsSection.tsx`) | 8 | 9 | 8 | 8 | 8 | 8 | 8 | **8.2** | Keep |
| ExplanationTab (`ExplanationTab.tsx`) | 8 | 8 | 8 | 7 | 6 | 6 | 7 | **7.2** | High |
| ArchitectureOverviewCard (`explanation/ArchitectureOverviewCard.tsx`) | 8 | 8 | 8 | 8 | 7 | 6 | 7 | **7.5** | Medium |
| ArchitectureHotspotsSection (`explanation/ArchitectureHotspotsSection.tsx`) | 8 | 8 | 8 | 7 | 8 | 6 | 7 | **7.5** | Medium |
| ArchitectureLayersSection (`explanation/ArchitectureLayersSection.tsx`) | 8 | 8 | 8 | 7 | 8 | 7 | 7 | **7.7** | Low |
| ImportDiagnosticsSection (`explanation/ImportDiagnosticsSection.tsx`) | 8 | 8 | 8 | 7 | 8 | 6 | 8 | **7.7** | Medium |
| ModernizationPlaybookSection (`explanation/ModernizationPlaybookSection.tsx`) | 8 | 8 | 8 | 7 | 8 | 8 | 7 | **7.8** | Low |
| ModuleExplanationList (`explanation/ModuleExplanationList.tsx`) | 8 | 8 | 8 | 8 | 7 | 7 | 7 | **7.6** | Medium |
| HotspotsTab (`HotspotsTab.tsx`) | 9 | 9 | 8 | 8 | 7 | 7 | 8 | **8.1** | Medium |
| HotspotsKpiGrid (`hotspots/HotspotsKpiGrid.tsx`) | 8 | 8 | 9 | 7 | 9 | 9 | 8 | **8.2** | Keep |
| TopHotspotShowcase (`hotspots/TopHotspotShowcase.tsx`) | 9 | 9 | 8 | 8 | 8 | 8 | 8 | **8.4** | Keep |
| HotspotRowCard (`hotspots/HotspotRowCard.tsx`) | 8 | 8 | 8 | 8 | 7 | 7 | 7 | **7.7** | Medium |
| HotspotBadges (`hotspots/HotspotBadges.tsx`) | 8 | 8 | 9 | 7 | 9 | 8 | 8 | **8.1** | Keep |
| DependencyGraphTab (`DependencyGraphTab.tsx`) | 9 | 8 | 7 | 9 | 6 | 5 | 7 | **7.4** | High |
| GraphInspectorDrawer (`graph/GraphInspectorDrawer.tsx`) | 8 | 8 | 8 | 8 | 7 | 7 | 7 | **7.6** | Medium |
| GraphLegend (`graph/GraphLegend.tsx`) | 8 | 8 | 8 | 8 | 8 | 8 | 7 | **7.9** | Low |
| GraphListViewTable (`graph/GraphListViewTable.tsx`) | 8 | 8 | 7 | 7 | 8 | 8 | 8 | **7.8** | Low |
| GraphNodeComponent (`graph/GraphNodeComponent.tsx`) | 9 | 8 | 8 | 8 | 7 | 8 | 7 | **8.0** | Low |
| UnresolvedDiagnosticsModal (`graph/UnresolvedDiagnosticsModal.tsx`) | 8 | 8 | 8 | 7 | 8 | 8 | 6 | **7.6** | High |
| NeuralMapPage (`NeuralMap/NeuralMapPage.tsx`) | 9 | 8 | 7 | 9 | 7 | 7 | 7 | **7.8** | Medium |
| ForceGraphCanvas (`NeuralMap/ForceGraphCanvas.tsx`) | 9 | 8 | 6 | 9 | 6 | 5 | 5 | **6.9** | High |
| NeuralMapControls (`NeuralMap/NeuralMapControls.tsx`) | 8 | 7 | 6 | 9 | 8 | 7 | 7 | **7.4** | Medium |
| NeuralMapLegend (`NeuralMap/NeuralMapLegend.tsx`) | 8 | 8 | 7 | 8 | 8 | 8 | 7 | **7.8** | Low |
| SelectedNodePanel (`NeuralMap/SelectedNodePanel.tsx`) | 8 | 8 | 7 | 8 | 7 | 7 | 7 | **7.5** | Medium |
| CommandPaletteModal (`NeuralMap/CommandPaletteModal.tsx`) | 9 | 9 | 8 | 9 | 8 | 8 | 7 | **8.4** | Medium |
| ArchitectureTourModal (`NeuralMap/ArchitectureTourModal.tsx`) | 8 | 8 | 8 | 8 | 8 | 8 | 6 | **7.7** | High |
| PathTracingModal (`NeuralMap/PathTracingModal.tsx`) | 8 | 8 | 8 | 8 | 7 | 4 | 5 | **6.8** | High |
| graphDataAdapter (`NeuralMap/graphDataAdapter.ts`) | 7 | 8 | 8 | 7 | 8 | 8 | 7 | **7.6** | Low |
| useForceSimulation (`NeuralMap/useForceSimulation.ts`) | 8 | 8 | 8 | 9 | 8 | 8 | 7 | **8.1** | Low |
| GeneratedTestsTab (`GeneratedTestsTab.tsx`) | 8 | 9 | 8 | 8 | 6 | 6 | 7 | **7.5** | High |
| SelectedTestPanel (`tests/SelectedTestPanel.tsx`) | 8 | 8 | 8 | 8 | 7 | 7 | 7 | **7.6** | Medium |
| TestCoverageSummaryCard (`tests/TestCoverageSummaryCard.tsx`) | 8 | 8 | 8 | 8 | 8 | 7 | 8 | **7.9** | Low |
| TestDownloadModal (`tests/TestDownloadModal.tsx`) | 8 | 8 | 8 | 7 | 8 | 8 | 5 | **7.4** | High |
| RefactoredCodeTab (`RefactoredCodeTab.tsx`) | 8 | 8 | 8 | 8 | 6 | 6 | 7 | **7.4** | High |
| ModernizationSummaryCard (`modernization/ModernizationSummaryCard.tsx`) | 8 | 8 | 8 | 8 | 7 | 7 | 7 | **7.6** | Medium |
| ModernizationPipeline (`modernization/ModernizationPipeline.tsx`) | 8 | 8 | 8 | 8 | 8 | 8 | 8 | **8.0** | Low |
| CandidateReviewPanel (`modernization/CandidateReviewPanel.tsx`) | 8 | 8 | 7 | 8 | 7 | 6 | 7 | **7.4** | Medium |
| CandidateDispositionPanel (`modernization/CandidateDispositionPanel.tsx`) | 8 | 8 | 8 | 8 | 8 | 8 | 7 | **7.9** | Low |
| ModernizationRulesModal (`modernization/ModernizationRulesModal.tsx`) | 8 | 8 | 8 | 8 | 7 | 8 | 5 | **7.4** | High |
| MigrationPlanTab (`MigrationPlanTab.tsx`) | 9 | 9 | 8 | 8 | 6 | 6 | 7 | **7.7** | High |
| ExecutiveSummaryCard (`migration/ExecutiveSummaryCard.tsx`) | 9 | 9 | 8 | 8 | 8 | 8 | 8 | **8.4** | Keep |
| ImpactRippleGraphic (`migration/ImpactRippleGraphic.tsx`) | 8 | 8 | 7 | 8 | 8 | 8 | 6 | **7.6** | Medium |
| PriorityMatrix (`migration/PriorityMatrix.tsx`) | 8 | 8 | 7 | 8 | 8 | 8 | 7 | **7.7** | Low |
| ReadinessDimensionsSection (`migration/ReadinessDimensionsSection.tsx`) | 8 | 8 | 8 | 8 | 8 | 8 | 7 | **7.9** | Low |
| ReadinessFormulaModal (`migration/ReadinessFormulaModal.tsx`) | 8 | 9 | 8 | 7 | 8 | 8 | 5 | **7.6** | High |
| WaveRoadmapSection (`migration/WaveRoadmapSection.tsx`) | 9 | 9 | 8 | 8 | 7 | 7 | 7 | **8.0** | Medium |

### Landing page components

| Component (file) | UI | UX | Resp. | A/I | Perf. | Code | A11y | Overall | Priority |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| LandingPage (`landing/LandingPage.tsx`) | 9 | 7 | 8 | 9 | 5 | 7 | 7 | **7.4** | High |
| LandingNavbar (`landing/LandingNavbar.tsx`) | 8 | 8 | 8 | 8 | 7 | 7 | 7 | **7.6** | Medium |
| HeroSection (`landing/HeroSection.tsx`) | 9 | 8 | 8 | 9 | 5 | 5 | 7 | **7.3** | High |
| ProductRevealSection (`landing/ProductRevealSection.tsx`) | 9 | 8 | 8 | 9 | 6 | 6 | 7 | **7.6** | Medium |
| ProblemSection (`landing/ProblemSection.tsx`) | 8 | 8 | 8 | 8 | 6 | 7 | 7 | **7.5** | Medium |
| MainProductStory (`landing/MainProductStory.tsx`) | 9 | 8 | 7 | 9 | 6 | 5 | 7 | **7.4** | High |
| RiskSection (`landing/RiskSection.tsx`) | 9 | 9 | 8 | 9 | 7 | 7 | 8 | **8.2** | Low |
| ProtectionSection (`landing/ProtectionSection.tsx`) | 9 | 8 | 8 | 8 | 8 | 8 | 8 | **8.2** | Keep |
| ModernizationSection (`landing/ModernizationSection.tsx`) | 9 | 8 | 8 | 9 | 6 | 6 | 7 | **7.7** | Medium |
| ImpactSimulationSection (`landing/ImpactSimulationSection.tsx`) | 9 | 9 | 8 | 9 | 7 | 7 | 8 | **8.2** | Low |
| MigrationRoadmapSection (`landing/MigrationRoadmapSection.tsx`) | 9 | 9 | 8 | 9 | 7 | 7 | 8 | **8.2** | Low |
| CapabilityBento (`landing/CapabilityBento.tsx`) | 9 | 8 | 8 | 8 | 7 | 6 | 7 | **7.7** | Medium |
| TrustSection (`landing/TrustSection.tsx`) | 8 | 8 | 8 | 8 | 8 | 8 | 8 | **8.0** | Low |
| FactStrip (`landing/FactStrip.tsx`) | 8 | 7 | 8 | 8 | 8 | 8 | 7 | **7.7** | Low |
| AudienceSection (`landing/AudienceSection.tsx`) | 8 | 8 | 8 | 8 | 8 | 8 | 8 | **8.0** | Low |
| FaqSection (`landing/FaqSection.tsx`) | 8 | 9 | 9 | 8 | 8 | 8 | 8 | **8.3** | Keep |
| FinalCtaSection (`landing/FinalCtaSection.tsx`) | 9 | 8 | 9 | 8 | 8 | 8 | 8 | **8.3** | Keep |
| LandingFooter (`landing/LandingFooter.tsx`) | 8 | 8 | 9 | 7 | 9 | 8 | 8 | **8.2** | Keep |

## 3. Page-by-Page Ratings

| Page | Rating | Strongest features | Main issues | Recommended improvement |
|---|---:|---|---|---|
| Landing `/` | **7.4** | Distinctive hero, evidence-led storytelling, excellent trust positioning, polished responsive layout | 21k–23k px long; repeated proof messages; many simultaneous scroll effects; 75 buttons in audited DOM; dense mobile journey | Reduce to 7–9 core sections; merge Trust + manifesto + Fact Strip; preserve Hero, Risk, Protection, Impact, Roadmap, FAQ, CTA |
| Sign in `/signin` | **7.8** | Clear form, labels, autocomplete, actionable validation, strong split visual | Two visible H1s on desktop; auth visual competes with task; literal colors; no verified focus-on-error | Use one document H1, make visual headline H2, focus first invalid field, tokenise auth palette |
| Register `/register` | **7.8** | Password guidance, clear validation, Google option, responsive stacking | Same dual-H1 issue; password requirements should expose live satisfied state; auth-only flow not E2E verified | Add `aria-live` requirement summary and one H1; verify account-error recovery |
| 404 | **8.2** | Clear recovery choices, compact, responsive, excellent hierarchy | Persisted `?project=` can be reattached to unknown/auth routes by app state | Scope project URL synchronization to `/workspace` only |
| Workspace ingest | **7.6** | Three ingestion choices, guest restrictions, validation, loading/progress, recent demos | Large 678-line form component; recent/demo requests are duplicated and lack cancellation; custom-repo path not runtime tested | Split GitHub/ZIP/demo panels; consolidate fetching; add explicit upload retry summary |
| Project Overview | **8.3** | Best-in-class repository identity, parse coverage, inventory filters, guarantees | Dense desktop above the fold; source row interaction semantics deserve targeted keyboard testing | Keep design; virtualize inventory for large repos; test keyboard row expansion |
| System Pulse | **7.9** | Executive health story, dimensions, pressure zones, next actions | Very long (4,720 px in audited desktop state); source reload briefly exposes loading-only page | Add sticky section index; cache/reuse project pulse response; skeleton heading to retain page context |
| Explanation | **7.5** | Broad architecture synthesis, transparent confidence and diagnostics | 866-line coordinator + 530-line overview; extensive `any`; transient page has no H1 while loading | Split data adapter from view; typed view model; persistent PageHeroHeader/skeleton |
| Risk Hotspots | **8.1** | Strong ranking hierarchy, explainable score factors, effective filters and top-target showcase | Row cards are large; performance on hundreds of rows not verified | Window/virtualize long results and retain URL filter state |
| Dependency Graph | **7.8** | Excellent graph/list duality, filters, inspector, legend, Mermaid export | 1,014-line component, React Flow chunk cost, small controls, mobile graph requires deep vertical scrolling | Extract toolbar/data/inspector controller; offer mobile list as default; lazy-load route |
| Neural Map | **7.9** | Memorable, functional canvas; modes, depth/density filters, tour, trace; lazily loaded | Dense controls, many sub-44 px targets, canvas accessibility is limited, 1,295-line renderer | Provide a first-class synchronized accessible table, larger touch controls, split renderer/input/overlay layers |
| Generated Tests | **7.7** | Strong coverage summary, selected-file review, download scoping, static/runtime distinction | Manual polling loop lacks cancellation; 728-line tab; download modal focus lifecycle incomplete | Abort on unmount/project change; extract generation controller; standard modal primitive |
| Refactor Proposals | **7.6** | Useful candidate disposition, diff review, verification framing | 761-line tab; multiple network/error paths; large review panel; runtime download not verified | Separate query/state/view layers; lazy-load diff viewer; standardize error states |
| Migration Plan | **8.2** | Strongest executive page: readiness, blockers, waves, connected views, export affordances | 5,922 px on mobile; 820-line tab; secondary fetch with cache-busting bypasses client; modals incomplete | Add mobile section navigator, extract controller, reuse query cache, standard modal |

## 4. Detailed Component Analysis

The following inventory covers every rendered React component found under `frontend/src/components`, plus the application/auth providers and Neural Map render helpers. “Remove” means remove only the named redundancy or anti-pattern, not the component unless explicitly stated.

### Shell, auth, and workspace

| Component | Purpose | What is good | What is poor / bugs / risks | Add / improve / remove | Priority |
|---|---|---|---|---|---|
| React bootstrap (`src/main.tsx`) | Mounts `App` into `#root` under `StrictMode` | Minimal, conventional, and correctly enables development lifecycle checks | No error boundary at the root; a render failure can blank the application | **Add:** a root error boundary with recovery/reporting; otherwise keep bootstrap minimal | Medium |
| App / WorkspaceContent | Route dispatch, project state, tabs, cross-feature orchestration | Central URL state, shortcuts, lazy Neural Map, comprehensive empty states | Source-confirmed navigation during render; un-aborted background fetches; 795 lines; project query synchronization runs outside workspace | **Improve:** reducer/router/query layer. **Add:** abort/stale guards and route focus/title updates. **Remove:** render-time navigation | High |
| AuthProvider | Session, login, registration, logout | HttpOnly-cookie-friendly API use; clear methods and boot state | `console.error` leaks implementation detail; no request abort; logout outcome ignored | **Improve:** typed `ApiError`, abort session check, surface logout failure non-destructively | Medium |
| AppSidebar | Primary workspace IA and mobile drawer | Excellent grouping and active state; responsive rail; Escape closes open drawer | Runtime-confirmed: closed mobile drawer remains in accessibility tree/focus order | **Add:** `inert` + `aria-hidden` when closed, focus trap/restore when open. **Keep:** IA and visual hierarchy | Critical |
| ProjectContextBar | Active project context and top actions | Compact, useful, responsive | Subtitle can state generic requirements even when project exists; title truncation needs accessible full value | **Improve:** context-specific subtitle and `title`/tooltip for truncation | Low |
| ProjectNavBar | Older/alternate project navigation | Clear tab choices | Overlaps with AppSidebar/TabNavigation concepts and increases design drift risk | **Remove or consolidate** if no active import path requires it; otherwise share one nav config | Low |
| WorkspaceShell | Width/layout wrapper | Tiny, reusable, predictable | No meaningful defect | **Keep unchanged** | Keep |
| Header | Health/status header wrapper | Simple and readable | Appears superseded by sidebar/context bar; verify actual use | **Remove if unused** after dependency check; do not maintain duplicate shell patterns | Low |
| HealthIndicator | 15-second service health poll | Understandable live status | Duplicates StatusPill purpose; no abort/timeout; unnecessary periodic work if mounted | **Consolidate** with StatusPill and shared health query | Medium |
| InputSection | ZIP/GitHub/demo intake | Strong validation, disabled states, guest gate, security copy | 678 lines; mixed modes/state/API concerns; pre-existing working-tree edits make exact baseline uncertain | **Split** mode panels and controller; **add** per-mode error summary; do not rewrite until existing edits are reconciled | Medium |
| RecentProjectsSection | Recent/private and demo projects | Useful search, refresh, empty/error handling | Two direct requests; no abort; large hardcoded palette; local filtering only | **Improve:** shared query client, cancellation, skeleton; **remove:** duplicate color literals | Medium |
| JobProgressView | Analysis job status | Clear progress and stage presentation | Minimal detail for long jobs | **Add:** elapsed time and retry/help link only when thresholds are exceeded | Low |
| SignInPage | Credential login | Proper labels, autocomplete, validation and error alert | Desktop has two H1s with AuthVisualPanel; colors bypass tokens | **Improve:** one H1, focus invalid field, use semantic tokens | Medium |
| RegisterPage | Account creation | Clear requirements and accessible descriptions | Same two-H1/token issues; requirement satisfaction not announced | **Add:** live password checklist; **improve:** one H1 and invalid focus | Medium |
| AuthVisualPanel | Brand/story panel | Attractive product context and responsive hiding | H1 conflicts with form H1; 59 hardcoded colors | **Change H1 to H2** and tokenise; keep visual concept | Low |
| GoogleAuthButton | OAuth availability and redirect | Handles configuration and loading state | Direct fetch without abort; redirect result not verified | **Improve:** shared API client and failure telemetry; **keep** interaction | Low |

### Shared UI

| Component | Purpose | What is good | What is poor / risks | Add / improve / remove | Priority |
|---|---|---|---|---|---|
| AnalysisStepper | Ingestion progress and recoverable errors | Excellent mapping from technical state to action; responsive | 372 lines for a presentation component | Extract error-copy mapper and stage model; keep UI | Low |
| Badge | Semantic label | Reusable variants and sizes | Meaning can be color-dependent at call sites | Require textual/icon cue for status variants | Low |
| Button | Button primitive | `forwardRef`, variants, sizes, focus treatment | No loading contract | Add optional loading/busy API; otherwise keep | Keep |
| Card | Surface primitive | Compact and consistent | Hover semantics depend on consumers | Keep; document interactive vs static card usage | Keep |
| ChangeImpactModal | Impact dialog shell | Strong visual hierarchy and rich view reuse | No label reference, Escape, backdrop close, initial focus, trap, or restore | Replace shell with standard Dialog primitive | High |
| ChangeImpactView | Blast-radius content | Valuable evidence and connected actions | 649 lines; fetch/controller/render mixed; direct fetch | Split data hook/sections; shared client with abort | Medium |
| Chips | Filter/toggle controls | Native buttons and clear selected styling | Needs pressed-state verification across both variants | Add/verify `aria-pressed`; keep primitive | Low |
| CodeViewer | Code display/copy/fullscreen | Line numbers, copy feedback, fullscreen Escape | Copy timer not cleaned up; fullscreen dialog lacks full focus lifecycle | Standard Dialog; clear timers; handle clipboard failure | Medium |
| DiffViewer | Unified/split diff review | Strong task fit and readable change colors | Copy timer not cleaned; large diffs not virtualized | Add virtualization and timer cleanup; keep | Medium |
| EmptyState | Missing-data recovery | Clear icon/headline/action pattern | None material | Keep unchanged | Keep |
| FindingFunnel | Finding disposition visualization | Clear sequence and counts | Needs non-visual relationship explanation | Add concise text summary/ordered list semantics | Low |
| KpiCard | Metric tile | Clear hierarchy and optional trend | Many sibling stat primitives overlap | Consolidate API with StatCard/StatTile/ScoreCard | Low |
| LoadingState | Loading feedback | Correct status semantics and compact reuse | Generic copy can hide page context | Allow heading-preserving skeleton variant | Keep |
| NotFoundPage | Unknown-route recovery | Excellent concise UX | Project query can be reattached by App | Fix App scoping; keep page | Keep |
| Notice | Status/warning/error banner | Semantic roles and variants | None material | Keep unchanged | Keep |
| PageHeader | Standard page heading | Consistent actions and text hierarchy | Duplicates some PageHeroHeader concerns | Clarify compact vs hero usage in component contract | Keep |
| PageHeroHeader | Dark feature hero | Strong visual consistency across views | Can consume too much mobile vertical space | Add compact mobile density option | Keep |
| PipelineStrip | Cross-workflow context | Helpful continuity | Repetitive on every long page | Make sticky/compact after scroll; keep | Low |
| ProgressBar | Progress | Clear label/value semantics | Contains `@ts-ignore` at line 33 | Type CSS custom property properly; remove suppression | Medium |
| ProjectTitle | Project identity | Compact and reusable | None material | Keep unchanged | Keep |
| ReadinessGauge | Score visualization | Strong visual summary | Ensure score/status are not only graphical | Add explicit accessible name/description if absent | Low |
| RiskBadge | Risk label | Text + color and consistent vocabulary | Verify contrast for all levels | Keep after automated contrast test | Keep |
| ScoreCard | Score summary | Clear numeric hierarchy | Overlaps stat primitives | Consolidate design API | Low |
| SearchField | Search with clear and live result count | Excellent semantics, focus return, and feedback | None material | Keep unchanged | Keep |
| SegmentedControl | Exclusive option selection | Correct radiogroup/radio semantics | Arrow-key behavior is not implemented like native radio groups | Add roving focus + arrow keys | Low |
| ShortcutsModal | Keyboard shortcut reference | Escape close and labeled dialog | No initial focus, trap, or trigger restoration | Standard Dialog primitive | High |
| StatCard | Metric summary | Reusable and consistent | Primitive duplication | Consolidate with KpiCard/StatTile | Low |
| StatTile | Clickable/static metric | Adds keyboard role/tab index when clickable | Custom button handling must support Enter/Space consistently | Prefer native button wrapper for interactive mode | Low |
| StatusPill | Service status polling | Polite live status and timeout abort | Deferred status timeout is not tracked/cleared; polling duplicates health behavior | Shared health query; cleanup timeout; single poller | Medium |
| Tags | Tag groups | Good overflow and count handling | Verify contrast/meaning at call sites | Keep | Keep |
| Toast | Global transient feedback | Correct alert/status semantics, max stack, dismiss | Auto-dismiss timers not tracked on provider unmount; errors persist indefinitely without guidance | Track/clear timers; define persistent-error action pattern | Medium |

### Analysis features

| Component/group | Purpose and strengths | Weakness / evidence | Action | Priority |
|---|---|---|---|---|
| ProjectOverviewTab | Repository identity, language/AST metrics, source inventory; runtime view is clear and premium | 700 lines; large lists not virtualized; keyboard behavior of expandable rows not deeply verified | Split inventory; virtualize above a threshold; add keyboard tests | Medium |
| ProjectResultsView | Wrapper for project results | Useful composition but overlaps App orchestration | Reduce pass-through props or retire if redundant | Low |
| TabNavigation | Accessible workspace tabs | Strong roving focus, roles, `aria-selected`, status indicators | Not used as primary desktop navigation in current runtime | Reuse its semantics in AppSidebar or remove duplicate path | Keep |
| SystemPulseTab | Health data fetch and page composition | Clear loading/error model | Direct fetch, no abort, transient heading disappears | Shared query hook + persistent shell | Medium |
| Pulse subcomponents | Health hero/map/dimensions/signals/zones/matrix/actions communicate executive health very well | Map/cards/matrix duplicate some metrics; dense on mobile; formulas require modal | Keep hero/actions; collapse secondary evidence by default; standard dialog | Medium |
| ExplanationTab | Architecture explanation coordinator | Broad coverage and graceful optional sections | 866 lines and extensive derived logic; many `any` contracts | Create typed `ExplanationViewModel`; extract query/normalization | High |
| Explanation subcomponents | Overview, layers, hotspots, diagnostics, playbook, modules provide traceable evidence | `ArchitectureOverviewCard` is 530 lines; several props are `any`; module list 457 lines | Type all props; split cards/tables; virtualize module list | Medium |
| HotspotsTab | Fetch/filter/sort/rank risk | Strongest decision-support UX | Long-list performance not verified | Keep structure; virtualize and URL-persist filters | Medium |
| Hotspot subcomponents | KPI grid, top showcase, row cards, badges | Excellent score explainability and hierarchy | Row card 354 lines; repeated badge implementations (`common/RiskBadge` vs hotspot badges) | Consolidate badges; split row details | Medium |
| DependencyGraphTab | React Flow graph/list/filters/export | Runtime-confirmed functional and visually strong | 1,014 lines, many `any`, mixed query/layout/interactions; large vendor chunk | Lazy-load entire route; extract toolbar/controller/export and strongly type events | High |
| Graph subcomponents | Inspector, legend, list, node, unresolved diagnostics | Clear supporting IA and list fallback | Unresolved modal lacks full focus lifecycle; inspector 388 lines | Standard dialog; split inspector sections; keep list fallback | High |
| NeuralMapPage | Canvas page orchestration | Only major route already lazy-loaded; runtime rendering successful | Dense mobile control surface; search/filter/state all local | Preserve lazy boundary; make mobile “Explore/List” modes explicit | Medium |
| ForceGraphCanvas | Custom force-directed visualization | Distinctive, performant enough for demo; resize/wheel/key cleanup exists | 1,295 lines; canvas is inherently weak for screen readers; numerous responsibilities | Split drawing, hit-testing, input, overlays; synchronized accessible list; worker/offscreen evaluation for scale | High |
| NeuralMapControls/Legend/SelectedNodePanel | Rich exploration controls and evidence | Good coverage of modes and connected views | Many small touch targets; clipboard failure uncaught; dense two-row toolbar | Larger mobile targets; overflow menu; catch clipboard failure | Medium |
| CommandPaletteModal | Searchable keyboard command surface | Best dialog interaction implementation; Escape and keyboard selection | Still lacks focus trap/trigger restoration | Move to standard Dialog while preserving keyboard model | Medium |
| ArchitectureTourModal | Guided visualization onboarding | Useful staged explanation | No Escape/focus lifecycle | Standard Dialog and focus step headings | High |
| PathTracingModal | Shortest dependency path | Valuable feature and clear preview | **Confirmed defect:** `setSourceId` inside `useMemo`; no Escape/focus lifecycle; close icon lacks accessible name | Replace `useMemo` with `useEffect`; standard Dialog; label close button | High |
| graphDataAdapter | Converts canonical graph to visual model | Deterministic, tested, cohesive | 743 lines; classification heuristics are bundled with mapping | Split normalization/classification/path algorithms; retain tests | Low |
| useForceSimulation | D3 simulation lifecycle | Cleanup cancels frame and visibility listener; tested at 0–500 nodes | Main-thread scale beyond 500 not verified | Add performance marks and worker experiment only if real data warrants | Low |
| GeneratedTestsTab | Test results/generation/download controller | Excellent static-vs-runtime communication | 728 lines; 750 ms polling loop lacks abort/stale guard | Extract query/generation hook with AbortController and bounded state machine | High |
| Tests subcomponents | Coverage summary, selected test, scoped download | Strong task hierarchy and export choices | Download dialog has no Escape/focus lifecycle; `relatedRefactor: any` | Standard dialog and typed relation | High |
| RefactoredCodeTab | Candidate review, verification and download | Useful transparent diff workflow | 761 lines; direct async paths and multiple `any` catches | Extract data/action hooks; lazy-load diff; consistent errors | High |
| Modernization subcomponents | Summary, pipeline, candidate review/disposition, rules | Clear guarded transformation model | Review panel 547 lines; rules dialog lacks focus lifecycle; `any[]` relations | Split review tabs, type relations, standard dialog | Medium |
| MigrationPlanTab | Readiness/waves/impact/export | Runtime page is polished and decision-oriented | 820 lines; direct cache-busting fetch; extreme mobile length | Extract query/controller; mobile index; shared client | High |
| Migration subcomponents | Summary, ripple, priority, dimensions, formula, waves | Excellent executive communication and connected views | Formula modal lacks focus lifecycle; graphics need text alternatives; some cards long | Standard dialog; concise accessible summaries; collapsible mobile sections | High |

### Landing components

| Component | Purpose / good | Poor / risks | Add / improve / remove | Priority |
|---|---|---|---|---|
| LandingPage | Composes complete marketing story; sections are coherent individually | Aggregate page is excessively long and mounts many animated sections | Remove/merge redundant sections; keep a shorter evidence narrative | High |
| LandingNavbar | Sticky navigation and mobile menu | Button-based pseudo-links reduce native link affordances; scroll listener per page | Use anchors/routes for navigational destinations; retain sticky shell | Medium |
| HeroSection | Value proposition + repository composer | Strongest brand moment and clear CTAs | 839 lines, 100 hex colors, timers/scroll/input/progress in one component | Split hero art, composer, progress; tokenise; keep visual identity | High |
| ProductRevealSection | Product evidence preview | Attractive reveal and reduced-motion check | Extra resize/scroll listeners and 87 color literals | Reuse shared scroll hook/tokens; consider merging with MainProductStory | Medium |
| ProblemSection | Frames four risk vectors | Clear problem articulation | Each card owns an IntersectionObserver; repeated risk language later | Use one observer/stagger manager; shorten copy | Medium |
| MainProductStory | Seven-stage interactive sequence | Strong end-to-end mental model | 483 lines, 126 color literals, timers require careful cleanup | Keep sequence, reduce ornamental detail, split stage data/render | High |
| RiskSection | Explainable risk scoring | Highly persuasive and grounded | Some animated numeric state initially reads as zero to accessibility snapshot | Render final accessible value separately; keep visual | Low |
| ProtectionSection | Verification ladder | Excellent differentiation of generated vs executed tests | Minor repetition with Trust section | Keep, trim duplicate trust copy | Keep |
| ModernizationSection | Six-step guarded modernization | Useful and interactive | Overlaps MainProductStory; 356 lines and timers | Merge into product story or reduce to one focused transformation example | Medium |
| ImpactSimulationSection | Blast-radius simulator | Excellent concrete interaction and evidence | Simulation timeout is not tracked/cleared | Clear timer; keep feature | Low |
| MigrationRoadmapSection | Wave-based plan | Excellent sequence and action model | Manual-override timeout not tracked/cleared | Clear timer; keep feature | Low |
| CapabilityBento | Feature summary | Strong visual scanability | Repeats content already demonstrated; 76 color literals | Reduce to 4 highest-value capabilities or remove | Medium |
| TrustSection | Engineering principles | Important product differentiation | Followed by another trust manifesto, creating repetition | Merge with manifesto into one “Evidence & boundaries” section | Low |
| FactStrip | Scale metrics | Compact proof | Animated counters expose zero during initial snapshot and repeat claims | Ensure final value is accessible; shorten/remove if redundant | Low |
| AudienceSection | Personas | Clear targeting | Five cards extend an already long page | Compress to three primary personas or horizontal compact list | Low |
| FaqSection | Objection handling | Strong native button accordion and useful answers | Twelve items add length | Keep but group/search or show six + expand | Keep |
| FinalCtaSection | Conversion close | Clear and well timed conceptually | Page fatigue reduces its effectiveness | Keep after shortening earlier page | Keep |
| LandingFooter | Utility navigation and repository link | Complete, responsive, safe external-link rel | Internal destinations are buttons rather than links | Use semantic anchors; keep visual design | Keep |

## 5. Bugs and Technical Issues

| ID | Severity | Status | Evidence / reproduction | Recommended fix |
|---|---|---|---|---|
| FE-01 | **Critical accessibility** | Runtime + source confirmed | At 375×667 with drawer visually closed, the accessibility tree still exposed Analyze, all nine workspace destinations, project, auth, status and collapse controls. Drawer is translated off-screen but not inert/hidden (`AppSidebar.tsx:391-407`). | When closed below `lg`, set `inert`, `aria-hidden=true`, and remove focusability; when open, trap focus, focus close/first item, and restore trigger focus. |
| FE-02 | High | Source confirmed | Six dialog files have no Escape listener; all nine lack a shared complete focus lifecycle. Examples: `ChangeImpactModal.tsx:30`, `ReadinessFormulaModal.tsx:20`, `PathTracingModal.tsx:52`, `TestDownloadModal.tsx:28`. | Create one accessible Dialog primitive with label/description, Escape, backdrop policy, initial focus, trap, scroll lock, and focus restoration. |
| FE-03 | High | Source confirmed | `PathTracingModal.tsx:21-24` uses `useMemo(() => setSourceId(...))`. This performs state mutation during render and can produce React warnings or render loops as props change. | Replace with `useEffect`; initialize state when opening and validate source/target when node sets change. |
| FE-04 | High | Source confirmed | `App.tsx:488-499` calls `navigateTo` during render for authenticated auth routes. | Return a redirect component/effect or route guard that navigates after commit. |
| FE-05 | High | Build confirmed | Vite warns about the 696.75 kB minified main chunk; large tabs are eagerly imported in `App.tsx:6-13`. | Lazy-load each workspace feature and heavy diff/graph subviews; create stable vendor chunks; measure route-level budgets. |
| FE-06 | High | Source-confirmed risk | Background graph/refactor fetches in `App.tsx:298-319` and multiple feature fetches have no abort/stale response guard. Switching projects can allow an old response to update status. | Abort on dependency change/unmount and compare request/project token before committing. |
| FE-07 | High | Runtime confirmed | E2E commands stalled before tests began; no results. | Diagnose Playwright `webServer` startup under CI/Windows; emit Vite logs; add a CI timeout and `--reporter=line`; avoid relying on `reuseExistingServer` in CI. |
| FE-08 | Medium | Runtime confirmed | Landing document height measured 21,679 px desktop and 23,806 px mobile. | Merge/remove repeated sections and set a content budget; validate conversion and time-to-intake. |
| FE-09 | Medium | Static confirmed | 1,312 literal hex occurrences across 40 component files; top offenders include `MainProductStory` 126, `HeroSection` 100, `ProductRevealSection` 87. | Extend semantic tokens for marketing/auth/canvas surfaces; ban new literal colors with linting. |
| FE-10 | Medium | Runtime + source confirmed | Project URL sync reattached `?project=...` to `/signin`, `/register`, and the unknown route during audit (`App.tsx:261-275`). | Only persist/synchronize project parameters when `currentRoute === '/workspace'`; clear irrelevant params on public/auth routes. |
| FE-11 | Medium | Source confirmed | Manual polling in `GeneratedTestsTab.tsx:239-256` waits with an uncancelled promise and may continue after unmount/project change. | Use AbortController plus a cancellable polling hook and active job token. |
| FE-12 | Medium | Source confirmed | Copy helpers in `DependencyGraphTab.tsx:486-490` and `SelectedNodePanel.tsx:44-47` do not await/catch clipboard failure but announce success. | Await clipboard write; show success only after resolution and an actionable failure toast otherwise. |
| FE-13 | Medium | Source confirmed | `ProgressBar.tsx:33` uses `@ts-ignore` for a CSS custom property. | Use `React.CSSProperties & Record<'--progress', string>` or a typed style helper. |
| FE-14 | Medium | Runtime measured | Many interactive targets were under 44×44 px: 43 of 78 desktop landing interactives; 52 visible targets on mobile Neural Map were below at least one 44 px dimension. | Adopt 44 px primary touch targets and at least WCAG 2.2 24 px minimum/spacing for compact controls; consolidate Neural controls into menus on mobile. |
| FE-15 | Low | Source-confirmed risk | Several feedback timers are not retained/cleared (`DependencyGraphTab.tsx:489`, `CodeViewer.tsx:93`, `DiffViewer.tsx:63`, `StatusPill.tsx:24`, `Toast.tsx:31`, landing sections). | Store timer IDs and clear on unmount/retrigger. |
| FE-16 | Low | Runtime confirmed | Sign-in/register desktop composition contains two H1 elements (`AuthVisualPanel.tsx:55` plus page H1). | Make visual-panel headline an H2 or styled paragraph. |

### Confirmed clean areas

- No `dangerouslySetInnerHTML`, `eval`, or `new Function` use was found.
- External GitHub link uses `target="_blank"` with `rel="noopener noreferrer"`.
- Reduced-motion handling exists globally and in scroll hooks; motion is substantially disabled under `prefers-reduced-motion`.
- Event/observer cleanup exists in the force simulation, canvas resize/wheel/key handlers, scroll hooks, and main navigation listeners.
- Runtime inspection produced no browser console warnings/errors on the audited deployed flows.

## 6. Add / Improve / Remove

### ADD

- A shared accessible Dialog/Drawer primitive and automated keyboard/focus tests.
- Route-level Suspense skeletons that preserve page heading/context.
- Abortable project-scoped query hooks with stale-response protection and request deduplication.
- Route-level performance budgets and bundle analysis in CI.
- Accessible list/table equivalents synchronized with canvas selections.
- Mobile sticky section navigation for Pulse and Migration.
- Large-list virtualization for source files, hotspots, module explanations, tests, and candidate lists.
- Automated axe/ARIA checks plus contrast and target-size checks.

### IMPROVE

- Split all components above roughly 400–500 lines into controller, view model, and presentation pieces.
- Replace `any` in graph, explanation, modernization, test and API error contracts.
- Tokenize marketing/auth/Neural Map colors and document allowed intentional exceptions.
- Use semantic anchors for true navigation and preserve native link behavior.
- Make route changes update document title, move focus to the page H1, and announce loading completion.
- Consolidate status/KPI primitives and duplicate health polling.
- Shorten landing content while preserving the current identity and strongest evidence sections.

### REMOVE

- Render-time navigation and render-time state mutation.
- Duplicate/superseded navigation and status components after dependency confirmation.
- Redundant landing sections/copy, especially duplicated trust, capability, modernization, and metric claims.
- Untracked feedback timers and direct `fetch` variants where the shared API/query layer can handle errors and cancellation.
- New hardcoded palette values outside the design-token layer.

### KEEP

- The warm neutral + indigo brand system, dark feature headers, mono evidence labels, and confidence language.
- Overview, Hotspots, Graph/Neural duality, and Migration’s executive hierarchy.
- SearchField, Button, Card, Notice, EmptyState, PageHeroHeader, TabNavigation, and the core risk/readiness visual language.
- The explicit distinction between static validation and runtime verification.

## 7. Priority-Based Improvement Roadmap

| Priority | Task | Affected files | Approach | Effort | Expected impact | Dependencies |
|---|---|---|---|---:|---|---|
| P0 | Hide/inert closed mobile drawer and implement correct open-drawer focus | `AppSidebar.tsx`, App trigger | Add `inert`, responsive `aria-hidden`, trap/restore focus; Playwright keyboard tests | 1–2 d | Removes a critical navigation/accessibility defect | None |
| P0 | Fix render-phase state/navigation | `PathTracingModal.tsx`, `App.tsx` | `useEffect` for prop synchronization and post-commit redirects | 0.5 d | Eliminates React lifecycle instability | None |
| P0 | Establish shared Dialog primitive | Nine dialog/modal files | Build one primitive; migrate all modals; test Escape, Tab loop, label, restore | 2–4 d | Large accessibility and consistency gain | P0 drawer patterns can share focus utilities |
| P0 | Restore deterministic E2E execution | `playwright.config.ts`, E2E specs, CI | Diagnose server startup; capture logs; fail fast; run accessibility/responsive suite in CI | 1–2 d | Restores release confidence | Environment/CI access |
| P1 | Route-level code splitting | `App.tsx`, large tabs | Lazy-load all analysis routes; split graph/diff vendors; inspect bundle | 2–3 d | Lower initial JS and faster interaction readiness | Stable loading skeletons |
| P1 | Abortable project-scoped query layer | `App.tsx`, hooks, feature tabs, services | Shared `fetchJson` signal/error contract; dedupe/cache by project; stale token guard | 3–5 d | Prevents races and cuts redundant requests | API contract inventory |
| P1 | Break up largest components | ForceGraph, Graph, Explanation, Hero, Migration, App, Tests, Refactor | Extract controllers, typed view models, section components | 5–10 d | Major maintainability and testability improvement | Query layer first |
| P1 | Shorten landing page | `landing/*` | Merge sections; preserve Hero → Risk → Protection → Impact → Roadmap → FAQ → CTA | 2–4 d | Better comprehension, conversion, and runtime cost | Product/content approval |
| P1 | Accessible canvas alternatives + touch controls | Neural Map, Graph controls/list | Synchronized table; larger targets; mobile list default; overflow menu | 3–5 d | Makes flagship visualization usable beyond mouse desktop | Dialog/control primitives |
| P2 | Design-token consolidation | `index.css`, Tailwind config, landing/auth/Neural components | Add semantic marketing/dark-canvas tokens; replace literals incrementally; lint rule | 3–6 d | Reduces drift and makes theming safer | Design sign-off |
| P2 | Consolidate primitives and health polling | KPI/stat/score components, HealthIndicator/StatusPill | One metric-card family and one health query | 1–2 d | Less duplication and network churn | Query layer |
| P2 | Virtualize long collections | Overview, hotspots, explanation, tests, refactor | Threshold-based windowing with accessible list semantics | 3–5 d | Reliable large-repository performance | Realistic fixture |
| P2 | Route focus/title and semantic links | router utility, nav/footer/auth | Focus H1 after route change, unique titles, anchor semantics | 1–2 d | Better keyboard/screen-reader UX and browser behavior | None |
| P3 | Optional motion/perf polish | landing hooks/sections | Share observers; pause offscreen decorative effects; performance marks | 2–3 d | Incremental smoothness and battery improvement | After content reduction |
| P3 | Optional advanced graph scaling | force simulation/canvas | Profile 1k–5k nodes; worker/offscreen only if budgets fail | 3–6 d | Future-proofing without premature complexity | Large benchmark data |

## 8. Final Professional Verdict

### Is the frontend production-ready?

**For a public demo or controlled beta: yes, with monitoring. For a broad enterprise production release: not yet.** Functional quality is better than the raw score might imply—the build, unit suite, live rendering, responsive layout, and visual system are strong. The remaining blockers are concentrated and fixable: mobile drawer accessibility, dialogs, render-time side effects, stale network work, code splitting, and reliable E2E execution.

### Weakest components

1. `ForceGraphCanvas` — flagship value but too large, canvas-heavy, and inaccessible without a synchronized alternative.
2. `PathTracingModal` — render-phase state mutation plus incomplete dialog behavior.
3. `AppSidebar` mobile drawer — visually correct but accessibility state is wrong when closed.
4. `App` / WorkspaceContent — over-centralized orchestration with render-time navigation and URL/request coupling.
5. `ExplanationTab` / `DependencyGraphTab` — strong UI, weak maintainability due size and loose typing.

### Pages needing redesign vs refinement

- **Needs structural redesign:** Landing page content architecture only—not the brand. It should be substantially shorter.
- **Needs responsive interaction redesign:** Neural Map controls and mobile Dependency Graph default experience.
- **Needs refinement, not redesign:** Sign-in/register heading structure; System Pulse length; Migration mobile navigation.
- **Should remain visually unchanged:** Project Overview, Top Hotspot showcase, Migration executive summary, shared PageHeroHeader language, Notices, Empty/Loading states.

### Five highest-impact improvements

1. Build and migrate to one accessible Dialog/Drawer foundation.
2. Route-split all analysis views and reduce the initial main bundle.
3. Create an abortable, typed, project-scoped data layer.
4. Shorten the landing page by merging redundant evidence sections.
5. Split the 700–1,295-line feature components and eliminate `any` at their boundaries.

### Fix order

1. **First:** mobile drawer accessibility + `PathTracingModal`/render-time navigation defects.
2. **Second:** shared dialog lifecycle + reliable E2E/axe coverage.
3. **Third:** route code splitting and abortable query architecture, then component decomposition.

No implementation should begin until this audit is approved, per the request.
