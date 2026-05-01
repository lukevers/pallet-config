export type PalletStandardId =
  | 'gma'
  | 'drum'
  | 'square'
  | 'tall'
  | 'compact'
  | 'half'
  | 'quarter'
  | 'euro-epal'
  | 'euro-iso1'
  | 'australian'
  | 'asian';

export type PalletStandard = {
  id: PalletStandardId;
  label: string;
  region: string;
  length: number;
  width: number;
  nativeUnit: 'in' | 'mm';
  nativeLength: number;
  nativeWidth: number;
};

export type Box = {
  length: number;
  width: number;
  height: number;
};

export type PalletConfig = {
  palletId: PalletStandardId;
  box: Box;
  layersHigh: number;
  pouchesPerBox: number;
};

export type ViewMode = '3d' | '2d';
