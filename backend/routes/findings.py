"""Rutas de la capa de hallazgos: listado, ranking, detalle, condiciones y comparación."""

from dataclasses import dataclass
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException

from backend import analysis
from backend.envelope import envelope
from backend.findings import Finding, FindingsStore

FINDINGS_SOURCE = "data/processed/findings.json"
CONDITIONS_SOURCE = "data/processed/sample_conditions.csv"
MIN_COMPARE_SAMPLES = 2


@dataclass
class FindingFilters:
    """Filtros opcionales de /api/findings; solo se aplican los presentes."""
    theme: str | None = None
    sample: str | None = None
    material: str | None = None
    evidence_type: str | None = None
    confidence: str | None = None

    def matches(self, f: Finding) -> bool:
        exact = ("theme", "sample", "evidence_type", "confidence")
        if any(getattr(self, k) is not None and getattr(f, k) != getattr(self, k) for k in exact):
            return False
        return self.material is None or self.material.lower() in (f.material or "").lower()


def _quality(store: FindingsStore) -> str:
    return "ok" if store.findings else "unavailable"


def _related_view(store: FindingsStore, sequence_id: str) -> dict:
    seq = store.sequences.get(sequence_id)
    if seq is None:
        return {"sequence_id": sequence_id, "available": False,
                "warnings": ["Sequence not found in the loaded catalog."]}
    keys = ("sequence_id", "group", "camera", "file_type", "processing_variant", "sequence_role",
            "temporal_quality", "duration_s", "n_files")
    return {**{k: seq[k] for k in keys}, "available": True, "warnings": store.sequence_warnings(sequence_id)}


def _finding_detail(store: FindingsStore, f: Finding) -> dict:
    related = [_related_view(store, sid) for sid in f.related_sequences]
    return {"finding": f.to_dict(), "conditions": store.conditions.get(f.sample) if f.sample else None,
            "related_sequences": related}


def _samples_from(store: FindingsStore, samples: str | None, finding_ids: str | None) -> list[str]:
    if finding_ids:
        by_id = {f.finding_id: f for f in store.findings}
        ids = [i.strip() for i in finding_ids.split(",") if i.strip()]
        unknown = [i for i in ids if i not in by_id]
        if unknown:
            raise HTTPException(404, f"Unknown finding_id(s): {', '.join(unknown)}")
        return list(dict.fromkeys(by_id[i].sample for i in ids if by_id[i].sample))
    return list(dict.fromkeys(s.strip() for s in (samples or "").split(",") if s.strip()))


def build_findings_router(store: FindingsStore) -> APIRouter:
    router = APIRouter()
    base_warnings = list(store.warnings)

    @router.get("/api/findings")
    def list_findings(filters: Annotated[FindingFilters, Depends()]):
        rows = [f.to_dict() for f in store.findings if filters.matches(f)]
        return envelope(rows, FINDINGS_SOURCE, base_warnings, _quality(store))

    @router.get("/api/findings/ranked")
    def ranked_findings():
        data = {"ranking_criteria": analysis.ranking_criteria(),
                "findings": analysis.rank_findings(list(store.findings))}
        return envelope(data, FINDINGS_SOURCE, base_warnings, _quality(store))

    @router.get("/api/findings/{finding_id}")
    def finding_detail(finding_id: str):
        f = next((x for x in store.findings if x.finding_id == finding_id), None)
        if f is None:
            raise HTTPException(404, f"Unknown finding_id: {finding_id}")
        detail = _finding_detail(store, f)
        warns = base_warnings + [w for r in detail["related_sequences"] for w in r["warnings"]]
        return envelope(detail, f"{f.source_path} ({f.source_location})", sorted(set(warns)), f.data_status)

    @router.get("/api/conditions")
    def conditions():
        warns = [] if store.conditions else ["sample_conditions.csv not loaded."]
        return envelope(list(store.conditions.values()), CONDITIONS_SOURCE, warns,
                        "ok" if store.conditions else "unavailable")

    @router.get("/api/compare")
    def compare(samples: str | None = None, finding_ids: str | None = None):
        wanted = _samples_from(store, samples, finding_ids)
        unknown = [s for s in wanted if s not in store.conditions]
        if unknown:
            raise HTTPException(404, f"Unknown sample(s): {', '.join(unknown)}")
        if len(wanted) < MIN_COMPARE_SAMPLES:
            raise HTTPException(422, "Provide at least two distinct samples (samples=5,9) or finding_ids.")
        result = analysis.compare_conditions([store.conditions[s] for s in wanted])
        warns = ["Side-by-side view of cited conditions only; no conclusion is drawn across different conditions."]
        return envelope(result, CONDITIONS_SOURCE, warns, result["comparison_status"])

    return router
