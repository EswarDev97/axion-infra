import React, { useMemo, useEffect, useState } from 'react';

interface ConfettiPiece {
  x: number;
  y: number;
  delay: number;
  duration: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
  size: number;
  shape: 'circle' | 'square' | 'triangle';
  opacity: number;
}

interface Props {
  count?: number;
}

// Mission Control inspired colors
const COLORS = [
  '#00f5ff', // Cyan (working)
  '#a855f7', // Purple (testing)
  '#22c55e', // Green (success)
  '#ffb000', // Amber (thinking)
  '#ff006e', // Pink (error/accent)
  '#4f46e5', // Indigo
];

const SHAPES: Array<'circle' | 'square' | 'triangle'> = ['circle', 'square', 'triangle'];

function generateConfetti(count: number): ConfettiPiece[] {
  return Array.from({ length: count }, () => ({
    x: Math.random() * 100,
    y: Math.random() * 30 - 10, // Start above viewport
    delay: Math.random() * 0.8,
    duration: 1.5 + Math.random() * 2,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    rotation: Math.random() * 360,
    rotationSpeed: (Math.random() - 0.5) * 720,
    size: 6 + Math.random() * 10,
    shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
    opacity: 0.6 + Math.random() * 0.4,
  }));
}

export function Confetti({ count = 30 }: Props) {
  const [isActive, setIsActive] = useState(false);
  const pieces = useMemo(() => generateConfetti(count), [count]);

  useEffect(() => {
    // Trigger animation on mount
    requestAnimationFrame(() => {
      setIsActive(true);
    });
  }, []);

  const getShapeStyle = (piece: ConfettiPiece) => {
    const baseStyle = {
      width: `${piece.size}px`,
      height: `${piece.size}px`,
      backgroundColor: piece.color,
      opacity: piece.opacity,
    };

    switch (piece.shape) {
      case 'circle':
        return { ...baseStyle, borderRadius: '50%' };
      case 'triangle':
        return {
          width: '0',
          height: '0',
          borderLeft: `${piece.size / 2}px solid transparent`,
          borderRight: `${piece.size / 2}px solid transparent`,
          borderBottom: `${piece.size}px solid ${piece.color}`,
          opacity: piece.opacity,
        };
      default:
        return { ...baseStyle, borderRadius: '2px' };
    }
  };

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {pieces.map((piece, index) => (
        <div
          key={index}
          className="absolute animate-confetti-fall"
          style={{
            left: `${piece.x}%`,
            top: `${piece.y}%`,
            animationDelay: `${piece.delay}s`,
            animationDuration: `${piece.duration}s`,
            animationPlayState: isActive ? 'running' : 'paused',
          }}
        >
          <div
            className="animate-confetti-spin"
            style={{
              ...getShapeStyle(piece),
              '--confetti-rotation': `${piece.rotationSpeed}deg`,
            } as unknown as React.CSSProperties}
          />
        </div>
      ))}

      {/* Burst effect from center */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="animate-confetti-burst">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={`burst-${i}`}
              className="absolute w-1 h-1 rounded-full bg-cyan-400"
              style={{
                transform: `rotate(${i * 30}deg) translateY(-80px)`,
                animationDelay: `${i * 0.03}s`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
