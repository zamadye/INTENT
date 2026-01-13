/**
 * Proof Statistics Card Component
 * Displays aggregated proof statistics for the dashboard
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Fingerprint, Users, TrendingUp, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ProofStats {
  totalProofs: number;
  uniqueUsers: number;
  userProofs?: number;
  verifiedCount?: number;
}

interface ProofStatsCardProps {
  stats: ProofStats;
  isLoading?: boolean;
}

export const ProofStatsCard: React.FC<ProofStatsCardProps> = ({ stats, isLoading }) => {
  const statItems = [
    {
      label: 'Total Proofs',
      value: stats.totalProofs,
      icon: Fingerprint,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      label: 'Unique Users',
      value: stats.uniqueUsers,
      icon: Users,
      color: 'text-accent',
      bgColor: 'bg-accent/10',
    },
    {
      label: 'Your Proofs',
      value: stats.userProofs ?? 0,
      icon: TrendingUp,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
      showIfConnected: true,
    },
    {
      label: 'Verified',
      value: stats.verifiedCount ?? stats.totalProofs,
      icon: CheckCircle2,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
  ];

  return (
    <Card className="bg-card/50 border-border/50 backdrop-blur-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Network Statistics
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {statItems.map((item, index) => {
            const Icon = item.icon;
            
            return (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex flex-col items-center p-3 rounded-lg bg-background/50"
              >
                <div className={`p-2 rounded-full ${item.bgColor} mb-2`}>
                  <Icon className={`w-4 h-4 ${item.color}`} />
                </div>
                {isLoading ? (
                  <div className="h-6 w-12 bg-muted/50 rounded animate-pulse" />
                ) : (
                  <span className="text-xl font-bold text-foreground">
                    {item.value.toLocaleString()}
                  </span>
                )}
                <span className="text-xs text-muted-foreground mt-1">
                  {item.label}
                </span>
              </motion.div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};