import { act, render, screen } from '@testing-library/react';
import type { Box } from '../types';
import { BoxSizeCard } from './BoxSizeCard';

describe('BoxSizeCard', () => {
  const sampleBox: Box = {
    length: 14,
    width: 10,
    height: 10,
    weightLbs: 10,
    weightOz: 4,
  };

  it('renders box size and weight section with lbs and oz', async () => {
    await act(async () => {
      render(<BoxSizeCard box={sampleBox} />);
    });

    expect(screen.getByText('BOX SIZE')).toBeInTheDocument();
    expect(screen.getByText('14" × 10" × 10"')).toBeInTheDocument();
    expect(screen.getByText('WEIGHT')).toBeInTheDocument();
    expect(screen.getByText('10 lbs 4 oz')).toBeInTheDocument();
  });
});
