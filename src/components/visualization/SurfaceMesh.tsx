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
}

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
    const triangles = delaunay.triangles;

    // Create geometry
    const geo = new THREE.BufferGeometry();

    // Create vertices
    const vertices: number[] = [];
    const colors: number[] = [];

    points.forEach((point) => {
      const x = (point.x - offset.x) * scale.x;
      const y = (point.y - offset.y) * scale.y;
      const z = (point.z - offset.z) * scale.z;
      // Match Scene3D coordinate system: [x, z, -y]
      vertices.push(x, z, -y);

      const value = point.properties[selectedProperty] ?? 0;
      const color = getColorForValue3D(value, minValue, maxValue, colorScheme);
      colors.push(color[0], color[1], color[2]);
    });

    geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.setIndex(Array.from(triangles));
    geo.computeVertexNormals();

    return geo;
  }, [points, selectedProperty, colorScheme, minValue, maxValue, scale, offset]);

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
