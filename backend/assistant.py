"""Deterministic, source-grounded explanation layer (no LLM).

Answers are built only from the catalogs and the transcribed references. Every answer has
Observation / Interpretation / Evidence / Limitations. Unknown questions get
"Not available in the loaded sources." instead of a guess.
"""

import re
import statistics
from collections.abc import Callable
from dataclasses import dataclass

NOT_AVAILABLE = "Not available in the loaded sources."

# Questions asking for quantities the images cannot provide. Checked first.
FORBIDDEN = {
    "temperature": r"temperat|\bheat\b|calor|hrr|heat.release",
    "risk": r"\brisk|riesgo|danger|peligro|safe to",
    "oxygen": r"oxygen|ox[ií]geno|\bo2\b",
    "material": r"which sample|qu[eé] muestra|sample number|is s\d.*sample|es s\d.*muestra|"
                r"material (is|of|in) (this|the) (sequence|image|frame|video)",
    "physical_length": r"\b(mm|cm|millimet|centimet|mil[ií]metro|cent[ií]metro)\b",
}


@dataclass
class Context:
    sequences: dict
    frames_by_seq: dict
    metrics_by_seq: dict
    refs: dict
    cal_status: Callable[[str], str]
    primary_of: dict


def _answer(observation, interpretation, evidence, limitations, grounded=True):
    return {
        "observation": observation,
        "interpretation": interpretation,
        "evidence": evidence,
        "limitations": limitations,
        "grounded": grounded,
        "evidence_sources": sorted({e["source"] for e in evidence}),
    }


def _not_available(reason: str = ""):
    return _answer(NOT_AVAILABLE, "", [], reason or "The question is outside the indexed catalog and references.", False)


def _forbidden(kind: str, seq: dict | None):
    msgs = {
        "temperature": "Pixel brightness is not a temperature measurement; the images carry no radiometric calibration.",
        "risk": "The dashboard does not estimate fire risk; published results apply only to their tested conditions.",
        "oxygen": "Oxygen concentration cannot be inferred from images. Published test conditions are listed in the Scientific context view.",
        "material": "No loaded source maps image folder groups (S1..S9) to Saffire-2 sample numbers or materials.",
        "physical_length": "Spatial calibration is not validated, so lengths are reported in pixels only.",
    }
    evidence = [{"source": "data/processed/calibration_catalog.csv", "detail": "calibration_status = pending for all grids"}]
    if seq:
        evidence.append({"source": "data/processed/sequence_catalog.csv", "detail": f"{seq['sequence_id']}: group={seq['group']}, camera={seq['camera']}"})
    return _answer(NOT_AVAILABLE, msgs[kind], evidence, msgs[kind] + " This would require a validated source that is not loaded.", False)


def _continuity(ctx: Context, s: dict):
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
    return _answer(obs, interp, ev, "raw_id is treated as a millisecond timestamp (consistent with ~33 ms spacing and "
                   "the 30 fps cameras in urban2019 p.173); this is an inference, not documented metadata.")


def _describe(ctx: Context, s: dict):
    obs = (f"{s['sequence_id']}: folder {s['folder']}, group {s['group']}, channel {s['camera']}, "
           f"{s['file_type']} ({s['processing_variant']}), role {s['sequence_role']}, {s['n_files']} frames.")
    interp = ("An ordered image sequence from the Saffire-II image release. Group and channel labels come from "
              "folder names; their physical meaning is not documented.")
    return _answer(obs, interp, [{"source": "data/processed/sequence_catalog.csv", "detail": s["sequence_id"]},
                                 {"source": "saffire_inventory.csv", "detail": f"folder {s['folder']}"}],
                   f"Do not equate '{s['group']}' with a Saffire-2 sample number; calibration status: {ctx.cal_status(s['sequence_id'])}.")


def _files(ctx: Context, s: dict | None):
    seqs = [s] if s else list(ctx.sequences.values())
    total = sum(x["n_files"] for x in seqs)
    avail = sum(f["availability"] == "available" for x in seqs for f in ctx.frames_by_seq.get(x["sequence_id"], []))
    scope = s["sequence_id"] if s else f"{len(seqs)} sequences"
    return _answer(f"{scope}: {total} files listed, {avail} found on disk.",
                   "Missing files are kept in the catalog with availability != available." if avail < total else "All listed files are present locally.",
                   [{"source": "data/processed/frame_catalog.csv", "detail": "availability column"}],
                   "Availability is checked when the catalog is built.")


def _metrics(ctx: Context, s: dict):
    vals = [m["value"] for m in ctx.metrics_by_seq.get(s["sequence_id"], []) if m["metric_name"] == "mean_intensity"]
    if not vals:
        return _not_available(f"No metrics computed for {s['sequence_id']}.")
    obs = (f"mean_intensity over {len(vals)} sampled frames: min {min(vals):.1f}, median {statistics.median(vals):.1f}, "
           f"max {max(vals):.1f} (8-bit intensity units).")
    return _answer(obs, "Changes in brightness indicate changes in luminous content of the frame (flame, LED illumination, glare).",
                   [{"source": "data/processed/frame_metrics.csv", "detail": "metric_name = mean_intensity"}],
                   "Brightness is not temperature or heat release. Periodic green LED illumination (urban2019 p.173) "
                   "affects brightness. Values are not comparable across processing variants.")


def _paper(ctx: Context, q: str):
    facts = ctx.refs.get("facts", []) + [
        {"id": r["id"], "text": f"{r['experiment']} ({r['material']}): {r['published_result']} = {r['value']} {r['unit']}".strip(),
         "source": r["source"], "page": r["page"]} for r in ctx.refs.get("results", []) if r["value"] is not None]
    words = {w for w in re.findall(r"[a-z0-9]+", q.lower()) if len(w) > 3}
    scored = sorted(facts, key=lambda f: -len(words & set(re.findall(r"[a-z0-9]+", f["text"].lower()))))
    hits = [f for f in scored if words & set(re.findall(r"[a-z0-9]+", f["text"].lower()))][:3]
    if not hits:
        return _not_available()
    return _answer(" ".join(h["text"] for h in hits),
                   "These are published reference statements, not results computed by this dashboard.",
                   [{"source": "urban2019.pdf", "detail": f"p.{h['page']}: {h['id']}"} for h in hits],
                   "Published values apply to their tested conditions and are not linked to a specific image folder here.")


def answer(ctx: Context, question: str, sequence_id: str | None = None) -> dict:
    q = question.lower().strip()
    if not q:
        return _not_available("Empty question.")
    seq = ctx.sequences.get(sequence_id) if sequence_id else None
    if seq is None:  # allow mentioning the id in the question
        seq = next((s for sid, s in ctx.sequences.items() if sid.lower() in q), None)

    for kind, pattern in FORBIDDEN.items():
        if re.search(pattern, q):
            return _forbidden(kind, seq)
    if re.search(r"paper|article|art[ií]culo|publish|publica|urban|spread|propagaci|pmma|sibal|limiting|pyrolysis|pir[oó]lisis", q):
        return _paper(ctx, q)
    if re.search(r"file|archivo|available|disponible", q):
        return _files(ctx, seq)
    if seq is None:
        return _not_available("Select a sequence or mention its sequence_id.")
    if re.search(r"continu|gap|hueco|salto|interval", q):
        return _continuity(ctx, seq)
    if re.search(r"metric|m[eé]trica|graph|gr[aá]fic|chart|bright|brillo|intensity", q):
        return _metrics(ctx, seq)
    if re.search(r"what|qu[eé]|represent|describe|explain|explica", q):
        return _describe(ctx, seq)
    return _not_available()
