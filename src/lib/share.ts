import { STANDARD_PALLETS } from '../constants';
import type {
  Box,
  LayerAlignment,
  LayerConfig,
  LayerOrientationChoice,
  PalletStandardId,
  StackingPattern,
} from '../types';

export type SharedPayload = {
  name: string;
  palletId: PalletStandardId;
  box: Box;
  stackingPattern: StackingPattern;
  orientation: LayerOrientationChoice;
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

const STACKING_PATTERNS: ReadonlySet<string> = new Set<StackingPattern>([
  'block',
  'row',
  'brick',
  'pinwheel',
  'split-row',
  'hybrid-pinwheel',
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

// Detect a stacking pattern from a sequence of legacy per-layer orientations.
// All same → 'block'. Strict alternation → 'row'. Otherwise → 'block'.
export function inferLegacyPattern(
  orientations: ReadonlyArray<LayerOrientationChoice>,
): { pattern: StackingPattern; orientation: LayerOrientationChoice } {
  if (orientations.length === 0) {
    return { pattern: 'block', orientation: 'auto' };
  }
  const first = orientations[0];
  const allSame = orientations.every((o) => o === first);
  if (allSame) {
    return { pattern: 'block', orientation: first };
  }
  let alternating = true;
  for (let i = 1; i < orientations.length; i++) {
    const expected = i % 2 === 0 ? first : flipChoice(first);
    if (orientations[i] !== expected) {
      alternating = false;
      break;
    }
  }
  if (alternating && first !== 'auto') {
    return { pattern: 'row', orientation: first };
  }
  return { pattern: 'block', orientation: 'auto' };
}

function flipChoice(o: LayerOrientationChoice): LayerOrientationChoice {
  if (o === 'length-along-pallet') {
    return 'width-along-pallet';
  }
  if (o === 'width-along-pallet') {
    return 'length-along-pallet';
  }
  return 'auto';
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
  const layersRaw = obj.layers;
  if (!Array.isArray(layersRaw)) {
    return null;
  }

  // We accept both old format (per-layer orientation, no stackingPattern) and
  // new format (per-layer boxCount, top-level stackingPattern + orientation).
  const layers: Array<LayerConfig> = [];
  const legacyOrientations: Array<LayerOrientationChoice> = [];
  let sawLegacyOrientation = false;
  for (const layer of layersRaw) {
    if (!layer || typeof layer !== 'object') {
      return null;
    }
    const l = layer as Record<string, unknown>;
    if (typeof l.alignment !== 'string' || !ALIGNMENTS.has(l.alignment)) {
      return null;
    }
    const alignment = l.alignment as LayerAlignment;
    let boxCount: number | null = null;
    if (l.boxCount != null) {
      if (
        typeof l.boxCount !== 'number' ||
        !Number.isFinite(l.boxCount) ||
        l.boxCount < 0
      ) {
        return null;
      }
      boxCount = Math.floor(l.boxCount);
    }
    let layerOrientation: LayerOrientationChoice = 'auto';
    if (typeof l.orientation === 'string') {
      if (!ORIENTATIONS.has(l.orientation)) {
        return null;
      }
      layerOrientation = l.orientation as LayerOrientationChoice;
      sawLegacyOrientation = true;
    }
    legacyOrientations.push(layerOrientation);
    layers.push({ alignment, boxCount });
  }

  let stackingPattern: StackingPattern;
  let orientation: LayerOrientationChoice;
  if (
    typeof obj.stackingPattern === 'string' &&
    STACKING_PATTERNS.has(obj.stackingPattern)
  ) {
    stackingPattern = obj.stackingPattern as StackingPattern;
    if (
      typeof obj.orientation === 'string' &&
      ORIENTATIONS.has(obj.orientation)
    ) {
      orientation = obj.orientation as LayerOrientationChoice;
    } else {
      orientation = 'auto';
    }
  } else if (sawLegacyOrientation) {
    const inferred = inferLegacyPattern(legacyOrientations);
    stackingPattern = inferred.pattern;
    orientation = inferred.orientation;
  } else {
    stackingPattern = 'block';
    orientation = 'auto';
  }

  const name = typeof obj.name === 'string' ? obj.name : 'Shared configuration';
  return {
    name,
    palletId: palletId as PalletStandardId,
    box: { length: b.length, width: b.width, height: b.height },
    stackingPattern,
    orientation,
    layers,
  };
}
