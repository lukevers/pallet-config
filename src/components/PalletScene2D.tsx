import { PALLET_HEIGHT } from '../constants';
import { iso, pathFromPoints } from '../lib/iso';
import type { LayerLayout } from '../lib/layout';
import { formatInches } from '../lib/layout';
import type { Box, PalletStandard } from '../types';

type Props = {
  pallet: PalletStandard;
  box: Box;
  layout: LayerLayout;
  layersHigh: number;
};

const COLORS = {
  boxTop: '#D6AC85',
  boxRight: '#C09569',
  boxLeft: '#A87C4F',
  boxStroke: '#7B5A36',
  palletTop: '#D2A86C',
  palletRight: '#B98E4F',
  palletLeft: '#8E6936',
  palletStroke: '#6E4E26',
  dim: '#1B2A56',
};

export function PalletScene2D({ pallet, box, layout, layersHigh }: Props) {
  const L = pallet.length;
  const W = pallet.width;
  const Hp = PALLET_HEIGHT;
  const Hb = box.height;

  const boxes: Array<{
    x0: number;
    x1: number;
    y0: number;
    y1: number;
    z0: number;
    z1: number;
    depth: number;
  }> = [];
  const fpL = layout.footprintLength;
  const fpW = layout.footprintWidth;
  const startX = layout.marginLength / 2;
  const startZ = layout.marginWidth / 2;
  for (let layer = 0; layer < layersHigh; layer++) {
    for (let row = 0; row < layout.rows; row++) {
      for (let col = 0; col < layout.cols; col++) {
        const x0 = startX + col * fpL;
        const z0 = startZ + row * fpW;
        const y0 = Hp + layer * Hb;
        boxes.push({
          x0,
          x1: x0 + fpL,
          y0,
          y1: y0 + Hb,
          z0,
          z1: z0 + fpW,
          depth: col + row + layer * 0.001,
        });
      }
    }
  }
  boxes.sort((a, b) => a.depth - b.depth);

  const corners = [
    iso(0, 0, 0),
    iso(L, 0, 0),
    iso(0, 0, W),
    iso(L, 0, W),
    iso(0, Hp + Hb * layersHigh, 0),
    iso(L, Hp + Hb * layersHigh, 0),
    iso(0, Hp + Hb * layersHigh, W),
    iso(L, Hp + Hb * layersHigh, W),
  ];
  const xs = corners.map((c) => c.sx);
  const ys = corners.map((c) => c.sy);
  const dimPad = Math.max(L, W) * 0.18;
  const minX = Math.min(...xs) - dimPad;
  const maxX = Math.max(...xs) + dimPad * 0.4;
  const minY = Math.min(...ys) - 2;
  const maxY = Math.max(...ys) + dimPad;
  const vbW = maxX - minX;
  const vbH = maxY - minY;

  return (
    <svg
      viewBox={`${minX} ${minY} ${vbW} ${vbH}`}
      className="h-full w-full"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <marker
          id="iso-arrow"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill={COLORS.dim} />
        </marker>
      </defs>

      <BoxFaces
        x0={0}
        y0={0}
        z0={0}
        x1={L}
        y1={Hp}
        z1={W}
        topFill={COLORS.palletTop}
        rightFill={COLORS.palletRight}
        leftFill={COLORS.palletLeft}
        stroke={COLORS.palletStroke}
        strokeWidth={Math.max(L, W) * 0.005}
      />

      {boxes.map((b) => (
        <BoxFaces
          key={`${b.x0}-${b.y0}-${b.z0}`}
          {...b}
          topFill={COLORS.boxTop}
          rightFill={COLORS.boxRight}
          leftFill={COLORS.boxLeft}
          stroke={COLORS.boxStroke}
          strokeWidth={Math.max(L, W) * 0.004}
        />
      ))}

      <DimensionArrows pallet={pallet} totalHeight={Hp + Hb * layersHigh} />
    </svg>
  );
}

