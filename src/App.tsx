import { useCallback, useEffect, useMemo, useState } from 'react';
import { BoxSizeCard } from './components/BoxSizeCard';
import { ConfigsBar } from './components/ConfigsBar';
import { Controls } from './components/Controls';
import { Header } from './components/Header';
import { HeroView } from './components/HeroView';
import { OrthoView } from './components/OrthoView';
import { SummaryCard } from './components/SummaryCard';
import { STANDARD_PALLETS } from './constants';
import { computeLayerLayouts } from './lib/layout';
import {
  buildShareUrl,
  clearHash,
  inferLegacyPattern,
  readSharedFromHash,
  type SharedPayload,
} from './lib/share';
import { type ConfigStore, loadStore, saveStore } from './lib/storage';
import type {
  Box,
  LayerConfig,
  LayerOrientationChoice,
  PalletStandardId,
  SavedConfig,
  StackingPattern,
  ViewMode,
} from './types';

type AppState = {
  configs: Array<SavedConfig>;
  activeId: string;
};

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function makeDefaultConfig(name = 'Untitled configuration'): SavedConfig {
  return {
    id: newId(),
    name,
    palletId: 'gma',
    box: { length: 14, width: 10, height: 10 },
    stackingPattern: 'block',
    orientation: 'auto',
    layers: [],
    updatedAt: Date.now(),
  };
}

function fromShared(shared: SharedPayload): SavedConfig {
  return {
    id: newId(),
    name: shared.name || 'Shared configuration',
    palletId: shared.palletId,
    box: shared.box,
    stackingPattern: shared.stackingPattern,
    orientation: shared.orientation,
    layers: shared.layers,
    updatedAt: Date.now(),
  };
}

// Migrate a legacy stored config (per-layer orientation, no stackingPattern)
// into the current shape. Idempotent for already-migrated configs.
function migrateConfig(raw: unknown): SavedConfig | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const c = raw as Record<string, unknown>;
  if (typeof c.id !== 'string' || typeof c.name !== 'string') {
    return null;
  }
  if (typeof c.palletId !== 'string') {
    return null;
  }
  const box = c.box;
  if (
    !box ||
    typeof box !== 'object' ||
    typeof (box as Record<string, unknown>).length !== 'number' ||
    typeof (box as Record<string, unknown>).width !== 'number' ||
    typeof (box as Record<string, unknown>).height !== 'number'
  ) {
    return null;
  }
  if (!Array.isArray(c.layers)) {
    return null;
  }
  const layers: Array<LayerConfig> = [];
  const legacyOrientations: Array<LayerOrientationChoice> = [];
  for (const layer of c.layers) {
    if (!layer || typeof layer !== 'object') {
      return null;
    }
    const l = layer as Record<string, unknown>;
    if (typeof l.alignment !== 'string') {
      return null;
    }
    let boxCount: number | null = null;
    if (l.boxCount != null && typeof l.boxCount === 'number') {
      boxCount = Math.floor(l.boxCount);
    }
    legacyOrientations.push(
      (typeof l.orientation === 'string'
        ? l.orientation
        : 'auto') as LayerOrientationChoice,
    );
    layers.push({
      alignment: l.alignment as LayerConfig['alignment'],
      boxCount,
    });
  }

  let stackingPattern: StackingPattern;
  let orientation: LayerOrientationChoice;
  if (typeof c.stackingPattern === 'string') {
    stackingPattern = c.stackingPattern as StackingPattern;
    orientation = (
      typeof c.orientation === 'string' ? c.orientation : 'auto'
    ) as LayerOrientationChoice;
  } else {
    const inferred = inferLegacyPattern(legacyOrientations);
    stackingPattern = inferred.pattern;
    orientation = inferred.orientation;
  }

  return {
    id: c.id as string,
    name: c.name as string,
    palletId: c.palletId as PalletStandardId,
    box: box as { length: number; width: number; height: number },
    stackingPattern,
    orientation,
    layers,
    updatedAt:
      typeof c.updatedAt === 'number' ? (c.updatedAt as number) : Date.now(),
  };
}

