import type { Box, PalletStandard } from '../types';

export type BoxOrientation = 'length-along-pallet' | 'width-along-pallet';

export type LayerLayout = {
  rows: number;
  cols: number;
  boxesPerLayer: number;
  orientation: BoxOrientation;
  footprintLength: number;
  footprintWidth: number;
  marginLength: number;
  marginWidth: number;
};

export function computeLayerLayout(
  box: Box,
  pallet: PalletStandard,
): LayerLayout {
  const a = {
    cols: Math.floor(pallet.length / box.length),
    rows: Math.floor(pallet.width / box.width),
    fpL: box.length,
    fpW: box.width,
    orientation: 'length-along-pallet' as const,
  };
  const b = {
    cols: Math.floor(pallet.length / box.width),
    rows: Math.floor(pallet.width / box.length),
    fpL: box.width,
    fpW: box.length,
    orientation: 'width-along-pallet' as const,
  };
  const winner = a.cols * a.rows >= b.cols * b.rows ? a : b;
  const cols = Math.max(0, winner.cols);
  const rows = Math.max(0, winner.rows);
  return {
    rows,
    cols,
    boxesPerLayer: cols * rows,
    orientation: winner.orientation,
    footprintLength: winner.fpL,
    footprintWidth: winner.fpW,
    marginLength: pallet.length - cols * winner.fpL,
    marginWidth: pallet.width - rows * winner.fpW,
  };
}

export function totalBoxes(layout: LayerLayout, layersHigh: number): number {
  return layout.boxesPerLayer * layersHigh;
}

export function totalUnits(
  layout: LayerLayout,
  layersHigh: number,
  pouchesPerBox: number,
): number {
  return totalBoxes(layout, layersHigh) * pouchesPerBox;
}

export function formatInches(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  return Number.isInteger(rounded)
    ? `${rounded}"`
    : `${rounded.toFixed(rounded * 10 === Math.floor(rounded * 10) ? 1 : 2)}"`;
}
