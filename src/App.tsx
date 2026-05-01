import { useCallback, useEffect, useMemo, useState } from 'react';
import { BoxSizeCard } from './components/BoxSizeCard';
import { ConfigsBar } from './components/ConfigsBar';
import { Controls } from './components/Controls';
import { Header } from './components/Header';
import { HeroView } from './components/HeroView';
import { OrthoView } from './components/OrthoView';
import { SummaryCard } from './components/SummaryCard';
import { STANDARD_PALLETS } from './constants';
import { computeLayerLayout, computeLayerLayouts } from './lib/layout';
import {
  buildShareUrl,
  clearHash,
  readSharedFromHash,
  type SharedPayload,
} from './lib/share';
import { type ConfigStore, loadStore, saveStore } from './lib/storage';
import type {
  Box,
  LayerConfig,
  PalletStandardId,
  SavedConfig,
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
    layers: shared.layers,
    updatedAt: Date.now(),
  };
}

function initialState(): AppState {
  const stored = loadStore();
  const shared = readSharedFromHash();

  let configs: Array<SavedConfig> = stored?.configs ?? [];
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
    () => computeLayerLayouts(active.box, pallet, active.layers),
    [active.box, pallet, active.layers],
  );

  const baseLayout = useMemo(
    () => computeLayerLayout(active.box, pallet),
    [active.box, pallet],
  );

  const setPalletId = useCallback((palletId: PalletStandardId) => {
    setState((prev) => mapActive(prev, (c) => ({ ...c, palletId })));
  }, []);

  const setBox = useCallback((box: Box) => {
    setState((prev) => mapActive(prev, (c) => ({ ...c, box })));
  }, []);

  const addLayer = useCallback(() => {
    setState((prev) =>
      mapActive(prev, (c) => ({
        ...c,
        layers: [
          ...c.layers,
          { orientation: 'auto', alignment: 'middle-center' },
        ],
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
  const fitsBoxes = baseLayout.boxesPerLayer > 0;

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
          layers={active.layers}
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
