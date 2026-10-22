"""Capa de hallazgos: modelo, carga y validación de `findings.json` y `sample_conditions.csv`.

Los hallazgos se transcriben a mano con cita (archivo + ubicación). Este módulo no crea contenido: solo carga,
valida y descarta los registros que incumplen las reglas científicas de AGENTS.md (§2, reglas 8, 11–17).
Un hallazgo inválido se excluye con una advertencia; un archivo faltante produce advertencias, nunca un fallo.
"""

import csv
import json
from collections import defaultdict
from collections.abc import Callable
from dataclasses import asdict, dataclass, field, fields
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW_PREFIX = "descompressed/"

EVIDENCE_TYPES = frozenset({"published_result", "instrument_measurement", "image_observation",
                            "derived_metric", "data_quality_note"})
LEVELS = frozenset({"high", "medium", "low"})
DATA_STATUSES = frozenset({"complete", "partial", "conflicting", "unknown"})
VALUE_EVIDENCE_TYPES = frozenset({"published_result", "instrument_measurement"})
PIXEL_EVIDENCE_TYPES = frozenset({"derived_metric", "image_observation"})
PHYSICAL_UNITS = frozenset({"mm", "cm", "m", "mm/s", "cm/s", "m/s"})
REQUIRED_TEXT = ("finding_id", "title", "summary", "theme", "observation", "evidence_type", "source_path",
                 "source_location", "source_quote", "confidence", "confidence_rationale", "safety_relevance",
                 "safety_relevance_rationale", "data_status")

# Documentos fuente listados en docs/sources.md. Se aceptan aunque descompressed/ no esté en esta máquina.
DOCUMENTED_SOURCES = frozenset({
    "descompressed/urban2019.pdf",
    "descompressed/SAFFIRE-II DoD.docx",
    "descompressed/SAFFIRE-II_Image_Directory_Nomenclature_v3.0.pdf",
    "descompressed/SAFFIRE-II_MergeResult-jpeg_v5_Final.xlsx",
    "descompressed/SaffireIIStitchedCO2V7.pdf",
    "descompressed/Saffire-II Sample 1 TM Graphs.docx",
    "descompressed/saffire_inventory.csv",
    "descompressed/continuidad_saltos.csv",
    "descompressed/continuidad_series.csv",
    "descompressed/continuidad_cortes_entre_series.csv",
    # Fuentes NASA NTRS remotas (docs/sources.md, "Microgravity published references"); sin copia local.
    "https://ntrs.nasa.gov/api/citations/20170008805/downloads/20170008805.pdf",
    "https://ntrs.nasa.gov/api/citations/20160000593/downloads/20160000593.pdf",
    "https://ntrs.nasa.gov/api/citations/20210011521/downloads/ICES%202021-266%200503-2021%20final.pdf",
})

CONDITION_FLOAT_FIELDS = frozenset({"thickness_mm", "airflow_cm_s_dod", "airflow_cm_s_urban2019", "oxygen_pct",
                                    "pressure_atm"})
CONDITION_INT_FIELDS = frozenset({"jpeg_received", "jpeg_local"})


@dataclass(frozen=True)
class Finding:
    """Un hallazgo citado. Los campos desconocidos quedan en None; nunca se rellenan."""
    finding_id: str | None = None
    title: str | None = None
    summary: str | None = None
    experiment: str | None = None
    sample: str | None = None
    material: str | None = None
    condition: str | None = None
    theme: str | None = None
    observation: str | None = None
    metric: str | None = None
    value: float | None = None
    unit: str | None = None
    evidence_type: str | None = None
    source_path: str | None = None
    source_location: str | None = None
    source_quote: str | None = None
    confidence: str | None = None
    confidence_rationale: str | None = None
    safety_relevance: str | None = None
    safety_relevance_rationale: str | None = None
    limitations: tuple[str, ...] = ()
    related_sequences: tuple[str, ...] = ()
    data_status: str | None = None
    reference_id: str | None = None

    @classmethod
    def from_dict(cls, raw: dict) -> "Finding":
        known = {f.name for f in fields(cls)}
        data = {k: v for k, v in raw.items() if k in known}
        data["limitations"] = tuple(raw.get("limitations") or ())
        data["related_sequences"] = tuple(raw.get("related_sequences") or ())
        return cls(**data)

    def to_dict(self) -> dict:
        out = asdict(self)
        out["limitations"] = list(self.limitations)
        out["related_sequences"] = list(self.related_sequences)
        return out


@dataclass(frozen=True)
class ValidationContext:
    sequences: dict
    raw_dir: Path
    root: Path = ROOT


@dataclass(frozen=True)
class FindingsStore:
    """Hallazgos y condiciones cargados en memoria, más lo necesario para resolver la evidencia vinculada."""
    findings: tuple[Finding, ...]
    conditions: dict
    sequences: dict
    sequence_warnings: Callable[[str], list[str]]
    warnings: tuple[str, ...] = field(default=())


def _check_required(f: Finding) -> list[str]:
    missing = [name for name in REQUIRED_TEXT if not getattr(f, name)]
    return [f"{f.finding_id}: missing required field(s): {', '.join(missing)}"] if missing else []


def _check_enums(f: Finding) -> list[str]:
    checks = [("evidence_type", EVIDENCE_TYPES), ("confidence", LEVELS), ("safety_relevance", LEVELS),
              ("data_status", DATA_STATUSES)]
    return [f"{f.finding_id}: invalid {name}: {getattr(f, name)}" for name, allowed in checks
            if getattr(f, name) and getattr(f, name) not in allowed]


