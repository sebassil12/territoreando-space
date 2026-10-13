"""Synthetic mathematical checks, not experimental validation."""

import math
from itertools import pairwise

import pytest

from backend.physics import evaluate_thin_branch


@pytest.mark.parametrize("eta_g", [0.0, 0.5, 1.0, 2.0, 1e12])
def test_zero_radiation_recovers_thermal_limit(eta_g):
    result = evaluate_thin_branch(eta_g, 0.0)
    assert result.eta_f == pytest.approx(1.0)
    assert result.model_status == "positive_branch"


@pytest.mark.parametrize("eta_g,radiation_number", [(0.0, 0.2), (0.5, 0.4), (2.0, 1.0), (2.0, 2.125)])
def test_selected_branch_satisfies_source_energy_balance(eta_g, radiation_number):
    result = evaluate_thin_branch(eta_g, radiation_number)
    eta_f = result.eta_f
    # Eq. (2) with heated-layer/fuel-thickness ratio = 1, independently of the root formula.
    residual = eta_f * eta_f + (eta_g - 1) * eta_f + radiation_number - eta_g
    assert residual == pytest.approx(0.0, abs=1e-14)
    assert eta_f >= (1 - eta_g) / 2  # Select the published plus-root branch only.


def test_radiation_reduces_the_positive_branch():
    values = [evaluate_thin_branch(2.0, r).eta_f for r in (0.0, 0.5, 1.0, 1.5)]
    assert all(a > b for a, b in pairwise(values))


@pytest.mark.parametrize("eta_g,radiation_number,eta_f,status", [
    (0.0, 0.25, 0.5, "positive_branch"),  # Repeated root, still positive.
    (1.0, 1.0, 0.0, "zero_branch"),
    (2.0, 2.0, 0.0, "zero_branch"),
    (2.0, 2.25, -0.5, "negative_branch"),  # Repeated negative root is retained.
])
def test_real_boundaries_are_math_results_not_extinction(eta_g, radiation_number, eta_f, status):
    result = evaluate_thin_branch(eta_g, radiation_number)
    assert result.eta_f == pytest.approx(eta_f)
    assert result.model_status == status


def test_negative_discriminant_has_no_real_branch():
    result = evaluate_thin_branch(0.0, 1.0)
    assert result.discriminant == -3.0
    assert result.eta_f is None
    assert result.model_status == "no_real_branch"


def test_near_zero_branch_avoids_cancellation():
    r = math.nextafter(2.0, 0.0)
    result = evaluate_thin_branch(2.0, r)
    assert result.eta_f > 0
    assert result.eta_f == pytest.approx(2.0 - r, rel=1e-14)


@pytest.mark.parametrize("value", [-1.0, math.nan, math.inf, -math.inf, 10**1000])
@pytest.mark.parametrize("parameter", ["eta_g", "radiation_number"])
def test_invalid_inputs_are_rejected(value, parameter):
    inputs = {"eta_g": 1.0, "radiation_number": 0.0, parameter: value}
    with pytest.raises(ValueError, match="finite, non-negative"):
        evaluate_thin_branch(**inputs)


@pytest.mark.parametrize("value", [True, "1", None])
@pytest.mark.parametrize("parameter", ["eta_g", "radiation_number"])
def test_invalid_types_are_rejected(value, parameter):
    inputs = {"eta_g": 1.0, "radiation_number": 0.0, parameter: value}
    with pytest.raises(TypeError, match="finite, non-negative"):
        evaluate_thin_branch(**inputs)


@pytest.mark.parametrize("eta_g,radiation_number", [(1e308, 0.0), (0.0, 1e308)])
def test_numerical_overflow_is_explicit(eta_g, radiation_number):
    with pytest.raises(ValueError, match="floating-point range"):
        evaluate_thin_branch(eta_g, radiation_number)
