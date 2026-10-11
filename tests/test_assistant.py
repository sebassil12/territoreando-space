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
