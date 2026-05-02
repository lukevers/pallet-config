import type { ReactElement } from 'react';
import type { LayerLayout } from '../lib/layout';
import { formatInches } from '../lib/layout';
import type { Box, PalletStandard } from '../types';

type View = 'top' | 'front' | 'side';

type Props = {
  view: View;
  pallet: PalletStandard;
  box: Box;
  layouts: ReadonlyArray<LayerLayout>;
};

const COLORS = {
  boxFill: '#C09569',
  boxFillAlt: '#BA9066',
  tape: '#E0C29B',
  stroke: '#7B5A36',
  palletFill: '#B98E4F',
  palletStroke: '#6E4E26',
  dim: '#1B2A56',
};

export function OrthoView({ view, pallet, box, layouts }: Props) {
  // Stroke is computed once from the box's intrinsic dimensions so every
  // layer in every view (and the pallet) renders outlines at the same width,
  // regardless of per-layer orientation. Box and pallet share the same value
  // so the boxes don't appear to overhang the pallet edge in elevation views.
  const cellStroke = Math.max(box.length, box.width, box.height) * 0.025;

  if (view === 'top') {
    return (
      <OrthoSvg
        contentWidth={pallet.length}
        contentHeight={pallet.width}
        widthLabel={formatInches(pallet.length)}
        heightLabel={formatInches(pallet.width)}
        viewKey="top"
      >
        <defs>
          <clipPath id="ortho-top-pallet-clip">
            <rect x={0} y={0} width={pallet.length} height={pallet.width} />
          </clipPath>
        </defs>
        <PalletTop
          length={pallet.length}
          width={pallet.width}
          cellStroke={cellStroke}
        />
        <g clipPath="url(#ortho-top-pallet-clip)">
          {layouts.map((layer, i) => (
            <TopLayerCells
              // biome-ignore lint/suspicious/noArrayIndexKey: layer index is positional
              key={`layer-${i}`}
              layer={layer}
              cellStroke={cellStroke}
            />
          ))}
        </g>
      </OrthoSvg>
    );
  }

  const layersHigh = layouts.length;
  const stackHeight = layersHigh * box.height;
  const totalHeight = stackHeight + pallet.height;
  const palletAxis = view === 'front' ? pallet.width : pallet.length;

  return (
    <OrthoSvg
      contentWidth={palletAxis}
      contentHeight={totalHeight}
      widthLabel={formatInches(palletAxis)}
      heightLabel={formatInches(totalHeight)}
      viewKey={view}
    >
      {layouts.map((layer, i) => (
        <ElevationLayerRow
          // biome-ignore lint/suspicious/noArrayIndexKey: layer index is positional
          key={`layer-${i}`}
          layer={layer}
          axis={view === 'front' ? 'width' : 'length'}
          rowY={(layersHigh - 1 - i) * box.height}
          rowH={box.height}
          cellStroke={cellStroke}
        />
      ))}
      <PalletElevation
        width={palletAxis}
        y={stackHeight}
        height={pallet.height}
        cellStroke={cellStroke}
      />
    </OrthoSvg>
  );
}

