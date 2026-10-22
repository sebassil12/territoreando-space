"""Contract checks for the hand-transcribed published-reference catalog."""

import json
import math
from pathlib import Path

REFERENCES = Path(__file__).resolve().parents[1] / "data/scientific_reference_results.json"
FLOW_DIRECTIONS = {"concurrent", "opposed", None}
GRAVITY = {"microgravity", "1g", None}
QUALIFIERS = {"approx", "range", "plus_minus", "no_spread", "not_ignited", "fit_extrapolation", "upper_bound",
              "criterion", None}
NULL_VALUE_QUALIFIERS = {"no_spread", "not_ignited", "range"}
NEW_SOURCES = {"ferkul2017", "ferkul2014-bass2", "olson2015", "urban2021", "urban2021-flare", "urban2025",
               "ochmo2023"}
NEW_RESULTS = {
    "ferkul2017-saffire1-concurrent-spread-rate", "ferkul2017-saffire1-opposed-spread-rate",
    "ferkul2017-saffire2-s5-spread-rate", "ferkul2017-saffire2-s6-spread-rate",
    "ferkul2017-saffire2-s1-silicone-no-spread", "ferkul2017-saffire2-s7-nomex-not-ignited",
    "ferkul2017-saffire2-thick-pmma-regression-rate", "bass2-pmma-rod-oxygen-margin",
    "olson2015-pmma-rod-intercept-oxygen", "urban2021-saffire5-oxygen", "urban2021-saffire2-oxygen-table2",
    "urban2025-test1-damage-criterion",
}

refs = json.loads(REFERENCES.read_text(encoding="utf-8"))


def test_every_citation_resolves_to_a_source_with_positive_page():
    for row in refs["results"] + refs["facts"]:
        assert row["source"] in refs["sources"], row["id"]
        assert type(row["page"]) is int and row["page"] > 0, row["id"]
    assert NEW_SOURCES <= refs["sources"].keys()
    assert all(refs["sources"][key].get("url") and refs["sources"][key].get("citation") for key in NEW_SOURCES)


def test_optional_fields_take_documented_values():
    for row in refs["results"]:
        assert row.get("flow_direction") in FLOW_DIRECTIONS, row["id"]
        assert row.get("gravity") in GRAVITY, row["id"]
        assert row.get("value_qualifier") in QUALIFIERS, row["id"]
        assert row.get("locator") is None or isinstance(row["locator"], str), row["id"]


def test_values_stay_numeric_or_null_and_qualifiers_are_consistent():
    for row in refs["results"]:
        value, qualifier = row["value"], row.get("value_qualifier")
        assert value is None or (type(value) in (int, float) and math.isfinite(value)), row["id"]
        if qualifier in NULL_VALUE_QUALIFIERS:
            assert value is None, row["id"]
        if qualifier == "range":
            low, high = row["value_range"]
            assert low <= high and row["unit"], row["id"]
        if "uncertainty" in row:
            assert qualifier == "plus_minus" and row["uncertainty"] > 0, row["id"]


def test_new_published_references_present_with_locators():
    rows = {row["id"]: row for row in refs["results"]}
    assert NEW_RESULTS <= rows.keys()
    assert all(rows[rid]["locator"] and rows[rid]["source"] in NEW_SOURCES for rid in NEW_RESULTS)


def test_known_conflicts_remain_separate_records():
    rows = {row["id"]: row for row in refs["results"]}
    assert rows["saffire2-s5-spread-rate"]["value"] == 2.03
    assert rows["ferkul2017-saffire2-s5-spread-rate"]["value"] == 2.1
    assert rows["urban2021-saffire2-oxygen-table2"]["value"] == 21
