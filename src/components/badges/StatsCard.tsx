import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  label: string;
  value: string | number;
  change?: string;
  icon?: LucideIcon;
  className?: string;
}

export function StatsCard({ 
  label, 
  value, 
  change,
  icon: Icon,
  className 
}: StatsCardProps) {
  const isPositiveChange = change?.startsWith('+');
  
  return (
    <div className={cn('stats-card', className)}>
      <div className="flex items-start justify-between">
        <span className="text-xs text-muted-foreground uppercase tracking-wide">
          {label}
        </span>
        {Icon && <Icon className="w-4 h-4 text-muted-foreground" />}
      </div>
      
      <div className="mt-2">
        <span className="text-2xl font-mono font-medium text-foreground">
          {value}
        </span>
      </div>
      
      {change && (
        <p className={cn(
          'text-xs mt-1',
          isPositiveChange ? 'text-accent' : 'text-muted-foreground'
        )}>
          {change}
        </p>
      )}
    </div>
  );
}