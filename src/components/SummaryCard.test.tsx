import { act, render, screen } from '@testing-library/react';
import { STANDARD_PALLETS } from '../constants';
import {
  computeLayerLayouts,
  formatWeightLbsOz,
  totalWeightInOz,
} from '../lib/layout';
import type { Box, LayerConfig } from '../types';
import { SummaryCard } from './SummaryCard';

describe('SummaryCard', () => {
  const gmaPallet = STANDARD_PALLETS[0];
  const sampleBox: Box = {
    length: 14,
    width: 10,
    height: 10,
    weightLbs: 10,
    weightOz: 4,
  };

  it('displays pallet dimensions and total weight with layers', async () => {
    const layers: Array<LayerConfig> = [
      { orientation: 'auto', alignment: 'middle-center' },
      { orientation: 'auto', alignment: 'middle-center' },
    ];
    const layouts = computeLayerLayouts(sampleBox, gmaPallet, layers);

    await act(async () => {
      render(
        <SummaryCard pallet={gmaPallet} box={sampleBox} layouts={layouts} />,
      );
    });

    expect(screen.getByText('PALLET SUMMARY')).toBeInTheDocument();
    expect(screen.getByText('WEIGHT:')).toBeInTheDocument();
    const totalOz = totalWeightInOz(layouts, sampleBox);
    expect(screen.getByText(formatWeightLbsOz(totalOz))).toBeInTheDocument();
  });

  it('displays 0 lbs when there are no layers', async () => {
    const layouts = computeLayerLayouts(sampleBox, gmaPallet, []);
    await act(async () => {
      render(
        <SummaryCard pallet={gmaPallet} box={sampleBox} layouts={layouts} />,
      );
    });
    expect(screen.getByText('0 lbs')).toBeInTheDocument();
  });
});
