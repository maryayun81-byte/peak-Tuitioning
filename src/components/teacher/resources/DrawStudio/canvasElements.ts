type ExcalidrawElement = Record<string, any>

function rng() {
  return Math.floor(Math.random() * 1_000_000) + 1
}

function base(type: string, x: number, y: number, w: number, h: number, overrides: Record<string, any> = {}): ExcalidrawElement {
  return {
    id: `el-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    x, y, width: w, height: h,
    strokeColor: '#000000',
    backgroundColor: 'transparent',
    fillStyle: 'solid',
    strokeWidth: 2,
    strokeStyle: 'solid',
    roughness: 0,
    opacity: 100,
    groupIds: [],
    roundness: null,
    seed: rng(),
    version: 1,
    versionNonce: rng(),
    isDeleted: false,
    boundElements: null,
    updated: Date.now(),
    link: null,
    locked: false,
    ...overrides,
  }
}

function rect(x: number, y: number, w: number, h: number, overrides: any = {}): ExcalidrawElement {
  return base('rectangle', x, y, w, h, overrides)
}

function ellipse(x: number, y: number, w: number, h: number, overrides: any = {}): ExcalidrawElement {
  return base('ellipse', x, y, w, h, overrides)
}

function line(x: number, y: number, points: number[][], overrides: any = {}): ExcalidrawElement {
  const xs = points.map(p => p[0]); const ys = points.map(p => p[1])
  const w = Math.max(...xs) - Math.min(...xs) || 1; const h = Math.max(...ys) - Math.min(...ys) || 1
  return base('line', x, y, w, h, { points, ...overrides })
}

function arrow(x: number, y: number, points: number[][], overrides: any = {}): ExcalidrawElement {
  const xs = points.map(p => p[0]); const ys = points.map(p => p[1])
  const w = Math.max(...xs) - Math.min(...xs) || 1; const h = Math.max(...ys) - Math.min(...ys) || 1
  return base('arrow', x, y, w, h, { points, ...overrides })
}

function text(x: number, y: number, w: number, h: number, content: string, fontSize = 16, overrides: any = {}): ExcalidrawElement {
  return base('text', x, y, w, h, {
    text: content, fontSize, fontFamily: 1, textAlign: 'center', verticalAlign: 'middle', baseline: 14,
    strokeColor: '#000000', ...overrides,
  })
}

function freedraw(x: number, y: number, points: number[][], overrides: any = {}): ExcalidrawElement {
  const xs = points.map(p => p[0]); const ys = points.map(p => p[1])
  const w = Math.max(...xs) - Math.min(...xs) || 1; const h = Math.max(...ys) - Math.min(...ys) || 1
  return base('freedraw', x, y, w, h, { points, ...overrides })
}

// ────────────────────────────────────────────────────────────────────
// CHEMISTRY ARROWS
// ────────────────────────────────────────────────────────────────────

export function createReactionArrow(x: number, y: number, length = 150): ExcalidrawElement[] {
  return [
    arrow(x, y, [[0, 0], [length, 0]], { strokeWidth: 3, strokeColor: '#333333' }),
    text(x + length / 2 - 30, y - 30, 60, 18, '→', 16, { strokeColor: '#333333' }),
  ]
}

export function createEquilibriumArrow(x: number, y: number, length = 120): ExcalidrawElement[] {
  return [
    arrow(x, y, [[0, 0], [length, 0]], { strokeWidth: 3, strokeColor: '#333333' }),
    arrow(x + length, y, [[0, 0], [-length, 0]], { strokeWidth: 2, strokeColor: '#666666' }),
    text(x + length / 2 - 20, y - 30, 40, 18, '⇌', 16, { strokeColor: '#666666' }),
  ]
}

export function createCurvedArrow(x: number, y: number): ExcalidrawElement[] {
  return [
    line(x, y, [[0, 0], [40, -30], [80, 0]], { strokeWidth: 3, strokeColor: '#333333', roughness: 0 }),
    arrow(x + 80, y, [[0, 0], [0, 0]], { strokeWidth: 3, strokeColor: '#333333' }),
  ]
}

export function createDoubleArrow(x: number, y: number, length = 100): ExcalidrawElement[] {
  return [
    arrow(x, y - 6, [[0, 0], [length, 0]], { strokeWidth: 3, strokeColor: '#333333' }),
    arrow(x, y + 6, [[0, 0], [length, 0]], { strokeWidth: 3, strokeColor: '#333333' }),
  ]
}

// ────────────────────────────────────────────────────────────────────
// ANNOTATION ELEMENTS
// ────────────────────────────────────────────────────────────────────

export function createCalloutBox(x: number, y: number, text_: string, color = '#4f46e5'): ExcalidrawElement[] {
  const w = 200; const h = 60
  return [
    rect(x, y, w, h, { strokeColor: color, backgroundColor: `${color}10`, strokeWidth: 2, roundness: { type: 3 } }),
    text(x + 10, y + 8, w - 20, h - 16, text_, 12, { strokeColor: color, textAlign: 'left' }),
    arrow(x, y + h / 2, [[0, 0], [-40, 0]], { strokeColor: color, strokeWidth: 2 }),
  ]
}

export function createStickyNote(x: number, y: number, text_: string): ExcalidrawElement[] {
  const w = 180; const h = 140
  return [
    rect(x, y, w, h, {
      backgroundColor: '#fef3c7', fillStyle: 'solid', strokeColor: '#f59e0b', strokeWidth: 2, roundness: { type: 3 },
    }),
    text(x + 10, y + 8, w - 20, h - 16, text_, 14, { strokeColor: '#92400e', textAlign: 'left', verticalAlign: 'top' }),
  ]
}

export function createObservationBox(x: number, y: number, text_: string): ExcalidrawElement[] {
  const w = 220; const h = 100
  return [
    rect(x, y, w, h, { strokeColor: '#2563eb', backgroundColor: '#eff6ff', fillStyle: 'solid', strokeWidth: 2, roundness: { type: 3 } }),
    rect(x, y, w, 28, { strokeColor: '#2563eb', backgroundColor: '#2563eb', fillStyle: 'solid', strokeWidth: 1, roundness: null }),
    text(x + 8, y, w - 16, 28, '🔬 OBSERVATION', 11, { strokeColor: '#ffffff', textAlign: 'left', fontFamily: 1 }),
    text(x + 10, y + 34, w - 20, h - 40, text_, 12, { strokeColor: '#1e3a5f', textAlign: 'left', verticalAlign: 'top' }),
  ]
}

export function createInferenceBox(x: number, y: number, text_: string): ExcalidrawElement[] {
  const w = 220; const h = 100
  return [
    rect(x, y, w, h, { strokeColor: '#059669', backgroundColor: '#ecfdf5', fillStyle: 'solid', strokeWidth: 2, roundness: { type: 3 } }),
    rect(x, y, w, 28, { strokeColor: '#059669', backgroundColor: '#059669', fillStyle: 'solid', strokeWidth: 1, roundness: null }),
    text(x + 8, y, w - 16, 28, '💡 INFERENCE', 11, { strokeColor: '#ffffff', textAlign: 'left', fontFamily: 1 }),
    text(x + 10, y + 34, w - 20, h - 40, text_, 12, { strokeColor: '#064e3b', textAlign: 'left', verticalAlign: 'top' }),
  ]
}

export function createWarningBox(x: number, y: number, text_: string): ExcalidrawElement[] {
  const w = 220; const h = 80
  return [
    rect(x, y, w, h, { strokeColor: '#dc2626', backgroundColor: '#fef2f2', fillStyle: 'solid', strokeWidth: 2, roundness: { type: 3 } }),
    text(x + 10, y + 10, w - 20, h - 20, `⚠️ ${text_}`, 13, { strokeColor: '#991b1b', textAlign: 'left', verticalAlign: 'top' }),
  ]
}

export function createHighlighterStroke(x: number, y: number, width = 300): ExcalidrawElement[] {
  return [
    freedraw(x, y, [[0, 0], [width / 3, -15], [(width / 3) * 2, 8], [width, -10]], {
      strokeColor: '#fde047', backgroundColor: '#fde04788', fillStyle: 'solid', strokeWidth: 30, opacity: 40, roughness: 1,
    }),
  ]
}

export function createExaminerNote(x: number, y: number, text_: string): ExcalidrawElement[] {
  const w = 240; const h = 70
  return [
    rect(x, y, w, h, { strokeColor: '#7c3aed', backgroundColor: '#f5f3ff', fillStyle: 'solid', strokeWidth: 2, roundness: { type: 3 }, strokeStyle: 'dashed' }),
    text(x + 10, y + 8, w - 20, h - 16, `📝 ${text_}`, 12, { strokeColor: '#5b21b6', textAlign: 'left', verticalAlign: 'top' }),
  ]
}

// ────────────────────────────────────────────────────────────────────
// CANVAS INSERTION HELPERS
// ────────────────────────────────────────────────────────────────────

export function insertElements(excalidrawApi: any, els: ExcalidrawElement[]) {
  if (!excalidrawApi) return
  try {
    const sceneElements = excalidrawApi.getSceneElements() || []
    excalidrawApi.updateScene({
      elements: [...sceneElements, ...els],
      appState: { ...excalidrawApi.getAppState() },
    })
  } catch (e) {
    console.warn('Failed to insert elements:', e)
  }
}

export function getCanvasCenter(excalidrawApi: any): { x: number; y: number } {
  if (!excalidrawApi) return { x: 500, y: 300 }
  try {
    const state = excalidrawApi.getAppState()
    return {
      x: (state?.offsetLeft || 0) + (state?.width || 1200) / 2,
      y: (state?.offsetTop || 0) + (state?.height || 800) / 2,
    }
  } catch {
    return { x: 500, y: 300 }
  }
}
