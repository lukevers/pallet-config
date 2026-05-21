import type {
  Box,
  BoxOrientation,
  LayerAlignment,
  LayerConfig,
  LayerOrientationChoice,
  PalletStandard,
  StackingPattern,
} from '../types';

export type BoxPlacement = {
  orientation: BoxOrientation;
  offsetLength: number;
  offsetWidth: number;
};

export type LayerLayout = {
  placements: ReadonlyArray<BoxPlacement>;
  capacity: number;
  boundsLength: number;
  boundsWidth: number;
  boundsOriginLength: number;
  boundsOriginWidth: number;
};

export type LayerBounds = {
  length: number;
  width: number;
  originLength: number;
  originWidth: number;
};

export function alignmentFractions(alignment: LayerAlignment): {
  h: number;
  v: number;
} {
  const [v, h] = alignment.split('-') as [
    'top' | 'middle' | 'bottom',
    'left' | 'center' | 'right',
  ];
  const vFrac = v === 'top' ? 0 : v === 'middle' ? 0.5 : 1;
  const hFrac = h === 'left' ? 0 : h === 'center' ? 0.5 : 1;
  return { h: hFrac, v: vFrac };
}

function footprint(
  box: Box,
  orientation: BoxOrientation,
): {
  fpL: number;
  fpW: number;
} {
  return orientation === 'length-along-pallet'
    ? { fpL: box.length, fpW: box.width }
    : { fpL: box.width, fpW: box.length };
}

function bestFitOrientation(
  box: Box,
  region: { length: number; width: number },
): BoxOrientation {
  const along =
    Math.floor(region.length / box.length) *
    Math.floor(region.width / box.width);
  const across =
    Math.floor(region.length / box.width) *
    Math.floor(region.width / box.length);
  return along >= across ? 'length-along-pallet' : 'width-along-pallet';
}

function resolveOrientation(
  box: Box,
  region: { length: number; width: number },
  choice: LayerOrientationChoice,
): BoxOrientation {
  return choice === 'auto' ? bestFitOrientation(box, region) : choice;
}

function flipOrientation(o: BoxOrientation): BoxOrientation {
  return o === 'length-along-pallet'
    ? 'width-along-pallet'
    : 'length-along-pallet';
}

// Build a simple grid of placements in row-major order, packed at (0, 0)
// relative to the bounded region.
function gridPlacements(
  box: Box,
  region: { length: number; width: number },
  orientation: BoxOrientation,
): Array<BoxPlacement> {
  const { fpL, fpW } = footprint(box, orientation);
  const cols = Math.floor(region.length / fpL);
  const rows = Math.floor(region.width / fpW);
  const out: Array<BoxPlacement> = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      out.push({
        orientation,
        offsetLength: c * fpL,
        offsetWidth: r * fpW,
      });
    }
  }
  return out;
}

// AABB of a placement list. Returns zero-bounds if empty.
function placementsAABB(
  box: Box,
  placements: ReadonlyArray<BoxPlacement>,
): {
  length: number;
  width: number;
  originLength: number;
  originWidth: number;
} {
  if (placements.length === 0) {
    return { length: 0, width: 0, originLength: 0, originWidth: 0 };
  }
  let minL = Number.POSITIVE_INFINITY;
  let minW = Number.POSITIVE_INFINITY;
  let maxL = Number.NEGATIVE_INFINITY;
  let maxW = Number.NEGATIVE_INFINITY;
  for (const p of placements) {
    const { fpL, fpW } = footprint(box, p.orientation);
    if (p.offsetLength < minL) {
      minL = p.offsetLength;
    }
    if (p.offsetWidth < minW) {
      minW = p.offsetWidth;
    }
    if (p.offsetLength + fpL > maxL) {
      maxL = p.offsetLength + fpL;
    }
    if (p.offsetWidth + fpW > maxW) {
      maxW = p.offsetWidth + fpW;
    }
  }
  return {
    originLength: minL,
    originWidth: minW,
    length: maxL - minL,
    width: maxW - minW,
  };
}

// Shift placements so their AABB origin sits at (offsetL, offsetW).
function shiftTo(
  placements: ReadonlyArray<BoxPlacement>,
  aabb: { originLength: number; originWidth: number },
  offsetL: number,
  offsetW: number,
): Array<BoxPlacement> {
  const dl = offsetL - aabb.originLength;
  const dw = offsetW - aabb.originWidth;
  return placements.map((p) => ({
    orientation: p.orientation,
    offsetLength: p.offsetLength + dl,
    offsetWidth: p.offsetWidth + dw,
  }));
}

