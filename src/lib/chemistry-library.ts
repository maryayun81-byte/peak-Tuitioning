// Chemistry Apparatus Vector Library for Excalidraw
// Generated: 2026-06-20
// Exports: chemistryLibraryItems, chemistryTemplates

export type ExcalidrawElementType =
  | 'rectangle'
  | 'ellipse'
  | 'line'
  | 'arrow'
  | 'text'
  | 'freedraw';

export interface ExcalidrawElement {
  id: string;
  type: ExcalidrawElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  strokeColor: string;
  backgroundColor: string;
  fillStyle: 'solid' | 'hachure' | 'cross-hatch' | 'zigzag' | 'dots' | 'dashed' | 'zigzag-line';
  strokeWidth: number;
  strokeStyle: 'solid' | 'dashed' | 'dotted';
  roughness: number;
  opacity: number;
  groupIds: string[];
  roundness: null | { type: number; value?: number };
  seed: number;
  version: number;
  versionNonce: number;
  isDeleted: boolean;
  boundElements: null;
  updated: number;
  link: null;
  locked: boolean;
  // line/arrow only
  points?: number[][];
  // text only
  text?: string;
  fontSize?: number;
  fontFamily?: number;
  textAlign?: string;
  verticalAlign?: string;
  baseline?: number;
}

export interface ChemistryLibraryItem {
  id: string;
  status: 'published';
  created: number;
  elements: ExcalidrawElement[];
}

export interface ChemistryTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  elements: ExcalidrawElement[];
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: base element defaults
// ─────────────────────────────────────────────────────────────────────────────
function base(
  id: string,
  type: ExcalidrawElementType,
  x: number,
  y: number,
  width: number,
  height: number,
  overrides: Partial<ExcalidrawElement> = {}
): ExcalidrawElement {
  return {
    id,
    type,
    x,
    y,
    width,
    height,
    strokeColor: '#000000',
    backgroundColor: 'transparent',
    fillStyle: 'solid',
    strokeWidth: 2,
    strokeStyle: 'solid',
    roughness: 0,
    opacity: 100,
    groupIds: [],
    roundness: null,
    seed: Math.floor(Math.random() * 1_000_000) + 1,
    version: 1,
    versionNonce: Math.floor(Math.random() * 1_000_000) + 1,
    isDeleted: false,
    boundElements: null,
    updated: 1,
    link: null,
    locked: false,
    ...overrides,
  };
}

function rect(
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  overrides: Partial<ExcalidrawElement> = {}
): ExcalidrawElement {
  return base(id, 'rectangle', x, y, w, h, overrides);
}

function ellipse(
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  overrides: Partial<ExcalidrawElement> = {}
): ExcalidrawElement {
  return base(id, 'ellipse', x, y, w, h, overrides);
}

function line(
  id: string,
  x: number,
  y: number,
  points: number[][],
  overrides: Partial<ExcalidrawElement> = {}
): ExcalidrawElement {
  const xs = points.map(p => p[0]);
  const ys = points.map(p => p[1]);
  const w = Math.max(...xs) - Math.min(...xs) || 1;
  const h = Math.max(...ys) - Math.min(...ys) || 1;
  return base(id, 'line', x, y, w, h, { points, ...overrides });
}

function arrow(
  id: string,
  x: number,
  y: number,
  points: number[][],
  overrides: Partial<ExcalidrawElement> = {}
): ExcalidrawElement {
  const xs = points.map(p => p[0]);
  const ys = points.map(p => p[1]);
  const w = Math.max(...xs) - Math.min(...xs) || 1;
  const h = Math.max(...ys) - Math.min(...ys) || 1;
  return base(id, 'arrow', x, y, w, h, { points, ...overrides });
}

