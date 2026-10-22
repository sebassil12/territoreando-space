// Fundamentals copy (es/en) for a software engineer without aerospace background.
// Concept ids, routes and citations live in content.ts; `analogy` keys exist only where an analogy genuinely helps.
const es = {
  'fund.title': 'Fundamentos: lo mínimo para leer estos datos',
  'fund.intro': 'Conceptos previos, pensados para alguien que programa pero no estudió combustión. Cada uno indica dónde aparece en la app y de dónde sale.',
  'fund.path': 'Orden sugerido de estudio',
  'fund.analogyLabel': 'Analogía de software',
  'fund.whereLabel': 'Dónde lo ves en la app',
  'fund.open': 'Abrir →',
  'fund.phase.combustion': '1. Cómo arde algo y por qué la gravedad importa',
  'fund.phase.spread': '2. Cómo se mide el avance de una llama',
  'fund.phase.images': '3. Imágenes como datos',
  'fund.phase.reading': '4. Modelos y citas',

  'fund.fireTriangle.title': 'Triángulo del fuego',
  'fund.fireTriangle.body': 'Para que haya llama hacen falta combustible, oxígeno y calor. Quitar cualquiera de los tres la apaga.',
  'fund.fireTriangle.analogy': 'Como un proceso que necesita CPU, memoria y datos de entrada: si falta uno, se detiene.',
  'fund.fireTriangle.where': 'Hallazgos: cada resultado describe qué material ardió y en qué condiciones.',

  'fund.buoyancy.title': 'Flotabilidad (y por qué desaparece)',
  'fund.buoyancy.body': 'En la Tierra el gas caliente es más liviano y sube, renovando el aire de la llama. En órbita todo cae a la vez y ese efecto casi desaparece; la llama depende del aire que la ventilación le trae.',
  'fund.buoyancy.analogy': 'Pasar de un sistema con "push" automático a uno que solo recibe datos si alguien los pide (polling).',
  'fund.buoyancy.where': 'Evidencia: fotogramas reales de llamas en microgravedad.',

  'fund.forcedFlow.title': 'Flujo forzado: opuesto y concurrente',
  'fund.forcedFlow.body': 'Sin flotabilidad, el aire lo mueve un ventilador. Si la llama avanza contra ese aire es propagación opuesta; si avanza a favor, concurrente. Son regímenes distintos.',
  'fund.forcedFlow.analogy': 'Como leer un log desde el principio o desde el final: mismos datos, recorrido y costo distintos.',
  'fund.forcedFlow.where': 'Comparación: flujo (cm/s) y posición del ignitor por muestra.',

  'fund.spreadRate.title': 'Velocidad de propagación (Vf)',
  'fund.spreadRate.body': 'Cuánto avanza el frente de la llama por unidad de tiempo, en mm/s. Es un resultado publicado por los autores; esta app no lo recalcula desde las imágenes.',
  'fund.spreadRate.analogy': 'Es un throughput: distancia procesada por segundo.',
  'fund.spreadRate.where': 'Hallazgo F-urban2019-001: velocidad publicada de la muestra 5.',

  'fund.pyrolysis.title': 'Pirólisis y longitud de pirólisis (l_p)',
  'fund.pyrolysis.body': 'La pirólisis es cuando el calor descompone el sólido en gases que luego arden. La longitud de pirólisis es la distancia entre el frente de pirólisis y la base de la llama; no es lo mismo que el largo visible de la llama.',
  'fund.pyrolysis.where': 'Hallazgo F-urban2019-016: definición de la fuente.',

  'fund.limitingLength.title': 'Longitud límite y extinción',
  'fund.limitingLength.body': 'Con flujo concurrente la llama puede dejar de crecer y estabilizarse en un tamaño máximo (longitud límite). Si las condiciones empeoran, puede apagarse (extinción).',
  'fund.limitingLength.analogy': 'Como una cola que llega a equilibrio: entra tanto como sale y su tamaño deja de crecer.',
  'fund.limitingLength.where': 'Hallazgo F-urban2019-004: longitud límite en la muestra de PMMA.',

  'fund.oxygenPressure.title': 'Concentración de oxígeno y presión',
  'fund.oxygenPressure.body': 'Más oxígeno o más presión suelen favorecer la llama. La fuente indica que estos factores, entre otros, afectan la propagación y pide más investigación.',
  'fund.oxygenPressure.where': 'Comparación: O₂ (%) y presión (atm) cuando la fuente los reporta.',

  'fund.materials.title': 'Los materiales ensayados',
  'fund.materials.body': 'Silicona, tela SIBAL, PMMA estructurado y plano, y una muestra PMMA a Nomex. El espesor importa: una muestra fina y una gruesa arden de forma distinta.',
  'fund.materials.where': 'Comparación: material y espesor (mm) de cada muestra.',

  'fund.digitalImages.title': 'Imágenes como datos',
  'fund.digitalImages.body': 'Cada fotograma es una matriz de píxeles con intensidad de 8 bits (0–255). Con la cadencia de la cámara y el tiempo de cada archivo se ordenan en una serie temporal.',
  'fund.digitalImages.analogy': 'Un fotograma es un array de uint8; una secuencia es una serie temporal indexada por timestamp.',
  'fund.digitalImages.where': 'Visor: fotograma, tiempo relativo y métricas de brillo.',

  'fund.timeGaps.title': 'Marcas de tiempo y huecos',
  'fund.timeGaps.body': 'Si faltan fotogramas entre dos tiempos hay un hueco. No se debe calcular una velocidad sobre una serie con huecos: la división usaría un tiempo que no se observó.',
  'fund.timeGaps.analogy': 'Como métricas con muestras perdidas: un rate() sobre datos faltantes da un número engañoso.',
  'fund.timeGaps.where': 'Evidencia: columna de huecos y calidad temporal de cada secuencia.',

  'fund.calibration.title': 'Calibración: píxeles no son centímetros',
  'fund.calibration.body': 'Convertir píxeles a milímetros exige una referencia validada (rejillas de distorsión, posición de la cámara). Sin ella, cualquier largo de imagen queda en píxeles.',
  'fund.calibration.analogy': 'Un número sin unidad es como un timestamp sin zona horaria: parece exacto pero no se puede comparar.',
  'fund.calibration.where': 'Limitaciones: estado de la calibración.',

  'fund.dimensionless.title': 'Números adimensionales (eta_g, R0)',
  'fund.dimensionless.body': 'Son cocientes sin unidades que resumen un régimen. eta_g compara la velocidad del gas con una velocidad de referencia de la llama; R0 resume cuánto pesa la radiación. Permiten comparar casos de distinta escala.',
  'fund.dimensionless.analogy': 'Como expresar uso de CPU en porcentaje en vez de ciclos: normalizar permite comparar máquinas distintas.',
  'fund.dimensionless.where': 'Reconstrucción 3D, modo experto: modelo matemático sin validación experimental.',

  'fund.citations.title': 'Cómo leer una cita en esta app',
  'fund.citations.body': 'Cada hallazgo muestra un ID (por ejemplo F-urban2019-001), el archivo fuente y la página o tabla. Si un dato no tiene cita, no es un resultado de la fuente.',
  'fund.citations.analogy': 'Como un commit hash: permite volver al origen exacto de un cambio.',
  'fund.citations.where': 'Hallazgos: ID, archivo y ubicación en cada tarjeta.',
}

