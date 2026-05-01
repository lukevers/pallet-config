import { Box as BoxIcon, Layers, Package, Truck } from 'lucide-react';
import { STANDARD_PALLETS } from '../constants';
import type { Box, PalletStandardId } from '../types';

type Props = {
  palletId: PalletStandardId;
  onPalletChange: (id: PalletStandardId) => void;
  box: Box;
  onBoxChange: (box: Box) => void;
  layersHigh: number;
  onLayersChange: (layers: number) => void;
  pouchesPerBox: number;
  onPouchesChange: (pouches: number) => void;
};

export function Controls({
  palletId,
  onPalletChange,
  box,
  onBoxChange,
  layersHigh,
  onLayersChange,
  pouchesPerBox,
  onPouchesChange,
}: Props) {
  return (
    <div className="rounded-lg border border-navy/10 bg-canvas-card p-4 shadow-card">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1.6fr_1fr_1fr]">
        <Field label="Pallet size" icon={<Truck size={14} />}>
          <select
            value={palletId}
            onChange={(e) => onPalletChange(e.target.value as PalletStandardId)}
            className="w-full rounded-md border border-navy/15 bg-white px-3 py-2 font-medium text-navy-ink text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/20"
          >
            {STANDARD_PALLETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label} —{' '}
                {p.nativeUnit === 'in'
                  ? `${p.nativeLength}" × ${p.nativeWidth}"`
                  : `${p.nativeLength} × ${p.nativeWidth} mm`}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Box size (inches)" icon={<BoxIcon size={14} />}>
          <div className="grid grid-cols-3 gap-2">
            <NumInput
              value={box.length}
              onChange={(v) => onBoxChange({ ...box, length: v })}
              suffix="L"
            />
            <NumInput
              value={box.width}
              onChange={(v) => onBoxChange({ ...box, width: v })}
              suffix="W"
            />
            <NumInput
              value={box.height}
              onChange={(v) => onBoxChange({ ...box, height: v })}
              suffix="H"
            />
          </div>
        </Field>

        <Field label="Layers high" icon={<Layers size={14} />}>
          <NumInput
            value={layersHigh}
            onChange={onLayersChange}
            min={1}
            step={1}
            integer
          />
        </Field>

        <Field label="Pouches per box" icon={<Package size={14} />}>
          <NumInput
            value={pouchesPerBox}
            onChange={onPouchesChange}
            min={1}
            step={1}
            integer
          />
        </Field>
      </div>
    </div>
  );
}

function Field({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="block">
      <div className="mb-1.5 flex items-center gap-1.5 font-semibold text-[11px] text-navy/70 uppercase tracking-wider">
        {icon}
        {label}
      </div>
      {children}
    </div>
  );
}

function NumInput({
  value,
  onChange,
  min = 0.1,
  step = 0.5,
  suffix,
  integer = false,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  step?: number;
  suffix?: string;
  integer?: boolean;
}) {
  return (
    <div className="relative">
      <input
        type="number"
        value={value}
        min={min}
        step={step}
        onChange={(e) => {
          const raw = e.target.valueAsNumber;
          if (Number.isNaN(raw)) {
            return;
          }
          onChange(
            integer ? Math.max(min, Math.round(raw)) : Math.max(min, raw),
          );
        }}
        className="w-full rounded-md border border-navy/15 bg-white px-3 py-2 pr-7 font-medium text-navy-ink text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/20"
      />
      {suffix ? (
        <span className="absolute top-1/2 right-2 -translate-y-1/2 font-semibold text-[10px] text-navy/40 uppercase">
          {suffix}
        </span>
      ) : null}
    </div>
  );
}
