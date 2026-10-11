"""Lógica pura sobre hallazgos: ranking por reglas explícitas y comparación de condiciones.

El puntaje del ranking es un orden de lectura determinista. No es una probabilidad, ni un riesgo, ni una predicción.
La comparación pone condiciones citadas lado a lado y nunca produce una conclusión.
"""

from backend.findings import Finding

# Reglas del ranking en un solo lugar (AGENTS.md regla 13). Cambiar aquí cambia el orden y su explicación en la API.
RANKING_RULES = {
    "safety_relevance": {"high": 3, "medium": 2, "low": 1},
    "confidence": {"high": 3, "medium": 2, "low": 1},
    "evidence_type": {"published_result": 2, "instrument_measurement": 2, "image_observation": 1,
                      "derived_metric": 1, "data_quality_note": 0},
    "data_status": {"complete": 0, "partial": -1, "conflicting": -2, "unknown": -2},
}
TIE_BREAK = ("score desc", "safety_relevance desc", "confidence desc", "finding_id asc")
RANKING_NOTE = ("Rule-based reading order computed from documented categories. "
                "It is not a probability, a risk estimate or a prediction.")

COMPARISON_FACTORS = ("material", "thickness_mm", "airflow_cm_s", "igniter_position", "oxygen_pct", "pressure_atm")


def ranking_criteria() -> dict:
    return {"rules": RANKING_RULES, "tie_break": list(TIE_BREAK), "note": RANKING_NOTE}


def score_finding(f: Finding) -> tuple[int, list[dict]]:
    """Puntaje y desglose; la suma de `points` del desglose es siempre igual al puntaje."""
    breakdown = [{"criterion": name, "value": getattr(f, name), "points": table.get(getattr(f, name), 0)}
                 for name, table in RANKING_RULES.items()]
    return sum(item["points"] for item in breakdown), breakdown


def rank_findings(findings: list[Finding]) -> list[dict]:
    rows = []
    for f in findings:
        score, breakdown = score_finding(f)
        rows.append({**f.to_dict(), "score": score, "score_breakdown": breakdown})
    levels = RANKING_RULES["confidence"]
    rows.sort(key=lambda r: (-r["score"], -levels.get(r["safety_relevance"], 0),
                             -levels.get(r["confidence"], 0), r["finding_id"]))
    for position, row in enumerate(rows, start=1):
        row["rank"] = position
    return rows


def resolve_airflow(row: dict) -> tuple[float | None, str]:
    """Flujo de una muestra: valor único citado, o None si falta o las fuentes se contradicen."""
    values = {v for v in (row.get("airflow_cm_s_dod"), row.get("airflow_cm_s_urban2019")) if v is not None}
    if len(values) > 1:
        return None, "conflicting"
    return (values.pop(), "known") if values else (None, "unknown")


def _factor_value(row: dict, factor: str) -> tuple[object, str]:
    if factor == "airflow_cm_s":
        return resolve_airflow(row)
    value = row.get(factor)
    return value, "known" if value is not None else "unknown"


def _factor_entry(rows: list[dict], factor: str) -> dict:
    values = {r["sample"]: _factor_value(r, factor) for r in rows}
    return {"factor": factor,
            "values": {s: v for s, (v, _) in values.items()},
            "status": {s: st for s, (_, st) in values.items()}}


def compare_conditions(rows: list[dict]) -> dict:
    """Condiciones lado a lado. `comparison_status` es `limited` si algo difiere, falta o está en conflicto."""
    entries = [_factor_entry(rows, factor) for factor in COMPARISON_FACTORS]
    missing = [e["factor"] for e in entries if "unknown" in e["status"].values()]
    conflicting = [e["factor"] for e in entries if "conflicting" in e["status"].values()]
    differing = [e["factor"] for e in entries
                 if set(e["status"].values()) == {"known"} and len(set(e["values"].values())) > 1]
    status = "limited" if missing or conflicting or differing else "same_reported_conditions"
    return {"samples": [r["sample"] for r in rows], "conditions": rows, "factors": entries,
            "differing_factors": differing, "missing_factors": missing, "conflicting_factors": conflicting,
            "comparison_status": status}
