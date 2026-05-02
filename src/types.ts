export type PalletStandardId =
  | 'gma'
  | 'chep'
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
  height: number;
  nativeUnit: 'in' | 'mm';
  nativeLength: number;
  nativeWidth: number;
  nativeHeight: number;
};

export type Box = {
  length: number;
  width: number;
  height: number;
};

export type BoxOrientation = 'length-along-pallet' | 'width-along-pallet';

export type LayerOrientationChoice = 'auto' | BoxOrientation;

export type LayerAlignment =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'middle-left'
  | 'middle-center'
  | 'middle-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

export type LayerConfig = {
  orientation: LayerOrientationChoice;
  alignment: LayerAlignment;
};

export type PalletConfig = {
  palletId: PalletStandardId;
  box: Box;
  layers: Array<LayerConfig>;
};

export type SavedConfig = {
  id: string;
  name: string;
  palletId: PalletStandardId;
  box: Box;
  layers: Array<LayerConfig>;
  updatedAt: number;
};

export type ViewMode = '3d' | '2d';