function initialState(): AppState {
  const stored = loadStore();
  const shared = readSharedFromHash();

  let configs: Array<SavedConfig> = [];
  if (stored?.configs && Array.isArray(stored.configs)) {
    for (const raw of stored.configs) {
      const migrated = migrateConfig(raw);
      if (migrated) {
        configs.push(migrated);
      }
    }
  }
  let activeId: string | null = stored?.activeId ?? null;

  if (shared) {
    const imported = fromShared(shared);
    configs = [...configs, imported];
    activeId = imported.id;
    clearHash();
  }

  if (configs.length === 0) {
    const def = makeDefaultConfig();
    configs = [def];
    activeId = def.id;
  }

  if (!activeId || !configs.some((c) => c.id === activeId)) {
    activeId = configs[0].id;
  }

  return { configs, activeId };
}

function mapActive(
  state: AppState,
  fn: (config: SavedConfig) => SavedConfig,
): AppState {
  return {
    ...state,
    configs: state.configs.map((c) =>
      c.id === state.activeId ? { ...fn(c), updatedAt: Date.now() } : c,
    ),
  };
}

export default function App() {
  const [state, setState] = useState<AppState>(initialState);
  const [viewMode, setViewMode] = useState<ViewMode>('2d');

  const { configs, activeId } = state;
  const active = useMemo(
    () => configs.find((c) => c.id === activeId) ?? configs[0],
    [configs, activeId],
  );

  useEffect(() => {
    const store: ConfigStore = { configs, activeId };
    saveStore(store);
  }, [configs, activeId]);

  const pallet = useMemo(
    () =>
      STANDARD_PALLETS.find((p) => p.id === active.palletId) ??
      STANDARD_PALLETS[0],
    [active.palletId],
  );

  const layouts = useMemo(
    () =>
      computeLayerLayouts(
        active.box,
        pallet,
        active.stackingPattern,
        active.orientation,
        active.layers,
      ),
    [
      active.box,
      pallet,
      active.stackingPattern,
      active.orientation,
      active.layers,
    ],
  );

  // For empty-state detection: would a single layer with default settings
  // place any boxes given current pallet/box/pattern/orientation?
  const baseCapacity = useMemo(() => {
    const probe = computeLayerLayouts(
      active.box,
      pallet,
      active.stackingPattern,
      active.orientation,
      [{ alignment: 'middle-center', boxCount: null }],
    );
    return probe[0]?.capacity ?? 0;
  }, [active.box, pallet, active.stackingPattern, active.orientation]);

  const setPalletId = useCallback((palletId: PalletStandardId) => {
    setState((prev) => mapActive(prev, (c) => ({ ...c, palletId })));
  }, []);

  const setBox = useCallback((box: Box) => {
    setState((prev) => mapActive(prev, (c) => ({ ...c, box })));
  }, []);

  const setStackingPattern = useCallback((stackingPattern: StackingPattern) => {
    setState((prev) => mapActive(prev, (c) => ({ ...c, stackingPattern })));
  }, []);

  const setOrientation = useCallback((orientation: LayerOrientationChoice) => {
    setState((prev) => mapActive(prev, (c) => ({ ...c, orientation })));
  }, []);

  const addLayer = useCallback(() => {
    setState((prev) =>
      mapActive(prev, (c) => ({
        ...c,
        layers: [...c.layers, { alignment: 'middle-center', boxCount: null }],
      })),
    );
  }, []);

  const removeLayer = useCallback((index: number) => {
    setState((prev) =>
      mapActive(prev, (c) => ({
        ...c,
        layers: c.layers.filter((_, i) => i !== index),
      })),
    );
  }, []);

  const updateLayer = useCallback(
    (index: number, partial: Partial<LayerConfig>) => {
      setState((prev) =>
        mapActive(prev, (c) => ({
          ...c,
          layers: c.layers.map((l, i) =>
            i === index ? { ...l, ...partial } : l,
          ),
        })),
      );
    },
    [],
  );

  const renameActive = useCallback((name: string) => {
    setState((prev) => mapActive(prev, (c) => ({ ...c, name })));
  }, []);

  const switchConfig = useCallback((id: string) => {
    setState((prev) => ({ ...prev, activeId: id }));
  }, []);

  const createConfig = useCallback(() => {
    setState((prev) => {
      const name = `Untitled configuration ${prev.configs.length + 1}`;
      const next = makeDefaultConfig(name);
      return { configs: [...prev.configs, next], activeId: next.id };
    });
  }, []);

  const deleteConfig = useCallback((id: string) => {
    setState((prev) => {
      const filtered = prev.configs.filter((c) => c.id !== id);
      if (filtered.length === 0) {
        const def = makeDefaultConfig();
        return { configs: [def], activeId: def.id };
      }
      const nextActive = prev.activeId === id ? filtered[0].id : prev.activeId;
      return { configs: filtered, activeId: nextActive };
    });
  }, []);

  const shareActive = useCallback(async (): Promise<boolean> => {
    const url = buildShareUrl({
      name: active.name,
      palletId: active.palletId,
      box: active.box,
      stackingPattern: active.stackingPattern,
      orientation: active.orientation,
      layers: active.layers,
    });
    try {
      await navigator.clipboard.writeText(url);
      return true;
    } catch {
      window.prompt('Copy this shareable URL:', url);
      return false;
    }
  }, [active]);

  const hasLayers = active.layers.length > 0;
  const fitsBoxes = baseCapacity > 0;

  return (
    <div className="min-h-full bg-canvas font-sans text-navy-ink">
      <Header box={active.box} />
      <main className="mx-auto max-w-[1400px] space-y-4 px-4 py-4 sm:px-6">
        <ConfigsBar
          configs={configs}
          activeId={activeId}
          onSwitch={switchConfig}
          onCreate={createConfig}
          onDelete={deleteConfig}
          onRename={renameActive}
          onShare={shareActive}
        />

        <Controls
          palletId={active.palletId}
          onPalletChange={setPalletId}
          box={active.box}
          onBoxChange={setBox}
          stackingPattern={active.stackingPattern}
          onStackingPatternChange={setStackingPattern}
          orientation={active.orientation}
          onOrientationChange={setOrientation}
          layers={active.layers}
          layouts={layouts}
          onAddLayer={addLayer}
          onRemoveLayer={removeLayer}
          onUpdateLayer={updateLayer}
        />

        {!fitsBoxes ? (
          <EmptyState
            title="No boxes fit this configuration."
            hint="Try smaller box dimensions or a larger pallet size."
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(280px,1fr)]">
            <div className="flex flex-col gap-4">
              <HeroView
                pallet={pallet}
                box={active.box}
                layouts={layouts}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
              />
              {hasLayers ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <OrthoCard title="FRONT VIEW">
                    <OrthoView
                      view="front"
                      pallet={pallet}
                      box={active.box}
                      layouts={layouts}
                    />
                  </OrthoCard>
                  <OrthoCard title="SIDE VIEW">
                    <OrthoView
                      view="side"
                      pallet={pallet}
                      box={active.box}
                      layouts={layouts}
                    />
                  </OrthoCard>
                </div>
              ) : null}
            </div>

            <div className="flex flex-col gap-4">
              <SummaryCard pallet={pallet} box={active.box} layouts={layouts} />
              {hasLayers ? (
                <OrthoCard title="TOP VIEW">
                  <OrthoView
                    view="top"
                    pallet={pallet}
                    box={active.box}
                    layouts={layouts}
                  />
                </OrthoCard>
              ) : null}
              <BoxSizeCard box={active.box} />
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

function EmptyState({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="rounded-lg border border-navy/10 border-dashed bg-canvas-card p-12 text-center text-navy/60">
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-sm">{hint}</p>
    </div>
  );
}
