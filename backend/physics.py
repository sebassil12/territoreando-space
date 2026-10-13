"""Pure evaluation of the thin-fuel, plus-root branch of Bhattacharjee et al.

Source: NASA NTRS 20040053557, 20040053557.pdf, Eq. (5), printed p.202.
Definitions: Eq. (2), printed p.201. This is an approximate, dimensionless
steady balance, not a physical extinction diagnosis or a calibrated prediction.
"""

import math
from dataclasses import dataclass
from typing import Literal

BranchStatus = Literal["positive_branch", "zero_branch", "negative_branch", "no_real_branch"]


@dataclass(frozen=True)
class BranchResult:
    eta_f: float | None
    discriminant: float
    model_status: BranchStatus


def evaluate_thin_branch(eta_g: float, radiation_number: float) -> BranchResult:
    """Evaluate (1 - eta_g + sqrt((1 + eta_g)**2 - 4*R0))/2.

    Inputs are explicit, finite, non-negative dimensionless numbers. Negative
    real outputs are retained as mathematical results, without interpretation.
    No second root, complex root, material lookup, or physical threshold is used.
    """
    for name, value in (("eta_g", eta_g), ("radiation_number", radiation_number)):
        if isinstance(value, bool) or not isinstance(value, (int, float)):
            raise TypeError(f"{name} must be a finite, non-negative number.")
        try:
            valid = math.isfinite(value) and value >= 0
        except OverflowError:
            valid = False
        if not valid:
            raise ValueError(f"{name} must be a finite, non-negative number.")

    shifted_flow = 1.0 + eta_g
    discriminant = shifted_flow * shifted_flow - 4.0 * radiation_number
    if not math.isfinite(discriminant):
        raise ValueError("Case exceeds the finite floating-point range of this implementation.")
    if discriminant < 0:
        return BranchResult(None, discriminant, "no_real_branch")

    root = math.sqrt(discriminant)
    if eta_g > 1:
        # Rationalize the same plus-root branch to avoid cancellation at large eta_g.
        eta_f = 2.0 * (eta_g - radiation_number) / (root + eta_g - 1.0)
    else:
        eta_f = (1.0 - eta_g + root) / 2.0
    if not math.isfinite(eta_f):
        raise ValueError("Case exceeds the finite floating-point range of this implementation.")
    status: BranchStatus = "positive_branch" if eta_f > 0 else "negative_branch" if eta_f < 0 else "zero_branch"
    return BranchResult(eta_f, discriminant, status)