// Translate placements by an additive offset.
function translate(
  placements: ReadonlyArray<BoxPlacement>,
  dL: number,
  dW: number,
): Array<BoxPlacement> {
  return placements.map((p) => ({
    orientation: p.orientation,
    offsetLength: p.offsetLength + dL,
    offsetWidth: p.offsetWidth + dW,
  }));
}

// --- Pattern algorithms (region-local placements, anchored at origin 0,0) ---

function blockPlacements(
  box: Box,
  region: { length: number; width: number },
  primaryOrientation: LayerOrientationChoice,
): Array<BoxPlacement> {
  const orientation = resolveOrientation(box, region, primaryOrientation);
  return gridPlacements(box, region, orientation);
}

function rowPlacements(
  box: Box,
  region: { length: number; width: number },
  primaryOrientation: LayerOrientationChoice,
  layerIndex: number,
): Array<BoxPlacement> {
  const base = resolveOrientation(box, region, primaryOrientation);
  const orientation = layerIndex % 2 === 0 ? base : flipOrientation(base);
  return gridPlacements(box, region, orientation);
}

// Stack alternating-orientation stripes along an axis. axis = 'width' means
// stripes run horizontally (each stripe spans the full length, stacked along
// width). axis = 'length' means stripes run vertically.
function brickStripes(
  box: Box,
  region: { length: number; width: number },
  axis: 'width' | 'length',
  startOrientation: BoxOrientation,
): Array<BoxPlacement> {
  const out: Array<BoxPlacement> = [];
  let cursor = 0;
  let stripeIndex = 0;
  const stackAxisLimit = axis === 'width' ? region.width : region.length;

  while (true) {
    const orientation =
      stripeIndex % 2 === 0
        ? startOrientation
        : flipOrientation(startOrientation);
    const { fpL, fpW } = footprint(box, orientation);
    // Stripe depth (along stack axis) and span (along the other axis).
    const stripeDepth = axis === 'width' ? fpW : fpL;
    const spanLimit = axis === 'width' ? region.length : region.width;
    const cellSpan = axis === 'width' ? fpL : fpW;
    if (cursor + stripeDepth > stackAxisLimit) {
      break;
    }
    const cells = Math.floor(spanLimit / cellSpan);
    if (cells <= 0) {
      // Can't fit any in this stripe; advance and try the other orientation.
      cursor += stripeDepth;
      stripeIndex++;
      continue;
    }
    for (let i = 0; i < cells; i++) {
      const along = i * cellSpan;
      const placement: BoxPlacement = {
        orientation,
        offsetLength: axis === 'width' ? along : cursor,
        offsetWidth: axis === 'width' ? cursor : along,
      };
      out.push(placement);
    }
    cursor += stripeDepth;
    stripeIndex++;
  }
  return out;
}

function brickPlacements(
  box: Box,
  region: { length: number; width: number },
  primaryOrientation: LayerOrientationChoice,
  layerIndex: number,
): Array<BoxPlacement> {
  // Choose the stripe axis & starting orientation that fits the most boxes.
  const candidates: Array<{
    axis: 'width' | 'length';
    start: BoxOrientation;
  }> = [
    { axis: 'width', start: 'length-along-pallet' },
    { axis: 'width', start: 'width-along-pallet' },
    { axis: 'length', start: 'length-along-pallet' },
    { axis: 'length', start: 'width-along-pallet' },
  ];
  // primaryOrientation gives a hint for tie-breaking at layer 0.
  const layouts = candidates.map((c) => ({
    ...c,
    placements: brickStripes(box, region, c.axis, c.start),
  }));
  layouts.sort((a, b) => b.placements.length - a.placements.length);
  const best = layouts[0];
  // Alternate between layers: if layerIndex odd, flip axis.
  if (layerIndex % 2 === 1) {
    const flippedAxis: 'width' | 'length' =
      best.axis === 'width' ? 'length' : 'width';
    return brickStripes(box, region, flippedAxis, flipOrientation(best.start));
  }
  // Use primary orientation as a tiebreaker if equal.
  if (primaryOrientation !== 'auto') {
    const matching = layouts.find(
      (l) =>
        l.placements.length === best.placements.length &&
        l.start === primaryOrientation,
    );
    if (matching) {
      return matching.placements;
    }
  }
  return best.placements;
}

