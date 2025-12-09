import React, { useMemo, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Grid } from '@react-three/drei';
import * as THREE from 'three';
import { IndentationPoint, ColorScheme } from '@/types/indentation';
import { getColorForValue3D } from '@/utils/colorScales';

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
      <meshStandardMaterial vertexColors />
    </instancedMesh>
  );
};

interface HeatmapSurfaceProps {
  points: IndentationPoint[];
  selectedProperty: string;
  colorScheme: ColorScheme;
  minValue: number;
  maxValue: number;
  scale: { x: number; y: number; z: number };
  offset: { x: number; y: number; z: number };
}

const HeatmapSurface: React.FC<HeatmapSurfaceProps> = ({
  points,
  selectedProperty,
  colorScheme,
  minValue,
  maxValue,
  scale,
  offset,
}) => {
  const geometry = useMemo(() => {
    if (points.length < 3) return null;

    // Get unique X and Y values and sort them
    const xValues = [...new Set(points.map(p => p.x))].sort((a, b) => a - b);
    const yValues = [...new Set(points.map(p => p.y))].sort((a, b) => a - b);

    if (xValues.length < 2 || yValues.length < 2) return null;

    // Create a grid map for quick lookup
    const pointMap = new Map<string, IndentationPoint>();
    points.forEach(p => {
      pointMap.set(`${p.x},${p.y}`, p);
    });

    const vertices: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];

    // Create vertices for each grid point
    const vertexMap = new Map<string, number>();
    let vertexIndex = 0;

    xValues.forEach((x) => {
      yValues.forEach((y) => {
        const point = pointMap.get(`${x},${y}`);
        if (point) {
          const px = (point.x - offset.x) * scale.x;
          const py = (point.y - offset.y) * scale.y;
          const pz = (point.z - offset.z) * scale.z;

          vertices.push(px, pz, -py);

          const value = point.properties[selectedProperty] ?? 0;
          const color = getColorForValue3D(value, minValue, maxValue, colorScheme);
          colors.push(color[0], color[1], color[2]);

          vertexMap.set(`${x},${y}`, vertexIndex);
          vertexIndex++;
        }
      });
    });

    // Create triangles between adjacent points
    for (let i = 0; i < xValues.length - 1; i++) {
      for (let j = 0; j < yValues.length - 1; j++) {
        const x1 = xValues[i], x2 = xValues[i + 1];
        const y1 = yValues[j], y2 = yValues[j + 1];

        const v00 = vertexMap.get(`${x1},${y1}`);
        const v10 = vertexMap.get(`${x2},${y1}`);
        const v01 = vertexMap.get(`${x1},${y2}`);
        const v11 = vertexMap.get(`${x2},${y2}`);

        // Create two triangles for each quad if all vertices exist
        if (v00 !== undefined && v10 !== undefined && v01 !== undefined && v11 !== undefined) {
          indices.push(v00, v10, v01);
          indices.push(v10, v11, v01);
        }
      }
    }

    if (vertices.length === 0 || indices.length === 0) return null;

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    return geo;
  }, [points, selectedProperty, colorScheme, minValue, maxValue, scale, offset]);

  if (!geometry) return null;

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial 
        vertexColors 
        side={THREE.DoubleSide}
        transparent
        opacity={0.85}
      />
    </mesh>
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
  showHeatmapSurface?: boolean;
  showDataPoints?: boolean;
}

export const Scene3D: React.FC<Scene3DProps> = ({
  points,
  selectedProperty,
  colorScheme,
  minValue,
  maxValue,
  selectedPoint,
  onPointSelect,
  showHeatmapSurface = true,
  showDataPoints = true,
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
    <Canvas>
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

      {showHeatmapSurface && (
        <HeatmapSurface
          points={points}
          selectedProperty={selectedProperty}
          colorScheme={colorScheme}
          minValue={minValue}
          maxValue={maxValue}
          scale={scale}
          offset={offset}
        />
      )}

      {showDataPoints && (
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
      )}

      {/* Axis indicators */}
      <arrowHelper args={[new THREE.Vector3(1, 0, 0), new THREE.Vector3(-4, 0, 0), 1, 0xff0000]} />
      <arrowHelper args={[new THREE.Vector3(0, 1, 0), new THREE.Vector3(-4, 0, 0), 1, 0x00ff00]} />
      <arrowHelper args={[new THREE.Vector3(0, 0, 1), new THREE.Vector3(-4, 0, 0), 1, 0x0000ff]} />
    </Canvas>
  );
};
