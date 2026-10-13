# Frontend

- `src/App.tsx` owns navigation/views; `src/Viewer.tsx` owns playback, provenance and analysis.
- Put API types/fetch helpers in `src/api.ts` and shared UI elements in `src/ui.tsx`.
- Use React + TypeScript and Tailwind utilities; consume `/api` through the Vite proxy.
- Preserve `#Viewer/<sequence_id>` links and visible source, warning and quality information.
- Charts use plain SVG: one metric series, one value axis, explicit units,
  and separate segments across temporal gaps.
- Scripts/tooling: [package.json](package.json). Demo behavior: [demo script](../docs/demo-script.md).
