import React from 'react';
import { cn } from '@/lib/utils';

interface SimplifiedImageStyleProps {
  value: string;
  onChange: (style: string) => void;
}

const imageStyles = [
  { 
    value: 'tech', 
    label: 'Tech / Professional', 
    preview: '📐',
    description: 'Clean, minimalist tech aesthetic',
    mappedStyles: ['minimalist', 'blueprint']
  },
  { 
    value: 'vibrant', 
    label: 'Vibrant / Web3', 
    preview: '🌈',
    description: 'Bold colors, crypto energy',
    mappedStyles: ['cyberpunk', 'gradient']
  },
  { 
    value: 'cosmic', 
    label: 'Cosmic / Future', 
    preview: '🌌',
    description: 'Space theme, futuristic',
    mappedStyles: ['space']
  },
];

// Map simplified styles to original backend styles
export const mapToBackendStyle = (simplifiedStyle: string): string => {
  switch (simplifiedStyle) {
    case 'tech':
      return 'minimalist';
    case 'vibrant':
      return 'cyberpunk';
    case 'cosmic':
      return 'space';
    default:
      return 'cyberpunk';
  }
};

export const SimplifiedImageStyle: React.FC<SimplifiedImageStyleProps> = ({
  value,
  onChange,
}) => {
  return (
    <div className="space-y-3">
      <label className="text-sm font-medium">Visual Style</label>
      <div className="grid grid-cols-3 gap-3">
        {imageStyles.map((style) => (
          <button
            key={style.value}
            type="button"
            onClick={() => onChange(style.value)}
            className={cn(
              "flex flex-col items-center gap-2 p-4 rounded-xl transition-all duration-300",
              value === style.value
                ? "bg-primary/20 border-2 border-primary shadow-[0_0_20px_hsl(var(--primary)/0.2)]"
                : "bg-secondary/50 border-2 border-transparent hover:border-border"
            )}
          >
            <span className="text-3xl">{style.preview}</span>
            <span className="text-xs font-medium text-center">{style.label}</span>
          </button>
        ))}
      </div>
      {!value && (
        <p className="text-xs text-muted-foreground text-center">
          Defaults to "Vibrant / Web3" if not selected
        </p>
      )}
    </div>
  );
};

export default SimplifiedImageStyle;
