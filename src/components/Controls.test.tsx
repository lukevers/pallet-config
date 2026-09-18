import { act, fireEvent, render, screen } from '@testing-library/react';
import type { Box } from '../types';
import { Controls } from './Controls';

describe('Controls', () => {
  const sampleBox: Box = {
    length: 14,
    width: 10,
    height: 10,
    weightLbs: 10,
    weightOz: 4,
  };

  it('renders box weight inputs and triggers onBoxChange for lbs and oz', async () => {
    let currentBox = sampleBox;
    const handleBoxChange = (next: Box) => {
      currentBox = next;
    };

    await act(async () => {
      render(
        <Controls
          palletId="gma"
          onPalletChange={() => {}}
          box={currentBox}
          onBoxChange={handleBoxChange}
          layers={[]}
          onAddLayer={() => {}}
          onRemoveLayer={() => {}}
          onUpdateLayer={() => {}}
        />,
      );
    });

    const lbsInput = screen.getByLabelText('Box weight in pounds');
    const ozInput = screen.getByLabelText('Box weight in ounces');
    expect(lbsInput).toHaveValue(10);
    expect(ozInput).toHaveValue(4);

    await act(async () => {
      fireEvent.change(lbsInput, { target: { value: '12' } });
    });
    expect(currentBox.weightLbs).toBe(12);

    await act(async () => {
      fireEvent.change(ozInput, { target: { value: '8' } });
    });
    expect(currentBox.weightOz).toBe(8);
  });
});
