# CodeOracle Scoring Model & Mathematical Foundations

**Scoring Model Version:** `1.2.0`  
**Analyzer Version:** `1.1.0`  
**Test Suite:** `backend/tests/test_scoring_model.py`  
**Status:** Verified for Determinism, Normalization, Boundary Conditions, and Transparency

---

## 1. Executive Summary

CodeOracle implements a deterministic, multi-dimensional scoring engine designed to assess code modernization risk, architectural health, and refactoring readiness. Every score produced by the engine adheres to five foundational principles:

1. **Strict Determinism:** Identical source code and graph inputs produce bit-for-bit identical scores across repeated evaluations ($f(x) = f(x)$ without stochastic drift).
2. **Strict Normalization:** All user-facing scores are bounded to the closed interval $[0, 100]$.
3. **Graceful Boundary Behavior:** Empty repositories, single-file repositories, and zero-metric modules evaluate cleanly without zero-division exceptions or metric corruption.
4. **Full Transparency:** Every score exposes its formula, factor contributions, concrete evidence, confidence tier, and technical limitations.
5. **No Metric Inflation:** Unanalyzed code is never counted as passing, and unexecuted test suites are capped to prevent false confidence.

---

## 2. Module Hotspot Score Formula

The **Hotspot Score** assesses the risk and priority of modernizing an individual source file based on structural complexity, scale, coupling, and historical warnings.

### 2.1 Formula & Factor Caps

$$\text{HotspotScore} = \min\Big(100, \max\big(0, S_{\text{comp}} + S_{\text{loc}} + S_{\text{fan\_in}} + S_{\text{warnings}} + S_{\text{blast}}\big)\Big)$$

Where individual factor contributions are computed as:

| Factor | Factor Key | Contribution Formula | Minimum Floor | Maximum Cap | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Complexity** | `complexity` | $\min(35, \max(\text{Floor}_{\text{sev}}, \text{round}(C \times 1.0)))$ | $0$ (if $C=0$), else $2$ | $35$ | Cyclomatic complexity branches |
| **Lines of Code** | `loc` | $\min(10, \text{round}(\text{LOC} / 50))$ | $0$ | $10$ | Source footprint scaling |
| **Fan-in** | `fan_in` | $\min(15, \text{FanIn} \times 3)$ | $0$ | $15$ | Direct incoming callers |
| **Warnings** | `warnings` | $\min(20, \text{Warnings} \times 3)$ | $0$ | $20$ | Legacy anti-patterns & flags |
| **Blast Radius** | `blast_radius` | $\min(20, \text{BlastRadius} \times 2)$ | $0$ | $20$ | Transitive downstream callers |

Total theoretical sum of maximum factor caps:
$$35 + 10 + 15 + 20 + 20 = 100$$

### 2.2 Complexity Severity Floors

When cyclomatic complexity $C > 0$, rating floors guarantee minimum visibility for high-complexity files:
- **Critical** ($C \ge 22$): $\text{Floor} = 22$
- **High** ($15 \le C < 22$): $\text{Floor} = 15$
- **Medium** ($8 \le C < 15$): $\text{Floor} = 8$
- **Low** ($1 \le C < 8$): $\text{Floor} = 2$
- **Zero** ($C = 0$): $\text{Floor} = 0$ (handled explicitly to ensure zero-metric files yield 0).

### 2.3 Hotspot Risk Classification

The overall risk tier is determined strictly from the normalized score:
- **Critical:** $\text{Score} \ge 70$
- **High:** $45 \le \text{Score} < 70$
- **Medium:** $25 \le \text{Score} < 45$
- **Low:** $\text{Score} < 25$

---

## 3. Migration Readiness Score Formula

The **Migration Readiness Score** measures repository-level readiness to undergo automated or manual modernization with minimal risk of regressions.

### 3.1 Five Weighted Dimensions

$$\text{ReadinessScore} = \min\left(100, \max\left(0, \sum_{i=1}^{5} w_i \times D_i\right)\right)$$

Where each dimension has an equal weight of $w_i = 0.20$ ($20\%$):

