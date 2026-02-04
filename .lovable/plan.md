
# Fix: Show All Dots in Box Plot Diagrams

## Problem Identified
The jitter function in `src/components/analysis/boxViolin/jitter.ts` has a hard limit of **100 points** (`maxPoints: number = 100`). When a dataset contains more than 100 values, only the first 100 dots are rendered, causing missing data points.

## Solution
Remove or significantly increase the `maxPoints` limit to ensure all data points are displayed. Since performance with SVG circles is generally fine for thousands of points, I'll remove the artificial limit entirely.

---

## Implementation Details

### File: `src/components/analysis/boxViolin/jitter.ts`

**Change**: Remove the `maxPoints` parameter and the `.slice()` call that truncates the values array.

**Before:**
```typescript
export function getJitteredPoints(
  values: number[],
  jitterWidth: number,
  groupIndex: number,
  niceMin: number,
  niceMax: number,
  topMargin: number,
  maxPoints: number = 100  // This limits dots!
): JitteredPoint[] {
  const maxJitter = jitterWidth * 0.3;
  
  return values.slice(0, maxPoints).map((v, i) => ({  // Truncates values!
    x: (seededRandom(groupIndex * 1000 + i) - 0.5) * maxJitter,
    y: valueToY(v, niceMin, niceMax, topMargin),
  }));
}
```

**After:**
```typescript
export function getJitteredPoints(
  values: number[],
  jitterWidth: number,
  groupIndex: number,
  niceMin: number,
  niceMax: number,
  topMargin: number
): JitteredPoint[] {
  const maxJitter = jitterWidth * 0.3;
  
  return values.map((v, i) => ({  // Render ALL values
    x: (seededRandom(groupIndex * 1000 + i) - 0.5) * maxJitter,
    y: valueToY(v, niceMin, niceMax, topMargin),
  }));
}
```

---

## Technical Notes

- **Performance**: SVG rendering handles hundreds to a few thousand circles without issue. Modern browsers can easily render 500-2000 small circles.
- **No breaking changes**: The `maxPoints` parameter was optional and defaulted to 100, so removing it won't break any existing calls (since `BoxViolinSvg.tsx` doesn't pass this parameter).
- **Alternative considered**: Instead of removing entirely, could increase to 1000 or 5000, but fully removing the limit is cleaner since the real constraint is the data size, not the rendering.
