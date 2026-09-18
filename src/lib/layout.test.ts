import { STANDARD_PALLETS } from '../constants';
import type { Box, LayerConfig } from '../types';
import {
  boxWeightInOz,
  computeLayerLayout,
  computeLayerLayouts,
  formatInches,
  formatWeight,
  formatWeightLbsOz,
  totalBoxes,
  totalWeight,
  totalWeightInOz,
} from './layout';

describe('formatWeightLbsOz and formatWeight', () => {
  it('formats zero correctly', () => {
    expect(formatWeightLbsOz(0)).toBe('0 lbs');
    expect(formatWeight(0, 0)).toBe('0 lbs');
  });

  it('formats singular pound', () => {
    expect(formatWeightLbsOz(16)).toBe('1 lb');
    expect(formatWeight(1, 0)).toBe('1 lb');
  });

  it('formats lbs and oz together (e.g. 10 lbs 4 oz)', () => {
    expect(formatWeight(10, 4)).toBe('10 lbs 4 oz');
    expect(formatWeightLbsOz(10 * 16 + 4)).toBe('10 lbs 4 oz');
  });

  it('formats only ounces when under 1 lb', () => {
    expect(formatWeight(0, 8)).toBe('8 oz');
    expect(formatWeightLbsOz(8)).toBe('8 oz');
  });

  it('formats integer pounds with commas', () => {
    expect(formatWeight(25, 0)).toBe('25 lbs');
    expect(formatWeight(1200, 0)).toBe('1,200 lbs');
    expect(formatWeight(1200, 8)).toBe('1,200 lbs 8 oz');
  });

  it('handles negative or NaN values safely', () => {
    expect(formatWeightLbsOz(-5)).toBe('0 lbs');
    expect(formatWeightLbsOz(Number.NaN)).toBe('0 lbs');
  });
});

describe('boxWeightInOz', () => {
  it('calculates ounces from lbs and oz', () => {
    expect(boxWeightInOz({ weightLbs: 10, weightOz: 4 })).toBe(164);
    expect(boxWeightInOz({ weightLbs: 0, weightOz: 8 })).toBe(8);
    expect(boxWeightInOz({ weightLbs: 25, weightOz: 0 })).toBe(400);
  });
});

describe('totalWeightInOz', () => {
  const sampleBox: Box = {
    length: 14,
    width: 10,
    height: 10,
    weightLbs: 10,
    weightOz: 4,
  };
  const gmaPallet = STANDARD_PALLETS[0];

  it('returns 0 when there are no layers', () => {
    const layouts = computeLayerLayouts(sampleBox, gmaPallet, []);
    expect(totalWeightInOz(layouts, sampleBox)).toBe(0);
  });

  it('calculates total weight across layers with lbs and oz', () => {
    const layers: Array<LayerConfig> = [
      { orientation: 'auto', alignment: 'middle-center' },
      { orientation: 'auto', alignment: 'middle-center' },
    ];
    const layouts = computeLayerLayouts(sampleBox, gmaPallet, layers);
    const boxes = totalBoxes(layouts);
    expect(boxes).toBeGreaterThan(0);
    // 10 lbs 4 oz = 164 oz
    expect(totalWeightInOz(layouts, sampleBox)).toBe(boxes * 164);
  });

  it('handles box weight of 0 lbs 0 oz', () => {
    const layout = computeLayerLayout(sampleBox, gmaPallet);
    expect(totalWeightInOz([layout], { weightLbs: 0, weightOz: 0 })).toBe(0);
    expect(totalWeight([layout], 0)).toBe(0);
  });
});

describe('formatInches', () => {
  it('formats integers and decimals', () => {
    expect(formatInches(48)).toBe('48"');
    expect(formatInches(40.5)).toBe('40.5"');
    expect(formatInches(40.25)).toBe('40.25"');
  });
});
