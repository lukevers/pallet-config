import { RotateCw } from 'lucide-react';
import { Suspense } from 'react';
import type { LayerLayout } from '../lib/layout';
import type { Box, PalletStandard, ViewMode } from '../types';
import { PalletScene2D } from './PalletScene2D';
import { PalletScene3D } from './PalletScene3D';

type Props = {
  pallet: PalletStandard;
  box: Box;
  layouts: ReadonlyArray<LayerLayout>;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
};

export function HeroView({
  pallet,
  box,
  layouts,
  viewMode,
  onViewModeChange,
}: Props) {
  return (
    <section className="relative min-h-[420px] overflow-hidden rounded-lg border border-navy/10 bg-canvas-card shadow-card">
      <ViewToggle value={viewMode} onChange={onViewModeChange} />
      {viewMode === '3d' ? (
        <Hint icon={<RotateCw size={12} />}>
          Drag to rotate · scroll to zoom
        </Hint>
      ) : null}
      <div className="absolute inset-0">
        <Suspense fallback={null}>
          {viewMode === '3d' ? (
            <PalletScene3D pallet={pallet} box={box} layouts={layouts} />
          ) : (
            <div className="h-full w-full p-6">
              <PalletScene2D pallet={pallet} box={box} layouts={layouts} />
            </div>
          )}
        </Suspense>
      </div>
    </section>
  );
}

function ViewToggle({
  value,
  onChange,
}: {
  value: ViewMode;
  onChange: (m: ViewMode) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="View mode"
      className="absolute top-3 right-3 z-10 inline-flex overflow-hidden rounded-full border border-navy/15 bg-white/95 shadow-card backdrop-blur"
    >
      <ToggleButton
        active={value === '3d'}
        onClick={() => onChange('3d')}
        label="3D"
      />
      <ToggleButton
        active={value === '2d'}
        onClick={() => onChange('2d')}
        label="2D"
      />
    </div>
  );
}

function ToggleButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={
        active
          ? 'bg-navy px-4 py-1.5 font-semibold text-sm text-white'
          : 'bg-transparent px-4 py-1.5 font-semibold text-navy/70 text-sm transition hover:text-navy'
      }
    >
      {label}
    </button>
  );
}

function Hint({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="absolute bottom-3 left-3 z-10 inline-flex items-center gap-1.5 rounded-full border border-navy/10 bg-white/85 px-2.5 py-1 font-medium text-[11px] text-navy/70 shadow-sm backdrop-blur">
      {icon}
      {children}
    </div>
  );
}
