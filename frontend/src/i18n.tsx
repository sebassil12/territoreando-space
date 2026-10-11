import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

// Locale de la UI sin dependencias: diccionarios planos, `es` por defecto.
// Los valores que llegan del backend (columnas, advertencias, respuestas del asistente) no se traducen.
const es = {
  'app.subtitle': '· Explorador de evidencia SAFFIRE-II',
  'app.views': 'Vistas',
  'app.language': 'Idioma',
  'tab.Overview': 'Resumen',
  'tab.Sequences': 'Secuencias',
  'tab.Viewer': 'Visor',
  'tab.Scientific context': 'Contexto científico',
  'tab.Assistant': 'Asistente',
  'tab.Sources & limitations': 'Fuentes y limitaciones',
  'common.loading': 'Cargando…',

  'overview.p1': 'En la Tierra, los gases calientes ascienden, por lo que la flotabilidad da forma a las llamas. En órbita casi no hay gravedad, así que la llama toma forma sobre todo por el lento flujo de aire de la ventilación. Eso cambia la rapidez y el alcance con que el fuego se propaga sobre un material, lo cual es importante para la seguridad contra incendios en naves espaciales.',
  'overview.p2a': 'Saffire-II se realizó a bordo del vehículo de carga Cygnus (misión CRS OA-5) después de que este dejara la ISS. Quemó nueve muestras pequeñas (29 cm × 5 cm) en un túnel de flujo, entre ellas tejido de algodón y fibra de vidrio (Muestras 5 y 6) y una placa de PMMA de 1 cm de espesor (Muestra 9).',
  'overview.p2b': ' Dos cámaras registraron las combustiones a 30 fotogramas por segundo.',
  'overview.p3': 'Este dashboard permite recorrer las secuencias de imágenes publicadas, comprobar si cada una es temporalmente continua, reproducirlas fotograma a fotograma con trazabilidad completa y ver estadísticas simples de píxeles junto a los resultados publicados.',
  'overview.scope': 'Alcance',
  'overview.scope1': 'Un explorador de evidencia: no es un simulador de combustión, no es un predictor de riesgo de incendio y no es un gemelo digital.',
  'overview.scope2': 'Las métricas de imagen están en píxeles e intensidad de 8 bits. Sin temperatura ni longitud física (la calibración está pendiente).',
  'overview.scope3': 'No está comprobado que etiquetas de carpeta como S1 o C2 sean números de muestra o identidades de cámara.',
  'overview.start': 'Iniciar la demo: abrir S1-C2 raw parte 1 →',

  'filter.group': 'grupo',
  'filter.camera': 'cámara',
  'filter.file_type': 'tipo de archivo',
  'filter.processing_variant': 'variante de procesamiento',
  'filter.temporal_quality': 'calidad temporal',
  'catalog.all': 'todos',
  'catalog.sequence': 'Secuencia',
  'catalog.group': 'Grupo',
  'catalog.channel': 'Canal',
  'catalog.type': 'Tipo',
  'catalog.role': 'Rol',
  'catalog.frames': 'Fotogramas',
  'catalog.duration': 'Duración',
  'catalog.medianDt': 'Δt mediano',
  'catalog.gaps': 'Huecos',
  'catalog.quality': 'Calidad',
  'catalog.calibration': 'Calibración',
  'catalog.of': 'de {id}',
  'catalog.note': 'Fuente: {source}. Las versiones Raw y Mapped de la misma ventana temporal se listan por separado como variantes de procesamiento y nunca se combinan.',

  'science.experiment': 'Experimento',
  'science.material': 'Material',
  'science.conditions': 'Condiciones',
  'science.result': 'Resultado',
  'science.value': 'Valor',
  'science.source': 'Fuente',
  'science.published': 'Referencia publicada',
  'science.findings': 'Hallazgos publicados clave',
  'science.compare': 'Cómo comparar: los valores publicados están en cm y mm/s y provienen del seguimiento calibrado realizado por los autores. Las métricas de este dashboard están en píxeles y no están vinculadas a una muestra específica: compare tendencias, no números.',

  'assistant.intro': 'Asistente determinista basado en fuentes. Responde solo a partir de los catálogos y del artículo transcrito. Las respuestas se generan en inglés.',
  'assistant.context': 'Secuencia de contexto:',
  'assistant.placeholder': 'Pregunte sobre esta secuencia o el artículo…',
  'assistant.question': 'Pregunta',
  'assistant.ask': 'Preguntar',
  'assistant.observation': 'Observación',
  'assistant.interpretation': 'Interpretación',
  'assistant.evidence': 'Evidencia',
  'assistant.limitations': 'Limitaciones',
  'assistant.s1': '¿Esta secuencia es continua?',
  'assistant.s2': '¿Qué representa esta secuencia?',
  'assistant.s3': '¿Qué indican las métricas de brillo?',
  'assistant.s4': '¿Qué dice el artículo sobre la longitud límite del PMMA?',
  'assistant.s5': '¿Cuál es la temperatura de la llama?',

  'limits.can': 'Lo que este dashboard puede mostrar',
  'limits.can1': 'Qué secuencias de imágenes existen, su cantidad de fotogramas, intervalos de tiempo y huecos.',
  'limits.can2': 'Cada fotograma con su ruta original, raw_id y tiempo relativo.',
  'limits.can3': 'Estadísticas de píxeles (brillo, área brillante, centroide, caja delimitadora) a lo largo del tiempo.',
  'limits.can4': 'Valores publicados de urban2019, etiquetados como tales, con números de página.',
  'limits.cannot': 'Lo que no puede concluir',
  'limits.cannot1': 'Temperatura, tasa de liberación de calor, concentración de oxígeno o riesgo de incendio.',
  'limits.cannot2': 'Longitud de la llama o tasa de propagación en mm o cm (calibración no validada).',
  'limits.cannot3': 'Qué muestra o material de Saffire-2 contiene una carpeta (S1…S9, F1, F2).',
  'limits.cannot4': 'Tasas a partir de secuencias con huecos temporales (las series Mapped TIFF).',
  'limits.cannot5': 'Comparaciones entre variantes de procesamiento (raw / mapped / ICMAD) como si fueran la misma señal.',
  'limits.calibration': 'Estado de la calibración',
  'limits.reference': 'referencia',
  'limits.block': 'bloque de {mm} mm',
  'limits.unknown': 'desconocida',
  'limits.calNote': 'Calibración no disponible para medir: todos los valores se muestran solo en píxeles.',
  'limits.sources': 'Fuentes',
  'limits.notFound': '(no encontrado)',

  'quality.continuous': 'continua',
  'quality.gap_detected': 'hueco detectado',
  'quality.overlapping_variant': 'variante superpuesta',
  'quality.incomplete': 'incompleta',
  'quality.unknown': 'desconocida',
  'ui.warnings': 'Advertencias',

  'metric.mean_intensity': 'Intensidad media',
  'metric.bright_pixel_fraction': 'Fracción de píxeles brillantes',
  'metric.bright_area_pixels': 'Área brillante',
  'metric.centroid_x': 'Centroide brillante x',
  'metric.centroid_y': 'Centroide brillante y',
  'metric.bbox_width_pixels': 'Ancho de la caja delimitadora brillante',
  'metric.bbox_height_pixels': 'Alto de la caja delimitadora brillante',

  'viewer.loadError': 'No se pudo cargar la secuencia: {error}',
  'viewer.loading': 'Cargando secuencia…',
  'viewer.summary': '{type} · {n} fotogramas · {d} s · rol: {role}',
  'viewer.frameAlt': 'Fotograma {i} de {id}',
  'viewer.noImage': 'Imagen no disponible localmente ({availability}). Ruta: {path}',
  'viewer.prevLabel': 'Fotograma anterior',
  'viewer.prev': '◀ Anterior',
  'viewer.play': '▶ Reproducir',
  'viewer.pause': '❚❚ Pausar',
  'viewer.nextLabel': 'Fotograma siguiente',
  'viewer.next': 'Siguiente ▶',
  'viewer.samplingPre': 'Muestreo: uno de cada',
  'viewer.samplingPost': 'fotograma(s)',
  'viewer.position': 'Posición del fotograma',
  'prov.sourceValue': 'Datos de imagen NASA PSI / SAFFIRE-II',
  'prov.sequence': 'Secuencia',
  'prov.frame': 'Fotograma',
  'prov.rawId': 'Raw ID',
  'prov.time': 'Tiempo',
  'prov.timeValue': '{t} s (desde raw_id)',
  'prov.quality': 'Calidad temporal',
  'detail.pause': 'Pause para cargar el detalle del fotograma.',
  'detail.title': 'Detalle del fotograma',
  'detail.path': 'Ruta relativa original',
  'detail.sourceFile': 'Archivo fuente',
  'detail.availability': 'Disponibilidad',
  'detail.noWarnings': 'Sin advertencias a nivel de fotograma.',
  'detail.metrics': 'Métricas derivadas de imagen',
  'detail.metricsNote': '(solo píxeles / intensidad)',
  'detail.notComputed': 'No calculadas para este fotograma (las métricas se muestrean uno de cada 5 fotogramas).',
  'analysis.loading': 'Cargando métricas…',
  'analysis.title': 'Análisis: métrica derivada de imagen',
  'analysis.metric': 'Métrica',
  'analysis.badge': 'Métrica derivada de imagen',
  'analysis.noValues': 'Sin valores para esta métrica (p. ej., ningún píxel supera el umbral en los fotogramas muestreados).',
  'analysis.method': 'Método: {method} · umbral 128 · fuente: {source}',
  'chart.aria': '{label} ({unit}) frente al tiempo en segundos',
  'chart.caption': '{label} [{unit}] frente al tiempo [s]. Los cortes en la línea son huecos temporales. Línea discontinua = fotograma actual. Haga clic en el gráfico para saltar a ese instante.',
}

