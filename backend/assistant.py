"""Capa de explicación determinista y basada en fuentes (sin LLM).

Las respuestas se construyen solo a partir de los catálogos, los hallazgos citados (`findings.json`) y las
condiciones por muestra. Toda respuesta tiene status / observation / interpretation / evidence / limitations.
`status` es `answered`, `refused` (inferencia física pedida a las imágenes) o `not_available` (sin evidencia).
La interpretación solo reformula hallazgos citados y lleva su etiqueta; nunca agrega valores nuevos.
"""

import re
import statistics
from collections.abc import Callable
from dataclasses import dataclass, field

NOT_AVAILABLE = "Not available in the loaded sources."
INTERPRETATION_LABEL = "Interpretation (restates the cited findings only; adds no new values):"
MAX_FINDING_HITS = 3
MIN_TOKEN_LENGTH = 4
SAMPLE_BONUS = 2

# Siempre se rechazan: magnitudes que el dashboard no calcula ni con fuentes ni con píxeles (regla 4).
ALWAYS_REFUSED = {
    "temperature": r"temperat|\bheat\b|calor|\bhrr\b|heat.release",
    "risk": r"\brisk (of|for|in|to)\b|\briesgo (de|del|para|en)\b|how (dangerous|risky)|\bis (it|this) safe\b|"
            r"safe to|es seguro|peligros",
}
# Se rechazan salvo que la pregunta pida un valor publicado o documentado y no hable de imágenes.
REFUSED_WITHOUT_SOURCE = {
    "oxygen": r"oxygen|ox[ií]geno|\bo2\b",
    "physical_length": r"\b(mm|cm|millimet\w*|centimet\w*|mil[ií]metros?|cent[ií]metros?)\b",
    "material": r"\bmaterial",
}
PUBLISHED_CONTEXT = (r"publish|publica|paper|art[ií]culo|article|urban|report|finding|hallazgo|saffire|\bdod\b|"
                     r"\bsample \d|\bmuestra \d|\b[sf][1-9]\b")
IMAGE_CONTEXT = r"pixel|p[ií]xel|frame|fotograma|image|imagen|video|bright|brillo|this sequence|esta secuencia"
SAMPLE_MAPPING = r"\b([sf][1-9])\b"
# Preguntas de identidad de carpeta ("Is S1 sample 1?", "¿Qué material es S9?"), no de resultados medidos.
MAPPING_INTENT = r"\b(sample|muestra|material|camera|c[aá]mara|pre-flow|post-flow)\b"
RESULT_INTENT = r"rate|tasa|length|longitud|spread|propaga|duration|duraci|limit"
SAMPLE_MENTION = r"(?:sample|muestra|\bs)\s*([1-9])\b"
STOPWORDS = frozenset({"what", "which", "does", "about", "with", "from", "that", "this", "there", "have", "were",
                       "paper", "article", "published", "sobre", "dice", "cual", "cuál", "según", "finding",
                       "findings", "hallazgo", "hallazgos", "value", "valor", "sample", "muestra", "saffire"})

REFUSAL_MESSAGES = {
    "temperature": "Temperature and heat-release rate are not computed: images carry no radiometric calibration.",
    "risk": "The dashboard does not estimate fire risk; published results apply only to their tested conditions. "
            "Ask for the cited safety relevance of a finding instead.",
    "oxygen": "Oxygen concentration cannot be inferred from images; only published test conditions are available.",
    "material": "Material is never inferred from pixels; ask which material the source documents for a sample.",
    "physical_length": "Spatial calibration is not validated, so image lengths are reported in pixels only.",
}


@dataclass
class Context:
    sequences: dict
    frames_by_seq: dict
    metrics_by_seq: dict
    refs: dict
    cal_status: Callable[[str], str]
    primary_of: dict
    findings: tuple = ()
    conditions: dict = field(default_factory=dict)


def _result(observation, interpretation, evidence, limitations) -> dict:
    return {"status": "answered", "observation": observation, "interpretation": interpretation,
            "evidence": evidence, "limitations": limitations, "grounded": True,
            "evidence_sources": sorted({e["source"] for e in evidence})}


def _unanswered(reason: str, evidence: list | None = None, status: str = "not_available") -> dict:
    return {**_result(NOT_AVAILABLE, reason if status == "refused" else "", evidence or [], reason),
            "status": status, "grounded": False}


def _not_available(reason: str = "") -> dict:
    return _unanswered(reason or "No loaded finding, catalog entry or reference supports an answer.")


