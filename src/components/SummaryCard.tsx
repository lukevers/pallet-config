import type { LayerLayout } from '../lib/layout';
import { formatInches, totalBoxes } from '../lib/layout';
import type { Box, PalletStandard } from '../types';

type Props = {
  pallet: PalletStandard;
  box: Box;
  layouts: ReadonlyArray<LayerLayout>;
};

export function SummaryCard({ pallet, box, layouts }: Props) {
  const layersHigh = layouts.length;
  const boxes = totalBoxes(layouts);
  const stackHeight = pallet.height + box.height * layersHigh;

  const perLayer = layouts.map((l) => l.placements.length);
  const minPerLayer = perLayer.length > 0 ? Math.min(...perLayer) : 0;
  const maxPerLayer = perLayer.length > 0 ? Math.max(...perLayer) : 0;
  const perLayerLabel =
    minPerLayer === maxPerLayer
      ? `${minPerLayer}`
      : `${minPerLayer}–${maxPerLayer}`;

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
            <span className="font-bold">{perLayerLabel}</span> BOXES PER LAYER
          </p>
          <p>
            <span className="font-bold">{layersHigh}</span> LAYERS HIGH
          </p>
        </div>
        <hr className="border-navy/15" />
        <div className="space-y-1">
          <p className="font-bold text-base">{boxes} BOXES TOTAL</p>
          <p className="text-sm">PER PALLET</p>
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
        </dl>
      </div>
    </section>
  );
}
