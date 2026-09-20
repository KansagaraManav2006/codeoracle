export interface HealthResponse {
  status: string;
  app_name: string;
  version: string;
  environment?: string;
}

export type JobState = 'queued' | 'extracting' | 'analyzing' | 'generating' | 'completed' | 'failed';

export interface JobResponse {
  job_id: string;
  state: JobState;
  stage: string;
  progress_percentage: number;
  source_type: string;
  source_url?: string | null;
  project_id?: string | null;
  message?: string | null;
  error_code?: string | null;
  error_message?: string | null;
  polling_url: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectMetadataResponse {
  project_id: string;
  display_name: string;
  source_type: string;
  source_url?: string | null;
  detected_languages: string[];
  total_files: number;
  total_lines: number;
  content_hash: string;
  created_at: string;
}

export interface ProjectFileResponse {
  file_id: string;
  relative_path: string;
  language: string;
  size_bytes: number;
  line_count: number;
  sha256_hash: string;
}

export interface ProjectFilesListResponse {
  project_id: string;
  total_files: number;
  files: ProjectFileResponse[];
}

export type TabType = 'explanation' | 'hotspots' | 'graph' | 'tests' | 'refactor' | 'migration';

export interface HotspotFactors {
  complexity_raw: number;
  complexity_score: number;
  loc_raw: number;
  loc_score: number;
  fan_in_raw: number;
  fan_in_score: number;
  warnings_raw: number;
  warnings_score: number;
  blast_radius_raw: number;
  blast_radius_score: number;
}

export interface HotspotItem {
  file: string;
  hotspot_score: number;
  score_mode: 'static' | string;
  complexity: number;
  complexity_rating: string;
  lines_of_code: number;
  dependency_fan_in: number;
  warnings_count: number;
  blast_radius: number;
  transitive_dependents: string[];
  direct_dependents: string[];
  is_partially_parsed?: boolean;
  risk_level: 'critical' | 'high' | 'medium' | 'low';
  reason: string;
  recommended_action: string;
  score_factors: HotspotFactors;
}

export interface HotspotsResponse {
  project_id: string;
  project_name: string;
  score_mode: 'static' | string;
  total_files: number;
  hotspots: HotspotItem[];
  recommended_start_file?: string | null;
  recommended_start_reason?: string | null;
  summary: {
    highest_score?: number;
    critical_count?: number;
    high_count?: number;
    total_evaluated?: number;
    scoring_engine?: string;
  };
}

export type IngestionMode = 'zip' | 'github';

export interface ReadinessCategory {
  key: string;
  label: string;
  score: number;
  status: string;
  reason: string;
}

export interface ChecklistItem {
  id: string;
  task: string;
  target_file?: string | null;
  action_type: 'test' | 'refactor' | 'cycle_decouple' | 'entry_verify' | string;
  completed?: boolean;
}

export interface ScoreBlocker {
  category_key: string;
  label: string;
  current_score: number;
  target_file?: string | null;
  blocker_reason: string;
  unblocking_action: string;
}

export interface ChangeImpact {
  module_id: string;
  relative_path: string;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  blast_radius: number;
  direct_blast_radius?: number;
  transitive_blast_radius?: number;
  dependency_depth: number;
  wave?: number;
  wave_title?: string;
  is_cycle_participant?: boolean;
  is_score_blocker?: boolean;
  direct_dependents: string[];
  transitive_dependents: string[];
  direct_dependencies: string[];
  affected_entry_points: string[];
  cycles?: string[][];
  suggested_tests: string[];
  reasons: string[];
  risk_evidence?: string[];
  recommended_action?: string;
}

export interface MigrationPhase {
  phase: number;
  title: string;
  goal: string;
  risk_level: string;
  files: string[];
  actions: string[];
}

export interface MigrationWave {
  wave: number;
  name: string;
  title: string;
  goal: string;
  strategy: string;
  risk_level: 'low' | 'medium' | 'high' | 'critical' | string;
  files: string[];
  total_direct_dependents: number;
  total_transitive_blast_radius: number;
  affected_entry_points: string[];
  suggested_test_order: string[];
  checklist: ChecklistItem[];
}

export interface MigrationPlanResponse {
  project_id: string;
  readiness_score: number;
  readiness_label: string;
  executive_summary: string;
  first_action_summary?: string;
  categories: ReadinessCategory[];
  score_blockers?: ScoreBlocker[];
  top_priorities: ChangeImpact[];
  impacts: ChangeImpact[];
  phases: MigrationPhase[];
  waves?: MigrationWave[];
  findings: Finding[];
  finding_funnel: FindingFunnel;
}

// --- Deterministic Analysis Interfaces ---

export interface ParameterInfo {
  name: string;
  default?: string | null;
  annotation?: string | null;
}

export interface WarningInfo {
  code: string;
  message: string;
  line?: number | null;
  severity: 'warning' | 'risk' | 'info';
}

export interface Finding {
  id: string;
  rule_id: string;
  file: string;
  line?: number | null;
  severity: 'info' | 'warning' | 'risk' | 'critical';
  category: string;
  message: string;
  evidence: string;
  confidence: 'static' | 'estimated' | 'verified';
  autofixable: boolean;
  has_diff: boolean;
  verified: boolean;
  related_dependencies: string[];
  suggested_tests: string[];
}

export interface FindingFunnel {
  total_findings: number;
  modernization_candidates: number;
  autofixable_findings: number;
  generated_diffs: number;
  verified_changes: number;
  estimated_findings: number;
  verification_label: string;
}

export interface ComplexitySummary {
  cyclomatic_complexity: number;
  rating: 'low' | 'medium' | 'high' | 'critical';
  hotspots_count: number;
}

export interface SymbolExplanation {
  summary: string;
  inputs_summary: string;
  returns_summary: string;
  side_effects: string;
  uncertainty_label?: string | null;
}

export interface SymbolInfo {
  symbol_id: string;
  kind: 'class' | 'function' | 'method' | 'constructor' | 'variable';
  name: string;
  qualified_name: string;
  parameters: ParameterInfo[];
  return_annotation?: string | null;
  decorators: string[];
  is_async: boolean;
  docstring?: string | null;
  start_line: number;
  end_line: number;
  direct_calls: string[];
  complexity: number;
  legacy_warnings: WarningInfo[];
  explanation?: SymbolExplanation | null;
}

export interface ImportInfo {
  module_name: string;
  imported_symbols: string[];
  is_relative: boolean;
  source_line: number;
  import_kind?: string;
}

export interface ExportInfo {
  name: string;
  kind: string;
  source_line: number;
}

export interface ModuleExplanation {
  responsibility: string;
  classes_functions_summary: string;
  dependencies_summary: string;
  entry_point_indicator: string;
  warnings_summary: string;
}

export interface ModuleAnalysis {
  module_id: string;
  relative_path: string;
  language: string;
  line_count: number;
  parse_status: 'complete' | 'partial' | 'failed';
  parse_errors: string[];
  imports: ImportInfo[];
  exports: ExportInfo[];
  classes: SymbolInfo[];
  functions: SymbolInfo[];
  variables: SymbolInfo[];
  is_entry_point: boolean;
  complexity: ComplexitySummary;
  legacy_warnings: WarningInfo[];
  explanation?: ModuleExplanation | null;
  start_line: number;
  end_line: number;
}

export interface DependencyEdge {
  edge_id: string;
  source_module_id: string;
  target_module_id: string;
  type: string;
  resolved: boolean;
  source_line: number;
}

export interface ProjectExplanation {
  languages_summary: string;
  entry_points_summary: string;
  major_modules_summary: string;
  dependencies_summary: string;
  architectural_observations: string[];
  complexity_hotspots: string[];
  legacy_risks: string[];
  parse_limitations: string[];
}

export interface ProjectAnalysis {
  project_id: string;
  analyzer_version: string;
  content_hash: string;
  analyzed_at: string;
  languages: string[];
  total_files: number;
  total_lines: number;
  modules: ModuleAnalysis[];
  dependency_edges: DependencyEdge[];
  entry_points: string[];
  project_warnings: WarningInfo[];
  findings: Finding[];
  finding_funnel: FindingFunnel;
  parse_success_count: number;
  parse_partial_count: number;
  parse_failure_count: number;
  analysis_duration_ms: number;
  cache_status: 'hit' | 'miss' | 'forced';
  explanation?: ProjectExplanation | null;
}

// --- Dependency Graph Interfaces ---

export interface GraphNodeData {
  id: string;
  label: string;
  language: string;
  kind: string;
  parse_status?: string | null;
  line_count: number;
  complexity_score: number;
  complexity_rating: string;
  warning_count: number;
  is_entry_point: boolean;
  is_external: boolean;
  symbol_count: number;
  module_id?: string | null;
  standalone_reason?: string | null;
}

export interface GraphEdgeData {
  id: string;
  source: string;
  target: string;
  type: string;
  resolved: boolean;
  source_line: number;
  is_type_only?: boolean;
  is_dynamic?: boolean;
}

export interface MostConnectedModule {
  module_id: string;
  label: string;
  total_degree: number;
  in_degree: number;
  out_degree: number;
}

export interface GraphSummary {
  total_nodes: number;
  internal_nodes: number;
  external_nodes: number;
  total_edges: number;
  internal_edges: number;
  external_edges: number;
  cycle_count: number;
  runtime_cycle_count?: number;
  type_cycle_count?: number;
  orphan_count: number;
  entry_point_count: number;
  high_complexity_module_count: number;
  most_connected_modules: MostConnectedModule[];
  truncated_edges_count: number;
}

export interface GraphResponse {
  project_id: string;
  level: 'module' | 'symbol';
  nodes: GraphNodeData[];
  edges: GraphEdgeData[];
  cycles: string[][];
  entry_point_ids: string[];
  orphan_module_ids: string[];
  summary: GraphSummary;
}

// --- Generated Test Interfaces ---

export interface GeneratedTestFile {
  test_id: string;
  target_relative_path: string;
  language: 'python' | 'javascript';
  framework: 'pytest' | 'vitest';
  safe_test_path: string;
  code: string;
  generation_strategy: string;
  test_category: string;
  test_categories?: string[];
  covered_symbols: string[];
  is_import_only: boolean;
  protection_type: string;
  syntax_valid: boolean;
  syntax_error_message?: string | null;
  execution_status: 'not_run' | 'passed' | 'failed' | 'timed_out' | 'unavailable';
  test_count: number;
  execution_output?: string | null;
  line_coverage?: number | null;
  covered_lines: number[];
  uncovered_lines: number[];
  warnings: string[];
}

export interface ProjectTestResult {
  project_id: string;
  generation_version: string;
  generated_at: string;
  status: string;
  frameworks: string[];
  test_files: GeneratedTestFile[];
  target_source_files: number;
  total_generated_tests: number;
  syntax_valid_count: number;
  executed_test_count: number;
  passed_test_count: number;
  failed_test_count: number;
  overall_line_coverage?: number | null;
  per_file_coverage: Record<string, number | null>;
  execution_enabled: boolean;
  execution_warning?: string | null;
  generation_duration_ms: number;
  execution_duration_ms: number;
  iteration_count: number;
  protected_files?: string[];
  unprotected_files?: string[];
  category_counts?: Record<string, number>;
  is_measured?: boolean;
}

// --- Refactor Proposal Interfaces ---

export interface RefactorWarning {
  code: string;
  severity: 'info' | 'warning' | 'risk';
  message: string;
  line?: number | null;
  breaking_change: boolean;
}

export interface RefactoredFile {
  relative_path: string;
  language: 'python' | 'javascript';
  original_code: string;
  refactored_code: string;
  unified_diff: string;
  changes: string[];
  warnings: RefactorWarning[];
  syntax_valid: boolean;
  syntax_error?: string | null;
  changed: boolean;
}

export interface ProjectRefactorResult {
  project_id: string;
  engine_version: string;
  generated_at: string;
  status: string;
  files: RefactoredFile[];
  analyzed_files: number;
  changed_files: number;
  total_changes: number;
  breaking_warning_count: number;
  safe_to_apply_automatically: boolean;
  summary: string;
  findings: Finding[];
  finding_funnel: FindingFunnel;
  verification?: RefactorVerificationResult | null;
}

export interface TestExecutionComparison {
  total_tests: number;
  passed_tests: number;
  failed_tests: number;
  line_coverage?: number | null;
  execution_status: string;
}

export interface VerificationMetricsComparison {
  readiness_before: number;
  readiness_after: number;
  readiness_delta: number;
  cycles_before: number;
  cycles_after: number;
  new_cycles: number;
  warnings_before: number;
  warnings_after: number;
  resolved_warnings_count: number;
  resolved_warnings: string[];
}

export interface RefactorVerificationResult {
  project_id: string;
  verification_version: string;
  verified_at: string;
  status: 'verified' | 'failed' | 'safety_locked' | 'no_changes' | string;
  verified: boolean;
  can_execute: boolean;
  execution_warning?: string | null;
  syntax_status: 'passed' | 'failed' | string;
  syntax_errors: string[];
  changed_files: string[];
  baseline_tests: TestExecutionComparison;
  after_tests: TestExecutionComparison;
  metrics: VerificationMetricsComparison;
  verification_summary: string;
}
