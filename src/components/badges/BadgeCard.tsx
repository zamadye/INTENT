import { Lock, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Badge, BadgeUnlock } from '@/shared/types/badge';

interface BadgeCardProps {
  badge: Badge;
  unlock?: BadgeUnlock;
  size?: 'sm' | 'md' | 'lg';
  showDetails?: boolean;
  onClick?: () => void;
  className?: string;
}

const rarityColors: Record<string, string> = {
  common: 'rarity-common',
  uncommon: 'rarity-uncommon',
  rare: 'rarity-rare',
  epic: 'rarity-epic',
  legendary: 'rarity-legendary',
};

const rarityTextColors: Record<string, string> = {
  common: 'rarity-text-common',
  uncommon: 'rarity-text-uncommon',
  rare: 'rarity-text-rare',
  epic: 'rarity-text-epic',
  legendary: 'rarity-text-legendary',
};

const sizeClasses = {
  sm: 'w-20 h-20',
  md: 'w-28 h-28',
  lg: 'w-36 h-36',
};

export function BadgeCard({ 
  badge, 
  unlock, 
  size = 'md', 
  showDetails = true,
  onClick,
  className 
}: BadgeCardProps) {
  const isUnlocked = !!unlock;
  const nodes = badge.visualConfig.nodes || 3;
  const glow = badge.visualConfig.glow || 'minimal';
  
  return (
    <div 
      className={cn(
        'badge-card cursor-pointer',
        rarityColors[badge.rarity],
        !isUnlocked && 'badge-locked',
        isUnlocked && unlock && 'badge-glow-once',
        className
      )}
      onClick={onClick}
    >
      {/* Badge Visual */}
      <div className={cn(
        'relative mx-auto flex items-center justify-center rounded-lg bg-background/50',
        sizeClasses[size]
      )}>
        <BadgeVisual 
          nodes={nodes} 
          glow={glow} 
          rarity={badge.rarity}
          isUnlocked={isUnlocked}
        />
        
        {/* Lock/Unlock indicator */}
        <div className="absolute -top-1 -right-1">
          {isUnlocked ? (
            <CheckCircle2 className="w-5 h-5 text-accent" />
          ) : (
            <Lock className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </div>
      
      {showDetails && (
        <div className="mt-3 text-center">
          <h4 className="font-medium text-sm">{badge.name}</h4>
          <p className={cn(
            'text-xs capitalize mt-0.5',
            rarityTextColors[badge.rarity]
          )}>
            {badge.rarity}
          </p>
          
          {isUnlocked && unlock && (
            <p className="text-xs text-muted-foreground mt-1 font-mono">
              {new Date(unlock.unlockedAt).toLocaleDateString()}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// Badge visual component - generates arch/node pattern
function BadgeVisual({ 
  nodes, 
  glow, 
  rarity,
  isUnlocked 
}: { 
  nodes: number; 
  glow: string;
  rarity: string;
  isUnlocked: boolean;
}) {
  const glowOpacity = {
    minimal: 0.1,
    basic: 0.15,
    medium: 0.25,
    full: 0.35,
    maximum: 0.5,
  }[glow] || 0.1;
  
  const color = {
    common: 'hsl(215 16% 47%)',
    uncommon: 'hsl(217 91% 60%)',
    rare: 'hsl(263 70% 50%)',
    epic: 'hsl(38 92% 50%)',
    legendary: 'hsl(38 92% 50%)',
  }[rarity] || 'hsl(215 16% 47%)';
  
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      {/* Background glow */}
      {isUnlocked && (
        <circle 
          cx="50" 
          cy="50" 
          r="45" 
          fill={color}
          opacity={glowOpacity}
        />
      )}
      
      {/* Arch shape */}
      <path
        d="M20 80 Q20 20 50 20 Q80 20 80 80"
        fill="none"
        stroke={isUnlocked ? color : 'hsl(215 25% 27%)'}
        strokeWidth="2"
        strokeLinecap="round"
      />
      
      {/* Nodes along the arch */}
      {Array.from({ length: nodes }).map((_, i) => {
        const t = (i + 1) / (nodes + 1);
        // Simple arch interpolation
        const x = 20 + (60 * t);
        const y = 80 - Math.sin(t * Math.PI) * 60;
        
        return (
          <circle
            key={i}
            cx={x}
            cy={y}
            r={nodes > 7 ? 3 : 4}
            fill={isUnlocked ? color : 'hsl(215 25% 27%)'}
          />
        );
      })}
      
      {/* Center emblem for legendary */}
      {rarity === 'legendary' && isUnlocked && (
        <circle
          cx="50"
          cy="50"
          r="8"
          fill={color}
          opacity="0.8"
        />
      )}
    </svg>
  );
}