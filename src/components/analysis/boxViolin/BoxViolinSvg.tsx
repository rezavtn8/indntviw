/**
 * Pure SVG Renderer for Box/Violin Plots
 * 
 * This component renders the SVG element only, without any surrounding UI.
 * All positioning uses a single group transform per category to ensure
 * pixel-perfect alignment during rasterization.
 */

import React from 'react';
import { DescriptiveStats } from '@/utils/advancedStatistics';
import {
  BOX_WIDTH,
  PLOT_HEIGHT,
  LABEL_AREA_HEIGHT,
  BASE_TOP_MARGIN,
  getBWStyle,
  getCenterX,
  calculateSvgWidth,
  calculateBracketAreaHeight,
  calculateNiceAxisBounds,
  valueToY,
  formatValue,
  BRACKET_TOP_PADDING,
  BRACKET_ROW_HEIGHT,
} from './layout';
import { getViolinPath } from './violin';
import { getJitteredPoints } from './jitter';

export interface BoxViolinDataItem {
  name: string;
  color: string;
  values: number[];
  stats: DescriptiveStats;
}

export interface PairwiseResult {
  i: number;
  j: number;
  pValue: number;
  asterisks: string;
}

export interface BoxViolinSvgProps {
  data: BoxViolinDataItem[];
  pairwiseResults: PairwiseResult[];
  showViolin: boolean;
  showJitter: boolean;
  showPValueAsterisks: boolean;
  blackAndWhite: boolean;
}

const FONT_STYLE: React.CSSProperties = { fontFamily: 'Arial, Helvetica, sans-serif' };

