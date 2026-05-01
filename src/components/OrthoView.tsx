import type { ReactElement } from 'react';
import type { LayerLayout } from '../lib/layout';
import { formatInches } from '../lib/layout';
import type { Box, PalletStandard } from '../types';

type View = 'top' | 'front' | 'side';

type Props = {
  view: View;
  pallet: PalletStandard;
  box: Box;
  layout: LayerLayout;
  layersHigh: number;
};

const COLORS = {
  boxFill: '#C09569',
  boxFillAlt: '#B98559',
  tape: '#E0C29B',
  stroke: '#7B5A36',
  dim: '#1B2A56',
};

export function OrthoView({ view, pallet, box, layout, layersHigh }: Props) {
  const { content, widthLabel, heightLabel } = computeView({
    view,
    pallet,
    box,
    layout,
    layersHigh,
  });

  const padX = content.width * 0.18;
  const padY = content.height * 0.32;
  const vbX = -padX;
  const vbY = -padY;
  const vbW = content.width + padX * 1.5;
  const vbH = content.height + padY * 1.6;

  const fontSize = Math.max(content.width, content.height) * 0.06;
  const stroke = Math.max(content.width, content.height) * 0.005;
  const cellStroke = Math.max(content.width, content.height) * 0.003;

  const cells: Array<ReactElement> = [];
  for (let r = 0; r < content.rows; r++) {
    for (let c = 0; c < content.cols; c++) {
      const x = c * content.cellW;
      const y = (content.rows - 1 - r) * content.cellH;
      const fill = (r + c) % 2 === 0 ? COLORS.boxFill : COLORS.boxFillAlt;
      cells.push(
        <g key={`${r}-${c}`}>
          <rect
            x={x}
            y={y}
            width={content.cellW}
            height={content.cellH}
            fill={fill}
            stroke={COLORS.stroke}
            strokeWidth={cellStroke}
          />
          <line
            x1={x + content.cellW * 0.15}
            y1={y + content.cellH / 2}
            x2={x + content.cellW * 0.85}
            y2={y + content.cellH / 2}
            stroke={COLORS.tape}
            strokeWidth={cellStroke * 1.5}
          />
        </g>,
      );
    }
  }

  return (
    <svg
      viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`}
      className="h-full w-full"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <marker
          id={`ortho-arrow-${view}`}
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

      {cells}

      <g
        stroke={COLORS.dim}
        fill={COLORS.dim}
        strokeWidth={stroke}
        strokeLinecap="round"
      >
        <line
          x1={0}
          y1={content.height + padY * 0.4}
          x2={content.width}
          y2={content.height + padY * 0.4}
          markerStart={`url(#ortho-arrow-${view})`}
          markerEnd={`url(#ortho-arrow-${view})`}
        />
        <text
          x={content.width / 2}
          y={content.height + padY * 0.4 + fontSize * 1.4}
          fontSize={fontSize}
          fontWeight={700}
          textAnchor="middle"
          stroke="none"
        >
          {widthLabel}
        </text>

        <line
          x1={content.width + padX * 0.3}
          y1={0}
          x2={content.width + padX * 0.3}
          y2={content.height}
          markerStart={`url(#ortho-arrow-${view})`}
          markerEnd={`url(#ortho-arrow-${view})`}
        />
        <text
          x={content.width + padX * 0.3 + fontSize * 0.6}
          y={content.height / 2 + fontSize * 0.35}
          fontSize={fontSize}
          fontWeight={700}
          textAnchor="start"
          stroke="none"
        >
          {heightLabel}
        </text>
      </g>
    </svg>
  );
}

function computeView({ view, pallet, box, layout, layersHigh }: Props): {
  content: {
    rows: number;
    cols: number;
    cellW: number;
    cellH: number;
    width: number;
    height: number;
  };
  widthLabel: string;
  heightLabel: string;
} {
  if (view === 'top') {
    return {
      content: {
        rows: layout.rows,
        cols: layout.cols,
        cellW: layout.footprintLength,
        cellH: layout.footprintWidth,
        width: layout.cols * layout.footprintLength,
        height: layout.rows * layout.footprintWidth,
      },
      widthLabel: formatInches(pallet.length),
      heightLabel: formatInches(pallet.width),
    };
  }
  if (view === 'front') {
    return {
      content: {
        rows: layersHigh,
        cols: layout.rows,
        cellW: layout.footprintWidth,
        cellH: box.height,
        width: layout.rows * layout.footprintWidth,
        height: layersHigh * box.height,
      },
      widthLabel: formatInches(pallet.width),
      heightLabel: formatInches(box.height * layersHigh),
    };
  }
  return {
    content: {
      rows: layersHigh,
      cols: layout.cols,
      cellW: layout.footprintLength,
      cellH: box.height,
      width: layout.cols * layout.footprintLength,
      height: layersHigh * box.height,
    },
    widthLabel: formatInches(pallet.length),
    heightLabel: formatInches(box.height * layersHigh),
  };
}
