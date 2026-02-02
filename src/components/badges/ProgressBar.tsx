import { cn } from '@/lib/utils';

interface ProgressBarProps {
  current: number;
  target: number;
  label?: string;
  showPercentage?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function ProgressBar({
  current,
  target,
  label,
  showPercentage = true,
  size = 'md',
  className,
}: ProgressBarProps) {
  const percentage = Math.min((current / target) * 100, 100);
  
  const heights = {
    sm: 'h-1.5',
    md: 'h-2',
    lg: 'h-3',
  };
  
  return (
    <div className={cn('w-full', className)}>
      {(label || showPercentage) && (
        <div className="flex justify-between items-center mb-1.5">
          {label && (
            <span className="text-sm text-muted-foreground">{label}</span>
          )}
          {showPercentage && (
            <span className="text-xs font-mono text-muted-foreground">
              {current}/{target}
            </span>
          )}
        </div>
      )}
      
      <div className={cn('progress-bar', heights[size])}>
        <div 
          className="progress-fill"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}