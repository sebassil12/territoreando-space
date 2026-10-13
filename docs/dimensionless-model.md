# Dimensionless model API

## Implemented scope and evidence

The first twin increment evaluates one approximate steady 0D balance: the thermally thin,
plus-root branch of Bhattacharjee, Paolini, Wakai and Takahashi, *Extinction Criteria for
Opposed-Flow Flame Spread in a Microgravity Environment* (2003).

Source: [NASA NTRS 20040053557](https://ntrs.nasa.gov/citations/20040053557),
[`20040053557.pdf`](https://ntrs.nasa.gov/api/citations/20040053557/downloads/20040053557.pdf),
NASA/CP—2003-212376/REV1. The equation was checked visually against Eq. (5), printed p.202
(PDF page 2); definitions are in Eq. (2), printed p.201 (PDF page 1).

\[
\eta_f \sim \frac{1-\eta_g+\sqrt{(1+\eta_g)^2-4R_0}}{2}
\]

| API name | Meaning |
|---|---|
| `eta_g` | \(V_g/V_{f,\mathrm{th,thin}}\), opposing gas-flow speed divided by the thin-fuel thermal-limit speed |
| `eta_f` | \(V_f/V_{f,\mathrm{th,thin}}\), spread-speed ratio returned as the mathematical plus-root branch |
| `radiation_number` | \(R_0\), the dimensionless surface-radiation parameter defined in Eq. (2) |

For reference, the source defines
\(F=(T_f-T_v)/(T_v-T_\infty)\) and
\(V_{f,\mathrm{th,thin}}\sim\lambda_g F/(\rho_s c_s\tau)\), with

\[
R_0=\frac{1}{F^2}\frac{\rho_s c_s}{\rho_g c_g}
\frac{\epsilon\sigma\tau}{\lambda_g}
\frac{T_v^4-T_\infty^4}{T_v-T_\infty}.
\]

These dimensional definitions are documentation only; the implementation accepts the two
dimensionless inputs directly. It supplies no temperatures, gas/solid properties, or constants.

## Assumptions and validation status

This is a steady reduced balance for thermally thin fuel in microgravity with opposing flow;
the heated-layer thickness equals the fuel thickness. Only non-negative `eta_g` is exposed.
Inputs are explicit user assumptions, with no material or experiment association.

**Implemented and equation-verified does not mean scientifically validated.** No dataset fit,
experimental validation, dimensional prediction, or empirical input range is claimed.
The model is separate from the SAFFIRE evidence explorer and its published references.

The extinction paragraph on p.202 uses `eta_g > R0`, whereas Fig. 4 on p.203 uses `eta_g < R0`.
This inconsistency is documented, not corrected or encoded as a physical criterion.
The API reports branch mathematics only. It does not diagnose flame extinction, stability,
ignition, fire risk, or safety, including at a zero or negative branch value.

## Endpoints and request

- `GET /api/twin/models`: a list containing the implemented model, its equation, definitions,
  assumptions, source file/page/URL, versions, mathematical domain and operational case limit.
  `equation_verified_against_source` is true and `scientifically_validated` is false.
- `POST /api/twin/evaluate`: evaluates independent cases in request order.

All request fields are mandatory. Unsupported fields are rejected, including material,
sequence, temperature, or dimensional-speed inputs. There are no scientific defaults.

```json
{
  "schema_version": "1",
  "model_id": "bhattacharjee2003_thin_radiative_v1",
  "flow_configuration": "opposed",
  "mode": "dimensionless",
  "parameter_origin": "user_assumption",
  "cases": [{"eta_g": 0.0, "radiation_number": 0.0}]
}
```

This example is a mathematical zero-radiation check, not a physical preset. Each case requires
both numeric inputs. JSON numbers must be finite and non-negative; booleans, strings, nulls,
NaN and Infinity are rejected. Batches contain 1–1000 cases. The upper count is an operational
response-size limit, not a scientific parameter bound. Batch evaluation writes no files.

## Responses and mathematical states

Both successful endpoints use `{data, source, warnings, quality}` with
`quality="modelled_unvalidated"`. The evaluation data contains schema/model versions,
mode, flow configuration, parameter origin, `scientifically_validated=false`, units and results.
Each result echoes `eta_g` and `radiation_number`, with `eta_f`, `discriminant` and `model_status`.
All numeric quantities, including the discriminant, are dimensionless.

Let \(D=(1+\eta_g)^2-4R_0\).

| State | Returned result |
|---|---|
| `positive_branch` | Real `eta_f > 0` |
| `zero_branch` | Real `eta_f = 0` |
| `negative_branch` | Real `eta_f < 0`, retained without physical interpretation |
| `no_real_branch` | `D < 0`; `eta_f=null`, with the negative discriminant retained |

`D=0` is a repeated mathematical root; its sign still determines the branch status.
No alternate root, complex value, clipping, or extinction threshold is introduced.
For `eta_g > 1`, the engine rationalizes the same plus-root expression to reduce cancellation.
Signs are evaluated in floating-point arithmetic, without a scientific near-zero tolerance.

Unknown model IDs return HTTP 404. Invalid requests or calculations outside finite
floating-point range return HTTP 422. These twin errors also use the four-field envelope,
with `quality="unavailable"`; failed batches return no partial results. Validation errors
omit invalid input values so error JSON never contains NaN or Infinity.
Existing evidence endpoint errors retain their previous behavior.

## Reproducibility and remaining work

The implemented [Scenario Engine](scenario-engine.md) adapts the registry ID
`bhattacharjee2004_dimensionless` to this existing evaluator ID and version.
Its versioned scenario endpoints add provenance/applicability assessment and
revision checks; the two endpoints and batch contract above are unchanged.
Only explicit hypothetical dimensionless inputs can use the new adapter.
The 2016/Urban research candidates remain blocked; no new physical equation or
dimensional mapping is introduced.

The engine uses the standard library and no I/O; FastAPI only validates and serializes cases.
There is no dependency on images, catalogs, a local PDF, or the Urban reference JSON at runtime.
The equation and citation are versioned with the implementation; no source is fetched during requests.
Missing evidence assets can degrade the existing explorer without disabling this independent model.

Unit tests check source-balance consistency, thermal limits, branch boundaries, numerical
stability and invalid inputs. API tests check contracts, provenance and operation without assets.
**Synthetic tests verify software mathematics, not experimental validity.**

Pending: frontend integration, dimensional parameters and their documented conventions,
scientific validation, 1D evolution, and further models. Urban, thick-fuel branches, material
presets, temperature, heat release, risk and CFD are not implemented. A SAFFIRE concurrent-flow
reference must not be used to validate this opposed-flow model as if the configurations matched.