def _refusal_kind(q: str) -> str | None:
    for kind, pattern in ALWAYS_REFUSED.items():
        if re.search(pattern, q):
            return kind
    is_sourced = re.search(PUBLISHED_CONTEXT, q) and not re.search(IMAGE_CONTEXT, q)
    if is_sourced:
        return None
    return next((k for k, pattern in REFUSED_WITHOUT_SOURCE.items() if re.search(pattern, q)), None)


def _refused(kind: str, seq: dict | None) -> dict:
    evidence = [{"source": "data/processed/calibration_catalog.csv", "detail": "calibration_status = pending"}]
    if seq:
        evidence.append({"source": "data/processed/sequence_catalog.csv",
                         "detail": f"{seq['sequence_id']}: group={seq['group']}, camera={seq['camera']}"})
    return _unanswered(REFUSAL_MESSAGES[kind], evidence, status="refused")


def _tokens(text: str) -> set[str]:
    words = re.findall(r"[a-záéíóúñü0-9]+", (text or "").lower())
    return {w for w in words if len(w) >= MIN_TOKEN_LENGTH} - STOPWORDS


def _finding_score(f, tokens: set[str], sample: str | None) -> int:
    text = " ".join(filter(None, [f.title, f.summary, f.theme, f.material, f.observation, f.metric,
                                  f.source_quote]))
    return len(tokens & _tokens(text)) + (SAMPLE_BONUS if sample and f.sample == sample else 0)


def search_findings(findings, question: str) -> list:
    """Hallazgos por coincidencia de palabras clave (y muestra mencionada); orden determinista."""
    tokens = _tokens(question)
    match = re.search(SAMPLE_MENTION, question.lower())
    sample = match.group(1) if match else None
    scored = [(_finding_score(f, tokens, sample), f) for f in findings]
    hits = sorted((pair for pair in scored if pair[0] > 0), key=lambda p: (-p[0], p[1].finding_id))
    return [f for _, f in hits[:MAX_FINDING_HITS]]


def _finding_evidence(f) -> dict:
    return {"finding_id": f.finding_id, "source_path": f.source_path, "source_location": f.source_location,
            "evidence_type": f.evidence_type, "source": f.source_path, "detail": f.source_location}


def _findings_answer(ctx: Context, q: str) -> dict | None:
    hits = search_findings(ctx.findings, q)
    if not hits:
        return None
    observation = " ".join(f"[{f.finding_id}] {f.observation}" for f in hits)
    interpretation = " ".join([INTERPRETATION_LABEL] + [f"[{f.finding_id}] {f.summary}" for f in hits])
    limitations = " ".join(dict.fromkeys(item for f in hits for item in f.limitations))
    return _result(observation, interpretation, [_finding_evidence(f) for f in hits], limitations)


def _sample_mapping(ctx: Context, q: str) -> dict | None:
    match = re.search(SAMPLE_MAPPING, q)
    if not match or not re.search(MAPPING_INTENT, q) or re.search(RESULT_INTENT, q):
        return None
    label = match.group(1).upper()
    row = next((r for r in ctx.conditions.values() if r.get("folder_label") == label), None)
    if row is None:
        return None
    material = f"; material {row['material']}" if row.get("material") else ""
    observation = f"Folder label {label} corresponds to the PSI record '{row['psi_record_meaning']}'{material}."
    evidence = [{"source": row["source_path"], "detail": row["source_location"], "finding_id": "F-dod-001",
                 "source_path": row["source_path"], "source_location": row["source_location"]}]
    return _result(observation, f"{INTERPRETATION_LABEL} documentary mapping, not inferred from pixels.", evidence,
                   f"Confidence {row['confidence']}. {row.get('notes') or ''}".strip())


