import React, { useMemo } from 'react';
import * as THREE from 'three';
import Delaunator from 'delaunator';
import { IndentationPoint, ColorScheme } from '@/types/indentation';
import { getColorForValue3D } from '@/utils/colorScales';

interface SurfaceMeshProps {
  points: IndentationPoint[];
  selectedProperty: string;
  colorScheme: ColorScheme;
  minValue: number;
  maxValue: number;
  scale: { x: number; y: number; z: number };
  offset: { x: number; y: number; z: number };
  opacity: number;
  showWireframe: boolean;
  surfaceType?: 'full' | 'boundary';
  flipX?: boolean;
  flipY?: boolean;
  flipZ?: boolean;
}

// Calculate edge length for alpha filtering
const getEdgeLength = (
  p1: [number, number, number],
  p2: [number, number, number]
): number => {
  return Math.sqrt(
    Math.pow(p1[0] - p2[0], 2) +
    Math.pow(p1[1] - p2[1], 2) +
    Math.pow(p1[2] - p2[2], 2)
  );
};

export const SurfaceMesh: React.FC<SurfaceMeshProps> = ({
  points,
  selectedProperty,
  colorScheme,
  minValue,
  maxValue,
  scale,
  offset,
  opacity,
  showWireframe,
  surfaceType = 'full',
  flipX = false,
  flipY = false,
  flipZ = false,
}) => {
  const geometry = useMemo(() => {
    if (points.length < 3) return null;

    // Get 2D coordinates for triangulation (using x, y)
    const coords: number[] = [];
    points.forEach((point) => {
      coords.push(point.x, point.y);
    });

    // Perform Delaunay triangulation
    const delaunay = new Delaunator(coords);
    let triangles: number[] = Array.from(delaunay.triangles) as number[];

    // Create vertices with flip options
    const vertices: number[] = [];
    const vertexPositions: [number, number, number][] = [];
    const colors: number[] = [];

    points.forEach((point) => {
      let x = (point.x - offset.x) * scale.x;
      let y = (point.y - offset.y) * scale.y;
      let z = (point.z - offset.z) * scale.z;
      
      // Apply flip transformations
      if (flipX) x = -x;
      if (flipY) y = -y;
      if (flipZ) z = -z;
      
      // Match Scene3D coordinate system: [x, z, -y]
      const pos: [number, number, number] = [x, z, -y];
      vertexPositions.push(pos);
      vertices.push(pos[0], pos[1], pos[2]);

      const value = point.properties[selectedProperty] ?? 0;
      const color = getColorForValue3D(value, minValue, maxValue, colorScheme);
      colors.push(color[0], color[1], color[2]);
    });

    // For boundary mode, filter out large triangles (alpha shape approximation)
    if (surfaceType === 'boundary') {
      // Calculate average edge length
      let totalLength = 0;
      let edgeCount = 0;
      
      for (let i = 0; i < triangles.length; i += 3) {
        const i0 = triangles[i] as number;
        const i1 = triangles[i + 1] as number;
        const i2 = triangles[i + 2] as number;
        
        totalLength += getEdgeLength(vertexPositions[i0], vertexPositions[i1]);
        totalLength += getEdgeLength(vertexPositions[i1], vertexPositions[i2]);
        totalLength += getEdgeLength(vertexPositions[i2], vertexPositions[i0]);
        edgeCount += 3;
      }
      
      const avgLength = totalLength / edgeCount;
      const threshold = avgLength * 2; // Alpha threshold
      
      // Filter triangles with edges longer than threshold
      const filteredTriangles: number[] = [];
      for (let i = 0; i < triangles.length; i += 3) {
        const i0 = triangles[i] as number;
        const i1 = triangles[i + 1] as number;
        const i2 = triangles[i + 2] as number;
        
        const e1 = getEdgeLength(vertexPositions[i0], vertexPositions[i1]);
        const e2 = getEdgeLength(vertexPositions[i1], vertexPositions[i2]);
        const e3 = getEdgeLength(vertexPositions[i2], vertexPositions[i0]);
        
        if (e1 <= threshold && e2 <= threshold && e3 <= threshold) {
          filteredTriangles.push(i0, i1, i2);
        }
      }
      triangles = filteredTriangles;
    }

    // Create geometry
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.setIndex(triangles);
    geo.computeVertexNormals();

    return geo;
  }, [points, selectedProperty, colorScheme, minValue, maxValue, scale, offset, surfaceType, flipX, flipY, flipZ]);

  if (!geometry) return null;

  return (
    <group>
      <mesh geometry={geometry}>
        <meshStandardMaterial
          vertexColors
          transparent
          opacity={opacity}
          side={THREE.DoubleSide}
          flatShading={false}
        />
      </mesh>
      {showWireframe && (
        <mesh geometry={geometry}>
          <meshBasicMaterial
            wireframe
            color="#000000"
            transparent
            opacity={0.3}
          />
        </mesh>
      )}
    </group>
  );
};