```
Readiness Score (100) = 
    0.20 * Parser Readiness
  + 0.20 * Complexity Balance
  + 0.20 * Dependency Safety
  + 0.20 * Maintainability
  + 0.20 * Safety Test Protection
```

### 3.2 Dimension Formulations

#### Dimension 1: Parser Readiness ($D_1$)
Evaluates AST parse coverage across all repository files:
$$D_1 = \min\left(100, \max\left(0, \text{round}\left(100.0 \times \frac{N_{\text{full}} + 0.5 \times N_{\text{partial}} + 0.25 \times N_{\text{fallback}}}{N_{\text{total}}}\right)\right)\right)$$
- $N_{\text{full}}$: Files with complete AST parse without syntax errors.
- $N_{\text{partial}}$: Files parsed with Tree-sitter error recovery or token fallback.
- $N_{\text{fallback}}$: Files analyzed via lexical or regex scanners.
- $N_{\text{total}}$: Total files in the repository ($\ge 1$).

#### Dimension 2: Complexity Balance ($D_2$)
Penalizes files with high or critical cyclomatic complexity:
$$D_2 = \max\left(0, 100 - \min\left(85, \text{round}\left(100.0 \times \frac{N_{\text{crit}} \times 2.0 + N_{\text{high}} \times 1.0}{N_{\text{total}}}\right)\right)\right)$$

#### Dimension 3: Dependency Safety ($D_3$)
Evaluates coupling density, circular dependency loops, and unresolved imports:
$$D_3 = \max\left(0, 100 - \min\Big(85, (\text{Density} \times 18) + (N_{\text{cycles}} \times 15) + (N_{\text{unresolved}} \times 1.5)\Big)\right)$$
- $\text{Density} = \frac{|E_{\text{internal}}|}{N_{\text{total}}}$
- $N_{\text{cycles}}$: Number of detected circular dependency loops.
- $N_{\text{unresolved}}$: Number of unresolved local imports in project files.

#### Dimension 4: Maintainability ($D_4$)
Evaluates legacy anti-patterns and modernization candidates:
$$D_4 = \max\left(0, 100 - \min\left(85, \text{round}\left(\frac{\sum W_{\text{severity}} \times 3}{N_{\text{total}}}\right)\right)\right)$$
- Warning weights: `risk = 3`, `warning = 2`, `info = 1`.

#### Dimension 5: Safety Test Protection ($D_5$)
Reflects characterization test protection:
$$D_5 = \begin{cases} 
\min(100, \text{Coverage}_{\text{measured}} \times 0.6 + R_{\text{syntax}} \times 40) & \text{if runtime tests executed} \\
\min(40, R_{\text{syntax}} \times 40) & \text{if tests generated but unexecuted} \\
35 & \text{if no tests generated}
\end{cases}$$
- **Anti-Inflation Rule:** Unexecuted generated tests are strictly capped at $40/100$, explicitly labeled *"Estimated (not executed)"*, and flagged with `medium` confidence.

### 3.3 Readiness Thresholds & Labels

| Score Range | Canonical Label | Strategy / Guidance |
| :--- | :--- | :--- |
| **90–100** | High Readiness | Minimal architectural blockers; safe to proceed with automated refactoring. |
| **80–89** | Strong Readiness | Stable structure; minor legacy patterns; proceed with care. |
| **60–79** | Ready With Care | Decouple circular dependencies and increase test coverage before refactoring. |
| **40–59** | High Preparation Needed | High cyclomatic complexity and unmeasured test harnesses; prepare test baseline. |
| **0–39** | Not Ready | Incomplete dependency graph, severe cycles, or syntax errors; refactoring locked. |

---

## 4. System Pulse Health Score Formula

The **System Pulse** (Repository Health Observatory) aggregates project health into 5 architectural subsystems:

1. **Frontend:** UI components, views, styles, and client scripts.
2. **Backend:** Server APIs, services, business logic, domain models.
3. **Database:** Schemas, migrations, models, DAOs, repositories.
4. **Infrastructure:** Dockerfiles, CI workflows, configurations, scripts.
5. **Machine Learning:** Training scripts, evaluation routines, model pipelines.

### 4.1 Subsystem Health Score

