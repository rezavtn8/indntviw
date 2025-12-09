import { ColorScheme } from '@/types/indentation';

// Scientific color scales
const colorScales: Record<ColorScheme, [number, number, number][]> = {
  viridis: [
    [68, 1, 84],
    [72, 40, 120],
    [62, 74, 137],
    [49, 104, 142],
    [38, 130, 142],
    [31, 158, 137],
    [53, 183, 121],
    [109, 205, 89],
    [180, 222, 44],
    [253, 231, 37],
  ],
  plasma: [
    [13, 8, 135],
    [75, 3, 161],
    [126, 3, 168],
    [168, 34, 150],
    [203, 70, 121],
    [229, 107, 93],
    [248, 148, 65],
    [253, 195, 40],
    [240, 249, 33],
  ],
  inferno: [
    [0, 0, 4],
    [40, 11, 84],
    [101, 21, 110],
    [159, 42, 99],
    [212, 72, 66],
    [245, 125, 21],
    [250, 193, 39],
    [252, 255, 164],
  ],
  magma: [
    [0, 0, 4],
    [28, 16, 68],
    [79, 18, 123],
    [129, 37, 129],
    [181, 54, 122],
    [229, 80, 100],
    [251, 135, 97],
    [254, 194, 135],
    [252, 253, 191],
  ],
  turbo: [
    [48, 18, 59],
    [86, 91, 214],
    [36, 170, 226],
    [29, 223, 163],
    [145, 244, 80],
    [241, 206, 32],
    [253, 141, 60],
    [225, 67, 39],
    [122, 4, 3],
  ],
  jet: [
    [0, 0, 128],
    [0, 0, 255],
    [0, 128, 255],
    [0, 255, 255],
    [128, 255, 128],
    [255, 255, 0],
    [255, 128, 0],
    [255, 0, 0],
    [128, 0, 0],
  ],
};

export function interpolateColor(
  t: number,
  scheme: ColorScheme
): { r: number; g: number; b: number } {
  const scale = colorScales[scheme];
  const clampedT = Math.max(0, Math.min(1, t));
  const scaledT = clampedT * (scale.length - 1);
  const lowerIdx = Math.floor(scaledT);
  const upperIdx = Math.min(lowerIdx + 1, scale.length - 1);
  const localT = scaledT - lowerIdx;

  const lower = scale[lowerIdx];
  const upper = scale[upperIdx];

  return {
    r: Math.round(lower[0] + (upper[0] - lower[0]) * localT),
    g: Math.round(lower[1] + (upper[1] - lower[1]) * localT),
    b: Math.round(lower[2] + (upper[2] - lower[2]) * localT),
  };
}

export function getColorForValue(
  value: number,
  min: number,
  max: number,
  scheme: ColorScheme
): string {
  if (max === min) return `rgb(${colorScales[scheme][Math.floor(colorScales[scheme].length / 2)].join(',')})`;
  const t = (value - min) / (max - min);
  const { r, g, b } = interpolateColor(t, scheme);
  return `rgb(${r}, ${g}, ${b})`;
}

export function getColorForValue3D(
  value: number,
  min: number,
  max: number,
  scheme: ColorScheme
): [number, number, number] {
  if (max === min) {
    const mid = colorScales[scheme][Math.floor(colorScales[scheme].length / 2)];
    return [mid[0] / 255, mid[1] / 255, mid[2] / 255];
  }
  const t = (value - min) / (max - min);
  const { r, g, b } = interpolateColor(t, scheme);
  return [r / 255, g / 255, b / 255];
}

export { colorScales };
