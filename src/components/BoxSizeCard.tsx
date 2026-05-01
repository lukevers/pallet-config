import { iso, pathFromPoints } from '../lib/iso';
import { formatInches } from '../lib/layout';
import type { Box } from '../types';

type Props = {
  box: Box;
};

const COLORS = {
  top: '#D6AC85',
  right: '#C09569',
  left: '#A87C4F',
  stroke: '#7B5A36',
  tape: '#E0C29B',
  dim: '#1B2A56',
};

export function BoxSizeCard({ box }: Props) {
  const L = box.length;
  const W = box.width;
  const H = box.height;

  const c = {
    nbl: iso(0, 0, 0),
    nbr: iso(L, 0, 0),
    fbl: iso(0, 0, W),
    fbr: iso(L, 0, W),
    ntl: iso(0, H, 0),
    ntr: iso(L, H, 0),
    ftl: iso(0, H, W),
    ftr: iso(L, H, W),
  };

  const corners = Object.values(c);
  const padX = Math.max(L, W) * 0.45;
  const padY = Math.max(L, W, H) * 0.3;
  const minX = Math.min(...corners.map((p) => p.sx)) - padX;
  const maxX = Math.max(...corners.map((p) => p.sx)) + padX * 0.6;
  const minY = Math.min(...corners.map((p) => p.sy)) - padY * 0.4;
  const maxY = Math.max(...corners.map((p) => p.sy)) + padY * 0.7;
  const stroke = Math.max(L, W) * 0.012;
  const fontSize = Math.max(L, W, H) * 0.13;

  const tapeMidY = c.ntr.sy + (c.ftr.sy - c.ntr.sy) * 0.5;
  const tapeStartX = c.ntr.sx + (c.ntl.sx - c.ntr.sx) * 0.05;
  const tapeEndX = c.ntr.sx + (c.ntl.sx - c.ntr.sx) * 0.95;

  return (
    <section className="overflow-hidden rounded-lg border border-navy/10 bg-canvas-card shadow-card">
      <div className="grid grid-cols-[1fr_auto] items-stretch">
        <div className="flex items-center justify-center bg-canvas px-4 py-4">
          <svg
            viewBox={`${minX} ${minY} ${maxX - minX} ${maxY - minY}`}
            className="aspect-[5/4] h-auto w-full max-w-[180px]"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              <marker
                id="box-arrow"
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
            <path
              d={pathFromPoints([c.fbl, c.ftl, c.ftr, c.fbr])}
              fill={COLORS.left}
              stroke={COLORS.stroke}
              strokeWidth={stroke}
              strokeLinejoin="round"
            />
            <path
              d={pathFromPoints([c.nbr, c.ntr, c.ftr, c.fbr])}
              fill={COLORS.right}
              stroke={COLORS.stroke}
              strokeWidth={stroke}
              strokeLinejoin="round"
            />
            <path
              d={pathFromPoints([c.ntl, c.ntr, c.ftr, c.ftl])}
              fill={COLORS.top}
              stroke={COLORS.stroke}
              strokeWidth={stroke}
              strokeLinejoin="round"
            />
            <line
              x1={tapeStartX}
              y1={tapeMidY}
              x2={tapeEndX}
              y2={tapeMidY}
              stroke={COLORS.tape}
              strokeWidth={stroke * 1.2}
            />

            <g
              stroke={COLORS.dim}
              fill={COLORS.dim}
              strokeWidth={stroke * 0.9}
              strokeLinecap="round"
            >
              <line
                x1={c.fbl.sx - padX * 0.15}
                y1={c.ftl.sy}
                x2={c.fbl.sx - padX * 0.15}
                y2={c.fbl.sy}
                markerStart="url(#box-arrow)"
                markerEnd="url(#box-arrow)"
              />
              <text
                x={c.fbl.sx - padX * 0.25}
                y={(c.ftl.sy + c.fbl.sy) / 2}
                fontSize={fontSize}
                fontWeight={700}
                textAnchor="end"
                stroke="none"
                dominantBaseline="middle"
              >
                {formatInches(H)}
              </text>

              <line
                x1={c.fbl.sx}
                y1={c.fbl.sy + padY * 0.18}
                x2={c.fbr.sx}
                y2={c.fbr.sy + padY * 0.18}
                markerStart="url(#box-arrow)"
                markerEnd="url(#box-arrow)"
              />
              <text
                x={(c.fbl.sx + c.fbr.sx) / 2 - fontSize * 0.4}
                y={(c.fbl.sy + c.fbr.sy) / 2 + padY * 0.18 + fontSize * 1.2}
                fontSize={fontSize}
                fontWeight={700}
                textAnchor="middle"
                stroke="none"
              >
                {formatInches(W)}
              </text>

              <line
                x1={c.fbr.sx + padX * 0.05}
                y1={c.fbr.sy + padY * 0.05}
                x2={c.nbr.sx + padX * 0.05}
                y2={c.nbr.sy + padY * 0.05}
                markerStart="url(#box-arrow)"
                markerEnd="url(#box-arrow)"
              />
              <text
                x={(c.fbr.sx + c.nbr.sx) / 2 + fontSize * 0.6}
                y={(c.fbr.sy + c.nbr.sy) / 2 + padY * 0.05 + fontSize * 1.2}
                fontSize={fontSize}
                fontWeight={700}
                textAnchor="middle"
                stroke="none"
              >
                {formatInches(L)}
              </text>
            </g>
          </svg>
        </div>
        <div className="bg-navy px-5 py-4 text-white">
          <h3 className="font-bold text-sm tracking-widest">BOX SIZE</h3>
          <p className="mt-2 font-semibold text-base leading-tight">
            {formatInches(L)} × {formatInches(W)} × {formatInches(H)}
          </p>
        </div>
      </div>
    </section>
  );
}
