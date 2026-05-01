export type IsoPoint = { sx: number; sy: number };

const ANGLE = (30 * Math.PI) / 180;
const COS = Math.cos(ANGLE);
const SIN = Math.sin(ANGLE);

export function iso(x: number, y: number, z: number): IsoPoint {
  return {
    sx: (x - z) * COS,
    sy: (x + z) * SIN - y,
  };
}

export function pathFromPoints(points: ReadonlyArray<IsoPoint>): string {
  if (points.length === 0) {
    return '';
  }
  const [head, ...rest] = points;
  return [
    `M ${head.sx} ${head.sy}`,
    ...rest.map((p) => `L ${p.sx} ${p.sy}`),
    'Z',
  ].join(' ');
}
