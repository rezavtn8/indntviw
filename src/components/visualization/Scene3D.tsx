import React, { useMemo, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Grid } from '@react-three/drei';
import * as THREE from 'three';
import { IndentationPoint, ColorScheme } from '@/types/indentation';
import { getColorForValue3D } from '@/utils/colorScales';

// Configure color management for accurate heatmap colors
THREE.ColorManagement.enabled = true;

interface DataPointsProps {
  points: IndentationPoint[];
  selectedProperty: string;
  colorScheme: ColorScheme;
  minValue: number;
  maxValue: number;
  selectedPoint: IndentationPoint | null;
  onPointSelect: (point: IndentationPoint | null) => void;
  scale: { x: number; y: number; z: number };
  offset: { x: number; y: number; z: number };
}

const DataPoints: React.FC<DataPointsProps> = ({
  points,
  selectedProperty,
  colorScheme,
  minValue,
  maxValue,
  selectedPoint,
  onPointSelect,
  scale,
  offset,
}) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const tempObject = useMemo(() => new THREE.Object3D(), []);
  const tempColor = useMemo(() => new THREE.Color(), []);

  const { positions, colors } = useMemo(() => {
    const positions: [number, number, number][] = [];
    const colors: [number, number, number][] = [];

    points.forEach((point) => {
      const x = (point.x - offset.x) * scale.x;
      const y = (point.y - offset.y) * scale.y;
      const z = (point.z - offset.z) * scale.z;
      positions.push([x, z, -y]);

      const value = point.properties[selectedProperty] ?? 0;
      const color = getColorForValue3D(value, minValue, maxValue, colorScheme);
      colors.push(color);
    });

    return { positions, colors };
  }, [points, selectedProperty, colorScheme, minValue, maxValue, scale, offset]);

  React.useEffect(() => {
    if (!meshRef.current) return;

    positions.forEach((pos, i) => {
      tempObject.position.set(pos[0], pos[1], pos[2]);
      tempObject.scale.setScalar(selectedPoint?.id === points[i].id ? 0.15 : 0.1);
      tempObject.updateMatrix();
      meshRef.current!.setMatrixAt(i, tempObject.matrix);

      // Set color in linear space - renderer will convert to sRGB output
      tempColor.setRGB(colors[i][0], colors[i][1], colors[i][2]);
      meshRef.current!.setColorAt(i, tempColor);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  }, [positions, colors, selectedPoint, points, tempObject, tempColor]);

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, points.length]}
      onClick={(e) => {
        e.stopPropagation();
        const pointIndex = e.instanceId;
        if (pointIndex !== undefined) {
          const point = points[pointIndex];
          onPointSelect(selectedPoint?.id === point.id ? null : point);
        }
      }}
    >
      <sphereGeometry args={[1, 16, 16]} />
      <meshBasicMaterial vertexColors />
    </instancedMesh>
  );
};

interface Scene3DProps {
  points: IndentationPoint[];
  selectedProperty: string;
  colorScheme: ColorScheme;
  minValue: number;
  maxValue: number;
  selectedPoint: IndentationPoint | null;
  onPointSelect: (point: IndentationPoint | null) => void;
}

export const Scene3D: React.FC<Scene3DProps> = ({
  points,
  selectedProperty,
  colorScheme,
  minValue,
  maxValue,
  selectedPoint,
  onPointSelect,
}) => {
  const { scale, offset } = useMemo(() => {
    if (points.length === 0) {
      return { scale: { x: 1, y: 1, z: 1 }, offset: { x: 0, y: 0, z: 0 } };
    }

    const xValues = points.map(p => p.x);
    const yValues = points.map(p => p.y);
    const zValues = points.map(p => p.z);

    const xMin = Math.min(...xValues);
    const xMax = Math.max(...xValues);
    const yMin = Math.min(...yValues);
    const yMax = Math.max(...yValues);
    const zMin = Math.min(...zValues);
    const zMax = Math.max(...zValues);

    const xRange = xMax - xMin || 1;
    const yRange = yMax - yMin || 1;
    const zRange = zMax - zMin || 0.1;

    const maxRange = Math.max(xRange, yRange, zRange);
    const targetSize = 5;

    return {
      scale: {
        x: targetSize / maxRange,
        y: targetSize / maxRange,
        z: targetSize / maxRange * 2,
      },
      offset: {
        x: (xMin + xMax) / 2,
        y: (yMin + yMax) / 2,
        z: (zMin + zMax) / 2,
      },
    };
  }, [points]);

  if (points.length === 0) {
    return (
      <div className="flex items-center justify-center h-full border-2 border-dashed border-muted-foreground/30">
        <p className="text-muted-foreground font-mono">No data loaded</p>
      </div>
    );
  }

  return (
    <Canvas gl={{ toneMapping: THREE.NoToneMapping, outputColorSpace: THREE.SRGBColorSpace }}>
      <PerspectiveCamera makeDefault position={[8, 6, 8]} />
      <OrbitControls enableDamping dampingFactor={0.05} />
      
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 10, 10]} intensity={1} />
      <directionalLight position={[-10, -10, -10]} intensity={0.3} />

      <Grid
        args={[10, 10]}
        cellSize={0.5}
        cellThickness={0.5}
        cellColor="#444"
        sectionSize={2}
        sectionThickness={1}
        sectionColor="#666"
        fadeDistance={30}
        infiniteGrid
      />

      <DataPoints
        points={points}
        selectedProperty={selectedProperty}
        colorScheme={colorScheme}
        minValue={minValue}
        maxValue={maxValue}
        selectedPoint={selectedPoint}
        onPointSelect={onPointSelect}
        scale={scale}
        offset={offset}
      />

      {/* Axis indicators */}
      <arrowHelper args={[new THREE.Vector3(1, 0, 0), new THREE.Vector3(-4, 0, 0), 1, 0xff0000]} />
      <arrowHelper args={[new THREE.Vector3(0, 1, 0), new THREE.Vector3(-4, 0, 0), 1, 0x00ff00]} />
      <arrowHelper args={[new THREE.Vector3(0, 0, 1), new THREE.Vector3(-4, 0, 0), 1, 0x0000ff]} />
    </Canvas>
  );
};
