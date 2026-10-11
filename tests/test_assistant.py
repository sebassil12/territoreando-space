import pytest
from fastapi.testclient import TestClient

from backend.app import PROCESSED, create_app

pytestmark = pytest.mark.skipif(not (PROCESSED / "sequence_catalog.csv").is_file(), reason="catalogs not built")


@pytest.fixture(scope="module")
def ask():
    c = TestClient(create_app())

    def _ask(question, sequence_id=None):
        body = c.post("/api/assistant", json={"question": question, "sequence_id": sequence_id}).json()
        d = body["data"]
        assert set(d) >= {"observation", "interpretation", "evidence", "limitations"}
        return body

    return _ask


@pytest.mark.parametrize("q", [
    "What is the flame temperature?",
    "What is the fire risk of this material?",
    "What oxygen concentration is in this frame?",
    "What material is in this frame?",
    "How long is the flame in mm?",
])
def test_refuses_physical_inference(ask, q):
    body = ask(q, "S1-C2-raw-jpeg-part1")
    assert body["data"]["observation"] == "Not available in the loaded sources."
    assert body["data"]["status"] == "refused"
    assert body["quality"] == "not_available"


@pytest.mark.parametrize("q", [
    "What is the cited safety relevance of the flame size limit?",
    "What published spread rate in mm/s for sample 5?",
])
def test_answers_cited_safety_relevance_and_published_mm_values(ask, q):
    body = ask(q)
    data = body["data"]
    assert data["status"] == "answered" and body["quality"] == "grounded"
    assert all(e["finding_id"] and e["source_path"] and e["source_location"] for e in data["evidence"])
    assert data["interpretation"].startswith("Interpretation (restates the cited findings only")


def test_folder_label_mapping_cites_dod(ask):
    data = ask("Is S1 sample 1?", "S1-C2-raw-jpeg-part1")["data"]
    assert data["status"] == "answered"
    assert "Sample 1" in data["observation"]
    assert data["evidence"][0]["source_path"] == "descompressed/SAFFIRE-II DoD.docx"


def test_continuity_for_gapped_tiff(ask):
    body = ask("Is this sequence continuous?", "S6-C1-mapped-icmad-tiff-single")
    assert "not continuous" in body["data"]["interpretation"]
    assert body["data"]["evidence"]


def test_paper_answer_cites_source(ask):
    body = ask("What does the paper say about the PMMA limiting length?")
    assert body["quality"] == "grounded"
    assert all(e["source_path"] == "descompressed/urban2019.pdf" for e in body["data"]["evidence"])
    assert "9 cm" in body["data"]["observation"]


def test_unknown_question_not_available(ask):
    body = ask("zzz qqq")
    assert body["quality"] == "not_available"
    assert body["data"]["status"] == "not_available" and body["data"]["evidence"] == []


SEQ = "S1-C2-raw-jpeg-part1"


@pytest.mark.parametrize(("q", "sequence_id", "status"), [
    ("¿Qué dice la fuente sobre la longitud límite de la llama?", None, "answered"),
    ("¿S1 es la muestra 1?", None, "answered"),
    ("¿Hay conflicto en el flujo de la muestra 6?", None, "answered"),
    ("¿Esta secuencia es continua?", SEQ, "answered"),
    ("¿Cuál fue la humedad relativa?", None, "not_available"),
    ("¿Cuál fue la humedad relativa?", SEQ, "not_available"),
    ("¿Cuál es la temperatura de la llama?", None, "refused"),
    ("What does the source say about the flame length limit?", None, "answered"),
    ("Is there an airflow conflict for sample 6?", None, "answered"),
    ("What was the relative humidity?", None, "not_available"),
])
def test_frontend_suggested_questions(ask, q, sequence_id, status):
    assert ask(q, sequence_id)["data"]["status"] == status


@pytest.mark.parametrize("q", [
    "¿Cuál es el color favorito de la tripulación?",
    "What is the crew's favourite color?",
    "¿Qué opina la llama de la muestra?",
])
@pytest.mark.parametrize("sequence_id", [None, SEQ])
def test_out_of_scope_question_not_available(ask, q, sequence_id):
    data = ask(q, sequence_id)["data"]
    assert data["status"] == "not_available" and data["evidence"] == []


@pytest.mark.parametrize("q", ["¿Qué representa esta secuencia?", "How many frames does it have?"])
def test_sequence_context_answers_sequence_questions(ask, q):
    data = ask(q, SEQ)["data"]
    assert data["status"] == "answered" and SEQ in data["observation"]