def _continuity(ctx: Context, s: dict) -> dict:
    gaps = [f for f in ctx.frames_by_seq.get(s["sequence_id"], []) if "gap_before" in (f["warning"] or "")]
    obs = (f"{s['sequence_id']} has {s['n_files']} files over {s['duration_s']} s; median interval "
           f"{s['median_diff_ms']} ms; {s['n_gaps_gt_2x']} gap(s) > 2x median; temporal_quality = {s['temporal_quality']}.")
    if s["n_gaps_gt_2x"]:
        interp = "The series is not continuous. It should not be used to derive temporal rates."
    elif s["temporal_quality"] == "overlapping_variant":
        interp = (f"Continuous, but it is a processing variant of {ctx.primary_of.get(s['sequence_id'])}; "
                  "it covers the same time window and must not be concatenated as extra frames.")
    else:
        interp = "No interval exceeds twice the median: the series is continuous at the recorded frame rate."
    ev = [{"source": "data/processed/sequence_catalog.csv", "detail": "n_gaps_gt_2x, median_diff_ms, temporal_quality"}]
    ev += [{"source": "data/processed/frame_catalog.csv", "detail": f"{g['frame_id']}: {g['warning']}"} for g in gaps[:5]]
    return _result(obs, interp, ev, "raw_id equals the EpochTime column of the received-JPEG manifest "
                   "(SAFFIRE-II_MergeResult-jpeg_v5_Final.xlsx); reading it as milliseconds is an inference.")


def _describe(ctx: Context, s: dict) -> dict:
    obs = (f"{s['sequence_id']}: folder {s['folder']}, group {s['group']}, channel {s['camera']}, "
           f"{s['file_type']} ({s['processing_variant']}), role {s['sequence_role']}, {s['n_files']} frames.")
    interp = ("An ordered image sequence from the Saffire-II image release. Group and camera labels match the PSI "
              "records described in SAFFIRE-II DoD.docx, Table 2.")
    return _result(obs, interp, [{"source": "data/processed/sequence_catalog.csv", "detail": s["sequence_id"]},
                                 {"source": "saffire_inventory.csv", "detail": f"folder {s['folder']}"}],
                   f"Image frames are illustrative evidence; calibration status: {ctx.cal_status(s['sequence_id'])}.")


def _files(ctx: Context, s: dict | None) -> dict:
    seqs = [s] if s else list(ctx.sequences.values())
    total = sum(x["n_files"] for x in seqs)
    avail = sum(f["availability"] == "available" for x in seqs for f in ctx.frames_by_seq.get(x["sequence_id"], []))
    scope = s["sequence_id"] if s else f"{len(seqs)} sequences"
    return _result(f"{scope}: {total} files listed, {avail} found on disk.",
                   "Missing files are kept in the catalog with availability != available." if avail < total
                   else "All listed files are present locally.",
                   [{"source": "data/processed/frame_catalog.csv", "detail": "availability column"}],
                   "Availability is checked when the catalog is built.")


def _metrics(ctx: Context, s: dict) -> dict:
    vals = [m["value"] for m in ctx.metrics_by_seq.get(s["sequence_id"], []) if m["metric_name"] == "mean_intensity"]
    if not vals:
        return _not_available(f"No metrics computed for {s['sequence_id']}.")
    obs = (f"mean_intensity over {len(vals)} sampled frames: min {min(vals):.1f}, median {statistics.median(vals):.1f}, "
           f"max {max(vals):.1f} (8-bit intensity units).")
    return _result(obs, "Changes in brightness indicate changes in luminous content of the frame (flame, LED illumination, glare).",
                   [{"source": "data/processed/frame_metrics.csv", "detail": "metric_name = mean_intensity"}],
                   "Brightness is not temperature or heat release. Periodic green LED illumination (urban2019 p.173) "
                   "affects brightness. Values are not comparable across processing variants.")


def _sequence_answer(ctx: Context, q: str, seq: dict | None) -> dict | None:
    if re.search(r"file|archivo|available|disponible", q):
        return _files(ctx, seq)
    if seq is None:
        return None
    if re.search(r"continu|gap|hueco|salto|interval", q):
        return _continuity(ctx, seq)
    if re.search(r"metric|m[eé]trica|graph|gr[aá]fic|chart|bright|brillo|intensity", q):
        return _metrics(ctx, seq)
    if re.search(r"represent|describe|explain|explica", q):
        return _describe(ctx, seq)
    return None


def answer(ctx: Context, question: str, sequence_id: str | None = None) -> dict:
    q = question.lower().strip()
    if not q:
        return _not_available("Empty question.")
    seq = ctx.sequences.get(sequence_id) if sequence_id else None
    if seq is None:  # permite mencionar el id en la pregunta
        seq = next((s for sid, s in ctx.sequences.items() if sid.lower() in q), None)
    kind = _refusal_kind(q)
    if kind:
        return _refused(kind, seq)
    return (_sample_mapping(ctx, q) or _sequence_answer(ctx, q, seq) or _findings_answer(ctx, q)
            or (_describe(ctx, seq) if seq else None) or _not_available())
