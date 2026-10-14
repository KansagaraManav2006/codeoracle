import {
  RefactoredFile,
  ProjectRefactorResult,
  ProjectTestResult,
  HotspotItem,
  ChangeImpact,
  CandidateFileStatus,
  CandidateDisposition,
  GeneratedTestFile,
} from '../types';

export interface FileMetadata {
  status: CandidateFileStatus;
  candidateType: string;
  disposition: CandidateDisposition;
  findingsCount: number;
  modFindingsCount: number;
  hasDiff: boolean;
  matchingTest?: GeneratedTestFile;
  matchingHotspot?: HotspotItem;
  confidence: 'high' | 'medium' | 'low';
  confidenceChecks: { passed: boolean; label: string }[];
  blastRadius: number;
}

export function computeFileMetadata(
  file: RefactoredFile,
  result: ProjectRefactorResult | null,
  testsResult: ProjectTestResult | null,
  hotspots: HotspotItem[],
  selectedPath?: string,
  activeImpact?: ChangeImpact | null
): FileMetadata {
  const sel = file.relative_path.toLowerCase();
  const findings = (result?.findings || []).filter((f) => {
    const fFile = f.file.toLowerCase();
    return fFile === sel || fFile.endsWith(sel) || sel.endsWith(fFile);
  });
  const modFindings = findings.filter((f) => f.category === 'modernization');
  const hasDiff = Boolean(file.changed && file.unified_diff && file.unified_diff.trim().length > 0);
  const matchingTest = testsResult?.test_files?.find((t) => {
    const tTarget = t.target_relative_path.toLowerCase();
    return tTarget === sel || tTarget.endsWith(sel) || sel.endsWith(tTarget);
  });
  const matchingHotspot = hotspots.find((h) => {
    const hFile = (h.filePath || h.file || '').toLowerCase();
    return hFile === sel || hFile.endsWith(sel) || sel.endsWith(hFile);
  });

  // Status
  let status: CandidateFileStatus = 'CLEAN';
  if (file.changed) {
    if (result?.verification?.verified) {
      status = 'RUNTIME VERIFIED';
    } else if (file.syntax_valid) {
      status = 'STATIC VALID';
    } else {
      status = 'DIFF READY';
    }
  } else if (modFindings.some((f) => f.autofixable)) {
    status = 'AUTOFIX ELIGIBLE';
  } else if (modFindings.length > 0) {
    if (!matchingTest || !file.syntax_valid) {
      status = 'BLOCKED';
    } else {
      status = 'MANUAL REVIEW';
    }
  } else if (findings.length > 0) {
    status = 'FINDINGS';
  } else {
    status = 'CLEAN';
  }

  // Candidate type classification
  let candidateType = 'Structural audit';
  if (file.changed) {
    candidateType = 'Deterministic rule diff';
  } else if (matchingHotspot?.overallRisk === 'critical') {
    candidateType = 'High-complexity service refactor';
  } else if (
    modFindings.some(
      (f) =>
        f.rule_id?.includes('XRANGE') ||
        f.rule_id?.includes('PRINT') ||
        f.rule_id?.includes('VAR')
    )
  ) {
    candidateType = 'Legacy syntax modernization';
  } else if (
    modFindings.some(
      (f) => f.rule_id?.includes('ITER') || f.rule_id?.includes('UNICODE')
    )
  ) {
    candidateType = 'Deprecated API modernization';
  } else if (modFindings.some((f) => f.rule_id?.includes('CYCLE'))) {
    candidateType = 'Dependency coupling decoupling';
  } else if (modFindings.length > 0) {
    candidateType = 'Modernization candidate';
  } else {
    candidateType = 'Clean / Unchanged';
  }

  // Candidate rejection disposition (when no diff)
  let disposition: CandidateDisposition = 'already_modern';
  if (file.changed) {
    disposition = 'manual_review';
  } else if (!file.syntax_valid || file.syntax_error) {
    disposition = 'insufficient_parse_confidence';
  } else if (modFindings.length > 0 && !matchingTest) {
    disposition = 'missing_protection';
  } else if (
    (matchingHotspot?.graph?.blastRadius ?? matchingHotspot?.blast_radius ?? 0) > 4
  ) {
    disposition = 'high_blast_radius';
  } else if (
    findings.some((f) => f.rule_id?.includes('EVAL') || f.rule_id?.includes('EXEC'))
  ) {
    disposition = 'dynamic_behavior';
  } else if (modFindings.length > 0 && !modFindings.some((f) => f.autofixable)) {
    disposition = 'unsupported_transform';
  } else if (modFindings.length > 0) {
    disposition = 'manual_review';
  } else {
    disposition = 'already_modern';
  }

  // Modernization confidence evaluation
  let confidenceScore = 3; // Baseline medium
  const checks: { passed: boolean; label: string }[] = [];

  if (file.syntax_valid) {
    confidenceScore += 1;
    checks.push({ passed: true, label: 'Full AST parsed' });
  } else {
    confidenceScore -= 2;
    checks.push({ passed: false, label: 'Partial parse or syntax warning' });
  }

  if (file.changed && (file.applied_rule_ids?.length || file.changes?.length)) {
    confidenceScore += 2;
    checks.push({ passed: true, label: 'Deterministic rule match' });
  } else if (modFindings.length > 0) {
    checks.push({ passed: false, label: 'Structural refactor (manual rule)' });
  }

  if (matchingTest) {
    confidenceScore += 1;
    checks.push({ passed: true, label: 'Safety protection tests available' });
  } else if (modFindings.length > 0) {
    confidenceScore -= 1;
    checks.push({ passed: false, label: 'Protection missing' });
  }

  const blast =
    matchingHotspot?.graph?.blastRadius ??
    matchingHotspot?.blast_radius ??
    (file.relative_path === selectedPath ? activeImpact?.blast_radius : undefined) ??
    1;
  if (blast <= 2) {
    checks.push({ passed: true, label: `Contained blast radius (${blast})` });
  } else {
    confidenceScore -= 1;
    checks.push({ passed: false, label: `Wider blast radius (${blast})` });
  }

  const confidence: 'high' | 'medium' | 'low' =
    confidenceScore >= 5 ? 'high' : confidenceScore >= 3 ? 'medium' : 'low';

  return {
    status,
    candidateType,
    disposition,
    findingsCount: findings.length,
    modFindingsCount: modFindings.length,
    hasDiff,
    matchingTest,
    matchingHotspot,
    confidence,
    confidenceChecks: checks,
    blastRadius: blast,
  };
}
