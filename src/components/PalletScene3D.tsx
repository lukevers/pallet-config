import { Edges, OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import {
  PALLET_BOTTOM_BOARDS,
  PALLET_DECK_THICKNESS,
  PALLET_STRINGER_HEIGHT,
  PALLET_STRINGER_WIDTH,
  PALLET_TOP_BOARDS,
} from '../constants';
import type { LayerLayout } from '../lib/layout';
import type { Box, PalletStandard } from '../types';

type Props = {
  pallet: PalletStandard;
  box: Box;
  layouts: ReadonlyArray<LayerLayout>;
};

export function PalletScene3D({ pallet, box, layouts }: Props) {
  const layersHigh = layouts.length;
  const totalH = pallet.height + box.height * layersHigh;
  const camDist = Math.max(pallet.length, pallet.width, totalH) * 2.2;

  return (
    <Canvas
      shadows="percentage"
      dpr={[1, 2]}
      camera={{
        position: [camDist * 0.7, camDist * 0.65, camDist * 0.85],
        fov: 28,
      }}
    >
      <color attach="background" args={['#F4F1EA']} />
      <ambientLight intensity={0.55} />
      <directionalLight
        position={[40, 80, 40]}
        intensity={1.1}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-80}
        shadow-camera-right={80}
        shadow-camera-top={80}
        shadow-camera-bottom={-80}
      />
      <directionalLight position={[-50, 30, -30]} intensity={0.25} />

      <group position={[0, 0, 0]}>
        <Pallet length={pallet.length} width={pallet.width} height={pallet.height} />
        <BoxStack box={box} layouts={layouts} pallet={pallet} />
      </group>

      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.01, 0]}
        receiveShadow
      >
        <planeGeometry
          args={[pallet.length * 4, Math.max(pallet.width, pallet.length) * 4]}
        />
        <shadowMaterial opacity={0.18} />
      </mesh>

      <OrbitControls
        target={[0, totalH / 2, 0]}
        enablePan={false}
        minDistance={camDist * 0.5}
        maxDistance={camDist * 2}
        maxPolarAngle={Math.PI / 2.05}
      />
    </Canvas>
  );
}

function Pallet({
  length,
  width,
  height,
}: {
  length: number;
  width: number;
  height: number;
}) {
  const deckBoardCount = PALLET_TOP_BOARDS;
  const deckBoardWidth = (width * 0.92) / deckBoardCount;
  const deckBoardGap =
    (width - deckBoardCount * deckBoardWidth) / (deckBoardCount - 1);
  const deckY = height - PALLET_DECK_THICKNESS / 2;

  const bottomBoardCount = PALLET_BOTTOM_BOARDS;
  const bottomBoardWidth = (width * 0.85) / bottomBoardCount;
  const bottomBoardGap =
    (width - bottomBoardCount * bottomBoardWidth) / (bottomBoardCount - 1);
  const bottomY = PALLET_DECK_THICKNESS / 2;

  const stringerY = PALLET_DECK_THICKNESS + PALLET_STRINGER_HEIGHT / 2;

  return (
    <group>
      {Array.from({ length: deckBoardCount }, (_, i) => {
        const z =
          -width / 2 + deckBoardWidth / 2 + i * (deckBoardWidth + deckBoardGap);
        return (
          <mesh
            key={`top-${z.toFixed(3)}`}
            position={[0, deckY, z]}
            castShadow
            receiveShadow
          >
            <boxGeometry
              args={[length, PALLET_DECK_THICKNESS, deckBoardWidth]}
            />
            <meshStandardMaterial color="#B98E4F" roughness={0.85} />
            <Edges color="#7B5A36" threshold={20} />
          </mesh>
        );
      })}

      {[
        -length / 2 + PALLET_STRINGER_WIDTH / 2,
        0,
        length / 2 - PALLET_STRINGER_WIDTH / 2,
      ].map((x) => (
        <mesh
          key={`stringer-${x.toFixed(3)}`}
          position={[x, stringerY, 0]}
          castShadow
          receiveShadow
        >
          <boxGeometry
            args={[PALLET_STRINGER_WIDTH, PALLET_STRINGER_HEIGHT, width]}
          />
          <meshStandardMaterial color="#A07B40" roughness={0.9} />
          <Edges color="#6E4E26" threshold={20} />
        </mesh>
      ))}

      {Array.from({ length: bottomBoardCount }, (_, i) => {
        const z =
          -width / 2 +
          bottomBoardWidth / 2 +
          i * (bottomBoardWidth + bottomBoardGap);
        return (
          <mesh
            key={`bot-${z.toFixed(3)}`}
            position={[0, bottomY, z]}
            castShadow
            receiveShadow
          >
            <boxGeometry
              args={[length, PALLET_DECK_THICKNESS, bottomBoardWidth]}
            />
            <meshStandardMaterial color="#B98E4F" roughness={0.85} />
            <Edges color="#7B5A36" threshold={20} />
          </mesh>
        );
      })}
    </group>
  );
}

const BOX_FILL = '#C09569';
const BOX_FILL_ALT = '#BA9066';

function BoxStack({
  box,
  layouts,
  pallet,
}: {
  box: Box;
  layouts: ReadonlyArray<LayerLayout>;
  pallet: PalletStandard;
}) {
  const baseY = pallet.height;
  const boxes: Array<{
    x: number;
    y: number;
    z: number;
    fpL: number;
    fpW: number;
    color: string;
    key: string;
  }> = [];

  for (let layer = 0; layer < layouts.length; layer++) {
    const ll = layouts[layer];
    if (ll.boxesPerLayer === 0) {
      continue;
    }
    const fpL = ll.footprintLength;
    const fpW = ll.footprintWidth;
    const startX = -pallet.length / 2 + ll.offsetLength + fpL / 2;
    const startZ = -pallet.width / 2 + ll.offsetWidth + fpW / 2;
    const y = baseY + layer * box.height + box.height / 2;

    for (let row = 0; row < ll.rows; row++) {
      for (let col = 0; col < ll.cols; col++) {
        boxes.push({
          x: startX + col * fpL,
          y,
          z: startZ + row * fpW,
          fpL,
          fpW,
          color: (row + col + layer) % 2 === 0 ? BOX_FILL : BOX_FILL_ALT,
          key: `${layer}-${row}-${col}`,
        });
      }
    }
  }

  const tapeThickness = Math.max(box.height * 0.015, 0.05);

  return (
    <group>
      {boxes.map(({ x, y, z, fpL, fpW, color, key }) => {
        const isLong = fpL >= fpW;
        const tapeLengthX = isLong ? fpL * 0.7 : fpL * 0.18;
        const tapeLengthZ = isLong ? fpW * 0.18 : fpW * 0.7;
        const tapeY = y + box.height / 2 + tapeThickness / 2;
        return (
          <group key={key}>
            <mesh position={[x, y, z]} castShadow receiveShadow>
              <boxGeometry
                args={[fpL * 0.985, box.height * 0.985, fpW * 0.985]}
              />
              <meshStandardMaterial color={color} roughness={0.95} />
              <Edges color="#7B5A36" threshold={15} />
            </mesh>
            <mesh position={[x, tapeY, z]} castShadow>
              <boxGeometry args={[tapeLengthX, tapeThickness, tapeLengthZ]} />
              <meshStandardMaterial color="#E0C29B" roughness={0.9} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
