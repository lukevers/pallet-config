import { PALLET_HEIGHT } from '../constants';
import { iso, pathFromPoints } from '../lib/iso';
import type { LayerLayout } from '../lib/layout';
import { formatInches } from '../lib/layout';
import type { Box, PalletStandard } from '../types';

type Props = {
  pallet: PalletStandard;
  box: Box;
  layouts: ReadonlyArray<LayerLayout>;
};

const COLORS = {
  boxTop: '#D6AC85',
  boxRight: '#C09569',
  boxLeft: '#A87C4F',
  // Subtle alternates for the box-checker pattern (~3% darker per channel).
  boxTopAlt: '#D0A781',
  boxRightAlt: '#BA9066',
  boxLeftAlt: '#A3784D',
  boxStroke: '#7B5A36',
  boxTape: '#E0C29B',
  palletTop: '#D2A86C',
  palletRight: '#B98E4F',
  palletLeft: '#8E6936',
  palletStroke: '#6E4E26',
  dim: '#1B2A56',
};

type Bounds = {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  z0: number;
  z1: number;
};

type Face = {
  bounds: Bounds;
  path: string;
  fill: string;
  stroke: string;
  strokeWidth: number;
  key: string;
};

type Fills = { top: string; right: string; left: string };

function generateBoxFaces(
  bounds: Bounds,
  fills: Fills,
  stroke: string,
  strokeWidth: number,
  keyPrefix: string,
  tapeColor?: string,
): Array<Face> {
  const { x0, x1, y0, y1, z0, z1 } = bounds;
  const c = {
    nbr: iso(x1, y0, z0),
    fbl: iso(x0, y0, z1),
    fbr: iso(x1, y0, z1),
    ntl: iso(x0, y1, z0),
    ntr: iso(x1, y1, z0),
    ftl: iso(x0, y1, z1),
    ftr: iso(x1, y1, z1),
  };
  const faces: Array<Face> = [
    {
      bounds,
      path: pathFromPoints([c.fbl, c.ftl, c.ftr, c.fbr]),
      fill: fills.left,
      stroke,
      strokeWidth,
      key: `${keyPrefix}-left`,
    },
    {
      bounds,
      path: pathFromPoints([c.nbr, c.ntr, c.ftr, c.fbr]),
      fill: fills.right,
      stroke,
      strokeWidth,
      key: `${keyPrefix}-right`,
    },
    {
      bounds,
      path: pathFromPoints([c.ntl, c.ntr, c.ftr, c.ftl]),
      fill: fills.top,
      stroke,
      strokeWidth,
      key: `${keyPrefix}-top`,
    },
  ];

  if (tapeColor !== undefined) {
    // Tape runs down the middle of the top face along its longer axis. The
    // resulting iso-projected line direction differs between L and W
    // orientations, so the orientation is visually obvious.
    const lengthX = x1 - x0;
    const lengthZ = z1 - z0;
    const pad = 0.15;
    let p1: { sx: number; sy: number };
    let p2: { sx: number; sy: number };
    if (lengthX >= lengthZ) {
      const midZ = (z0 + z1) / 2;
      p1 = iso(x0 + lengthX * pad, y1, midZ);
      p2 = iso(x1 - lengthX * pad, y1, midZ);
    } else {
      const midX = (x0 + x1) / 2;
      p1 = iso(midX, y1, z0 + lengthZ * pad);
      p2 = iso(midX, y1, z1 - lengthZ * pad);
    }
    faces.push({
      bounds,
      path: `M ${p1.sx} ${p1.sy} L ${p2.sx} ${p2.sy}`,
      fill: 'none',
      stroke: tapeColor,
      strokeWidth: strokeWidth * 2,
      key: `${keyPrefix}-tape`,
    });
  }

  return faces;
}

// Returns negative if face A should be drawn before face B (A behind B for
// viewer at +x+y+z), positive if B before A, 0 if order doesn't matter.
//
// Compares at the BOX level using the separating-axis theorem for AABBs. For
// two non-overlapping axis-aligned boxes, at least one axis has non-overlapping
// ranges; the box on the smaller side of that axis is "fully behind" the other
// in painter's-algorithm sense (any pair of points on the two boxes that
// project to the same screen pixel will have the smaller-axis box at smaller
// camera-direction depth).
//
// Two faces of the same box have identical bounds and return 0; the stable
// insertion sort then preserves the input order (left, right, top) so that
// the top face's stroke draws last on top of the box's silhouette.
function painterCompare(A: Face, B: Face): number {
  const ab = A.bounds;
  const bb = B.bounds;
  if (ab.x1 <= bb.x0) {
    return -1;
  }
  if (bb.x1 <= ab.x0) {
    return 1;
  }
  if (ab.y1 <= bb.y0) {
    return -1;
  }
  if (bb.y1 <= ab.y0) {
    return 1;
  }
  if (ab.z1 <= bb.z0) {
    return -1;
  }
  if (bb.z1 <= ab.z0) {
    return 1;
  }
  return 0;
}