const en: Record<keyof typeof es, string> = {
  'fund.title': 'Fundamentals: the minimum to read this data',
  'fund.intro': 'Prerequisite concepts for someone who writes software but never studied combustion. Each one says where it appears in the app and where it comes from.',
  'fund.path': 'Suggested study order',
  'fund.analogyLabel': 'Software analogy',
  'fund.whereLabel': 'Where you see it in the app',
  'fund.open': 'Open →',
  'fund.phase.combustion': '1. How things burn and why gravity matters',
  'fund.phase.spread': '2. How flame spread is measured',
  'fund.phase.images': '3. Images as data',
  'fund.phase.reading': '4. Models and citations',

  'fund.fireTriangle.title': 'Fire triangle',
  'fund.fireTriangle.body': 'A flame needs fuel, oxygen and heat. Removing any of the three puts it out.',
  'fund.fireTriangle.analogy': 'Like a process that needs CPU, memory and input data: if one is missing, it stops.',
  'fund.fireTriangle.where': 'Findings: each result states which material burned and under which conditions.',

  'fund.buoyancy.title': 'Buoyancy (and why it vanishes)',
  'fund.buoyancy.body': 'On Earth hot gas is lighter and rises, renewing the air around the flame. In orbit everything falls together and that effect almost disappears; the flame depends on the air that ventilation brings.',
  'fund.buoyancy.analogy': 'Moving from a system with automatic push to one that only gets data when someone asks for it (polling).',
  'fund.buoyancy.where': 'Evidence: real frames of flames in microgravity.',

  'fund.forcedFlow.title': 'Forced flow: opposed and concurrent',
  'fund.forcedFlow.body': 'Without buoyancy, a fan moves the air. If the flame spreads against that air it is opposed spread; with it, concurrent spread. They are different regimes.',
  'fund.forcedFlow.analogy': 'Like reading a log from the start or from the end: same data, different path and cost.',
  'fund.forcedFlow.where': 'Compare: airflow (cm/s) and igniter position per sample.',

  'fund.spreadRate.title': 'Flame spread rate (Vf)',
  'fund.spreadRate.body': 'How far the flame front advances per unit time, in mm/s. It is a result published by the authors; this app does not recompute it from the images.',
  'fund.spreadRate.analogy': 'It is a throughput: distance processed per second.',
  'fund.spreadRate.where': 'Finding F-urban2019-001: published spread rate for Sample 5.',

  'fund.pyrolysis.title': 'Pyrolysis and pyrolysis length (l_p)',
  'fund.pyrolysis.body': 'Pyrolysis is heat breaking the solid down into gases that then burn. The pyrolysis length is the distance between the pyrolysis front and the flame base; it is not the same as the visible flame length.',
  'fund.pyrolysis.where': 'Finding F-urban2019-016: the source’s definition.',

  'fund.limitingLength.title': 'Limiting length and extinction',
  'fund.limitingLength.body': 'With concurrent flow the flame can stop growing and settle at a maximum size (limiting length). If conditions get worse, it can go out (extinction).',
  'fund.limitingLength.analogy': 'Like a queue reaching equilibrium: as much goes in as goes out, so its size stops growing.',
  'fund.limitingLength.where': 'Finding F-urban2019-004: limiting length on the PMMA sample.',

  'fund.oxygenPressure.title': 'Oxygen concentration and pressure',
  'fund.oxygenPressure.body': 'More oxygen or higher pressure usually favor the flame. The source states that these factors, among others, affect spread and calls for more research.',
  'fund.oxygenPressure.where': 'Compare: O₂ (%) and pressure (atm) when the source reports them.',

  'fund.materials.title': 'The tested materials',
  'fund.materials.body': 'Silicone, SIBAL fabric, structured and flat PMMA, and one PMMA-to-Nomex sample. Thickness matters: a thin and a thick sample burn differently.',
  'fund.materials.where': 'Compare: material and thickness (mm) of each sample.',

  'fund.digitalImages.title': 'Images as data',
  'fund.digitalImages.body': 'Each frame is a matrix of pixels with 8-bit intensity (0–255). The camera frame rate and each file’s time order them into a time series.',
  'fund.digitalImages.analogy': 'A frame is a uint8 array; a sequence is a time series indexed by timestamp.',
  'fund.digitalImages.where': 'Viewer: frame, relative time and brightness metrics.',

  'fund.timeGaps.title': 'Timestamps and gaps',
  'fund.timeGaps.body': 'If frames are missing between two times there is a gap. Do not compute a speed over a series with gaps: the division would use time that was never observed.',
  'fund.timeGaps.analogy': 'Like metrics with dropped samples: a rate() over missing data gives a misleading number.',
  'fund.timeGaps.where': 'Evidence: gap count and temporal quality of each sequence.',

  'fund.calibration.title': 'Calibration: pixels are not centimeters',
  'fund.calibration.body': 'Converting pixels to millimeters needs a validated reference (distortion grids, camera position). Without it, any image length stays in pixels.',
  'fund.calibration.analogy': 'A number without a unit is like a timestamp without a time zone: it looks exact but cannot be compared.',
  'fund.calibration.where': 'Limitations: calibration status.',

  'fund.dimensionless.title': 'Dimensionless numbers (eta_g, R0)',
  'fund.dimensionless.body': 'Unitless ratios that summarize a regime. eta_g compares the gas speed with a reference flame speed; R0 summarizes how much radiation matters. They let you compare cases at different scales.',
  'fund.dimensionless.analogy': 'Like expressing CPU usage as a percentage instead of cycles: normalizing lets you compare different machines.',
  'fund.dimensionless.where': '3D reconstruction, expert mode: mathematical model without experimental validation.',

  'fund.citations.title': 'How to read a citation in this app',
  'fund.citations.body': 'Each finding shows an ID (for example F-urban2019-001), the source file and the page or table. If a value has no citation, it is not a source result.',
  'fund.citations.analogy': 'Like a commit hash: it takes you back to the exact origin of a change.',
  'fund.citations.where': 'Findings: ID, file and location on every card.',
}

export const fundamentalsMessages = { es, en }
