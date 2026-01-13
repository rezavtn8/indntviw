/**
 * SVG Rasterization Utility
 * 
 * Converts SVG elements to PNG images using browser-native rendering.
 * This ensures pixel-perfect alignment of all SVG layers before html2canvas capture.
 */

/**
 * Serialize an SVG element to a complete, self-contained SVG string.
 * Ensures xmlns, dimensions, and basic styling are present.
 */
export function serializeSvg(svgEl: SVGElement): { svgString: string; width: number; height: number } {
  // Clone the SVG to avoid modifying the original
  const clone = svgEl.cloneNode(true) as SVGElement;
  
  // Get rendered dimensions
  const bbox = svgEl.getBoundingClientRect();
  const width = bbox.width || parseFloat(svgEl.getAttribute('width') || '300');
  const height = bbox.height || parseFloat(svgEl.getAttribute('height') || '150');
  
  // Ensure required attributes
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('width', String(width));
  clone.setAttribute('height', String(height));
  
  // Ensure viewBox if not present
  if (!clone.getAttribute('viewBox')) {
    clone.setAttribute('viewBox', `0 0 ${width} ${height}`);
  }
  
  // Add default styling to ensure colors render correctly
  // Replace CSS variables and currentColor with explicit values
  const styleEl = document.createElementNS('http://www.w3.org/2000/svg', 'style');
  styleEl.textContent = `
    text { fill: #111111; font-family: Arial, Helvetica, sans-serif; }
    .fill-muted-foreground { fill: #666666; }
    .fill-foreground { fill: #111111; }
    line[stroke="currentColor"], path[stroke="currentColor"] { stroke: #111111; }
  `;
  clone.insertBefore(styleEl, clone.firstChild);
  
  // Replace currentColor in inline attributes
  const elementsWithCurrentColor = clone.querySelectorAll('[stroke="currentColor"], [fill="currentColor"]');
  elementsWithCurrentColor.forEach(el => {
    if (el.getAttribute('stroke') === 'currentColor') {
      el.setAttribute('stroke', '#111111');
    }
    if (el.getAttribute('fill') === 'currentColor') {
      el.setAttribute('fill', '#111111');
    }
  });
  
  // Replace fill-muted-foreground class with explicit fill
  const mutedElements = clone.querySelectorAll('.fill-muted-foreground');
  mutedElements.forEach(el => {
    el.setAttribute('fill', '#666666');
  });
  
  // Replace fill-foreground class with explicit fill
  const foregroundElements = clone.querySelectorAll('.fill-foreground');
  foregroundElements.forEach(el => {
    el.setAttribute('fill', '#111111');
  });
  
  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(clone);
  
  return { svgString, width, height };
}

/**
 * Convert an SVG string to an HTMLImageElement.
 */
export function svgStringToImage(svgString: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(new Error(`Failed to load SVG as image: ${e}`));
    };
    
    img.src = url;
  });
}

/**
 * Rasterize an SVG element to a PNG data URL at a given scale.
 * Returns the data URL and final dimensions.
 */
export async function rasterizeSvgToDataUrl(
  svgEl: SVGElement,
  scale: number = 1
): Promise<{ dataUrl: string; width: number; height: number }> {
  const { svgString, width, height } = serializeSvg(svgEl);
  
  const scaledWidth = Math.ceil(width * scale);
  const scaledHeight = Math.ceil(height * scale);
  
  const img = await svgStringToImage(svgString);
  
  const canvas = document.createElement('canvas');
  canvas.width = scaledWidth;
  canvas.height = scaledHeight;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get canvas 2d context');
  }
  
  // Fill with white background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, scaledWidth, scaledHeight);
  
  // Draw the SVG image scaled
  ctx.drawImage(img, 0, 0, scaledWidth, scaledHeight);
  
  const dataUrl = canvas.toDataURL('image/png', 1.0);
  
  return { dataUrl, width: scaledWidth, height: scaledHeight };
}

/**
 * Replace all SVG elements in a cloned DOM tree with rasterized IMG elements.
 * This eliminates html2canvas SVG rendering inconsistencies.
 */
export async function replaceSvgsWithImages(
  container: HTMLElement,
  scale: number = 1
): Promise<void> {
  const svgElements = container.querySelectorAll('svg');
  
  const replacements = await Promise.all(
    Array.from(svgElements).map(async (svg) => {
      try {
        const { dataUrl, width, height } = await rasterizeSvgToDataUrl(svg as SVGElement, scale);
        
        // Get original rendered dimensions
        const bbox = svg.getBoundingClientRect();
        const originalWidth = bbox.width || parseFloat(svg.getAttribute('width') || '300');
        const originalHeight = bbox.height || parseFloat(svg.getAttribute('height') || '150');
        
        // Create replacement IMG element
        const img = document.createElement('img');
        img.src = dataUrl;
        img.style.width = `${originalWidth}px`;
        img.style.height = `${originalHeight}px`;
        img.style.display = 'block';
        img.style.maxWidth = 'none';
        
        return { svg, img };
      } catch (error) {
        console.warn('Failed to rasterize SVG, keeping original:', error);
        return null;
      }
    })
  );
  
  // Perform replacements
  for (const replacement of replacements) {
    if (replacement && replacement.svg.parentNode) {
      replacement.svg.parentNode.replaceChild(replacement.img, replacement.svg);
    }
  }
}