function pinwheelPlacements(
  box: Box,
  region: { length: number; width: number },
  layerIndex: number,
): Array<BoxPlacement> {
  // Split bounded region into 4 quadrants. Diagonally opposite quadrants share
  // an orientation (2-fold symmetric pinwheel).
  const halfL = region.length / 2;
  const halfW = region.width / 2;
  const quadRegion = { length: halfL, width: halfW };

  // For layerIndex even: NW=L, NE=W, SW=W, SE=L.
  // For layerIndex odd: NW=W, NE=L, SW=L, SE=W.
  const nw: BoxOrientation =
    layerIndex % 2 === 0 ? 'length-along-pallet' : 'width-along-pallet';
  const ne: BoxOrientation = flipOrientation(nw);
  const sw: BoxOrientation = ne;
  const se: BoxOrientation = nw;

  const out: Array<BoxPlacement> = [];
  // Push in a globally interleaved reading order (NW row 0, NE row 0, then
  // NW row 1, NE row 1, etc., then SW + SE) so partial counts stay balanced.

  const nwGrid = gridPlacements(box, quadRegion, nw);
  const neGrid = translate(gridPlacements(box, quadRegion, ne), halfL, 0);
  const swGrid = translate(gridPlacements(box, quadRegion, sw), 0, halfW);
  const seGrid = translate(gridPlacements(box, quadRegion, se), halfL, halfW);

  // Interleave top quadrants by row, then bottom quadrants by row.
  const interleaveRows = (
    a: Array<BoxPlacement>,
    b: Array<BoxPlacement>,
  ): Array<BoxPlacement> => {
    const groupByRow = (g: Array<BoxPlacement>) => {
      const map = new Map<number, Array<BoxPlacement>>();
      for (const p of g) {
        const list = map.get(p.offsetWidth) ?? [];
        list.push(p);
        map.set(p.offsetWidth, list);
      }
      return [...map.entries()].sort((x, y) => x[0] - y[0]).map((e) => e[1]);
    };
    const rowsA = groupByRow(a);
    const rowsB = groupByRow(b);
    const max = Math.max(rowsA.length, rowsB.length);
    const result: Array<BoxPlacement> = [];
    for (let i = 0; i < max; i++) {
      if (rowsA[i]) {
        result.push(...rowsA[i]);
      }
      if (rowsB[i]) {
        result.push(...rowsB[i]);
      }
    }
    return result;
  };

  out.push(...interleaveRows(nwGrid, neGrid));
  out.push(...interleaveRows(swGrid, seGrid));
  return out;
}

function splitRowPlacements(
  box: Box,
  region: { length: number; width: number },
  layerIndex: number,
): Array<BoxPlacement> {
  // Split along the longer axis into two halves; one half uses L, the other W.
  const splitAlong: 'length' | 'width' =
    region.length >= region.width ? 'length' : 'width';

  const layerSwap = layerIndex % 2 === 1;
  const orientA: BoxOrientation = layerSwap
    ? 'width-along-pallet'
    : 'length-along-pallet';
  const orientB: BoxOrientation = flipOrientation(orientA);

  if (splitAlong === 'length') {
    const halfL = region.length / 2;
    const halfRegion = { length: halfL, width: region.width };
    const left = gridPlacements(box, halfRegion, orientA);
    const right = translate(gridPlacements(box, halfRegion, orientB), halfL, 0);
    // Interleave by row so partial fills stay balanced.
    const groupByRow = (g: Array<BoxPlacement>) => {
      const map = new Map<number, Array<BoxPlacement>>();
      for (const p of g) {
        const list = map.get(p.offsetWidth) ?? [];
        list.push(p);
        map.set(p.offsetWidth, list);
      }
      return [...map.entries()].sort((x, y) => x[0] - y[0]).map((e) => e[1]);
    };
    const lr = groupByRow(left);
    const rr = groupByRow(right);
    const max = Math.max(lr.length, rr.length);
    const out: Array<BoxPlacement> = [];
    for (let i = 0; i < max; i++) {
      if (lr[i]) {
        out.push(...lr[i]);
      }
      if (rr[i]) {
        out.push(...rr[i]);
      }
    }
    return out;
  }
  const halfW = region.width / 2;
  const halfRegion = { length: region.length, width: halfW };
  const top = gridPlacements(box, halfRegion, orientA);
  const bottom = translate(gridPlacements(box, halfRegion, orientB), 0, halfW);
  return [...top, ...bottom];
}

