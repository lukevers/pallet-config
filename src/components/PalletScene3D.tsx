import { Edges, OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import {
  PALLET_BOTTOM_BOARDS,
  PALLET_DECK_THICKNESS,
  PALLET_HEIGHT,
  PALLET_STRINGER_HEIGHT,
  PALLET_STRINGER_WIDTH,
  PALLET_TOP_BOARDS,
} from '../constants';
import type { LayerLayout } from '../lib/layout';
import type { Box, PalletStandard } from '../types';

type Props = {
  pallet: PalletStandard;
  box: Box;
  layout: LayerLayout;
  layersHigh: number;
};

export function PalletScene3D({ pallet, box, layout, layersHigh }: Props) {
  const totalH = PALLET_HEIGHT + box.height * layersHigh;
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
        <Pallet length={pallet.length} width={pallet.width} />
        <BoxStack
          box={box}
          layout={layout}
          pallet={pallet}
          layersHigh={layersHigh}
        />
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

function Pallet({ length, width }: { length: number; width: number }) {
  const deckBoardCount = PALLET_TOP_BOARDS;
  const deckBoardWidth = (width * 0.92) / deckBoardCount;
  const deckBoardGap =
    (width - deckBoardCount * deckBoardWidth) / (deckBoardCount - 1);
  const deckY = PALLET_HEIGHT - PALLET_DECK_THICKNESS / 2;

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

function BoxStack({
  box,
  layout,
  pallet,
  layersHigh,
}: {
  box: Box;
  layout: LayerLayout;
  pallet: PalletStandard;
  layersHigh: number;
}) {
  if (layout.boxesPerLayer === 0) {
    return null;
  }
  const fpL = layout.footprintLength;
  const fpW = layout.footprintWidth;
  const baseY = PALLET_HEIGHT;

  const startX = -pallet.length / 2 + layout.marginLength / 2 + fpL / 2;
  const startZ = -pallet.width / 2 + layout.marginWidth / 2 + fpW / 2;

  const boxes: Array<{ x: number; y: number; z: number; key: string }> = [];
  for (let layer = 0; layer < layersHigh; layer++) {
    const y = baseY + layer * box.height + box.height / 2;
    for (let row = 0; row < layout.rows; row++) {
      for (let col = 0; col < layout.cols; col++) {
        const x = startX + col * fpL;
        const z = startZ + row * fpW;
        boxes.push({ x, y, z, key: `${layer}-${row}-${col}` });
      }
    }
  }

  return (
    <group>
      {boxes.map(({ x, y, z, key }) => (
        <mesh key={key} position={[x, y, z]} castShadow receiveShadow>
          <boxGeometry args={[fpL * 0.985, box.height * 0.985, fpW * 0.985]} />
          <meshStandardMaterial color="#C09569" roughness={0.95} />
          <Edges color="#7B5A36" threshold={15} />
        </mesh>
      ))}
    </group>
  );
}