def _check_value_units(f: Finding) -> list[str]:
    errors = []
    if f.value is not None and not f.unit:
        errors.append(f"{f.finding_id}: numeric value without unit")
    if f.value is not None and f.evidence_type not in VALUE_EVIDENCE_TYPES:
        errors.append(f"{f.finding_id}: numeric value requires a published_result or instrument_measurement")
    if f.unit in PHYSICAL_UNITS and f.evidence_type in PIXEL_EVIDENCE_TYPES:
        errors.append(f"{f.finding_id}: physical unit '{f.unit}' not allowed on {f.evidence_type}")
    return errors


def _check_source(f: Finding, ctx: ValidationContext) -> list[str]:
    path = f.source_path or ""
    if not path or path in DOCUMENTED_SOURCES or (ctx.root / path).is_file():
        return []
    if path.startswith(RAW_PREFIX) and (ctx.raw_dir / path.removeprefix(RAW_PREFIX)).is_file():
        return []
    return [f"{f.finding_id}: source_path is neither a documented source nor an existing file: {path}"]


def _check_sequences(f: Finding, sequences: dict) -> list[str]:
    if not f.related_sequences or not sequences:
        return []
    errors = [f"{f.finding_id}: unknown related sequence {sid}" for sid in f.related_sequences
              if sid not in sequences]
    # DoD Tabla 2: la carpeta Sn corresponde a la muestra n; un hallazgo de muestra solo enlaza su propio grupo
    if f.sample:
        errors += [f"{f.finding_id}: related sequence {sid} is not from sample {f.sample}"
                   for sid in f.related_sequences if sid in sequences and sequences[sid]["group"] != f"S{f.sample}"]
    file_types = defaultdict(set)
    for sid in f.related_sequences:
        if sid in sequences:
            seq = sequences[sid]
            file_types[(seq["group"], seq["camera"])].add(seq["file_type"])
    errors += [f"{f.finding_id}: related_sequences mix processing variants for {g}{c}: {sorted(t)}"
               for (g, c), t in file_types.items() if len(t) > 1]
    return errors


def validate_finding(f: Finding, ctx: ValidationContext) -> list[str]:
    """Devuelve la lista de errores de un hallazgo (vacía si es válido)."""
    return (_check_required(f) + _check_enums(f) + _check_value_units(f) + _check_source(f, ctx)
            + _check_sequences(f, ctx.sequences))


def _read_items(path: Path) -> tuple[list, list[str]]:
    if not path.is_file():
        return [], [f"Findings file not found: {path.name}. No findings loaded."]
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        return [], [f"Findings file is not valid JSON ({exc}). No findings loaded."]
    items = raw.get("findings", []) if isinstance(raw, dict) else raw
    return [i for i in items if isinstance(i, dict)], []


def _context_warnings(ctx: ValidationContext) -> list[str]:
    warnings = []
    if not ctx.raw_dir.is_dir():
        warnings.append("Raw data directory not found: cited source files were not verified on disk.")
    if not ctx.sequences:
        warnings.append("Sequence catalog not loaded: related_sequences were not verified.")
    return warnings


def load_findings(path: Path, ctx: ValidationContext) -> tuple[list[Finding], list[str]]:
    """Carga y valida los hallazgos. Los inválidos o duplicados se excluyen con una advertencia."""
    items, warnings = _read_items(path)
    findings, seen = [], set()
    for item in items:
        finding = Finding.from_dict(item)
        errors = validate_finding(finding, ctx)
        if finding.finding_id in seen:
            errors.append(f"{finding.finding_id}: duplicate finding_id")
        if errors:
            warnings += [f"Finding excluded: {e}" for e in errors]
            continue
        seen.add(finding.finding_id)
        findings.append(finding)
    if items:
        warnings += _context_warnings(ctx)
    return findings, warnings


def _typed_condition(row: dict) -> dict:
    out = {}
    for key, value in row.items():
        if value == "":
            out[key] = None
        elif key in CONDITION_FLOAT_FIELDS:
            out[key] = float(value)
        elif key in CONDITION_INT_FIELDS:
            out[key] = int(value)
        else:
            out[key] = value
    return out


def load_store(processed: Path, raw_dir: Path, sequences: dict,
               sequence_warnings: Callable[[str], list[str]]) -> FindingsStore:
    """Carga hallazgos y condiciones de `processed/` y los valida contra el catálogo de secuencias."""
    found, warnings = load_findings(processed / "findings.json", ValidationContext(sequences, raw_dir))
    conditions, condition_warnings = load_conditions(processed / "sample_conditions.csv")
    return FindingsStore(tuple(found), conditions, sequences, sequence_warnings,
                         tuple(warnings + condition_warnings))


def load_conditions(path: Path) -> tuple[dict, list[str]]:
    """Condiciones por muestra indexadas por `sample` ("1"…"9", "F1", "F2"). Vacío → None, nunca estimado."""
    if not path.is_file():
        return {}, [f"Conditions file not found: {path.name}. No sample conditions loaded."]
    with open(path, encoding="utf-8", newline="") as fh:
        rows = [_typed_condition(r) for r in csv.DictReader(fh)]
    return {r["sample"]: r for r in rows}, []