// Stable insertion sort using painterCompare. We can't use Array.prototype.sort
// because the comparator isn't a total order — when two faces don't have a
// definite order, painterCompare returns 0, and a non-stable sort can produce
// inconsistent results. Insertion sort places each face just before the first
// face it must precede; otherwise it goes at the end.
function painterSort(faces: Array<Face>): Array<Face> {
  const sorted: Array<Face> = [];
  for (const face of faces) {
    let inserted = false;
    for (let i = 0; i < sorted.length; i++) {
      if (painterCompare(face, sorted[i]) < 0) {
        sorted.splice(i, 0, face);
        inserted = true;
        break;
      }
    }
    if (!inserted) {
      sorted.push(face);
    }
  }
  return sorted;
}

export function PalletScene2D({ pallet, box, layouts }: Props) {
  const L = pallet.length;
  const W = pallet.width;
  const Hp = PALLET_HEIGHT;
  const Hb = box.height;
  const layersHigh = layouts.length;

  const boxStroke = Math.max(L, W) * 0.004;
  const palletStroke = Math.max(L, W) * 0.005;

  const palletBounds: Bounds = {
    x0: 0,
    x1: L,
    y0: 0,
    y1: Hp,
    z0: 0,
    z1: W,
  };
  const faces: Array<Face> = generateBoxFaces(
    palletBounds,
    {
      top: COLORS.palletTop,
      right: COLORS.palletRight,
      left: COLORS.palletLeft,
    },
    COLORS.palletStroke,
    palletStroke,
    'pallet',
  );

  // Hint at the pallet's deck/stringer structure with thin lines on the two
  // visible side faces, matching the elevation views.
  const deckThickness = Hp * 0.2;
  const deckLineWidth = palletStroke * 0.6;
  const addPalletLine = (
    p1: { sx: number; sy: number },
    p2: { sx: number; sy: number },
    key: string,
  ) => {
    faces.push({
      bounds: palletBounds,
      path: `M ${p1.sx} ${p1.sy} L ${p2.sx} ${p2.sy}`,
      fill: 'none',
      stroke: COLORS.palletStroke,
      strokeWidth: deckLineWidth,
      key,
    });
  };
  addPalletLine(
    iso(0, Hp - deckThickness, W),
    iso(L, Hp - deckThickness, W),
    'pallet-left-top-deck',
  );
  addPalletLine(
    iso(0, deckThickness, W),
    iso(L, deckThickness, W),
    'pallet-left-bottom-deck',
  );
  addPalletLine(
    iso(L, Hp - deckThickness, 0),
    iso(L, Hp - deckThickness, W),
    'pallet-right-top-deck',
  );
  addPalletLine(
    iso(L, deckThickness, 0),
    iso(L, deckThickness, W),
    'pallet-right-bottom-deck',
  );

  const boxFills: Fills = {
    top: COLORS.boxTop,
    right: COLORS.boxRight,
    left: COLORS.boxLeft,
  };
  const boxFillsAlt: Fills = {
    top: COLORS.boxTopAlt,
    right: COLORS.boxRightAlt,
    left: COLORS.boxLeftAlt,
  };

  for (let layer = 0; layer < layersHigh; layer++) {
    const ll = layouts[layer];
    if (ll.boxesPerLayer === 0) {
      continue;
    }
    const fpL = ll.footprintLength;
    const fpW = ll.footprintWidth;
    const startX = ll.offsetLength;
    const startZ = ll.offsetWidth;
    const y0 = Hp + layer * Hb;
    const y1 = y0 + Hb;
    for (let row = 0; row < ll.rows; row++) {
      for (let col = 0; col < ll.cols; col++) {
        const x0 = startX + col * fpL;
        const z0 = startZ + row * fpW;
        const fills = (row + col + layer) % 2 === 0 ? boxFills : boxFillsAlt;
        faces.push(
          ...generateBoxFaces(
            { x0, x1: x0 + fpL, y0, y1, z0, z1: z0 + fpW },
            fills,
            COLORS.boxStroke,
            boxStroke,
            `box-${layer}-${row}-${col}`,
            COLORS.boxTape,
          ),
        );
      }
    }
  }
  const sortedFaces = painterSort(faces);

  // Include dimension-arrow endpoints so viewBox encloses them.
  const totalH = Hp + Hb * layersHigh;
  const dimOff = Math.max(L, W) * 0.08;
  const dimFontSize = Math.max(L, W) * 0.045;
  const corners = [
    iso(0, 0, 0),
    iso(L, 0, 0),
    iso(0, 0, W),
    iso(L, 0, W),
    iso(0, totalH, 0),
    iso(L, totalH, 0),
    iso(0, totalH, W),
    iso(L, totalH, W),
    iso(-dimOff, 0, W),
    iso(-dimOff, totalH, W),
    iso(0, 0, W + dimOff),
    iso(L, 0, W + dimOff),
    iso(L + dimOff, 0, 0),
    iso(L + dimOff, 0, W),
    iso(L, 0, -dimOff * 0.6),
    iso(L, Hp, -dimOff * 0.6),
  ];

  const xs = corners.map((c) => c.sx);
  const ys = corners.map((c) => c.sy);
  // Allow room for labels: ~6 chars on the left of the height arrow (the
  // "TOTAL HEIGHT" caption is the widest left-side label), ~4 chars on the
  // right of the width arrow, plus a fontSize below for the length-arrow
  // label.
  const labelPad = dimFontSize * 6;
  const minX = Math.min(...xs) - labelPad;
  const maxX = Math.max(...xs) + labelPad;
  const minY = Math.min(...ys) - dimFontSize;
  const maxY = Math.max(...ys) + dimFontSize * 2;
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

      {sortedFaces.map((f) => (
        <path
          key={f.key}
          d={f.path}
          fill={f.fill}
          stroke={f.stroke}
          strokeWidth={f.strokeWidth}
          strokeLinejoin="round"
        />
      ))}

      <DimensionArrows
        pallet={pallet}
        palletHeight={Hp}
        totalHeight={Hp + Hb * layersHigh}
      />
    </svg>
  );
}