type BoxFacesProps = {
  x0: number;
  y0: number;
  z0: number;
  x1: number;
  y1: number;
  z1: number;
  topFill: string;
  rightFill: string;
  leftFill: string;
  stroke: string;
  strokeWidth: number;
};

function BoxFaces({
  x0,
  y0,
  z0,
  x1,
  y1,
  z1,
  topFill,
  rightFill,
  leftFill,
  stroke,
  strokeWidth,
}: BoxFacesProps) {
  const c = {
    nbl: iso(x0, y0, z0),
    nbr: iso(x1, y0, z0),
    fbl: iso(x0, y0, z1),
    fbr: iso(x1, y0, z1),
    ntl: iso(x0, y1, z0),
    ntr: iso(x1, y1, z0),
    ftl: iso(x0, y1, z1),
    ftr: iso(x1, y1, z1),
  };
  const left = pathFromPoints([c.fbl, c.ftl, c.ftr, c.fbr]);
  const right = pathFromPoints([c.nbr, c.ntr, c.ftr, c.fbr]);
  const top = pathFromPoints([c.ntl, c.ntr, c.ftr, c.ftl]);
  return (
    <g>
      <path
        d={left}
        fill={leftFill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      <path
        d={right}
        fill={rightFill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      <path
        d={top}
        fill={topFill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
    </g>
  );
}

function DimensionArrows({
  pallet,
  totalHeight,
}: {
  pallet: PalletStandard;
  totalHeight: number;
}) {
  const L = pallet.length;
  const W = pallet.width;
  const off = Math.max(L, W) * 0.08;
  const fontSize = Math.max(L, W) * 0.045;
  const stroke = Math.max(L, W) * 0.006;

  const lengthA = iso(0, 0, W + off);
  const lengthB = iso(L, 0, W + off);
  const widthA = iso(L + off, 0, 0);
  const widthB = iso(L + off, 0, W);
  const heightA = iso(-off, 0, W);
  const heightB = iso(-off, totalHeight, W);

  const labelMid = (a: { sx: number; sy: number }, b: typeof a) => ({
    sx: (a.sx + b.sx) / 2,
    sy: (a.sy + b.sy) / 2,
  });

  return (
    <g stroke={COLORS.dim} fill={COLORS.dim} strokeWidth={stroke}>
      <line
        x1={lengthA.sx}
        y1={lengthA.sy}
        x2={lengthB.sx}
        y2={lengthB.sy}
        markerStart="url(#iso-arrow)"
        markerEnd="url(#iso-arrow)"
      />
      <text
        x={labelMid(lengthA, lengthB).sx}
        y={labelMid(lengthA, lengthB).sy + fontSize * 1.2}
        fontSize={fontSize}
        fontWeight={700}
        textAnchor="middle"
        stroke="none"
      >
        {formatInches(L)}
      </text>

      <line
        x1={widthA.sx}
        y1={widthA.sy}
        x2={widthB.sx}
        y2={widthB.sy}
        markerStart="url(#iso-arrow)"
        markerEnd="url(#iso-arrow)"
      />
      <text
        x={labelMid(widthA, widthB).sx + fontSize * 0.4}
        y={labelMid(widthA, widthB).sy + fontSize * 1.2}
        fontSize={fontSize}
        fontWeight={700}
        textAnchor="start"
        stroke="none"
      >
        {formatInches(W)}
      </text>

      <line
        x1={heightA.sx}
        y1={heightA.sy}
        x2={heightB.sx}
        y2={heightB.sy}
        markerStart="url(#iso-arrow)"
        markerEnd="url(#iso-arrow)"
      />
      <text
        x={labelMid(heightA, heightB).sx - fontSize * 0.6}
        y={labelMid(heightA, heightB).sy}
        fontSize={fontSize}
        fontWeight={700}
        textAnchor="end"
        stroke="none"
      >
        {formatInches(totalHeight)}
      </text>
    </g>
  );
}
