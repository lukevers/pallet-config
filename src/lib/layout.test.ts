import { describe, expect, it } from 'vitest';
import { STANDARD_PALLETS } from '../constants';
import type { Box, LayerConfig, StackingPattern } from '../types';
import { computeLayerLayouts, totalBoxes } from './layout';

const gma = STANDARD_PALLETS.find((p) => p.id === 'gma');
if (!gma) {
  throw new Error('gma pallet missing');
}
const PALLET = gma;
const BOX: Box = { length: 14, width: 10, height: 10 };

const oneLayer: ReadonlyArray<LayerConfig> = [
  { alignment: 'middle-center', boxCount: null },
];

describe('computeLayerLayouts', () => {
  const PATTERNS: ReadonlyArray<StackingPattern> = [
    'block',
    'row',
    'brick',
    'pinwheel',
    'split-row',
    'hybrid-pinwheel',
  ];

  for (const pattern of PATTERNS) {
    it(`${pattern}: places at least one box on a GMA pallet with a 14x10 box`, () => {
      const layouts = computeLayerLayouts(
        BOX,
        PALLET,
        pattern,
        'auto',
        oneLayer,
      );
      expect(layouts).toHaveLength(1);
      expect(layouts[0].placements.length).toBeGreaterThan(0);
      expect(layouts[0].capacity).toBe(layouts[0].placements.length);
    });
  }

  it('block: every layer has identical capacity', () => {
    const layers: ReadonlyArray<LayerConfig> = [
      { alignment: 'middle-center', boxCount: null },
      { alignment: 'middle-center', boxCount: null },
      { alignment: 'middle-center', boxCount: null },
    ];
    const layouts = computeLayerLayouts(BOX, PALLET, 'block', 'auto', layers);
    expect(layouts[0].capacity).toBe(layouts[1].capacity);
    expect(layouts[1].capacity).toBe(layouts[2].capacity);
  });

  it('row: layer 0 and 1 use opposite orientations', () => {
    const layers: ReadonlyArray<LayerConfig> = [
      { alignment: 'middle-center', boxCount: null },
      { alignment: 'middle-center', boxCount: null },
    ];
    const layouts = computeLayerLayouts(
      BOX,
      PALLET,
      'row',
      'length-along-pallet',
      layers,
    );
    const o0 = layouts[0].placements[0]?.orientation;
    const o1 = layouts[1].placements[0]?.orientation;
    expect(o0).toBe('length-along-pallet');
    expect(o1).toBe('width-along-pallet');
  });

  it('boxCount truncates placements and totalBoxes reports the truncated count', () => {
    const probe = computeLayerLayouts(BOX, PALLET, 'block', 'auto', oneLayer);
    const capacity = probe[0].capacity;
    const limited: ReadonlyArray<LayerConfig> = [
      { alignment: 'middle-center', boxCount: Math.max(1, capacity - 2) },
    ];
    const layouts = computeLayerLayouts(BOX, PALLET, 'block', 'auto', limited);
    expect(layouts[0].placements.length).toBe(Math.max(1, capacity - 2));
    expect(totalBoxes(layouts)).toBe(Math.max(1, capacity - 2));
    // Capacity (max possible) should still report the unlimited value.
    expect(layouts[0].capacity).toBe(capacity);
  });

  it('pinwheel: contains both orientations within a layer', () => {
    const layouts = computeLayerLayouts(
      BOX,
      PALLET,
      'pinwheel',
      'auto',
      oneLayer,
    );
    const orientations = new Set(
      layouts[0].placements.map((p) => p.orientation),
    );
    expect(orientations.size).toBe(2);
  });

  it('brick: contains both orientations within a layer', () => {
    const layouts = computeLayerLayouts(BOX, PALLET, 'brick', 'auto', oneLayer);
    const orientations = new Set(
      layouts[0].placements.map((p) => p.orientation),
    );
    // Brick should use alternating stripes; if the box is too unbalanced for
    // a second stripe, it might collapse to one orientation, but with 14x10 on
    // a 48x40 pallet both stripes fit.
    expect(orientations.size).toBe(2);
  });

  it('split-row: contains both orientations within a layer', () => {
    const layouts = computeLayerLayouts(
      BOX,
      PALLET,
      'split-row',
      'auto',
      oneLayer,
    );
    const orientations = new Set(
      layouts[0].placements.map((p) => p.orientation),
    );
    expect(orientations.size).toBe(2);
  });

  it('placements never overhang the pallet bounds', () => {
    for (const pattern of PATTERNS) {
      const layouts = computeLayerLayouts(
        BOX,
        PALLET,
        pattern,
        'auto',
        oneLayer,
      );
      for (const placement of layouts[0].placements) {
        const fpL =
          placement.orientation === 'length-along-pallet'
            ? BOX.length
            : BOX.width;
        const fpW =
          placement.orientation === 'length-along-pallet'
            ? BOX.width
            : BOX.length;
        expect(placement.offsetLength).toBeGreaterThanOrEqual(0);
        expect(placement.offsetWidth).toBeGreaterThanOrEqual(0);
        expect(placement.offsetLength + fpL).toBeLessThanOrEqual(
          PALLET.length + 1e-6,
        );
        expect(placement.offsetWidth + fpW).toBeLessThanOrEqual(
          PALLET.width + 1e-6,
        );
      }
    }
  });
});