function DimensionArrows({
  pallet,
  palletHeight,
  totalHeight,
}: {
  pallet: PalletStandard;
  palletHeight: number;
  totalHeight: number;
}) {
  const L = pallet.length;
  const W = pallet.width;
  const off = Math.max(L, W) * 0.08;
  const fontSize = Math.max(L, W) * 0.045;
  const stroke = Math.max(L, W) * 0.006;

  // Total height arrow sits at the back-left edge (offset in -x direction).
  // Pallet height arrow sits at the back-right edge offset in -z direction so
  // it hugs the back-right vertical edge of the pallet near the corner.
  const totalHeightOff = off;
  const palletHeightOff = off * 0.6;

  const lengthA = iso(0, 0, W + off);
  const lengthB = iso(L, 0, W + off);
  const widthA = iso(L + off, 0, 0);
  const widthB = iso(L + off, 0, W);
  const totalHA = iso(-totalHeightOff, 0, W);
  const totalHB = iso(-totalHeightOff, totalHeight, W);
  const palletHA = iso(L, 0, -palletHeightOff);
  const palletHB = iso(L, palletHeight, -palletHeightOff);

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
        y={labelMid(lengthA, lengthB).sy + fontSize * 2.2}
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
        x1={totalHA.sx}
        y1={totalHA.sy}
        x2={totalHB.sx}
        y2={totalHB.sy}
        markerStart="url(#iso-arrow)"
        markerEnd="url(#iso-arrow)"
      />
      <text
        x={labelMid(totalHA, totalHB).sx - fontSize * 1.6}
        y={labelMid(totalHA, totalHB).sy + fontSize * 0.35}
        fontSize={fontSize}
        fontWeight={700}
        textAnchor="end"
        stroke="none"
      >
        {formatInches(totalHeight)}
      </text>
      <text
        x={labelMid(totalHA, totalHB).sx - fontSize * 1.6}
        y={labelMid(totalHA, totalHB).sy + fontSize * 1.4}
        fontSize={fontSize * 0.55}
        fontWeight={600}
        textAnchor="end"
        stroke="none"
        opacity={0.75}
      >
        TOTAL HEIGHT
      </text>

      <line
        x1={palletHA.sx}
        y1={palletHA.sy}
        x2={palletHB.sx}
        y2={palletHB.sy}
        markerStart="url(#iso-arrow)"
        markerEnd="url(#iso-arrow)"
      />
      <text
        x={labelMid(palletHA, palletHB).sx + fontSize * 0.4}
        y={labelMid(palletHA, palletHB).sy + fontSize * 0.35}
        fontSize={fontSize * 0.85}
        fontWeight={700}
        textAnchor="start"
        stroke="none"
      >
        {formatInches(palletHeight)}
      </text>
    </g>
  );
}