function text(
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  content: string,
  fontSize = 14,
  overrides: Partial<ExcalidrawElement> = {}
): ExcalidrawElement {
  return base(id, 'text', x, y, w, h, {
    text: content,
    fontSize,
    fontFamily: 1,
    textAlign: 'center',
    verticalAlign: 'middle',
    baseline: 10,
    strokeColor: '#000000',
    ...overrides,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. BEAKER
// wide cylinder with top rim ellipse and spout
// ─────────────────────────────────────────────────────────────────────────────
const beakerElements: ExcalidrawElement[] = [
  // Body (trapezoid-like: left wall, right wall, bottom)
  line('el-beaker-left', 10, 20, [[0, 0], [0, 120]], { strokeWidth: 3 }),
  line('el-beaker-right', 90, 20, [[0, 0], [0, 120]], { strokeWidth: 3 }),
  line('el-beaker-bottom', 10, 140, [[0, 0], [80, 0]], { strokeWidth: 3 }),
  // Top rim ellipse
  ellipse('el-beaker-rim', 10, 12, 80, 16, { strokeWidth: 2 }),
  // Spout notch on top-left
  line('el-beaker-spout', 10, 20, [[0, 0], [-8, -14]], { strokeWidth: 2 }),
  line('el-beaker-spout2', 2, 6, [[0, 0], [14, 0]], { strokeWidth: 2 }),
  // Volume line
  line('el-beaker-vol', 18, 100, [[0, 0], [64, 0]], { strokeWidth: 1, strokeStyle: 'dashed' }),
];

// ─────────────────────────────────────────────────────────────────────────────
// 2. CONICAL FLASK (Erlenmeyer)
// wide base tapering to narrow neck
// ─────────────────────────────────────────────────────────────────────────────
const conicalFlaskElements: ExcalidrawElement[] = [
  // Bottom ellipse
  ellipse('el-cf-bottom', 5, 140, 100, 20, { backgroundColor: '#e8f4f8', fillStyle: 'solid' }),
  // Left wall (slanted)
  line('el-cf-left', 5, 50, [[0, 90], [30, 0]], { strokeWidth: 3 }),
  // Right wall (slanted)
  line('el-cf-right', 75, 50, [[0, 0], [30, 90]], { strokeWidth: 3 }),
  // Neck left
  line('el-cf-necl', 35, 10, [[0, 40], [0, 0]], { strokeWidth: 3 }),
  // Neck right
  line('el-cf-necr', 75, 10, [[0, 0], [0, 40]], { strokeWidth: 3 }),
  // Neck rim ellipse
  ellipse('el-cf-rim', 33, 5, 44, 12, { strokeWidth: 2 }),
  // Bottom line
  line('el-cf-base', 5, 155, [[0, 0], [100, 0]], { strokeWidth: 3 }),
];

// ─────────────────────────────────────────────────────────────────────────────
// 3. ROUND-BOTTOM FLASK
// sphere body with narrow neck
// ─────────────────────────────────────────────────────────────────────────────
const roundBottomFlaskElements: ExcalidrawElement[] = [
  // Sphere body
  ellipse('el-rbf-body', 5, 40, 100, 100, { backgroundColor: '#e8f4f8', fillStyle: 'solid', strokeWidth: 2 }),
  // Neck left
  line('el-rbf-necl', 37, 5, [[0, 40], [0, 0]], { strokeWidth: 3 }),
  // Neck right
  line('el-rbf-necr', 73, 5, [[0, 0], [0, 40]], { strokeWidth: 3 }),
  // Rim ellipse
  ellipse('el-rbf-rim', 35, 0, 40, 12, { strokeWidth: 2 }),
];

// ─────────────────────────────────────────────────────────────────────────────
// 4. TEST TUBE
// long tube with rounded (closed) bottom
// ─────────────────────────────────────────────────────────────────────────────
const testTubeElements: ExcalidrawElement[] = [
  // Left wall
  line('el-tt-left', 20, 10, [[0, 0], [0, 130]], { strokeWidth: 3 }),
  // Right wall
  line('el-tt-right', 50, 10, [[0, 0], [0, 130]], { strokeWidth: 3 }),
  // Top rim ellipse
  ellipse('el-tt-rim', 18, 5, 34, 12, { strokeWidth: 2 }),
  // Rounded bottom (ellipse half)
  ellipse('el-tt-bottom', 18, 122, 34, 24, { strokeWidth: 2, backgroundColor: 'transparent' }),
];

// ─────────────────────────────────────────────────────────────────────────────
// 5. BOILING TUBE
// like test tube but wider
// ─────────────────────────────────────────────────────────────────────────────
const boilingTubeElements: ExcalidrawElement[] = [
  line('el-bt-left', 10, 10, [[0, 0], [0, 150]], { strokeWidth: 3 }),
  line('el-bt-right', 60, 10, [[0, 0], [0, 150]], { strokeWidth: 3 }),
  ellipse('el-bt-rim', 8, 5, 54, 14, { strokeWidth: 2 }),
  ellipse('el-bt-bottom', 8, 138, 54, 28, { strokeWidth: 2 }),
];

// ─────────────────────────────────────────────────────────────────────────────
// 6. BUNSEN BURNER
// barrel body, collar, base, flame
// ─────────────────────────────────────────────────────────────────────────────
const bunsenBurnerElements: ExcalidrawElement[] = [
  // Base (flat heavy trapezoid)
  rect('el-bb-base', 0, 150, 90, 18, { backgroundColor: '#555555', fillStyle: 'solid', strokeColor: '#222222' }),
  // Barrel (tube body)
  rect('el-bb-barrel', 30, 50, 30, 100, { backgroundColor: '#888888', fillStyle: 'solid', strokeColor: '#444444' }),
  // Collar (ring)
  rect('el-bb-collar', 25, 80, 40, 14, { backgroundColor: '#aaaaaa', fillStyle: 'solid', strokeColor: '#333333' }),
  // Barrel top rim ellipse
  ellipse('el-bb-top', 28, 43, 34, 14, { strokeWidth: 2 }),
  // Air hole
  ellipse('el-bb-hole', 40, 116, 10, 6, { backgroundColor: '#222222', fillStyle: 'solid' }),
  // Flame (orange/blue ellipse)
  ellipse('el-bb-flame-blue', 34, 20, 22, 28, { backgroundColor: '#3399ff', fillStyle: 'solid', strokeColor: '#0055cc', opacity: 90 }),
  ellipse('el-bb-flame-orange', 36, 8, 18, 22, { backgroundColor: '#ff8800', fillStyle: 'solid', strokeColor: '#cc4400', opacity: 90 }),
  ellipse('el-bb-flame-tip', 40, 2, 10, 12, { backgroundColor: '#ffee00', fillStyle: 'solid', strokeColor: '#ff9900', opacity: 80 }),
];

// ─────────────────────────────────────────────────────────────────────────────
// 7. TRIPOD STAND
// three legs meeting at a ring top
// ─────────────────────────────────────────────────────────────────────────────
const tripodStandElements: ExcalidrawElement[] = [
  // Ring at top
  ellipse('el-tri-ring', 25, 10, 60, 20, { strokeWidth: 3 }),
  // Left leg
  line('el-tri-legl', 55, 30, [[0, 0], [-45, 120]], { strokeWidth: 3 }),
  // Right leg
  line('el-tri-legr', 55, 30, [[0, 0], [45, 120]], { strokeWidth: 3 }),
  // Center leg (back)
  line('el-tri-legc', 55, 30, [[0, 0], [0, 120]], { strokeWidth: 2, strokeStyle: 'dashed' }),
  // Feet
  line('el-tri-footl', 10, 150, [[-10, 0], [10, 0]], { strokeWidth: 3 }),
  line('el-tri-footr', 90, 150, [[-10, 0], [10, 0]], { strokeWidth: 3 }),
  line('el-tri-footc', 45, 150, [[-10, 0], [10, 0]], { strokeWidth: 2 }),
];

// ─────────────────────────────────────────────────────────────────────────────
// 8. WIRE GAUZE
// rectangle with crossed lines pattern
// ─────────────────────────────────────────────────────────────────────────────
const wireGauzeElements: ExcalidrawElement[] = [
  // Frame
  rect('el-wg-frame', 0, 0, 100, 80, { strokeWidth: 2, fillStyle: 'hachure', backgroundColor: '#dddddd' }),
  // Horizontal lines
  line('el-wg-h1', 0, 20, [[0, 0], [100, 0]], { strokeWidth: 1 }),
  line('el-wg-h2', 0, 40, [[0, 0], [100, 0]], { strokeWidth: 1 }),
  line('el-wg-h3', 0, 60, [[0, 0], [100, 0]], { strokeWidth: 1 }),
  // Vertical lines
  line('el-wg-v1', 25, 0, [[0, 0], [0, 80]], { strokeWidth: 1 }),
  line('el-wg-v2', 50, 0, [[0, 0], [0, 80]], { strokeWidth: 1 }),
  line('el-wg-v3', 75, 0, [[0, 0], [0, 80]], { strokeWidth: 1 }),
  // Diagonal cross lines (mesh look)
  line('el-wg-d1', 0, 0, [[0, 0], [25, 20]], { strokeWidth: 1 }),
  line('el-wg-d2', 25, 0, [[0, 0], [25, 20]], { strokeWidth: 1 }),
  line('el-wg-d3', 50, 0, [[0, 0], [25, 20]], { strokeWidth: 1 }),
  line('el-wg-d4', 75, 0, [[0, 0], [25, 20]], { strokeWidth: 1 }),
];

// ─────────────────────────────────────────────────────────────────────────────
// 9. EVAPORATING DISH
// wide shallow bowl shape
// ─────────────────────────────────────────────────────────────────────────────
const evaporatingDishElements: ExcalidrawElement[] = [
  // Bowl bottom ellipse
  ellipse('el-ed-inner', 10, 25, 100, 30, { backgroundColor: '#f0f8ff', fillStyle: 'solid' }),
  // Left rim
  line('el-ed-left', 5, 30, [[0, 0], [10, 20]], { strokeWidth: 3 }),
  // Right rim
  line('el-ed-right', 105, 30, [[0, 0], [-10, 20]], { strokeWidth: 3 }),
  // Top rim ellipse
  ellipse('el-ed-top', 0, 20, 120, 22, { strokeWidth: 2 }),
  // Bottom ellipse
  ellipse('el-ed-base', 10, 45, 100, 16, { strokeWidth: 2 }),
];

// ─────────────────────────────────────────────────────────────────────────────
// 10. FILTER FUNNEL
// triangle on top + stem below
// ─────────────────────────────────────────────────────────────────────────────
const filterFunnelElements: ExcalidrawElement[] = [
  // Cone left
  line('el-ff-left', 5, 10, [[0, 0], [40, 70]], { strokeWidth: 3 }),
  // Cone right
  line('el-ff-right', 105, 10, [[0, 0], [-40, 70]], { strokeWidth: 3 }),
  // Top rim ellipse
  ellipse('el-ff-rim', 3, 5, 104, 16, { strokeWidth: 2 }),
  // Cone bottom ellipse
  ellipse('el-ff-neck', 40, 73, 30, 10, { strokeWidth: 2 }),
  // Stem
  line('el-ff-stem', 55, 82, [[0, 0], [0, 50]], { strokeWidth: 3 }),
  // Stem tip
  ellipse('el-ff-tip', 50, 128, 10, 6, { strokeWidth: 2 }),
];

// ─────────────────────────────────────────────────────────────────────────────
// 11. SEPARATING FUNNEL
// pear shape with stopcock at bottom
// ─────────────────────────────────────────────────────────────────────────────
const separatingFunnelElements: ExcalidrawElement[] = [
  // Pear body
  ellipse('el-sf-body', 10, 20, 80, 90, { backgroundColor: '#e8f4f8', fillStyle: 'solid', strokeWidth: 2 }),
  // Top neck
  line('el-sf-necl', 38, 5, [[0, 20], [0, 0]], { strokeWidth: 2 }),
  line('el-sf-necr', 62, 5, [[0, 0], [0, 20]], { strokeWidth: 2 }),
  // Top rim
  ellipse('el-sf-rim', 36, 0, 28, 10, { strokeWidth: 2 }),
  // Bottom cone to stopcock
  line('el-sf-conel', 30, 108, [[0, 0], [20, 30]], { strokeWidth: 2 }),
  line('el-sf-coner', 70, 108, [[0, 0], [-20, 30]], { strokeWidth: 2 }),
  // Stopcock handle
  rect('el-sf-cock', 38, 135, 24, 8, { backgroundColor: '#555555', fillStyle: 'solid' }),
  // Stem below stopcock
  line('el-sf-stem', 50, 143, [[0, 0], [0, 30]], { strokeWidth: 3 }),
  // Liquid level line
  line('el-sf-liq', 18, 80, [[0, 0], [64, 0]], { strokeWidth: 1, strokeStyle: 'dashed', strokeColor: '#2266aa' }),
];

// ─────────────────────────────────────────────────────────────────────────────
// 12. BURETTE
// long narrow tube with tap at bottom + scale markings
// ─────────────────────────────────────────────────────────────────────────────
const buretteElements: ExcalidrawElement[] = [
  // Tube left wall
  line('el-bu-left', 30, 5, [[0, 0], [0, 180]], { strokeWidth: 2 }),
  // Tube right wall
  line('el-bu-right', 50, 5, [[0, 0], [0, 180]], { strokeWidth: 2 }),
  // Top rim
  ellipse('el-bu-rim', 28, 0, 24, 10, { strokeWidth: 2 }),
  // Tap (stopcock)
  rect('el-bu-tap', 22, 178, 36, 10, { backgroundColor: '#555555', fillStyle: 'solid' }),
  // Tap handle
  line('el-bu-taphandle', 55, 183, [[0, 0], [20, 0]], { strokeWidth: 3 }),
  // Tip
  line('el-bu-tipl', 36, 188, [[0, 0], [-4, 16]], { strokeWidth: 2 }),
  line('el-bu-tipr', 44, 188, [[0, 0], [4, 16]], { strokeWidth: 2 }),
  line('el-bu-tipend', 32, 204, [[0, 0], [16, 0]], { strokeWidth: 2 }),
  // Scale markings
  line('el-bu-s1', 50, 30, [[0, 0], [8, 0]], { strokeWidth: 1 }),
  line('el-bu-s2', 50, 60, [[0, 0], [8, 0]], { strokeWidth: 1 }),
  line('el-bu-s3', 50, 90, [[0, 0], [8, 0]], { strokeWidth: 1 }),
  line('el-bu-s4', 50, 120, [[0, 0], [8, 0]], { strokeWidth: 1 }),
  line('el-bu-s5', 50, 150, [[0, 0], [8, 0]], { strokeWidth: 1 }),
  text('el-bu-n1', 60, 24, 20, 14, '10', 10),
  text('el-bu-n2', 60, 54, 20, 14, '20', 10),
  text('el-bu-n3', 60, 84, 20, 14, '30', 10),
  text('el-bu-n4', 60, 114, 20, 14, '40', 10),
  text('el-bu-n5', 60, 144, 20, 14, '50', 10),
];

// ─────────────────────────────────────────────────────────────────────────────
// 13. PIPETTE
// bulb in middle with tip at bottom
// ─────────────────────────────────────────────────────────────────────────────
const pipetteElements: ExcalidrawElement[] = [
  // Top stem
  line('el-pi-topl', 27, 0, [[0, 0], [0, 40]], { strokeWidth: 2 }),
  line('el-pi-topr', 43, 0, [[0, 0], [0, 40]], { strokeWidth: 2 }),
  // Top rim
  ellipse('el-pi-rim', 25, -5, 20, 8, { strokeWidth: 1 }),
  // Bulb
  ellipse('el-pi-bulb', 10, 38, 50, 55, { backgroundColor: '#e8f4f8', fillStyle: 'solid', strokeWidth: 2 }),
  // Lower stem
  line('el-pi-botl', 26, 92, [[0, 0], [0, 55]], { strokeWidth: 2 }),
  line('el-pi-botr', 44, 92, [[0, 0], [0, 55]], { strokeWidth: 2 }),
  // Taper to tip
  line('el-pi-tapl', 26, 147, [[0, 0], [7, 25]], { strokeWidth: 2 }),
  line('el-pi-tapr', 44, 147, [[0, 0], [-7, 25]], { strokeWidth: 2 }),
  // Tip end
  line('el-pi-tipend', 33, 172, [[0, 0], [4, 0]], { strokeWidth: 2 }),
  // Fill line on bulb
  line('el-pi-fill', 14, 70, [[0, 0], [42, 0]], { strokeWidth: 1, strokeStyle: 'dashed', strokeColor: '#2266aa' }),
];

// ─────────────────────────────────────────────────────────────────────────────
// 14. MEASURING CYLINDER
// cylinder with graduated markings
// ─────────────────────────────────────────────────────────────────────────────
const measuringCylinderElements: ExcalidrawElement[] = [
  // Body
  line('el-mc-left', 15, 15, [[0, 0], [0, 160]], { strokeWidth: 3 }),
  line('el-mc-right', 75, 15, [[0, 0], [0, 160]], { strokeWidth: 3 }),
  // Top rim
  ellipse('el-mc-rim', 13, 8, 64, 16, { strokeWidth: 2 }),
  // Foot/base ellipse
  ellipse('el-mc-base', 5, 165, 80, 20, { strokeWidth: 2, backgroundColor: '#dddddd', fillStyle: 'solid' }),
  // Base bottom
  line('el-mc-basebot', 5, 175, [[0, 0], [80, 0]], { strokeWidth: 3 }),
  // Pour spout
  line('el-mc-spout', 15, 15, [[-15, 0], [0, 0]], { strokeWidth: 2 }),
  // Volume markings (right side)
  line('el-mc-m1', 75, 40, [[0, 0], [10, 0]], { strokeWidth: 1 }),
  line('el-mc-m2', 75, 65, [[0, 0], [10, 0]], { strokeWidth: 1 }),
  line('el-mc-m3', 75, 90, [[0, 0], [10, 0]], { strokeWidth: 1 }),
  line('el-mc-m4', 75, 115, [[0, 0], [10, 0]], { strokeWidth: 1 }),
  line('el-mc-m5', 75, 140, [[0, 0], [10, 0]], { strokeWidth: 1 }),
  text('el-mc-n1', 88, 34, 28, 14, '100', 10),
  text('el-mc-n2', 88, 59, 28, 14, '80', 10),
  text('el-mc-n3', 88, 84, 28, 14, '60', 10),
  text('el-mc-n4', 88, 109, 28, 14, '40', 10),
  text('el-mc-n5', 88, 134, 28, 14, '20', 10),
  // Liquid inside
  ellipse('el-mc-liq', 15, 100, 60, 12, { backgroundColor: '#aaddff', fillStyle: 'solid', strokeColor: '#2266aa' }),
];

// ─────────────────────────────────────────────────────────────────────────────
// 15. GAS JAR
// large wide jar, no spout
// ─────────────────────────────────────────────────────────────────────────────
const gasJarElements: ExcalidrawElement[] = [
  // Body walls
  line('el-gj-left', 10, 15, [[0, 0], [0, 150]], { strokeWidth: 3 }),
  line('el-gj-right', 100, 15, [[0, 0], [0, 150]], { strokeWidth: 3 }),
  // Base
  line('el-gj-base', 10, 165, [[0, 0], [90, 0]], { strokeWidth: 3 }),
  // Top rim (wide)
  ellipse('el-gj-rim', 8, 8, 94, 16, { strokeWidth: 2 }),
  // Inner bottom ellipse
  ellipse('el-gj-inner', 12, 158, 86, 14, { strokeWidth: 1 }),
];

// ─────────────────────────────────────────────────────────────────────────────
// 16. DELIVERY TUBE
// curved line/arc
// ─────────────────────────────────────────────────────────────────────────────
const deliveryTubeElements: ExcalidrawElement[] = [
  // Curved tube (approximated with multiple line segments)
  line('el-dt-seg1', 10, 10, [[0, 0], [40, 0]], { strokeWidth: 3 }),
  line('el-dt-seg2', 50, 10, [[0, 0], [20, 20]], { strokeWidth: 3 }),
  line('el-dt-seg3', 70, 30, [[0, 0], [0, 60]], { strokeWidth: 3 }),
  // Outer tube parallel
  line('el-dt-seg1o', 10, 18, [[0, 0], [40, 0]], { strokeWidth: 3 }),
  line('el-dt-seg2o', 50, 18, [[0, 0], [28, 28]], { strokeWidth: 3 }),
  line('el-dt-seg3o', 78, 46, [[0, 0], [0, 44]], { strokeWidth: 3 }),
];

// ─────────────────────────────────────────────────────────────────────────────
// 17. RUBBER BUNG
// trapezoid shape (plug)
// ─────────────────────────────────────────────────────────────────────────────
const rubberBungElements: ExcalidrawElement[] = [
  // Trapezoid body
  line('el-rb-top', 20, 0, [[0, 0], [60, 0]], { strokeWidth: 3 }),
  line('el-rb-left', 20, 0, [[0, 0], [-10, 50]], { strokeWidth: 3 }),
  line('el-rb-right', 80, 0, [[0, 0], [10, 50]], { strokeWidth: 3 }),
  line('el-rb-bot', 10, 50, [[0, 0], [80, 0]], { strokeWidth: 3 }),
  // Fill
  rect('el-rb-fill', 10, 0, 80, 50, { backgroundColor: '#cc4400', fillStyle: 'solid', strokeColor: 'transparent', opacity: 70 }),
  // Hole (if one-hole bung)
  ellipse('el-rb-hole', 42, 5, 16, 40, { backgroundColor: '#ffffff', fillStyle: 'solid', strokeColor: '#333333', strokeWidth: 1 }),
];

// ─────────────────────────────────────────────────────────────────────────────
// 18. RETORT STAND
// vertical rod on heavy base with clamp
// ─────────────────────────────────────────────────────────────────────────────
const retortStandElements: ExcalidrawElement[] = [
  // Heavy base
  rect('el-rs-base', 0, 180, 120, 20, { backgroundColor: '#555555', fillStyle: 'solid', strokeColor: '#333333' }),
  // Vertical rod
  rect('el-rs-rod', 20, 0, 10, 185, { backgroundColor: '#888888', fillStyle: 'solid', strokeColor: '#444444' }),
  // Clamp arm
  line('el-rs-clamp', 30, 60, [[0, 0], [60, 0]], { strokeWidth: 6, strokeColor: '#555555' }),
  // Clamp ring
  ellipse('el-rs-ring', 70, 46, 28, 28, { strokeWidth: 3, strokeColor: '#333333' }),
  // Clamp screw
  rect('el-rs-screw', 26, 56, 8, 8, { backgroundColor: '#444444', fillStyle: 'solid' }),
];

// ─────────────────────────────────────────────────────────────────────────────
// 19. CRUCIBLE
// small half-sphere bowl with lid
// ─────────────────────────────────────────────────────────────────────────────
const crucibleElements: ExcalidrawElement[] = [
  // Bowl body (lower half ellipse + walls)
  ellipse('el-cr-bowl', 5, 30, 80, 60, { backgroundColor: '#f5f5dc', fillStyle: 'solid', strokeWidth: 2 }),
  // Top rim
  ellipse('el-cr-rim', 5, 25, 80, 18, { strokeWidth: 2, backgroundColor: '#eeeecc', fillStyle: 'solid' }),
  // Lid
  ellipse('el-cr-lid', 8, 10, 74, 20, { backgroundColor: '#f5f5dc', fillStyle: 'solid', strokeWidth: 2 }),
  // Lid knob
  ellipse('el-cr-knob', 38, 5, 14, 8, { backgroundColor: '#f5f5dc', fillStyle: 'solid', strokeWidth: 2 }),
];

// ─────────────────────────────────────────────────────────────────────────────
// 20. WATCH GLASS
// thin lens / arc shape
// ─────────────────────────────────────────────────────────────────────────────
const watchGlassElements: ExcalidrawElement[] = [
  // Outer ellipse (full)
  ellipse('el-wgl-outer', 0, 0, 120, 40, { strokeWidth: 2 }),
  // Inner concave line (arc effect)
  ellipse('el-wgl-inner', 5, 5, 110, 28, { strokeWidth: 1, strokeStyle: 'dashed' }),
];

// ─────────────────────────────────────────────────────────────────────────────
// 21. SPATULA
// thin rectangle handle with wider flat end
// ─────────────────────────────────────────────────────────────────────────────
const spatulaElements: ExcalidrawElement[] = [
  // Handle
  rect('el-sp-handle', 60, 8, 100, 8, { backgroundColor: '#aaaaaa', fillStyle: 'solid' }),
  // Flat blade end
  rect('el-sp-blade', 0, 4, 65, 16, { backgroundColor: '#cccccc', fillStyle: 'solid', strokeWidth: 2 }),
  // Tip
  line('el-sp-tip', 0, 4, [[0, 8], [-20, 8]], { strokeWidth: 2 }),
];

// ─────────────────────────────────────────────────────────────────────────────
// 22. TONGS
// two arms meeting at pivot
// ─────────────────────────────────────────────────────────────────────────────
const tongsElements: ExcalidrawElement[] = [
  // Left arm (upper handle)
  line('el-to-arml1', 50, 60, [[0, 0], [-40, -55]], { strokeWidth: 4, strokeColor: '#555555' }),
  // Right arm (upper handle)
  line('el-to-armr1', 50, 60, [[0, 0], [40, -55]], { strokeWidth: 4, strokeColor: '#555555' }),
  // Left jaw
  line('el-to-jawl', 50, 60, [[0, 0], [-35, 60]], { strokeWidth: 4, strokeColor: '#333333' }),
  // Right jaw
  line('el-to-jawr', 50, 60, [[0, 0], [35, 60]], { strokeWidth: 4, strokeColor: '#333333' }),
  // Pivot
  ellipse('el-to-pivot', 43, 53, 14, 14, { backgroundColor: '#777777', fillStyle: 'solid', strokeWidth: 2 }),
  // Spring (connecting top handles)
  ellipse('el-to-spring', 44, 0, 12, 10, { strokeWidth: 2 }),
];

// ─────────────────────────────────────────────────────────────────────────────
// 23. ELECTRODE - CARBON
// tall thin rectangle labeled 'C'
// ─────────────────────────────────────────────────────────────────────────────
const electrodeCarbonElements: ExcalidrawElement[] = [
  rect('el-ec-rod', 35, 0, 12, 140, { backgroundColor: '#333333', fillStyle: 'solid', strokeColor: '#111111' }),
  text('el-ec-label', 20, 148, 40, 20, 'C', 14, { strokeColor: '#333333' }),
  // Clip at top
  rect('el-ec-clip', 28, 0, 26, 12, { backgroundColor: '#cc4400', fillStyle: 'solid', strokeColor: '#aa2200' }),
];

// ─────────────────────────────────────────────────────────────────────────────
// 24. ELECTRODE - COPPER
// tall thin rectangle labeled 'Cu'
// ─────────────────────────────────────────────────────────────────────────────
const electrodeCopperElements: ExcalidrawElement[] = [
  rect('el-ecu-rod', 35, 0, 12, 140, { backgroundColor: '#b87333', fillStyle: 'solid', strokeColor: '#8b4513' }),
  text('el-ecu-label', 20, 148, 40, 20, 'Cu', 14, { strokeColor: '#8b4513' }),
  // Clip at top
  rect('el-ecu-clip', 28, 0, 26, 12, { backgroundColor: '#cc4400', fillStyle: 'solid', strokeColor: '#aa2200' }),
];

// ─────────────────────────────────────────────────────────────────────────────
// 25. BATTERY
// alternating long/short lines
// ─────────────────────────────────────────────────────────────────────────────
const batteryElements: ExcalidrawElement[] = [
  // Leads
  line('el-bat-leadl', 0, 30, [[0, 0], [20, 0]], { strokeWidth: 2 }),
  line('el-bat-leadr', 100, 30, [[0, 0], [20, 0]], { strokeWidth: 2 }),
  // Cell 1: long + short
  line('el-bat-c1l', 20, 15, [[0, 0], [0, 30]], { strokeWidth: 4 }),
  line('el-bat-c1s', 30, 22, [[0, 0], [0, 16]], { strokeWidth: 2 }),
  // Cell 2
  line('el-bat-c2l', 45, 15, [[0, 0], [0, 30]], { strokeWidth: 4 }),
  line('el-bat-c2s', 55, 22, [[0, 0], [0, 16]], { strokeWidth: 2 }),
  // Cell 3
  line('el-bat-c3l', 70, 15, [[0, 0], [0, 30]], { strokeWidth: 4 }),
  line('el-bat-c3s', 80, 22, [[0, 0], [0, 16]], { strokeWidth: 2 }),
  // Connecting lines
  line('el-bat-con1', 30, 30, [[0, 0], [15, 0]], { strokeWidth: 2 }),
  line('el-bat-con2', 55, 30, [[0, 0], [15, 0]], { strokeWidth: 2 }),
  line('el-bat-con3', 80, 30, [[0, 0], [20, 0]], { strokeWidth: 2 }),
  // + and - labels
  text('el-bat-plus', 18, 5, 16, 12, '+', 12),
  text('el-bat-minus', 93, 5, 16, 12, '−', 12),
];

// ─────────────────────────────────────────────────────────────────────────────
// 26. SWITCH
// line with gap and arc (open switch)
// ─────────────────────────────────────────────────────────────────────────────
const switchElements: ExcalidrawElement[] = [
  // Left wire
  line('el-sw-left', 0, 30, [[0, 0], [30, 0]], { strokeWidth: 2 }),
  // Right wire
  line('el-sw-right', 80, 30, [[0, 0], [30, 0]], { strokeWidth: 2 }),
  // Left contact dot
  ellipse('el-sw-dotl', 27, 25, 8, 8, { backgroundColor: '#000000', fillStyle: 'solid' }),
  // Right contact dot
  ellipse('el-sw-dotr', 75, 25, 8, 8, { backgroundColor: '#000000', fillStyle: 'solid' }),
  // Switch arm (at angle = open)
  line('el-sw-arm', 31, 29, [[0, 0], [40, -20]], { strokeWidth: 2 }),
];

// ─────────────────────────────────────────────────────────────────────────────
// 27. ELECTROLYTE CONTAINER
// wide beaker with liquid level line
// ─────────────────────────────────────────────────────────────────────────────
const electrolyteContainerElements: ExcalidrawElement[] = [
  // Body walls
  line('el-elc-left', 5, 20, [[0, 0], [0, 130]], { strokeWidth: 3 }),
  line('el-elc-right', 115, 20, [[0, 0], [0, 130]], { strokeWidth: 3 }),
  line('el-elc-base', 5, 150, [[0, 0], [110, 0]], { strokeWidth: 3 }),
  // Top rim ellipse
  ellipse('el-elc-rim', 3, 13, 114, 16, { strokeWidth: 2 }),
  // Liquid fill (blue tint)
  rect('el-elc-liq', 7, 85, 106, 63, { backgroundColor: '#aaddff', fillStyle: 'solid', strokeColor: 'transparent', opacity: 80 }),
  // Liquid meniscus
  ellipse('el-elc-men', 5, 79, 110, 14, { backgroundColor: '#aaddff', fillStyle: 'solid', strokeColor: '#2266aa', strokeWidth: 1 }),
  // Label
  text('el-elc-label', 5, 55, 110, 20, 'CuSO₄(aq)', 12),
];

// ─────────────────────────────────────────────────────────────────────────────
// 28. SALT BRIDGE
// inverted U-shaped tube labeled KNO₃
// ─────────────────────────────────────────────────────────────────────────────
const saltBridgeElements: ExcalidrawElement[] = [
  // Left vertical tube (outer)
  line('el-sb-lvlo', 5, 30, [[0, 0], [0, 60]], { strokeWidth: 3 }),
  // Left vertical tube (inner)
  line('el-sb-lvli', 15, 30, [[0, 0], [0, 60]], { strokeWidth: 3 }),
  // Right vertical tube (outer)
  line('el-sb-rvlo', 85, 30, [[0, 0], [0, 60]], { strokeWidth: 3 }),
  // Right vertical tube (inner)
  line('el-sb-rvli', 95, 30, [[0, 0], [0, 60]], { strokeWidth: 3 }),
  // Horizontal top outer
  line('el-sb-htop', 5, 30, [[0, 0], [90, 0]], { strokeWidth: 3 }),
  // Horizontal top inner
  line('el-sb-hbot', 15, 40, [[0, 0], [70, 0]], { strokeWidth: 3 }),
  // Fill (porous material color)
  rect('el-sb-fill', 15, 40, 70, 50, { backgroundColor: '#ffffcc', fillStyle: 'solid', strokeColor: 'transparent', opacity: 80 }),
  text('el-sb-label', 15, 55, 70, 20, 'KNO₃', 12),
];

// ─────────────────────────────────────────────────────────────────────────────
// 29. VOLTMETER
// circle with 'V' inside
// ─────────────────────────────────────────────────────────────────────────────
const voltmeterElements: ExcalidrawElement[] = [
  ellipse('el-vm-circle', 0, 0, 70, 70, { strokeWidth: 3 }),
  text('el-vm-v', 0, 0, 70, 70, 'V', 28, { strokeColor: '#000000' }),
  // Lead terminals
  line('el-vm-leadl', 0, 35, [[-20, 0], [0, 0]], { strokeWidth: 2 }),
  line('el-vm-leadr', 70, 35, [[0, 0], [20, 0]], { strokeWidth: 2 }),
];

// ─────────────────────────────────────────────────────────────────────────────
// 30. AMMETER
// circle with 'A' inside
// ─────────────────────────────────────────────────────────────────────────────
const ammeterElements: ExcalidrawElement[] = [
  ellipse('el-am-circle', 0, 0, 70, 70, { strokeWidth: 3 }),
  text('el-am-a', 0, 0, 70, 70, 'A', 28, { strokeColor: '#000000' }),
  // Lead terminals
  line('el-am-leadl', 0, 35, [[-20, 0], [0, 0]], { strokeWidth: 2 }),
  line('el-am-leadr', 70, 35, [[0, 0], [20, 0]], { strokeWidth: 2 }),
];

// ─────────────────────────────────────────────────────────────────────────────
// LIBRARY ITEMS EXPORT
// ─────────────────────────────────────────────────────────────────────────────
export const chemistryLibraryItems: ChemistryLibraryItem[] = [
  { id: 'lib-beaker', status: 'published', created: 1750000000000, elements: beakerElements },
  { id: 'lib-conical-flask', status: 'published', created: 1750000001000, elements: conicalFlaskElements },
  { id: 'lib-round-bottom-flask', status: 'published', created: 1750000002000, elements: roundBottomFlaskElements },
  { id: 'lib-test-tube', status: 'published', created: 1750000003000, elements: testTubeElements },
  { id: 'lib-boiling-tube', status: 'published', created: 1750000004000, elements: boilingTubeElements },
  { id: 'lib-bunsen-burner', status: 'published', created: 1750000005000, elements: bunsenBurnerElements },
  { id: 'lib-tripod-stand', status: 'published', created: 1750000006000, elements: tripodStandElements },
  { id: 'lib-wire-gauze', status: 'published', created: 1750000007000, elements: wireGauzeElements },
  { id: 'lib-evaporating-dish', status: 'published', created: 1750000008000, elements: evaporatingDishElements },
  { id: 'lib-filter-funnel', status: 'published', created: 1750000009000, elements: filterFunnelElements },
  { id: 'lib-separating-funnel', status: 'published', created: 1750000010000, elements: separatingFunnelElements },
  { id: 'lib-burette', status: 'published', created: 1750000011000, elements: buretteElements },
  { id: 'lib-pipette', status: 'published', created: 1750000012000, elements: pipetteElements },
  { id: 'lib-measuring-cylinder', status: 'published', created: 1750000013000, elements: measuringCylinderElements },
  { id: 'lib-gas-jar', status: 'published', created: 1750000014000, elements: gasJarElements },
  { id: 'lib-delivery-tube', status: 'published', created: 1750000015000, elements: deliveryTubeElements },
  { id: 'lib-rubber-bung', status: 'published', created: 1750000016000, elements: rubberBungElements },
  { id: 'lib-retort-stand', status: 'published', created: 1750000017000, elements: retortStandElements },
  { id: 'lib-crucible', status: 'published', created: 1750000018000, elements: crucibleElements },
  { id: 'lib-watch-glass', status: 'published', created: 1750000019000, elements: watchGlassElements },
  { id: 'lib-spatula', status: 'published', created: 1750000020000, elements: spatulaElements },
  { id: 'lib-tongs', status: 'published', created: 1750000021000, elements: tongsElements },
  { id: 'lib-electrode-carbon', status: 'published', created: 1750000022000, elements: electrodeCarbonElements },
  { id: 'lib-electrode-copper', status: 'published', created: 1750000023000, elements: electrodeCopperElements },
  { id: 'lib-battery', status: 'published', created: 1750000024000, elements: batteryElements },
  { id: 'lib-switch', status: 'published', created: 1750000025000, elements: switchElements },
  { id: 'lib-electrolyte-container', status: 'published', created: 1750000026000, elements: electrolyteContainerElements },
  { id: 'lib-salt-bridge', status: 'published', created: 1750000027000, elements: saltBridgeElements },
  { id: 'lib-voltmeter', status: 'published', created: 1750000028000, elements: voltmeterElements },
  { id: 'lib-ammeter', status: 'published', created: 1750000029000, elements: ammeterElements },
];

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE 1: Electrolysis of Copper Sulfate
// anode + cathode electrodes in beaker, battery, connecting wires, labels
// ─────────────────────────────────────────────────────────────────────────────
const electrolysisElements: ExcalidrawElement[] = [
  // --- Beaker / electrolyte container ---
  line('tmpl-el-beakl', 100, 120, [[0, 0], [0, 160]], { strokeWidth: 3 }),
  line('tmpl-el-beakr', 380, 120, [[0, 0], [0, 160]], { strokeWidth: 3 }),
  line('tmpl-el-beakb', 100, 280, [[0, 0], [280, 0]], { strokeWidth: 3 }),
  ellipse('tmpl-el-beakrim', 98, 113, 284, 16, { strokeWidth: 2 }),
  // CuSO4 solution fill
  rect('tmpl-el-liq', 102, 180, 276, 98, { backgroundColor: '#aaddff', fillStyle: 'solid', strokeColor: 'transparent', opacity: 80 }),
  ellipse('tmpl-el-men', 100, 174, 280, 14, { backgroundColor: '#aaddff', fillStyle: 'solid', strokeColor: '#2266aa', strokeWidth: 1 }),
  text('tmpl-el-liqlab', 140, 230, 200, 20, 'CuSO₄(aq)', 14),

  // --- Cathode (left, copper) ---
  rect('tmpl-el-cathode', 165, 90, 14, 170, { backgroundColor: '#b87333', fillStyle: 'solid', strokeColor: '#8b4513', strokeWidth: 2 }),
  text('tmpl-el-cathlabel', 130, 270, 60, 20, '(−) Cathode', 12),

  // --- Anode (right, carbon) ---
  rect('tmpl-el-anode', 305, 90, 14, 170, { backgroundColor: '#333333', fillStyle: 'solid', strokeColor: '#111111', strokeWidth: 2 }),
  text('tmpl-el-anolabel', 285, 270, 60, 20, '(+) Anode', 12),

  // --- Battery (top center) ---
  // Left lead
  line('tmpl-el-wirel', 172, 90, [[0, 0], [0, -30]], { strokeWidth: 2 }),
  line('tmpl-el-wirebl', 100, 60, [[0, 0], [72, 0]], { strokeWidth: 2 }),
  // Right lead
  line('tmpl-el-wirer', 312, 90, [[0, 0], [0, -30]], { strokeWidth: 2 }),
  line('tmpl-el-wirebr', 312, 60, [[0, 0], [100, 0]], { strokeWidth: 2 }),
  // Battery cells (top wire)
  line('tmpl-el-batc1l', 180, 45, [[0, 0], [0, 30]], { strokeWidth: 5 }),
  line('tmpl-el-batc1s', 198, 52, [[0, 0], [0, 16]], { strokeWidth: 2 }),
  line('tmpl-el-batc2l', 218, 45, [[0, 0], [0, 30]], { strokeWidth: 5 }),
  line('tmpl-el-batc2s', 236, 52, [[0, 0], [0, 16]], { strokeWidth: 2 }),
  line('tmpl-el-batc3l', 256, 45, [[0, 0], [0, 30]], { strokeWidth: 5 }),
  line('tmpl-el-batc3s', 274, 52, [[0, 0], [0, 16]], { strokeWidth: 2 }),
  line('tmpl-el-batcon1', 198, 60, [[0, 0], [20, 0]], { strokeWidth: 2 }),
  line('tmpl-el-batcon2', 236, 60, [[0, 0], [20, 0]], { strokeWidth: 2 }),
  line('tmpl-el-batcon3', 274, 60, [[0, 0], [38, 0]], { strokeWidth: 2 }),
  text('tmpl-el-batlab', 200, 30, 80, 18, 'Battery (6V)', 12),
  text('tmpl-el-plus', 175, 38, 16, 14, '+', 12),
  text('tmpl-el-minus', 305, 38, 16, 14, '−', 12),

  // --- Electron flow arrows ---
  arrow('tmpl-el-earrow1', 140, 55, [[0, 0], [-40, 0]], { strokeWidth: 2, strokeColor: '#cc0000' }),
  text('tmpl-el-eflow', 65, 40, 80, 14, 'e⁻ flow', 11, { strokeColor: '#cc0000' }),

  // --- Deposit labels ---
  text('tmpl-el-cathdep', 100, 300, 100, 16, 'Cu deposited', 11, { strokeColor: '#8b4513' }),
  text('tmpl-el-anodiss', 300, 300, 100, 16, 'Cu dissolves', 11, { strokeColor: '#333333' }),
];

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE 2: Hess Law Cycle
// Triangle: Reactants (top-left), Products (top-right), Intermediate (bottom)
// ─────────────────────────────────────────────────────────────────────────────
const hessLawElements: ExcalidrawElement[] = [
  // Reactants box
  rect('tmpl-hl-react', 20, 20, 160, 60, { backgroundColor: '#fff3cd', fillStyle: 'solid', strokeWidth: 2 }),
  text('tmpl-hl-reactlab', 20, 35, 160, 30, 'Reactants\nC(s) + O₂(g)', 13),

  // Products box
  rect('tmpl-hl-prod', 420, 20, 160, 60, { backgroundColor: '#d4edda', fillStyle: 'solid', strokeWidth: 2 }),
  text('tmpl-hl-prodlab', 420, 35, 160, 30, 'Products\nCO₂(g)', 13),

  // Intermediate box
  rect('tmpl-hl-inter', 220, 220, 160, 60, { backgroundColor: '#cce5ff', fillStyle: 'solid', strokeWidth: 2 }),
  text('tmpl-hl-interlab', 220, 235, 160, 30, 'Intermediate\nCO(g)', 13),

  // Arrow: Reactants → Products (direct, top)
  arrow('tmpl-hl-arr1', 180, 50, [[0, 0], [240, 0]], { strokeWidth: 2, strokeColor: '#333333' }),
  text('tmpl-hl-dh1', 230, 30, 140, 18, 'ΔH₁ = −393 kJ/mol', 12, { strokeColor: '#cc0000' }),

  // Arrow: Reactants → Intermediate (down-left)
  arrow('tmpl-hl-arr2', 100, 80, [[0, 0], [120, 140]], { strokeWidth: 2, strokeColor: '#333333' }),
  text('tmpl-hl-dh2', 50, 150, 120, 18, 'ΔH₂ = −283 kJ/mol', 11, { strokeColor: '#cc0000' }),

  // Arrow: Intermediate → Products (up-right)
  arrow('tmpl-hl-arr3', 380, 250, [[0, 0], [120, -170]], { strokeWidth: 2, strokeColor: '#333333' }),
  text('tmpl-hl-dh3', 430, 170, 130, 18, 'ΔH₃ = −110 kJ/mol', 11, { strokeColor: '#cc0000' }),

  // Title
  text('tmpl-hl-title', 180, -20, 240, 24, "Hess's Law Cycle", 16, { strokeColor: '#000033' }),

  // Hess law equation
  text('tmpl-hl-eq', 160, 310, 280, 20, 'ΔH₁ = ΔH₂ + ΔH₃', 14, { strokeColor: '#000066' }),
];

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE 3: Energy Profile Diagram
// x-axis, y-axis, curve with activation energy hump
// ─────────────────────────────────────────────────────────────────────────────
const energyProfileElements: ExcalidrawElement[] = [
  // Axes
  arrow('tmpl-ep-xaxis', 40, 300, [[0, 0], [420, 0]], { strokeWidth: 2 }),
  arrow('tmpl-ep-yaxis', 40, 300, [[0, 0], [0, -280]], { strokeWidth: 2 }),
  text('tmpl-ep-xlabel', 220, 315, 200, 20, 'Reaction Progress →', 13),
  text('tmpl-ep-ylabel', 5, 150, 30, 100, 'Energy (kJ/mol)', 12, { strokeColor: '#000000' }),

  // Reactants plateau
  line('tmpl-ep-react', 50, 220, [[0, 0], [80, 0]], { strokeWidth: 3, strokeColor: '#3366cc' }),
  text('tmpl-ep-reactlab', 30, 200, 100, 18, 'Reactants', 12, { strokeColor: '#3366cc' }),

  // Rise to Transition State (activation energy)
  line('tmpl-ep-rise', 130, 220, [[0, 0], [60, -120]], { strokeWidth: 3, strokeColor: '#cc3300' }),

  // Transition state peak
  line('tmpl-ep-peak', 190, 100, [[0, 0], [40, 0]], { strokeWidth: 2, strokeStyle: 'dashed', strokeColor: '#cc3300' }),
  text('tmpl-ep-tslab', 165, 82, 110, 18, 'Transition State (‡)', 11, { strokeColor: '#cc3300' }),

  // Fall from transition state
  line('tmpl-ep-fall', 230, 100, [[0, 0], [60, 90]], { strokeWidth: 3, strokeColor: '#cc3300' }),

  // Products plateau
  line('tmpl-ep-prod', 290, 190, [[0, 0], [100, 0]], { strokeWidth: 3, strokeColor: '#009933' }),
  text('tmpl-ep-prodlab', 320, 175, 90, 18, 'Products', 12, { strokeColor: '#009933' }),

  // Activation energy brace
  line('tmpl-ep-eabrace', 130, 220, [[0, 0], [0, -120]], { strokeWidth: 1, strokeStyle: 'dashed', strokeColor: '#aa0000' }),
  arrow('tmpl-ep-eaarrow', 160, 220, [[0, 0], [0, -120]], { strokeWidth: 1, strokeColor: '#aa0000' }),
  text('tmpl-ep-ealabel', 168, 140, 60, 18, 'Ea', 13, { strokeColor: '#aa0000' }),

  // ΔH arrow
  line('tmpl-ep-dhbrace', 180, 220, [[0, 0], [130, 0]], { strokeWidth: 1, strokeStyle: 'dashed', strokeColor: '#006600' }),
  arrow('tmpl-ep-dharrow', 320, 220, [[0, 0], [0, -30]], { strokeWidth: 1, strokeColor: '#006600' }),
  text('tmpl-ep-dhlabel', 325, 200, 50, 18, 'ΔH < 0', 11, { strokeColor: '#006600' }),

  // Title
  text('tmpl-ep-title', 100, -10, 300, 24, 'Energy Profile Diagram (Exothermic)', 15),
];

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE 4: Simple Distillation Setup
// flask → thermometer → condenser → collection flask
// ─────────────────────────────────────────────────────────────────────────────
const distillationElements: ExcalidrawElement[] = [
  // --- Distillation Flask (round bottom, left) ---
  ellipse('tmpl-ds-rbf', 20, 180, 110, 110, { backgroundColor: '#fff8dc', fillStyle: 'solid', strokeWidth: 2 }),
  line('tmpl-ds-necl', 62, 145, [[0, 0], [0, -35]], { strokeWidth: 3 }),
  line('tmpl-ds-necr', 88, 145, [[0, 0], [0, -35]], { strokeWidth: 3 }),
  ellipse('tmpl-ds-necrim', 60, 105, 30, 10, { strokeWidth: 2 }),
  // Stopper
  rect('tmpl-ds-stopper', 58, 95, 34, 14, { backgroundColor: '#cc4400', fillStyle: 'solid' }),
  // Heat source (flame)
  ellipse('tmpl-ds-flame', 60, 295, 30, 18, { backgroundColor: '#ff8800', fillStyle: 'solid', strokeColor: '#cc4400', opacity: 90 }),
  text('tmpl-ds-heat', 50, 318, 50, 14, 'Heat', 12),

  // --- Side arm / adapter ---
  line('tmpl-ds-sidearm', 92, 109, [[0, 0], [80, -40]], { strokeWidth: 8, strokeColor: '#888888' }),
  line('tmpl-ds-sidearm2', 92, 109, [[0, 0], [80, -40]], { strokeWidth: 4, strokeColor: '#ffffff' }),

  // --- Condenser tube (diagonal glass) ---
  // Outer jacket
  line('tmpl-ds-couter1', 172, 69, [[0, 0], [160, -60]], { strokeWidth: 8, strokeColor: '#aaddff', opacity: 70 }),
  line('tmpl-ds-couter2', 172, 77, [[0, 0], [160, -60]], { strokeWidth: 8, strokeColor: '#aaddff', opacity: 70 }),
  // Inner tube
  line('tmpl-ds-cinner', 174, 73, [[0, 0], [156, -58]], { strokeWidth: 3, strokeColor: '#555555' }),
  // Water in/out labels
  text('tmpl-ds-watin', 155, 95, 90, 16, 'Water in →', 11, { strokeColor: '#2266aa' }),
  text('tmpl-ds-watout', 310, 25, 90, 16, '← Water out', 11, { strokeColor: '#2266aa' }),
  arrow('tmpl-ds-watinarr', 172, 95, [[0, -20], [0, 0]], { strokeWidth: 1, strokeColor: '#2266aa' }),
  arrow('tmpl-ds-watoutarr', 332, 20, [[0, 20], [0, 0]], { strokeWidth: 1, strokeColor: '#2266aa' }),

  // --- Thermometer ---
  line('tmpl-ds-thermtube', 75, 90, [[0, 0], [0, -60]], { strokeWidth: 3 }),
  ellipse('tmpl-ds-thermbulb', 70, 126, 10, 10, { backgroundColor: '#ff3300', fillStyle: 'solid' }),
  text('tmpl-ds-thermlab', 88, 65, 90, 14, 'Thermometer', 11),

  // --- Collection Flask (right) ---
  ellipse('tmpl-ds-colflask', 380, 165, 90, 90, { backgroundColor: '#e8f4f8', fillStyle: 'solid', strokeWidth: 2 }),
  line('tmpl-ds-colnecl', 412, 132, [[0, 0], [0, -28]], { strokeWidth: 3 }),
  line('tmpl-ds-colnecr', 432, 132, [[0, 0], [0, -28]], { strokeWidth: 3 }),
  ellipse('tmpl-ds-colrim', 410, 98, 24, 10, { strokeWidth: 2 }),
  // Distillate drop
  line('tmpl-ds-drop', 335, 9, [[0, 0], [77, 95]], { strokeWidth: 2, strokeStyle: 'dashed', strokeColor: '#2266aa' }),

  // --- Labels ---
  text('tmpl-ds-flasklab', 30, 300, 100, 16, 'Distillation\nFlask', 12),
  text('tmpl-ds-condlab', 220, 40, 100, 16, 'Condenser', 12),
  text('tmpl-ds-collab', 380, 265, 90, 16, 'Collection\nFlask', 12),
  text('tmpl-ds-title', 150, -20, 220, 24, 'Simple Distillation', 16),
];

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE 5: Born-Haber Cycle
// Vertical energy ladder for NaCl
// ─────────────────────────────────────────────────────────────────────────────
const bornHaberElements: ExcalidrawElement[] = [
  // Title
  text('tmpl-bh-title', 100, -10, 300, 24, 'Born-Haber Cycle (NaCl)', 16),

  // Vertical energy axis arrow
  arrow('tmpl-bh-axis', 60, 550, [[0, 0], [0, -530]], { strokeWidth: 2 }),
  text('tmpl-bh-axislab', 5, 280, 50, 20, 'Energy', 12),

  // Step 0: Elements in standard state (bottom)
  line('tmpl-bh-step0', 80, 540, [[0, 0], [220, 0]], { strokeWidth: 3, strokeColor: '#333399' }),
  text('tmpl-bh-lab0', 80, 545, 220, 20, 'Na(s) + ½Cl₂(g)  [Elements]', 12, { strokeColor: '#333399' }),

  // Step 1: Atomisation — arrow up
  arrow('tmpl-bh-arr01', 150, 540, [[0, 0], [0, -90]], { strokeWidth: 2, strokeColor: '#008800' }),
  text('tmpl-bh-dh01', 165, 500, 160, 18, 'ΔH_at(Na) = +108 kJ/mol', 11, { strokeColor: '#008800' }),

  // Na(g) level
  line('tmpl-bh-step1', 80, 448, [[0, 0], [220, 0]], { strokeWidth: 3, strokeColor: '#008800' }),
  text('tmpl-bh-lab1', 80, 453, 220, 18, 'Na(g) + ½Cl₂(g)', 12, { strokeColor: '#008800' }),

  // Step 2: Bond dissociation — arrow up
  arrow('tmpl-bh-arr12', 150, 448, [[0, 0], [0, -70]], { strokeWidth: 2, strokeColor: '#008800' }),
  text('tmpl-bh-dh12', 165, 420, 160, 18, 'ΔH_dissoc(Cl₂) = +122 kJ/mol', 11, { strokeColor: '#008800' }),

  // Na(g) + Cl(g) level
  line('tmpl-bh-step2', 80, 376, [[0, 0], [220, 0]], { strokeWidth: 3, strokeColor: '#009944' }),
  text('tmpl-bh-lab2', 80, 381, 220, 18, 'Na(g) + Cl(g)', 12, { strokeColor: '#009944' }),

  // Step 3: Ionisation energy — arrow up (large)
  arrow('tmpl-bh-arr23', 150, 376, [[0, 0], [0, -120]], { strokeWidth: 2, strokeColor: '#cc6600' }),
  text('tmpl-bh-dh23', 165, 330, 160, 18, 'IE(Na) = +496 kJ/mol', 11, { strokeColor: '#cc6600' }),

  // Na+(g) + Cl(g) level
  line('tmpl-bh-step3', 80, 254, [[0, 0], [220, 0]], { strokeWidth: 3, strokeColor: '#cc6600' }),
  text('tmpl-bh-lab3', 80, 259, 220, 18, 'Na⁺(g) + Cl(g)', 12, { strokeColor: '#cc6600' }),

  // Step 4: Electron affinity — arrow DOWN (exothermic)
  arrow('tmpl-bh-arr34', 150, 254, [[0, 0], [0, 50]], { strokeWidth: 2, strokeColor: '#cc0000' }),
  text('tmpl-bh-dh34', 165, 268, 160, 18, 'EA(Cl) = −349 kJ/mol', 11, { strokeColor: '#cc0000' }),

  // Na+(g) + Cl-(g) level
  line('tmpl-bh-step4', 80, 302, [[0, 0], [220, 0]], { strokeWidth: 3, strokeColor: '#cc0000' }),
  text('tmpl-bh-lab4', 80, 307, 220, 18, 'Na⁺(g) + Cl⁻(g)', 12, { strokeColor: '#cc0000' }),

  // Step 5: Lattice enthalpy — large arrow DOWN
  arrow('tmpl-bh-arr45', 150, 302, [[0, 0], [0, 190]], { strokeWidth: 2, strokeColor: '#660099' }),
  text('tmpl-bh-dh45', 165, 390, 180, 18, 'ΔH_latt = −787 kJ/mol', 11, { strokeColor: '#660099' }),

  // Ionic solid level (near bottom, but higher than elements)
  line('tmpl-bh-step5', 80, 490, [[0, 0], [220, 0]], { strokeWidth: 3, strokeColor: '#660099' }),
  text('tmpl-bh-lab5', 80, 495, 220, 18, 'NaCl(s)  [Ionic Solid]', 12, { strokeColor: '#660099' }),

  // Overall ΔH_f arrow (left side, spanning full)
  arrow('tmpl-bh-dhfarr', 70, 540, [[0, 0], [0, -50]], { strokeWidth: 3, strokeColor: '#000099', strokeStyle: 'dashed' }),
  text('tmpl-bh-dhflab', 5, 520, 65, 18, 'ΔHf° =\n−411 kJ', 11, { strokeColor: '#000099' }),
];

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATES EXPORT
// ─────────────────────────────────────────────────────────────────────────────
export const chemistryTemplates: ChemistryTemplate[] = [
  {
    id: 'tmpl-electrolysis',
    name: 'Electrolysis of Copper Sulfate',
    description:
      'Full electrolysis cell diagram with copper anode and cathode in CuSO₄ solution, battery, connecting wires, and reaction labels.',
    category: 'Electrochemistry',
    elements: electrolysisElements,
  },
  {
    id: 'tmpl-hess-law',
    name: "Hess's Law Cycle",
    description:
      'Triangular Hess Law cycle showing Reactants, Products, and Intermediate with ΔH arrows and enthalpy values.',
    category: 'Thermochemistry',
    elements: hessLawElements,
  },
  {
    id: 'tmpl-energy-profile',
    name: 'Energy Profile Diagram',
    description:
      'Reaction energy profile with x/y axes, reactants plateau, activation energy hump, transition state, and products plateau. Includes Ea and ΔH annotations.',
    category: 'Thermochemistry',
    elements: energyProfileElements,
  },
  {
    id: 'tmpl-distillation',
    name: 'Simple Distillation Setup',
    description:
      'Complete simple distillation apparatus: round-bottom flask with heat source, thermometer, condenser with water in/out, and collection flask.',
    category: 'Separation Techniques',
    elements: distillationElements,
  },
  {
    id: 'tmpl-born-haber',
    name: 'Born-Haber Cycle',
    description:
      'Vertical energy ladder for NaCl formation: Elements → Gaseous Atoms (atomisation/dissociation) → Gaseous Ions (IE/EA) → Ionic Solid (lattice enthalpy), with all ΔH step labels.',
    category: 'Thermochemistry',
    elements: bornHaberElements,
  },
];
