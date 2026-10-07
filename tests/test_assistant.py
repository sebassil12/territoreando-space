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
    "Is S1 sample 1?",
    "How long is the flame in mm?",
])
def test_refuses_physical_inference(ask, q):
    body = ask(q, "S1-C2-raw-jpeg-part1")
    assert body["data"]["observation"] == "Not available in the loaded sources."
    assert body["quality"] == "not_available"


def test_continuity_for_gapped_tiff(ask):
    body = ask("Is this sequence continuous?", "S6-C1-mapped-icmad-tiff-single")
    assert "not continuous" in body["data"]["interpretation"]
    assert body["data"]["evidence"]


def test_paper_answer_cites_source(ask):
    body = ask("What does the paper say about the PMMA limiting length?")
    assert body["quality"] == "grounded"
    assert all(e["source"] == "urban2019.pdf" for e in body["data"]["evidence"])
    assert "9" in body["data"]["observation"]


def test_unknown_question_not_available(ask):
    assert ask("zzz qqq")["quality"] == "not_available"
