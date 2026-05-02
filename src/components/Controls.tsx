import { Box as BoxIcon, Layers, Plus, Truck, X } from 'lucide-react';
import { STANDARD_PALLETS } from '../constants';
import type {
  Box,
  LayerAlignment,
  LayerConfig,
  PalletStandardId,
} from '../types';

type Props = {
  palletId: PalletStandardId;
  onPalletChange: (id: PalletStandardId) => void;
  box: Box;
  onBoxChange: (box: Box) => void;
  layers: ReadonlyArray<LayerConfig>;
  onAddLayer: () => void;
  onRemoveLayer: (index: number) => void;
  onUpdateLayer: (index: number, partial: Partial<LayerConfig>) => void;
};

export function Controls({
  palletId,
  onPalletChange,
  box,
  onBoxChange,
  layers,
  onAddLayer,
  onRemoveLayer,
  onUpdateLayer,
}: Props) {
  return (
    <div className="rounded-lg border border-navy/10 bg-canvas-card p-4 shadow-card">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1.6fr]">
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
                  ? `${p.nativeLength}" × ${p.nativeWidth}" × ${p.nativeHeight}"`
                  : `${p.nativeLength} × ${p.nativeWidth} × ${p.nativeHeight} mm`}
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
      </div>

      <hr className="my-4 border-navy/10" />

      <Field
        label={
          layers.length === 0
            ? 'Layers — add layers to start building'
            : `Layers — ${layers.length} stacked bottom → top`
        }
        icon={<Layers size={14} />}
      >
        {layers.length === 0 ? (
          <button
            type="button"
            onClick={onAddLayer}
            className="flex w-full items-center justify-center gap-2 rounded-md border-2 border-navy/20 border-dashed bg-white px-4 py-6 font-semibold text-navy/70 text-sm transition hover:border-navy/40 hover:bg-navy/5"
          >
            <Plus size={16} />
            Add first layer
          </button>
        ) : (
          <div className="flex flex-wrap items-stretch gap-2">
            {layers.map((layer, i) => (
              <LayerCard
                key={`layer-${
                  // biome-ignore lint/suspicious/noArrayIndexKey: layers are positional
                  i
                }`}
                layerNumber={i + 1}
                isBottom={i === 0}
                isTop={i === layers.length - 1}
                config={layer}
                onChange={(partial) => onUpdateLayer(i, partial)}
                onRemove={() => onRemoveLayer(i)}
              />
            ))}
            <button
              type="button"
              onClick={onAddLayer}
              className="flex min-w-[120px] flex-col items-center justify-center gap-1 rounded-md border-2 border-navy/20 border-dashed bg-white px-3 py-2 font-semibold text-navy/70 text-xs transition hover:border-navy/40 hover:bg-navy/5"
            >
              <Plus size={20} />
              Add layer
            </button>
          </div>
        )}
      </Field>
    </div>
  );
}

function LayerCard({
  layerNumber,
  isBottom,
  isTop,
  config,
  onChange,
  onRemove,
}: {
  layerNumber: number;
  isBottom: boolean;
  isTop: boolean;
  config: LayerConfig;
  onChange: (partial: Partial<LayerConfig>) => void;
  onRemove: () => void;
}) {
  const suffix = isBottom ? ' (bottom)' : isTop ? ' (top)' : '';
  return (
    <div className="relative flex min-w-[180px] flex-col gap-2 rounded-md border border-navy/10 bg-white p-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold text-[10px] text-navy/60 uppercase tracking-wider">
          Layer {layerNumber}
          {suffix}
        </span>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove layer ${layerNumber}`}
          className="rounded p-0.5 text-navy/40 transition hover:bg-navy/5 hover:text-navy"
        >
          <X size={12} />
        </button>
      </div>

      <div>
        <span className="mb-1 block font-semibold text-[9px] text-navy/50 uppercase tracking-wider">
          Orientation
        </span>
        <div className="inline-flex w-full overflow-hidden rounded border border-navy/15">
          <SegButton
            active={config.orientation === 'auto'}
            onClick={() => onChange({ orientation: 'auto' })}
            label="Auto"
          />
          <SegButton
            active={config.orientation === 'length-along-pallet'}
            onClick={() => onChange({ orientation: 'length-along-pallet' })}
            label="L"
            title="Length along pallet"
          />
          <SegButton
            active={config.orientation === 'width-along-pallet'}
            onClick={() => onChange({ orientation: 'width-along-pallet' })}
            label="W"
            title="Width along pallet"
          />
        </div>
      </div>

      <div>
        <span className="mb-1 block font-semibold text-[9px] text-navy/50 uppercase tracking-wider">
          Alignment
        </span>
        <AlignmentGrid
          value={config.alignment}
          onChange={(alignment) => onChange({ alignment })}
        />
      </div>
    </div>
  );
}

const ALIGNMENT_CELLS: ReadonlyArray<LayerAlignment> = [
  'top-left',
  'top-center',
  'top-right',
  'middle-left',
  'middle-center',
  'middle-right',
  'bottom-left',
  'bottom-center',
  'bottom-right',
];

const ALIGNMENT_LABELS: Record<LayerAlignment, string> = {
  'top-left': 'Top left',
  'top-center': 'Top center',
  'top-right': 'Top right',
  'middle-left': 'Middle left',
  'middle-center': 'Center',
  'middle-right': 'Middle right',
  'bottom-left': 'Bottom left',
  'bottom-center': 'Bottom center',
  'bottom-right': 'Bottom right',
};

function AlignmentGrid({
  value,
  onChange,
}: {
  value: LayerAlignment;
  onChange: (next: LayerAlignment) => void;
}) {
  return (
    <div className="inline-grid grid-cols-3 gap-0.5 rounded border border-navy/15 bg-canvas p-1">
      {ALIGNMENT_CELLS.map((cell) => {
        const active = value === cell;
        return (
          <button
            key={cell}
            type="button"
            aria-pressed={active}
            aria-label={ALIGNMENT_LABELS[cell]}
            title={ALIGNMENT_LABELS[cell]}
            onClick={() => onChange(cell)}
            className={
              active
                ? 'h-6 w-6 rounded-sm bg-navy'
                : 'h-6 w-6 rounded-sm bg-white transition hover:bg-navy/15'
            }
          />
        );
      })}
    </div>
  );
}

function SegButton({
  active,
  onClick,
  label,
  title,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-pressed={active}
      className={
        active
          ? 'flex-1 bg-navy px-2.5 py-1 font-semibold text-[11px] text-white'
          : 'flex-1 bg-transparent px-2.5 py-1 font-semibold text-[11px] text-navy/70 transition hover:bg-navy/5'
      }
    >
      {label}
    </button>
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
