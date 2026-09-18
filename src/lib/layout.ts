import type {
  Box,
  BoxOrientation,
  LayerAlignment,
  LayerConfig,
  LayerOrientationChoice,
  PalletStandard,
} from '../types';

export type LayerLayout = {
  rows: number;
  cols: number;
  boxesPerLayer: number;
  orientation: BoxOrientation;
  footprintLength: number;
  footprintWidth: number;
  marginLength: number;
  marginWidth: number;
  offsetLength: number;
  offsetWidth: number;
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

export function computeLayerLayout(
  box: Box,
  pallet: PalletStandard,
  config?: {
    orientation?: LayerOrientationChoice;
    alignment?: LayerAlignment;
  },
  bounds?: LayerBounds,
): LayerLayout {
  const region = bounds ?? {
    length: pallet.length,
    width: pallet.width,
    originLength: 0,
    originWidth: 0,
  };
  const orientationChoice = config?.orientation ?? 'auto';
  const alignment = config?.alignment ?? 'middle-center';

  const along = {
    cols: Math.floor(region.length / box.length),
    rows: Math.floor(region.width / box.width),
    fpL: box.length,
    fpW: box.width,
    orientation: 'length-along-pallet' as const,
  };
  const across = {
    cols: Math.floor(region.length / box.width),
    rows: Math.floor(region.width / box.length),
    fpL: box.width,
    fpW: box.length,
    orientation: 'width-along-pallet' as const,
  };

  let winner: typeof along | typeof across;
  if (orientationChoice === 'length-along-pallet') {
    winner = along;
  } else if (orientationChoice === 'width-along-pallet') {
    winner = across;
  } else {
    winner =
      along.cols * along.rows >= across.cols * across.rows ? along : across;
  }

  const cols = Math.max(0, winner.cols);
  const rows = Math.max(0, winner.rows);
  const marginLength = region.length - cols * winner.fpL;
  const marginWidth = region.width - rows * winner.fpW;
  const { h, v } = alignmentFractions(alignment);

  return {
    rows,
    cols,
    boxesPerLayer: cols * rows,
    orientation: winner.orientation,
    footprintLength: winner.fpL,
    footprintWidth: winner.fpW,
    marginLength,
    marginWidth,
    offsetLength: region.originLength + marginLength * h,
    offsetWidth: region.originWidth + marginWidth * v,
  };
}

export function computeLayerLayouts(
  box: Box,
  pallet: PalletStandard,
  layers: ReadonlyArray<LayerConfig>,
): Array<LayerLayout> {
  const result: Array<LayerLayout> = [];
  let bounds: LayerBounds = {
    length: pallet.length,
    width: pallet.width,
    originLength: 0,
    originWidth: 0,
  };

  for (const layer of layers) {
    const layout = computeLayerLayout(box, pallet, layer, bounds);
    result.push(layout);
    bounds = {
      length: layout.cols * layout.footprintLength,
      width: layout.rows * layout.footprintWidth,
      originLength: layout.offsetLength,
      originWidth: layout.offsetWidth,
    };
  }

  return result;
}

export function totalBoxes(layouts: ReadonlyArray<LayerLayout>): number {
  let sum = 0;
  for (const l of layouts) {
    sum += l.boxesPerLayer;
  }
  return sum;
}

export function boxWeightInOz(box: {
  weightLbs: number;
  weightOz: number;
}): number {
  return Math.max(0, box.weightLbs) * 16 + Math.max(0, box.weightOz);
}

export function totalWeightInOz(
  layouts: ReadonlyArray<LayerLayout>,
  box: { weightLbs: number; weightOz: number },
): number {
  return totalBoxes(layouts) * boxWeightInOz(box);
}

export function totalWeight(
  layouts: ReadonlyArray<LayerLayout>,
  boxWeightLbs: number,
): number {
  return totalBoxes(layouts) * boxWeightLbs;
}

export function formatInches(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  return Number.isInteger(rounded)
    ? `${rounded}"`
    : `${rounded.toFixed(rounded * 10 === Math.floor(rounded * 10) ? 1 : 2)}"`;
}

export function formatWeightLbsOz(totalOz: number): string {
  if (Number.isNaN(totalOz) || totalOz <= 0) {
    return '0 lbs';
  }
  const roundedOz = Math.round(totalOz * 100) / 100;
  const lbs = Math.floor(roundedOz / 16);
  const oz = Math.round((roundedOz % 16) * 100) / 100;

  if (lbs === 0) {
    return `${oz} oz`;
  }
  if (oz === 0) {
    return `${lbs.toLocaleString('en-US')} ${lbs === 1 ? 'lb' : 'lbs'}`;
  }
  return `${lbs.toLocaleString('en-US')} ${lbs === 1 ? 'lb' : 'lbs'} ${oz} oz`;
}

export function formatWeight(lbs: number, oz = 0): string {
  return formatWeightLbsOz(Math.max(0, lbs) * 16 + Math.max(0, oz));
}