function OrthoSvg({
  contentWidth,
  contentHeight,
  widthLabel,
  heightLabel,
  viewKey,
  children,
}: {
  contentWidth: number;
  contentHeight: number;
  widthLabel: string;
  heightLabel: string;
  viewKey: string;
  children: React.ReactNode;
}) {
  const fontSize = Math.max(contentWidth, contentHeight) * 0.06;
  const stroke = Math.max(contentWidth, contentHeight) * 0.005;

  // Gap from content to the dimension line, and from the line to the label.
  const lineOffset = fontSize * 1.2;
  const labelOffset = fontSize * 1.6;
  // Estimated label width (allow ~4 chars at fontSize each).
  const labelWidth = fontSize * 4;
  const descender = fontSize * 0.4;

  const padTop = fontSize * 0.5;
  const padLeft = fontSize * 0.5;
  const padBottom = lineOffset + labelOffset + descender;
  const padRight = lineOffset + labelWidth;

  const vbX = -padLeft;
  const vbY = -padTop;
  const vbW = contentWidth + padLeft + padRight;
  const vbH = contentHeight + padTop + padBottom;

  const widthLineY = contentHeight + lineOffset;
  const widthLabelY = widthLineY + labelOffset;
  const heightLineX = contentWidth + lineOffset;
  const heightLabelX = heightLineX + fontSize * 0.4;

  return (
    <svg
      viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`}
      className="h-full w-full"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <marker
          id={`ortho-arrow-${viewKey}`}
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

      {children}

      <g
        stroke={COLORS.dim}
        fill={COLORS.dim}
        strokeWidth={stroke}
        strokeLinecap="round"
      >
        <line
          x1={0}
          y1={widthLineY}
          x2={contentWidth}
          y2={widthLineY}
          markerStart={`url(#ortho-arrow-${viewKey})`}
          markerEnd={`url(#ortho-arrow-${viewKey})`}
        />
        <text
          x={contentWidth / 2}
          y={widthLabelY}
          fontSize={fontSize}
          fontWeight={700}
          textAnchor="middle"
          stroke="none"
        >
          {widthLabel}
        </text>

        <line
          x1={heightLineX}
          y1={0}
          x2={heightLineX}
          y2={contentHeight}
          markerStart={`url(#ortho-arrow-${viewKey})`}
          markerEnd={`url(#ortho-arrow-${viewKey})`}
        />
        <text
          x={heightLabelX}
          y={contentHeight / 2 + fontSize * 0.35}
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

function PalletTop({
  length,
  width,
  cellStroke,
}: {
  length: number;
  width: number;
  cellStroke: number;
}) {
  return (
    <rect
      x={0}
      y={0}
      width={length}
      height={width}
      fill={COLORS.palletFill}
      stroke={COLORS.palletStroke}
      strokeWidth={cellStroke}
    />
  );
}

function PalletElevation({
  width,
  y,
  height,
  cellStroke,
}: {
  width: number;
  y: number;
  height: number;
  cellStroke: number;
}) {
  // Show a couple of horizontal slats hint to indicate the pallet's deck +
  // stringer structure without trying to be photorealistic.
  const deckThickness = height * 0.2;
  return (
    <g>
      <rect
        x={0}
        y={y}
        width={width}
        height={height}
        fill={COLORS.palletFill}
        stroke={COLORS.palletStroke}
        strokeWidth={cellStroke}
      />
      <line
        x1={0}
        y1={y + deckThickness}
        x2={width}
        y2={y + deckThickness}
        stroke={COLORS.palletStroke}
        strokeWidth={cellStroke * 0.6}
      />
      <line
        x1={0}
        y1={y + height - deckThickness}
        x2={width}
        y2={y + height - deckThickness}
        stroke={COLORS.palletStroke}
        strokeWidth={cellStroke * 0.6}
      />
    </g>
  );
}

function TopLayerCells({
  layer,
  cellStroke,
}: {
  layer: LayerLayout;
  cellStroke: number;
}) {
  const startX = layer.offsetLength;
  const startY = layer.offsetWidth;

  const cells: Array<ReactElement> = [];
  for (let r = 0; r < layer.rows; r++) {
    for (let c = 0; c < layer.cols; c++) {
      const x = startX + c * layer.footprintLength;
      const y = startY + r * layer.footprintWidth;
      const fill = (r + c) % 2 === 0 ? COLORS.boxFill : COLORS.boxFillAlt;
      cells.push(
        <g key={`top-${r}-${c}`}>
          <rect
            x={x}
            y={y}
            width={layer.footprintLength}
            height={layer.footprintWidth}
            fill={fill}
            stroke={COLORS.stroke}
            strokeWidth={cellStroke}
          />
          <line
            x1={x + layer.footprintLength * 0.15}
            y1={y + layer.footprintWidth / 2}
            x2={x + layer.footprintLength * 0.85}
            y2={y + layer.footprintWidth / 2}
            stroke={COLORS.tape}
            strokeWidth={cellStroke * 1.5}
          />
        </g>,
      );
    }
  }
  return <g>{cells}</g>;
}

function ElevationLayerRow({
  layer,
  axis,
  rowY,
  rowH,
  cellStroke,
}: {
  layer: LayerLayout;
  axis: 'width' | 'length';
  rowY: number;
  rowH: number;
  cellStroke: number;
}) {
  const count = axis === 'width' ? layer.rows : layer.cols;
  const cellW = axis === 'width' ? layer.footprintWidth : layer.footprintLength;
  const offset = axis === 'width' ? layer.offsetWidth : layer.offsetLength;
  const startX = offset;

  const cells: Array<ReactElement> = [];
  for (let i = 0; i < count; i++) {
    const x = startX + i * cellW;
    const fill = i % 2 === 0 ? COLORS.boxFill : COLORS.boxFillAlt;
    cells.push(
      <g key={`cell-${i}`}>
        <rect
          x={x}
          y={rowY}
          width={cellW}
          height={rowH}
          fill={fill}
          stroke={COLORS.stroke}
          strokeWidth={cellStroke}
        />
        <line
          x1={x + cellW * 0.15}
          y1={rowY + rowH / 2}
          x2={x + cellW * 0.85}
          y2={rowY + rowH / 2}
          stroke={COLORS.tape}
          strokeWidth={cellStroke * 1.5}
        />
      </g>,
    );
  }
  return <g>{cells}</g>;
}
