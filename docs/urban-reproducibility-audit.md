# Urban 2019 / SAFFIRE reproducibility audit

Audit date: 2026-10-13. Outcome: **not reproducible from the audited sources**.
Scope: an independent absolute prediction for Saffire-II Sample 5 using documented
inputs only. This does not establish that all SAFFIRE results are irreproducible.
No model was implemented, and no parameters were fitted or assumed.

The target **Published reference** results and their previously transcribed page
are owned by [scientific_reference_results.json](../data/scientific_reference_results.json),
IDs `saffire2-s5-spread-rate` and `saffire2-s5-pyrolysis-length`. They are comparison
targets, not project calculations. Their complete source PDF was unavailable for
independent page verification in this checkout.

## Equation verification

[Urban et al. (2019), publisher HTML](https://www.sciencedirect.com/science/article/pii/S0010218018304395),
Section 1.1, Eq. (2), gives the approximate thermal expression:

\[
V_f \approx l_p\frac{h(T_f-T_p)}{\rho_s c_s\tau(T_p-T_o)}.
\]

This transcription is verified against accessible publisher content. Its printed
PDF page remains unverified; no page number is guessed. The text defines `tau`
as solid thickness. It simplifies chemical kinetics and approximately cancels
flame radiation against surface re-radiation. Those approximations are source
assumptions, not experimental validation by this project.

Eq. (6) gives only a microgravity proportionality:

\[
V_f \propto P^{1/2}l_p^{1/2}U_f^{1/2}(T_f-T_p).
\]

No absolute velocity follows without its prefactor and temperatures. Using the
target velocity to infer that prefactor would be circular. The complete Eq. (1),
including chemical kinetics and separate radiative fluxes, is not certified here:
the accessible text rendering requires comparison with the original PDF. It
must not be silently corrected or used for calculation.

## Input and provenance inventory

The [source inventory](sources.md) links the publisher and versioned NASA files.
NASA Readme page numbers refer to the document's printed pages; Table 1 is an
embedded image inspected directly. CSV rows have no page numbers. Urban printed
pages below are identified as prior transcription when not reverified.

| Input | Value and unit | Source and location | Availability for this calculation |
|---|---|---|---|
| `l_p`, observed pyrolysis length | Target reference in the JSON; 0.045 m after unit conversion | Urban, p.177 according to prior JSON transcription; target PDF page not reverified | Available as a published observation, not an independently predicted length |
| `U_f`, entrance flow | 20 cm/s = 0.20 m/s | NASA Readme, Table 1, p.1, S5; NASA CSV, row `2-5`; Urban Section 2.2 | Documented entrance condition; no assumed local flame velocity |
| `tau`, full fabric thickness | 0.33 mm = 0.00033 m | NASA Readme, Table 1, p.1, S5 | Documented in Readme; CSV instead says `037 mm`, left unresolved |
| `rho_s tau`, total areal mass | 18.05 mg/cm² = 0.1805 kg/m² | Urban publisher HTML, experimental setup Section 2; printed page not reverified | Documented for the same SIBAL fabric, including inert fiberglass |
| Sample length and width | 29 cm × 5 cm | NASA Readme, p.1; NASA CSV, row `2-5` | Documented; not a pixel calibration |
| Oxygen | Approximately 22.1 vol% | NASA CSV, row `2-5`, Note 1; Urban Section 2.2 | Documented condition; does not determine flame temperature |
| Pressure | 1 atm in prior reference transcription | JSON target entry, Urban Fig.8 caption, p.177; target PDF page not reverified | Retained as a reference condition; not a new direct verification |
| `c_s`, effective SIBAL specific heat | Missing; required unit J/(kg K) | Eq. (2) defines it; no case-specific value located in audited sources | Unresolved; cotton-only constants cannot be substituted for the composite |
| `T_p`, pyrolysis temperature | Missing; K | Eq. (2); no case-specific value located | Unresolved |
| `T_o`, initial solid temperature | Missing; K | Eq. (2); no case-specific value located | Unresolved; room temperature is not assumed |
| `T_f`, relevant flame temperature | Missing; K | Eq. (2); no case-specific value located | Unresolved; oxygen concentration or image brightness cannot supply it |
| `h`, average convective coefficient | Missing; W/(m² K) | Eq. (2); no case-specific value located | Unresolved |
| Inputs to calculate `h` instead | Missing: correlation constant `C`, gas conductivity `k` [W/(m K)], gas density `rho` [kg/m³], viscosity `mu` [Pa s], and `Pr` [dimensionless], with evaluation conditions | Urban Eqs. (3)–(4), publisher HTML; printed page not verified | Unresolved; no textbook constants or prefactor are assumed |

The full radiative/kinetic expression would additionally require documented
heated length, convective and radiative fluxes, chemical time, mixed-flow
velocity, and its correlation factors. These were not located as a complete
Sample 5 input set. Sensor descriptions alone do not supply measured values.

## Independent calculation and error

Only unit conversions and the known coefficient can be evaluated. Using total
areal mass as the `rho_s tau` product in Eq. (2):

\[
\frac{l_p}{\rho_s\tau}=\frac{0.045}{0.1805}
=0.2493074792243767\ \mathrm{m^3/kg}.
\]

The remaining expression is:

\[
V_f\ [\mathrm{m/s}]\approx
0.2493074792243767\frac{h(T_f-T_p)}{c_s(T_p-T_o)}.
\]

This is a conditional algebraic reduction, not a calculated spread rate. Its
unit conversion was checked independently with Python standard-library Decimal
under `uv`: `18.05 * 1e-6 / 1e-4 == 0.1805` kg/m². No half-thickness or
two-sided-heating correction was introduced without source justification.

Absolute calculated speed: **undetermined**. Absolute and relative error against
the JSON target: **undetermined**, since `V_calc` does not exist. The comparison
would use `V_calc - V_published` and
`100 * (V_calc - V_published) / V_published` with common units, not a zero error
or an arbitrary surrogate value. Eq. (2) also supplies no independent closure for
predicting the pyrolysis length used as its input.

## Source conflicts and access limits

NASA CSV version 1 contains an ambiguous thickness string. Readme version 1
provides an explicit S5 thickness but differs from the article and CSV in some
other sample flow settings. Neither the ambiguous string nor another sample's
condition was silently substituted into the calculation. The CSV's coarse
spread-rate entry is another reported result, not an independent model output.

The local `descompressed/urban2019.pdf` is absent. The publisher preview was
read, but complete PDF retrieval was unavailable; the public Elsevier API
returned bibliographic metadata only. HAL's record had no full-text file, and
the NASA PSI inventory did not supply this article PDF. Consequently exact PDF
pagination and a complete paper-wide parameter audit remain outstanding.

Versioned NASA files were downloaded only to temporary storage. SHA-256:

| File | Version | SHA-256 |
|---|---|---|
| `PSI-99_Science Documents_SAFFIRE-II Readme.docx` | 1 | `9f71bb8461dd1306d73a84264729851a10d7195616390096f929fa3f5ecbad72` |
| `PSI-99_Experimental table_SAFFIRE-2.csv` | 1 | `3c24390b9ef86f3d1ebaab911a1a3cc95a8759aebf42062371370e6d4b31b8ac` |

The external Readme also documents sample/camera naming and processing terms
on pp.2–3. Those research sources are not integrated into runtime catalogs;
they do not validate any pixel-to-length mapping or permit deriving rates
across temporal gaps. No raw files or new reference values were committed.


## Later observation-data audit

The [2026-10-17 Sample 5/C2 audit](saffire2-validation-audit.md) locates remote
numeric telemetry and an initial image/trigger timestamp match. This updates
observation availability, not the analytical reproduction decision above. Sensor
channels do not by themselves supply the model's complete thermal inputs, validate
image-derived measurements or independently verify the original Vf/lp passage.