export const BoxViolinSvg: React.FC<BoxViolinSvgProps> = ({
  data,
  pairwiseResults,
  showViolin,
  showJitter,
  showPValueAsterisks,
  blackAndWhite,
}) => {
  // Calculate axis bounds from all values
  const allValues = data.flatMap(d => d.values);
  const { niceMin, niceMax, niceTicks } = calculateNiceAxisBounds(allValues);
  
  // Calculate bracket area and margins
  const bracketAreaHeight = calculateBracketAreaHeight(
    pairwiseResults.length,
    showPValueAsterisks
  );
  const topMargin = BASE_TOP_MARGIN + bracketAreaHeight;
  
  // Calculate SVG dimensions
  const svgWidth = calculateSvgWidth(data.length);
  const svgHeight = topMargin + PLOT_HEIGHT + LABEL_AREA_HEIGHT;
  
  // Y-coordinate helper bound to current axis
  const getY = (value: number) => valueToY(value, niceMin, niceMax, topMargin);
  
  return (
    <svg 
      width={svgWidth} 
      height={svgHeight} 
      style={{ ...FONT_STYLE, display: 'block', backgroundColor: '#ffffff' }}
    >
      {/* SVG Pattern definitions for B&W mode */}
      <defs>
        <pattern id="bw-stripe" patternUnits="userSpaceOnUse" width="4" height="4">
          <path d="M-1,1 l2,-2 M0,4 l4,-4 M3,5 l2,-2" stroke="#000" strokeWidth="0.5"/>
        </pattern>
        <pattern id="bw-dots" patternUnits="userSpaceOnUse" width="4" height="4">
          <circle cx="2" cy="2" r="1" fill="#000"/>
        </pattern>
      </defs>
      
      {/* Y-axis with nice ticks */}
      <g>
        {niceTicks.map(value => {
          const y = getY(value);
          return (
            <g key={value}>
              <line 
                x1={50} 
                y1={y} 
                x2={svgWidth - 20} 
                y2={y} 
                stroke="#111111" 
                strokeOpacity={0.1} 
              />
              <text 
                x={45} 
                y={y + 4} 
                textAnchor="end" 
                fill="#666666"
                style={{ fontSize: '11px', ...FONT_STYLE }}
              >
                {formatValue(value)}
              </text>
            </g>
          );
        })}
      </g>

      {/* P-value brackets and asterisks */}
      {showPValueAsterisks && pairwiseResults.map((result, idx) => {
        const centerX1 = getCenterX(result.i);
        const centerX2 = getCenterX(result.j);
        const bracketY = BRACKET_TOP_PADDING + idx * BRACKET_ROW_HEIGHT;
        const midX = (centerX1 + centerX2) / 2;
        
        return (
          <g key={`bracket-${idx}`}>
            <line x1={centerX1} y1={bracketY + 10} x2={centerX1} y2={bracketY} stroke="#111111" strokeWidth={1} />
            <line x1={centerX1} y1={bracketY} x2={centerX2} y2={bracketY} stroke="#111111" strokeWidth={1} />
            <line x1={centerX2} y1={bracketY} x2={centerX2} y2={bracketY + 10} stroke="#111111" strokeWidth={1} />
            
            <text 
              x={midX} 
              y={bracketY - 4} 
              textAnchor="middle" 
              fill="#111111"
              style={{ 
                fontSize: result.asterisks === 'ns' ? '9px' : '14px', 
                fontWeight: 'bold',
                fontStyle: result.asterisks === 'ns' ? 'italic' : 'normal',
                ...FONT_STYLE
              }}
            >
              {result.asterisks}
            </text>
          </g>
        );
      })}

      {/* Box plots - each group uses a single transform for all layers */}
      {data.map((d, idx) => {
        const centerX = getCenterX(idx);
        const { stats, values, color, name } = d;

        if (values.length === 0) return null;

        const q1Y = getY(stats.q1);
        const q3Y = getY(stats.q3);
        const medianY = getY(stats.median);
        const meanY = getY(stats.mean);
        const whiskerLow = getY(Math.max(stats.min, stats.q1 - 1.5 * stats.iqr));
        const whiskerHigh = getY(Math.min(stats.max, stats.q3 + 1.5 * stats.iqr));
        const labelY = topMargin + PLOT_HEIGHT + 25;

        // Get colors based on B&W mode
        const bwStyle = getBWStyle(idx);
        const boxFill = blackAndWhite
          ? (bwStyle.pattern === 'stripe'
              ? 'url(#bw-stripe)'
              : bwStyle.pattern === 'dots'
                ? 'url(#bw-dots)'
                : bwStyle.fill)
          : color;
        const boxFillOpacity = blackAndWhite ? bwStyle.fillOpacity : 0.3;
        const strokeColor = blackAndWhite ? '#000000' : color;
        const pointColor = blackAndWhite ? '#333333' : color;

        // All elements within this group are positioned relative to centerX
        return (
          <g key={name} transform={`translate(${centerX}, 0)`}>
            {/* Violin (if enabled) - centered at x=0 */}
            {showViolin && (
              <path
                d={getViolinPath(values, BOX_WIDTH * 1.5, niceMin, niceMax, topMargin)}
                fill={blackAndWhite ? '#888888' : color}
                fillOpacity={blackAndWhite ? 0.1 : 0.15}
                stroke={strokeColor}
                strokeOpacity={0.3}
              />
            )}

            {/* Jittered points (if enabled) - centered at x=0 */}
            {showJitter &&
              getJitteredPoints(values, BOX_WIDTH, idx, niceMin, niceMax, topMargin).map((pt, i) => (
                <circle
                  key={i}
                  cx={pt.x}
                  cy={pt.y}
                  r={2}
                  fill={pointColor}
                  fillOpacity={blackAndWhite ? 0.5 : 0.4}
                />
              ))}

            {/* Whiskers - centered at x=0 */}
            <line x1={0} y1={whiskerHigh} x2={0} y2={q3Y} stroke={strokeColor} strokeWidth={1.5} />
            <line x1={0} y1={q1Y} x2={0} y2={whiskerLow} stroke={strokeColor} strokeWidth={1.5} />
            <line x1={-10} y1={whiskerHigh} x2={10} y2={whiskerHigh} stroke={strokeColor} strokeWidth={1.5} />
            <line x1={-10} y1={whiskerLow} x2={10} y2={whiskerLow} stroke={strokeColor} strokeWidth={1.5} />

            {/* Box - centered at x=0 */}
            <rect
              x={-BOX_WIDTH / 2}
              y={q3Y}
              width={BOX_WIDTH}
              height={q1Y - q3Y}
              fill={boxFill}
              fillOpacity={boxFillOpacity}
              stroke={strokeColor}
              strokeWidth={2}
            />

            {/* Median line */}
            <line
              x1={-BOX_WIDTH / 2}
              y1={medianY}
              x2={BOX_WIDTH / 2}
              y2={medianY}
              stroke={strokeColor}
              strokeWidth={3}
            />

            {/* Mean diamond - centered at x=0 */}
            <polygon
              points={`0,${meanY - 4} 4,${meanY} 0,${meanY + 4} -4,${meanY}`}
              fill={blackAndWhite ? '#ffffff' : '#ffffff'}
              stroke={strokeColor}
              strokeWidth={2}
            />

            {/* Label - positioned at x=0 with rotation */}
            <text
              x={0}
              y={labelY}
              textAnchor="end"
              transform={`rotate(-45, 0, ${labelY})`}
              fill="#111111"
              style={{ fontSize: '11px', fontWeight: 'bold', ...FONT_STYLE }}
            >
              {name.length > 20 ? name.slice(0, 17) + '...' : name}
            </text>
            <text
              x={0}
              y={labelY + 18}
              textAnchor="end"
              transform={`rotate(-45, 0, ${labelY + 18})`}
              fill="#666666"
              style={{ fontSize: '10px', ...FONT_STYLE }}
            >
              n={stats.n}
            </text>
          </g>
        );
      })}
    </svg>
  );
};