export type Key = keyof typeof es
export type Lang = 'es' | 'en'

const en: Record<Key, string> = {
  'app.subtitle': '· SAFFIRE-II evidence explorer',
  'app.views': 'Views',
  'app.language': 'Language',
  'tab.Overview': 'Overview',
  'tab.Sequences': 'Sequences',
  'tab.Viewer': 'Viewer',
  'tab.Scientific context': 'Scientific context',
  'tab.Assistant': 'Assistant',
  'tab.Sources & limitations': 'Sources & limitations',
  'common.loading': 'Loading…',

  'overview.p1': 'On Earth, hot gases rise, so flames are shaped by buoyancy. In orbit there is almost no gravity, so a flame is shaped mostly by the slow air flow from ventilation. That changes how fast and how far fire spreads over a material — which matters for spacecraft fire safety.',
  'overview.p2a': 'Saffire-II was flown on the Cygnus cargo vehicle (mission CRS OA-5) after it left the ISS. It burned nine small samples (29 cm × 5 cm) in a flow tunnel, including cotton-fiberglass fabric (Samples 5 and 6) and a 1-cm-thick PMMA slab (Sample 9).',
  'overview.p2b': ' Two cameras recorded the burns at 30 frames per second.',
  'overview.p3': 'This dashboard lets you browse the released image sequences, check whether each one is temporally continuous, play them frame by frame with full traceability, and see simple pixel statistics next to the published results.',
  'overview.scope': 'Scope',
  'overview.scope1': 'An evidence explorer — not a combustion simulator, not a fire-risk predictor, not a digital twin.',
  'overview.scope2': 'Image metrics are in pixels and 8-bit intensity. No temperature, no physical length (calibration is pending).',
  'overview.scope3': 'Folder labels such as S1 or C2 are not proven to be sample numbers or camera identities.',
  'overview.start': 'Start the demo: open S1-C2 raw part 1 →',

  'filter.group': 'group',
  'filter.camera': 'camera',
  'filter.file_type': 'file type',
  'filter.processing_variant': 'processing variant',
  'filter.temporal_quality': 'temporal quality',
  'catalog.all': 'all',
  'catalog.sequence': 'Sequence',
  'catalog.group': 'Group',
  'catalog.channel': 'Channel',
  'catalog.type': 'Type',
  'catalog.role': 'Role',
  'catalog.frames': 'Frames',
  'catalog.duration': 'Duration',
  'catalog.medianDt': 'Median Δt',
  'catalog.gaps': 'Gaps',
  'catalog.quality': 'Quality',
  'catalog.calibration': 'Calibration',
  'catalog.of': 'of {id}',
  'catalog.note': 'Source: {source}. Raw and Mapped versions of the same time window are listed separately as processing variants and are never merged.',

  'science.experiment': 'Experiment',
  'science.material': 'Material',
  'science.conditions': 'Conditions',
  'science.result': 'Result',
  'science.value': 'Value',
  'science.source': 'Source',
  'science.published': 'Published reference',
  'science.findings': 'Key published findings',
  'science.compare': "How to compare: published values are in cm and mm/s and come from calibrated tracking by the authors. This dashboard's metrics are in pixels and are not linked to a specific sample — compare trends, not numbers.",

  'assistant.intro': 'Deterministic, source-grounded assistant. It answers only from the catalogs and the transcribed paper.',
  'assistant.context': 'Context sequence:',
  'assistant.placeholder': 'Ask about this sequence or the paper…',
  'assistant.question': 'Question',
  'assistant.ask': 'Ask',
  'assistant.observation': 'Observation',
  'assistant.interpretation': 'Interpretation',
  'assistant.evidence': 'Evidence',
  'assistant.limitations': 'Limitations',
  'assistant.s1': 'Is this sequence continuous?',
  'assistant.s2': 'What does this sequence represent?',
  'assistant.s3': 'What do the brightness metrics show?',
  'assistant.s4': 'What does the paper say about PMMA limiting length?',
  'assistant.s5': 'What is the flame temperature?',

  'limits.can': 'What this dashboard can show',
  'limits.can1': 'Which image sequences exist, their frame counts, time spans and gaps.',
  'limits.can2': 'Each frame with its original path, raw_id and relative time.',
  'limits.can3': 'Pixel statistics (brightness, bright area, centroid, bounding box) over time.',
  'limits.can4': 'Published values from urban2019, labeled as such, with page numbers.',
  'limits.cannot': 'What it cannot conclude',
  'limits.cannot1': 'Temperature, heat-release rate, oxygen concentration or fire risk.',
  'limits.cannot2': 'Flame length or spread rate in mm or cm (calibration not validated).',
  'limits.cannot3': 'Which Saffire-2 sample or material a folder (S1…S9, F1, F2) shows.',
  'limits.cannot4': 'Rates from sequences with temporal gaps (the Mapped TIFF series).',
  'limits.cannot5': 'Comparisons between processing variants (raw / mapped / ICMAD) as if they were the same signal.',
  'limits.calibration': 'Calibration status',
  'limits.reference': 'reference',
  'limits.block': '{mm} mm block',
  'limits.unknown': 'unknown',
  'limits.calNote': 'Calibration unavailable for measurement: all values are shown in pixels only.',
  'limits.sources': 'Sources',
  'limits.notFound': '(not found)',

  'quality.continuous': 'continuous',
  'quality.gap_detected': 'gap detected',
  'quality.overlapping_variant': 'overlapping variant',
  'quality.incomplete': 'incomplete',
  'quality.unknown': 'unknown',
  'ui.warnings': 'Warnings',

  'metric.mean_intensity': 'Mean intensity',
  'metric.bright_pixel_fraction': 'Bright-pixel fraction',
  'metric.bright_area_pixels': 'Bright area',
  'metric.centroid_x': 'Bright centroid x',
  'metric.centroid_y': 'Bright centroid y',
  'metric.bbox_width_pixels': 'Bright bounding-box width',
  'metric.bbox_height_pixels': 'Bright bounding-box height',

  'viewer.loadError': 'Could not load sequence: {error}',
  'viewer.loading': 'Loading sequence…',
  'viewer.summary': '{type} · {n} frames · {d} s · role: {role}',
  'viewer.frameAlt': 'Frame {i} of {id}',
  'viewer.noImage': 'Image not available locally ({availability}). Path: {path}',
  'viewer.prevLabel': 'Previous frame',
  'viewer.prev': '◀ Prev',
  'viewer.play': '▶ Play',
  'viewer.pause': '❚❚ Pause',
  'viewer.nextLabel': 'Next frame',
  'viewer.next': 'Next ▶',
  'viewer.samplingPre': 'Sampling: every',
  'viewer.samplingPost': 'frame(s)',
  'viewer.position': 'Frame position',
  'prov.sourceValue': 'NASA PSI / SAFFIRE-II image data',
  'prov.sequence': 'Sequence',
  'prov.frame': 'Frame',
  'prov.rawId': 'Raw ID',
  'prov.time': 'Time',
  'prov.timeValue': '{t} s (from raw_id)',
  'prov.quality': 'Temporal quality',
  'detail.pause': 'Pause to load frame details.',
  'detail.title': 'Frame detail',
  'detail.path': 'Original relative path',
  'detail.sourceFile': 'Source file',
  'detail.availability': 'Availability',
  'detail.noWarnings': 'No frame-level warnings.',
  'detail.metrics': 'Derived image metrics',
  'detail.metricsNote': '(pixels / intensity only)',
  'detail.notComputed': 'Not computed for this frame (metrics are sampled every 5th frame).',
  'analysis.loading': 'Loading metrics…',
  'analysis.title': 'Analysis: derived image metric',
  'analysis.metric': 'Metric',
  'analysis.badge': 'Derived image metric',
  'analysis.noValues': 'No values for this metric (e.g. no pixel above threshold in any sampled frame).',
  'analysis.method': 'Method: {method} · threshold 128 · source: {source}',
  'chart.aria': '{label} ({unit}) versus time in seconds',
  'chart.caption': '{label} [{unit}] vs. time [s]. Breaks in the line are temporal gaps. Dashed line = current frame. Click the chart to jump to that time.',
}

const messages: Record<Lang, Record<Key, string>> = { es, en }
const STORAGE_KEY = 'lang'

// ponytail: hook y helper conviven con el provider en un solo archivo; Fast Refresh recarga el módulo completo.
// eslint-disable-next-line react/only-export-components
export const isKey = (k: string): k is Key => k in es

type Vars = Record<string, string | number>
type I18n = { lang: Lang; setLang: (l: Lang) => void; t: (key: Key, vars?: Vars) => string }

const I18nContext = createContext<I18n | null>(null)

function initialLang(): Lang {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'en' ? 'en' : 'es'
  } catch {
    return 'es'
  }
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(initialLang)
  useEffect(() => {
    document.documentElement.lang = lang
    try { localStorage.setItem(STORAGE_KEY, lang) } catch { /* almacenamiento no disponible: se ignora */ }
  }, [lang])
  const t = (key: Key, vars?: Vars) =>
    messages[lang][key].replace(/\{(\w+)\}/g, (m, name) => (vars && name in vars ? String(vars[name]) : m))
  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>
}

// eslint-disable-next-line react/only-export-components
export function useT(): I18n {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useT must be used inside <I18nProvider>')
  return ctx
}