function hybridPinwheelPlacements(
  box: Box,
  region: { length: number; width: number },
  primaryOrientation: LayerOrientationChoice,
  layerIndex: number,
): Array<BoxPlacement> {
  // Perimeter pinwheel "frame": top + bottom strips run with L; left + right
  // strips run with W. A core in the middle uses the primary orientation.
  // Layers alternate the pinwheel rotation by swapping which axis gets which.

  const swap = layerIndex % 2 === 1;
  const horizontalStripOrient: BoxOrientation = swap
    ? 'width-along-pallet'
    : 'length-along-pallet';
  const verticalStripOrient: BoxOrientation = flipOrientation(
    horizontalStripOrient,
  );

  const hf = footprint(box, horizontalStripOrient);
  const vf = footprint(box, verticalStripOrient);

  // Top strip: along full length, depth = horizontal strip's fpW.
  const topStripDepth = hf.fpW;
  // Bottom strip: same depth.
  const bottomStripDepth = hf.fpW;
  // Left/right strip: depth = vertical strip's fpL.
  const leftStripDepth = vf.fpL;
  const rightStripDepth = vf.fpL;

  if (
    topStripDepth + bottomStripDepth >= region.width ||
    leftStripDepth + rightStripDepth >= region.length
  ) {
    // Can't fit a frame + core. Degrade: just do a split row fallback.
    return splitRowPlacements(box, region, layerIndex);
  }

  const out: Array<BoxPlacement> = [];

  // Top strip (anchored at left).
  const topCols = Math.floor(region.length / hf.fpL);
  for (let c = 0; c < topCols; c++) {
    out.push({
      orientation: horizontalStripOrient,
      offsetLength: c * hf.fpL,
      offsetWidth: 0,
    });
  }
  // Right strip (anchored at top, between the top & bottom strips).
  const rightInnerWidth = region.width - topStripDepth - bottomStripDepth;
  const rightRows = Math.floor(rightInnerWidth / vf.fpW);
  for (let r = 0; r < rightRows; r++) {
    out.push({
      orientation: verticalStripOrient,
      offsetLength: region.length - vf.fpL,
      offsetWidth: topStripDepth + r * vf.fpW,
    });
  }
  // Bottom strip (anchored at right).
  const bottomCols = Math.floor(region.length / hf.fpL);
  // Right-anchor: place from right to left so visually rotated vs. top.
  const bottomStartL = region.length - bottomCols * hf.fpL;
  for (let c = 0; c < bottomCols; c++) {
    out.push({
      orientation: horizontalStripOrient,
      offsetLength: bottomStartL + c * hf.fpL,
      offsetWidth: region.width - bottomStripDepth,
    });
  }
  // Left strip (anchored at bottom).
  const leftRows = Math.floor(rightInnerWidth / vf.fpW);
  const leftStartW = region.width - bottomStripDepth - leftRows * vf.fpW;
  for (let r = 0; r < leftRows; r++) {
    out.push({
      orientation: verticalStripOrient,
      offsetLength: 0,
      offsetWidth: leftStartW + r * vf.fpW,
    });
  }

  // Core region: inside the frame.
  const coreRegion = {
    length: region.length - leftStripDepth - rightStripDepth,
    width: region.width - topStripDepth - bottomStripDepth,
  };
  if (coreRegion.length > 0 && coreRegion.width > 0) {
    const coreOrient = resolveOrientation(box, coreRegion, primaryOrientation);
    const coreGrid = gridPlacements(box, coreRegion, coreOrient);
    const coreShifted = translate(coreGrid, leftStripDepth, topStripDepth);
    out.push(...coreShifted);
  }

  return out;
}

