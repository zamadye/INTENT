import { useEffect, useRef } from 'react';

// Simplified jazzicon implementation
export const useJazzicon = (address: string | null, diameter: number = 32) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!address || !ref.current) return;

    // Generate colors from address
    const colors = [
      '#FC5C54', '#FFD95A', '#E95D72', '#76E268',
      '#B98F4D', '#FF949A', '#6A87C8', '#D5D7E1',
      '#ABE5A1', '#2A4359', '#F0D05B', '#5F7FBA',
      '#E58B88', '#B3DCED', '#EFA06D', '#C6C7D1',
    ];

    // Create a simple seed from address
    const seed = parseInt(address.slice(2, 10), 16);
    
    // Pick colors based on seed
    const bgColor = colors[seed % colors.length];
    const fgColor = colors[(seed * 7) % colors.length];

    // Generate simple avatar
    const container = ref.current;
    container.innerHTML = '';
    
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', diameter.toString());
    svg.setAttribute('height', diameter.toString());
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.style.borderRadius = '50%';
    svg.style.overflow = 'hidden';

    // Background
    const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bg.setAttribute('width', '100');
    bg.setAttribute('height', '100');
    bg.setAttribute('fill', bgColor);
    svg.appendChild(bg);

    // Generate shapes
    const numShapes = 3 + (seed % 3);
    for (let i = 0; i < numShapes; i++) {
      const shape = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      const cx = ((seed * (i + 1) * 17) % 80) + 10;
      const cy = ((seed * (i + 1) * 23) % 80) + 10;
      const r = 10 + ((seed * (i + 1)) % 25);
      
      shape.setAttribute('cx', cx.toString());
      shape.setAttribute('cy', cy.toString());
      shape.setAttribute('r', r.toString());
      shape.setAttribute('fill', i % 2 === 0 ? fgColor : colors[(seed * (i + 3)) % colors.length]);
      shape.setAttribute('opacity', '0.8');
      svg.appendChild(shape);
    }

    container.appendChild(svg);
  }, [address, diameter]);

  return ref;
};

interface JazziconAvatarProps {
  address: string | null;
  diameter?: number;
  className?: string;
}

export const JazziconAvatar: React.FC<JazziconAvatarProps> = ({
  address,
  diameter = 32,
  className = '',
}) => {
  const ref = useJazzicon(address, diameter);

  if (!address) {
    return (
      <div
        className={`rounded-full bg-muted ${className}`}
        style={{ width: diameter, height: diameter }}
      />
    );
  }

  return <div ref={ref} className={className} />;
};

import React from 'react';

export default JazziconAvatar;
