import type { PalletStandard } from './types';

const MM_PER_IN = 25.4;
const mm = (n: number) => n / MM_PER_IN;

export const STANDARD_PALLETS: ReadonlyArray<PalletStandard> = [
  {
    id: 'gma',
    label: 'GMA / North American',
    region: 'USA',
    length: 48,
    width: 40,
    nativeUnit: 'in',
    nativeLength: 48,
    nativeWidth: 40,
  },
  {
    id: 'drum',
    label: 'Drum',
    region: 'USA',
    length: 48,
    width: 48,
    nativeUnit: 'in',
    nativeLength: 48,
    nativeWidth: 48,
  },
  {
    id: 'square',
    label: 'Square',
    region: 'USA',
    length: 42,
    width: 42,
    nativeUnit: 'in',
    nativeLength: 42,
    nativeWidth: 42,
  },
  {
    id: 'tall',
    label: 'Tall',
    region: 'USA',
    length: 48,
    width: 42,
    nativeUnit: 'in',
    nativeLength: 48,
    nativeWidth: 42,
  },
  {
    id: 'compact',
    label: 'Compact',
    region: 'USA',
    length: 40,
    width: 40,
    nativeUnit: 'in',
    nativeLength: 40,
    nativeWidth: 40,
  },
  {
    id: 'half',
    label: 'Half',
    region: 'USA',
    length: 48,
    width: 20,
    nativeUnit: 'in',
    nativeLength: 48,
    nativeWidth: 20,
  },
  {
    id: 'quarter',
    label: 'Quarter',
    region: 'USA',
    length: 24,
    width: 20,
    nativeUnit: 'in',
    nativeLength: 24,
    nativeWidth: 20,
  },
  {
    id: 'euro-epal',
    label: 'Euro EPAL (EUR1)',
    region: 'EU',
    length: mm(1200),
    width: mm(800),
    nativeUnit: 'mm',
    nativeLength: 1200,
    nativeWidth: 800,
  },
  {
    id: 'euro-iso1',
    label: 'Euro ISO1 (EUR2)',
    region: 'EU',
    length: mm(1200),
    width: mm(1000),
    nativeUnit: 'mm',
    nativeLength: 1200,
    nativeWidth: 1000,
  },
  {
    id: 'australian',
    label: 'Australian Standard',
    region: 'AU',
    length: mm(1165),
    width: mm(1165),
    nativeUnit: 'mm',
    nativeLength: 1165,
    nativeWidth: 1165,
  },
  {
    id: 'asian',
    label: 'Asian Standard',
    region: 'Asia',
    length: mm(1100),
    width: mm(1100),
    nativeUnit: 'mm',
    nativeLength: 1100,
    nativeWidth: 1100,
  },
];

export const PALLET_HEIGHT = 5.5;
export const PALLET_DECK_THICKNESS = 0.75;
export const PALLET_STRINGER_HEIGHT = 3.5;
export const PALLET_STRINGER_WIDTH = 3.5;
export const PALLET_TOP_BOARDS = 7;
export const PALLET_BOTTOM_BOARDS = 3;