// Dispatch to the right pattern algorithm.
function patternPlacements(
  box: Box,
  region: { length: number; width: number },
  pattern: StackingPattern,
  primaryOrientation: LayerOrientationChoice,
  layerIndex: number,
): Array<BoxPlacement> {
  switch (pattern) {
    case 'block':
      return blockPlacements(box, region, primaryOrientation);
    case 'row':
      return rowPlacements(box, region, primaryOrientation, layerIndex);
    case 'brick':
      return brickPlacements(box, region, primaryOrientation, layerIndex);
    case 'pinwheel':
      return pinwheelPlacements(box, region, layerIndex);
    case 'split-row':
      return splitRowPlacements(box, region, layerIndex);
    case 'hybrid-pinwheel':
      return hybridPinwheelPlacements(
        box,
        region,
        primaryOrientation,
        layerIndex,
      );
  }
}

export function computeLayerLayout(
  box: Box,
  pallet: PalletStandard,
  pattern: StackingPattern,
  primaryOrientation: LayerOrientationChoice,
  config: Pick<LayerConfig, 'alignment' | 'boxCount'>,
  layerIndex: number,
  bounds?: LayerBounds,
): LayerLayout {
  const region = bounds ?? {
    length: pallet.length,
    width: pallet.width,
    originLength: 0,
    originWidth: 0,
  };

  const local = patternPlacements(
    box,
    { length: region.length, width: region.width },
    pattern,
    primaryOrientation,
    layerIndex,
  );

  const capacity = local.length;
  const limit =
    config.boxCount == null
      ? capacity
      : Math.max(0, Math.min(config.boxCount, capacity));
  const truncated = local.slice(0, limit);

  // Apply alignment: shift the AABB of placements within the region by the
  // remaining margin, then translate from local-region into pallet-relative.
  const aabb = placementsAABB(box, truncated);
  const marginL = Math.max(0, region.length - aabb.length);
  const marginW = Math.max(0, region.width - aabb.width);
  const { h, v } = alignmentFractions(config.alignment);
  const finalOffsetL = region.originLength + marginL * h;
  const finalOffsetW = region.originWidth + marginW * v;

  const placements: Array<BoxPlacement> =
    truncated.length > 0
      ? shiftTo(truncated, aabb, finalOffsetL, finalOffsetW)
      : [];

  const finalAABB = placementsAABB(box, placements);
  return {
    placements,
    capacity,
    boundsLength: finalAABB.length,
    boundsWidth: finalAABB.width,
    boundsOriginLength: finalAABB.originLength,
    boundsOriginWidth: finalAABB.originWidth,
  };
}

export function computeLayerLayouts(
  box: Box,
  pallet: PalletStandard,
  pattern: StackingPattern,
  primaryOrientation: LayerOrientationChoice,
  layers: ReadonlyArray<LayerConfig>,
): Array<LayerLayout> {
  const result: Array<LayerLayout> = [];
  let bounds: LayerBounds = {
    length: pallet.length,
    width: pallet.width,
    originLength: 0,
    originWidth: 0,
  };

  for (let i = 0; i < layers.length; i++) {
    const layout = computeLayerLayout(
      box,
      pallet,
      pattern,
      primaryOrientation,
      layers[i],
      i,
      bounds,
    );
    result.push(layout);
    if (layout.placements.length > 0) {
      bounds = {
        length: layout.boundsLength,
        width: layout.boundsWidth,
        originLength: layout.boundsOriginLength,
        originWidth: layout.boundsOriginWidth,
      };
    }
  }
  return result;
}

// Compute capacity for a single layer at a given index (used by Controls to
// expose the maximum value of the box-count input). Mirrors the bounds
// threading in computeLayerLayouts but stops at the requested layer.
export function computeLayerCapacities(
  box: Box,
  pallet: PalletStandard,
  pattern: StackingPattern,
  primaryOrientation: LayerOrientationChoice,
  layers: ReadonlyArray<LayerConfig>,
): Array<number> {
  return computeLayerLayouts(
    box,
    pallet,
    pattern,
    primaryOrientation,
    layers,
  ).map((l) => l.capacity);
}

export function totalBoxes(layouts: ReadonlyArray<LayerLayout>): number {
  let sum = 0;
  for (const l of layouts) {
    sum += l.placements.length;
  }
  return sum;
}

export function formatInches(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  return Number.isInteger(rounded)
    ? `${rounded}"`
    : `${rounded.toFixed(rounded * 10 === Math.floor(rounded * 10) ? 1 : 2)}"`;
}

export function placementFootprint(
  box: Box,
  placement: BoxPlacement,
): { fpL: number; fpW: number } {
  return footprint(box, placement.orientation);
}
