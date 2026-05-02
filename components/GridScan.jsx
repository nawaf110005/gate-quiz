'use client';

/**
 * GridScan – animated grid background with a moving scan beam.
 * Pure CSS, no Three.js dependency.
 */
export default function GridScan({
  gridColor = 'rgba(139, 92, 246, 0.13)',
  scanColor = 'rgba(139, 92, 246, 0.55)',
  dotColor = 'rgba(139, 92, 246, 0.35)',
  speed = 9,
  gridSize = 44,
  bg = '#06030f',
}) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        background: bg,
      }}
    >
      {/* Grid lines */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `
            linear-gradient(${gridColor} 1px, transparent 1px),
            linear-gradient(90deg, ${gridColor} 1px, transparent 1px)
          `,
          backgroundSize: `${gridSize}px ${gridSize}px`,
        }}
      />

      {/* Grid intersection dots */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `radial-gradient(circle, ${dotColor} 1px, transparent 1px)`,
          backgroundSize: `${gridSize}px ${gridSize}px`,
        }}
      />

      {/* Moving scan beam */}
      <div
        className="grid-scan-beam"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          height: '180px',
          background: `linear-gradient(180deg,
            transparent 0%,
            ${scanColor}15 15%,
            ${scanColor}45 45%,
            ${scanColor}70 50%,
            ${scanColor}45 55%,
            ${scanColor}15 85%,
            transparent 100%
          )`,
          animationDuration: `${speed}s`,
          filter: 'blur(1px)',
        }}
      />

      {/* Bright leading edge of beam */}
      <div
        className="grid-scan-edge"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          height: '2px',
          background: `linear-gradient(90deg, transparent, ${scanColor}, rgba(255,255,255,0.6), ${scanColor}, transparent)`,
          animationDuration: `${speed}s`,
          boxShadow: `0 0 12px 4px ${scanColor}`,
        }}
      />

      {/* Radial vignette */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse at 50% 50%, transparent 35%, rgba(6,3,15,0.85) 100%)',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}
