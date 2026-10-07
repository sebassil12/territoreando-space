# Demo script (≈4 min)

Start both servers (README → Run) and open http://localhost:5173.

1. **Overview** — "Saffire-II burned nine samples in orbit; flames in microgravity behave differently. This is an
   evidence explorer, not a simulator." Point at the citations.
2. **Sequences** — filter `temporal quality = gap detected`: the two Mapped TIFF series. Clear it; show
   `S4-C1-mapped-jpeg-part2` marked as *processing variant of S4-C1-raw-jpeg-part2* — never merged.
3. Click **S1-C2-raw-jpeg-part1** — badge *continuous*, 5000 frames, 166.6 s, median Δt 33 ms.
4. **Play**, then pause. Show the provenance box: source, sequence, frame, raw_id, time, temporal quality.
   Frame detail: original relative path, source file, warnings.
5. **Analysis** — mean intensity vs. time. Point out periodic spikes and explain the green LED (0.4 s every 2 s,
   urban2019 p.173). Click the chart to jump to that frame.
6. Open `#Viewer/S6-C1-mapped-icmad-tiff-single` — gap warnings, broken line in the chart.
7. **Scientific context** — Sample 5 spread rate 2.03 mm/s, Sample 9 PMMA limiting length ~9 cm, each with page.
   "These are published, not computed by us."
8. **Assistant** — ask "Is this sequence continuous?" then "What is the flame temperature?" → *Not available in the
   loaded sources*, with the reason.
9. **Sources & limitations** — what we can and cannot conclude; calibration *pending*.

Closing line: "We turn hard-to-explore experiment data into traceable, honest evidence."
