from typing import Tuple, Dict, List, Any

SCORING_VERSION = "1.2.0"

def get_risk_level(score: int) -> str:
    """Returns the canonical overall risk level for a given hotspot score."""
    if score >= 70:
        return "critical"
    if score >= 45:
        return "high"
    if score >= 25:
        return "medium"
    return "low"

def get_complexity_severity(complexity: int) -> str:
    """Returns the severity based purely on cyclomatic complexity."""
    if complexity >= 22:
        return "critical"
    if complexity >= 15:
        return "high"
    if complexity >= 8:
        return "medium"
    return "low"

def get_parse_confidence(status: str, unresolved_imports: int) -> str:
    """Returns the confidence level based on parse status and graph resolution."""
    if status == "full" and unresolved_imports == 0:
        return "high"
    if status == "fallback" or status == "failed":
        return "low"
    # Either partial parse or some unresolved imports
    return "medium"

def calculate_hotspot_score(
    complexity_raw: int,
    loc_raw: int,
    fan_in_raw: int,
    warnings_raw: int,
    blast_radius_raw: int,
) -> Tuple[int, Dict[str, int]]:
    """
    Computes a deterministic static hotspot score (0-100) and returns the 
    total score alongside the individual factor contributions.
    """
    if complexity_raw <= 0 and loc_raw <= 0 and fan_in_raw <= 0 and warnings_raw <= 0 and blast_radius_raw <= 0:
        return 0, {
            "complexity": 0,
            "loc": 0,
            "fan_in": 0,
            "warnings": 0,
            "blast_radius": 0,
        }

    complexity_severity = get_complexity_severity(complexity_raw)
    rating_floors = {"critical": 22, "high": 15, "medium": 8, "low": 2}
    rating_floor = rating_floors.get(complexity_severity, 2)
    
    # 1. Complexity factor (0-35 max)
    complexity_score = min(35, max(rating_floor, round(complexity_raw * 1.0)))

    # 2. LOC factor (0-10 max)
    loc_score = min(10, round(loc_raw / 50))

    # 3. Dependency fan-in factor (0-15 max)
    fan_in_score = min(15, fan_in_raw * 3)

    # 4. Warnings factor (0-20 max)
    warnings_score = min(20, warnings_raw * 3)

    # 5. Blast radius factor (0-20 max)
    blast_radius_score = min(20, blast_radius_raw * 2)

    total_score = complexity_score + loc_score + fan_in_score + warnings_score + blast_radius_score
    hotspot_score = max(0, min(100, total_score))

    factors = {
        "complexity": complexity_score,
        "loc": loc_score,
        "fan_in": fan_in_score,
        "warnings": warnings_score,
        "blast_radius": blast_radius_score,
    }

    return hotspot_score, factors


def get_hotspot_explanation_details(
    complexity_raw: int,
    loc_raw: int,
    fan_in_raw: int,
    warnings_raw: int,
    blast_radius_raw: int,
    parse_status: str = "full",
    unresolved_relations: int = 0,
) -> Dict[str, Any]:
    """Returns formula, evidence, confidence, and limitations for a hotspot score."""
    score, factors = calculate_hotspot_score(
        complexity_raw, loc_raw, fan_in_raw, warnings_raw, blast_radius_raw
    )
    complexity_sev = get_complexity_severity(complexity_raw)
    confidence = get_parse_confidence(parse_status, unresolved_relations)

    evidence: List[str] = [
        f"Cyclomatic complexity: {complexity_raw} ({complexity_sev} severity)",
        f"Lines of code: {loc_raw} LOC",
        f"Direct incoming callers (fan-in): {fan_in_raw}",
        f"Legacy warnings: {warnings_raw}",
        f"Transitive blast radius: {blast_radius_raw} downstream files",
    ]

    limitations: List[str] = [
        "Static AST derivation only; runtime execution was not performed.",
    ]
    if parse_status != "full":
        limitations.append(f"Parser returned status '{parse_status}', which may omit subtle nested symbols.")
    if unresolved_relations > 0:
        limitations.append(f"{unresolved_relations} unresolved dependency relations may cause blast radius to be an underestimate.")

    return {
        "formula": "Complexity(0-35) + LOC(0-10) + Fan-in(0-15) + Warnings(0-20) + Blast Radius(0-20)",
        "score": score,
        "factors": factors,
        "evidence": evidence,
        "confidence": confidence,
        "limitations": limitations,
    }


