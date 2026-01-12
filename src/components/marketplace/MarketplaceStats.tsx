import React from 'react';
import { TrendingUp, DollarSign, ShoppingBag, BarChart3 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { MarketplaceStats as Stats } from '@/hooks/useMarketplace';

interface MarketplaceStatsProps {
  stats: Stats | null;
}

export const MarketplaceStats: React.FC<MarketplaceStatsProps> = ({ stats }) => {
  const statItems = [
    {
      label: 'Floor Price',
      value: stats ? `${stats.floor_price.toFixed(4)} USDC` : '—',
      icon: DollarSign,
      color: 'text-accent',
    },
    {
      label: 'Total Volume',
      value: stats ? `${stats.total_volume.toFixed(2)} USDC` : '—',
      icon: TrendingUp,
      color: 'text-primary',
    },
    {
      label: 'Total Sales',
      value: stats?.total_sales.toString() || '0',
      icon: ShoppingBag,
      color: 'text-purple-400',
    },
    {
      label: 'Listed',
      value: stats?.total_listed.toString() || '0',
      icon: BarChart3,
      color: 'text-cyan-400',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {statItems.map((item) => (
        <Card
          key={item.label}
          className="p-4 bg-card/50 border-border/50 backdrop-blur-sm"
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-background/50 ${item.color}`}>
              <item.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className="text-lg font-semibold text-foreground">{item.value}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};
