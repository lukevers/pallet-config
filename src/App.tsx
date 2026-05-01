import { useMemo, useState } from 'react';
import { BoxSizeCard } from './components/BoxSizeCard';
import { Controls } from './components/Controls';
import { Header } from './components/Header';
import { HeroView } from './components/HeroView';
import { OrthoView } from './components/OrthoView';
import { SummaryCard } from './components/SummaryCard';
import { STANDARD_PALLETS } from './constants';
import { computeLayerLayout } from './lib/layout';
import type { Box, PalletStandardId, ViewMode } from './types';

export default function App() {
  const [palletId, setPalletId] = useState<PalletStandardId>('gma');
  const [box, setBox] = useState<Box>({ length: 14, width: 10, height: 10 });
  const [layersHigh, setLayersHigh] = useState(4);
  const [pouchesPerBox, setPouchesPerBox] = useState(6);
  const [viewMode, setViewMode] = useState<ViewMode>('3d');

  const pallet = useMemo(
    () =>
      STANDARD_PALLETS.find((p) => p.id === palletId) ?? STANDARD_PALLETS[0],
    [palletId],
  );
  const layout = useMemo(() => computeLayerLayout(box, pallet), [box, pallet]);

  return (
    <div className="min-h-full bg-canvas font-sans text-navy-ink">
      <Header box={box} />
      <main className="mx-auto max-w-[1400px] space-y-4 px-4 py-4 sm:px-6">
        <Controls
          palletId={palletId}
          onPalletChange={setPalletId}
          box={box}
          onBoxChange={setBox}
          layersHigh={layersHigh}
          onLayersChange={setLayersHigh}
          pouchesPerBox={pouchesPerBox}
          onPouchesChange={setPouchesPerBox}
        />

        {layout.boxesPerLayer === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(280px,1fr)]">
            <div className="flex flex-col gap-4">
              <HeroView
                pallet={pallet}
                box={box}
                layout={layout}
                layersHigh={layersHigh}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
              />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <OrthoCard title="FRONT VIEW">
                  <OrthoView
                    view="front"
                    pallet={pallet}
                    box={box}
                    layout={layout}
                    layersHigh={layersHigh}
                  />
                </OrthoCard>
                <OrthoCard title="SIDE VIEW">
                  <OrthoView
                    view="side"
                    pallet={pallet}
                    box={box}
                    layout={layout}
                    layersHigh={layersHigh}
                  />
                </OrthoCard>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <SummaryCard
                pallet={pallet}
                box={box}
                layout={layout}
                layersHigh={layersHigh}
                pouchesPerBox={pouchesPerBox}
              />
              <OrthoCard title="TOP VIEW (PER LAYER)">
                <OrthoView
                  view="top"
                  pallet={pallet}
                  box={box}
                  layout={layout}
                  layersHigh={layersHigh}
                />
              </OrthoCard>
              <BoxSizeCard box={box} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function OrthoCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-navy/10 bg-canvas-card shadow-card">
      <header className="border-navy/10 border-b px-4 py-2">
        <h3 className="text-center font-bold text-navy text-sm tracking-widest">
          {title}
        </h3>
      </header>
      <div className="aspect-[4/3] p-4">{children}</div>
    </section>
  );
}

function EmptyState() {
  return (
    <div className="rounded-lg border border-navy/10 border-dashed bg-canvas-card p-12 text-center text-navy/60">
      <p className="font-semibold">No boxes fit this configuration.</p>
      <p className="mt-1 text-sm">
        Try smaller box dimensions or a larger pallet size.
      </p>
    </div>
  );
}
