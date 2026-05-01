import { Check, FolderOpen, Plus, Share2, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { SavedConfig } from '../types';

type Props = {
  configs: ReadonlyArray<SavedConfig>;
  activeId: string;
  onSwitch: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
  onRename: (name: string) => void;
  onShare: () => Promise<boolean> | boolean;
};

export function ConfigsBar({
  configs,
  activeId,
  onSwitch,
  onCreate,
  onDelete,
  onRename,
  onShare,
}: Props) {
  const active = configs.find((c) => c.id === activeId) ?? configs[0];
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (copiedTimer.current !== null) {
        window.clearTimeout(copiedTimer.current);
      }
    };
  }, []);

  if (!active) {
    return null;
  }

  const handleShare = async () => {
    const ok = await onShare();
    if (!ok) {
      return;
    }
    setCopied(true);
    if (copiedTimer.current !== null) {
      window.clearTimeout(copiedTimer.current);
    }
    copiedTimer.current = window.setTimeout(() => setCopied(false), 1600);
  };

  const handleDelete = () => {
    const confirmed = window.confirm(
      `Delete "${active.name || 'Untitled'}"?${
        configs.length === 1
          ? '\n\nThis is your last configuration — a fresh empty one will be created.'
          : ''
      }`,
    );
    if (confirmed) {
      onDelete(activeId);
    }
  };

  return (
    <div className="rounded-lg border border-navy/10 bg-canvas-card p-3 shadow-card">
      <div className="flex flex-wrap items-center gap-2">
        <input
          aria-label="Configuration name"
          value={active.name}
          onChange={(e) => onRename(e.target.value)}
          placeholder="Untitled configuration"
          className="min-w-[180px] flex-1 rounded-md border border-transparent bg-transparent px-2 py-1.5 font-semibold text-base text-navy-ink placeholder:font-normal placeholder:text-navy/40 hover:border-navy/15 focus:border-navy/15 focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy/20"
        />

        <div className="relative">
          <FolderOpen
            size={14}
            className="pointer-events-none absolute top-1/2 left-2 -translate-y-1/2 text-navy/40"
          />
          <select
            aria-label="Switch configuration"
            value={activeId}
            onChange={(e) => onSwitch(e.target.value)}
            className="rounded-md border border-navy/15 bg-white py-1.5 pr-3 pl-7 font-medium text-navy-ink text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/20"
          >
            {configs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name || 'Untitled'}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={onCreate}
          className="flex items-center gap-1.5 rounded-md border border-navy/15 bg-white px-3 py-1.5 font-semibold text-navy text-sm transition hover:bg-navy/5"
        >
          <Plus size={14} /> New
        </button>

        <button
          type="button"
          onClick={handleShare}
          className="flex items-center gap-1.5 rounded-md bg-navy px-3 py-1.5 font-semibold text-sm text-white transition hover:bg-navy-dark"
        >
          {copied ? <Check size={14} /> : <Share2 size={14} />}
          {copied ? 'Link copied' : 'Share'}
        </button>

        <button
          type="button"
          onClick={handleDelete}
          aria-label="Delete configuration"
          className="flex items-center gap-1.5 rounded-md border border-navy/15 bg-white px-3 py-1.5 font-semibold text-navy text-sm transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}
