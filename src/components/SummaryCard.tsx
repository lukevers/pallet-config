import { PALLET_HEIGHT } from '../constants';
import type { LayerLayout } from '../lib/layout';
import { formatInches, totalBoxes, totalUnits } from '../lib/layout';
import type { Box, PalletStandard } from '../types';

type Props = {
  pallet: PalletStandard;
  box: Box;
  layout: LayerLayout;
  layersHigh: number;
  pouchesPerBox: number;
};

export function SummaryCard({
  pallet,
  box,
  layout,
  layersHigh,
  pouchesPerBox,
}: Props) {
  const boxes = totalBoxes(layout, layersHigh);
  const units = totalUnits(layout, layersHigh, pouchesPerBox);
  const stackHeight = PALLET_HEIGHT + box.height * layersHigh;

  return (
    <section className="overflow-hidden rounded-lg border border-navy/10 bg-canvas-card shadow-card">
      <header className="bg-navy px-4 py-2.5 text-center">
        <h3 className="font-bold text-sm text-white tracking-widest">
          PALLET SUMMARY
        </h3>
      </header>
      <div className="space-y-3 px-5 py-4 text-navy-ink">
        <div className="space-y-1 font-medium text-sm">
          <p>
            <span className="font-bold">{layout.boxesPerLayer}</span> BOXES PER
            LAYER
          </p>
          <p>
            <span className="font-bold">{layersHigh}</span> LAYERS HIGH
          </p>
        </div>
        <hr className="border-navy/15" />
        <div className="space-y-1">
          <p className="font-bold text-base">{boxes} BOXES TOTAL</p>
          <p className="text-sm">
            @ <span className="font-bold">{pouchesPerBox} POUCHES</span> ={' '}
            <span className="font-bold">{units} UNITS</span>
            <br />
            PER PALLET
          </p>
        </div>
        <hr className="border-navy/15" />
        <dl className="space-y-1 text-sm">
          <div className="flex gap-2">
            <dt className="font-bold">DIMS:</dt>
            <dd>
              {formatInches(pallet.width)} × {formatInches(pallet.length)} ×{' '}
              {formatInches(stackHeight)}
            </dd>
          </div>
          <div className="flex gap-2">
            <dt className="font-bold">WEIGHT:</dt>
            <dd>TBD</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
