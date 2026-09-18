import { STANDARD_PALLETS } from '../constants';
import type {
  Box,
  LayerAlignment,
  LayerConfig,
  LayerOrientationChoice,
  PalletStandardId,
} from '../types';

export type SharedPayload = {
  name: string;
  palletId: PalletStandardId;
  box: Box;
  layers: Array<LayerConfig>;
};

const ORIENTATIONS: ReadonlySet<string> = new Set<LayerOrientationChoice>([
  'auto',
  'length-along-pallet',
  'width-along-pallet',
]);

const ALIGNMENTS: ReadonlySet<string> = new Set<LayerAlignment>([
  'top-left',
  'top-center',
  'top-right',
  'middle-left',
  'middle-center',
  'middle-right',
  'bottom-left',
  'bottom-center',
  'bottom-right',
]);

function toBase64Url(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function fromBase64Url(input: string): string {
  const padded =
    input.replace(/-/g, '+').replace(/_/g, '/') +
    '==='.slice((input.length + 3) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

export function encodeShare(payload: SharedPayload): string {
  return toBase64Url(JSON.stringify(payload));
}

export function buildShareUrl(payload: SharedPayload): string {
  const url = new URL(window.location.href);
  url.hash = `c=${encodeShare(payload)}`;
  return url.toString();
}

export function readSharedFromHash(): SharedPayload | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const hash = window.location.hash.replace(/^#/, '');
  if (!hash.startsWith('c=')) {
    return null;
  }
  try {
    const decoded = JSON.parse(fromBase64Url(hash.slice(2))) as unknown;
    return validatePayload(decoded);
  } catch {
    return null;
  }
}

export function clearHash(): void {
  if (typeof window === 'undefined') {
    return;
  }
  const { pathname, search } = window.location;
  window.history.replaceState(null, '', `${pathname}${search}`);
}

function validatePayload(raw: unknown): SharedPayload | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const obj = raw as Record<string, unknown>;
  const palletId = obj.palletId;
  if (
    typeof palletId !== 'string' ||
    !STANDARD_PALLETS.some((p) => p.id === palletId)
  ) {
    return null;
  }
  const box = obj.box;
  if (!box || typeof box !== 'object') {
    return null;
  }
  const b = box as Record<string, unknown>;
  if (
    typeof b.length !== 'number' ||
    typeof b.width !== 'number' ||
    typeof b.height !== 'number' ||
    !(b.length > 0) ||
    !(b.width > 0) ||
    !(b.height > 0)
  ) {
    return null;
  }
  let weightLbs = 25;
  let weightOz = 0;
  if (
    typeof b.weightLbs === 'number' &&
    !Number.isNaN(b.weightLbs) &&
    b.weightLbs >= 0
  ) {
    weightLbs = b.weightLbs;
    weightOz =
      typeof b.weightOz === 'number' &&
      !Number.isNaN(b.weightOz) &&
      b.weightOz >= 0
        ? b.weightOz
        : 0;
  } else if (
    typeof b.weight === 'number' &&
    !Number.isNaN(b.weight) &&
    b.weight >= 0
  ) {
    weightLbs = Math.floor(b.weight);
    weightOz = Math.round((b.weight - weightLbs) * 16);
  }
  const layers = obj.layers;
  if (!Array.isArray(layers)) {
    return null;
  }
  const validated: Array<LayerConfig> = [];
  for (const layer of layers) {
    if (!layer || typeof layer !== 'object') {
      return null;
    }
    const l = layer as Record<string, unknown>;
    if (
      typeof l.orientation !== 'string' ||
      !ORIENTATIONS.has(l.orientation) ||
      typeof l.alignment !== 'string' ||
      !ALIGNMENTS.has(l.alignment)
    ) {
      return null;
    }
    validated.push({
      orientation: l.orientation as LayerOrientationChoice,
      alignment: l.alignment as LayerAlignment,
    });
  }
  const name = typeof obj.name === 'string' ? obj.name : 'Shared configuration';
  return {
    name,
    palletId: palletId as PalletStandardId,
    box: {
      length: b.length,
      width: b.width,
      height: b.height,
      weightLbs,
      weightOz,
    },
    layers: validated,
  };
}