For each subsystem $S$, health is derived from the proportion of high-risk files, unresolved imports, and unprotected files:
$$\text{HealthScore}(S) = \max\left(0, 100 - \Big(N_{\text{high\_risk}} \times 15 + N_{\text{unresolved}} \times 10 + N_{\text{unprotected}} \times 5\Big)\right)$$
If a subsystem contains zero files, it evaluates to $100$ with $0$ high-risk files and $0$ pressure points.

### 4.2 Repository Health Labels

Considering both the score and confidence level:
- **Stable:** $\text{Score} \ge 80$ and $\text{Confidence} = \text{"high"}$.
- **Stable with pressure points:** $\text{Score} \ge 70$, or $\text{Score} \ge 80$ with $\text{Confidence} \ne \text{"high"}$.
- **Needs attention:** $50 \le \text{Score} < 70$.
- **High risk:** $\text{Score} < 50$.
- **Analysis incomplete:** Flagged when partial AST coverage is $< 85\%$ or confidence is `low`.

---

## 5. Boundary Condition Verification

CodeOracle's scoring formulas are programmatically asserted against critical boundary conditions in `backend/tests/test_scoring_model.py`:

| Boundary Scenario | Inputs | Expected Behavior | Asserted Output |
| :--- | :--- | :--- | :--- |
| **Zero-Metric Module** | $C=0, \text{LOC}=0, \text{FanIn}=0, W=0, B=0$ | Clean zero; no artificial rating floor | $\text{Score} = 0$, all factors $= 0$ |
| **Single-File Repository** | $1$ file, $0$ internal edges, $0$ cycles | Full dependency safety, bounded readiness | $D_3 = 100$, $0 \le R \le 100$ |
| **Empty Repository** | $0$ files, $0$ modules | Zero division prevented via $\max(N, 1)$ | $0 \le R \le 100$, no `ZeroDivisionError` |
| **Extreme Scale** | $C=500, \text{LOC}=100000, \text{FanIn}=100$ | Clamped to maximum ceiling | $\text{Score} = 100$, no integer overflow |
| **Unresolved Dependencies** | $N_{\text{unresolved}} > 0$ | Confidence downgraded; penalty applied | $\text{Confidence} = \text{"medium"}$, $D_3$ penalized |
| **Partial AST Parse** | $\text{Coverage} < 80\%$ | Confidence downgraded; blocker flagged | $\text{Confidence} = \text{"medium"}$, $D_1$ degraded |

---

## 6. Transparency Contract: Factor Breakdown, Evidence & Limitations

Every score exposed to users and API consumers implements the **Transparency Contract**:

```json
{
  "formula": "Complexity(0-35) + LOC(0-10) + Fan-in(0-15) + Warnings(0-20) + Blast Radius(0-20)",
  "score": 62,
  "factors": {
    "complexity": 22,
    "loc": 6,
    "fan_in": 12,
    "warnings": 12,
    "blast_radius": 10
  },
  "evidence": [
    "Cyclomatic complexity: 22 (CRITICAL complexity)",
    "Lines of code: 280 LOC",
    "Direct incoming callers: 4",
    "Legacy warnings: 4",
    "Transitive blast radius: 5 file(s)"
  ],
  "confidence": "high",
  "limitations": [
    "Static AST derivation only; runtime execution was not performed.",
    "Static graph analysis captures all resolved local imports."
  ]
}
```

---

## 7. State Separation Rigor

To prevent deceptive metrics, CodeOracle strictly differentiates static syntax claims from runtime execution claims:

1. **`Generated`:** Artifact synthesized.
2. **`Syntax-Valid`:** Static compiler/parser validation passed.
3. **`Runtime-Executed`:** Measured execution in disposable sandbox.
4. **`Behaviorally Verified`:** Characterization baseline tests pass with zero regression.

Treating syntax validity as runtime correctness is strictly prohibited by engine assertions.

---

## 8. Automated Reproduction

To run the full suite of scoring model determinism, normalization, and boundary tests:
```powershell
backend/.venv/Scripts/pytest.exe backend/tests/test_scoring_model.py -v
```
Expected output: **16 passed in <0.5s**.
